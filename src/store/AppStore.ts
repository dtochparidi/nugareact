import { action, configure, observable, toJS } from 'mobx';
import { Moment as IMoment } from 'moment';
import * as Moment from 'moment';
import { DateRange, extendMoment } from 'moment-range';
import IAppointment from 'src/interfaces/IAppointment';

import fetchDay from '../fetchers/DayFetcher';
import fetchPerson from '../fetchers/PersonFetcher';
import ICalendarDay from '../interfaces/ICalendarDay';
import { IPerson } from '../interfaces/IPerson';
import Appointment from '../structures/Appointment';

const moment = extendMoment(Moment);

configure({ enforceActions: 'observed' });

export class AppStore {
  @observable
  public currentUser?: IPerson;
  @observable
  public calendarDays: ICalendarDay[] = [];
  @observable
  public calendarDaysPending: IMoment[] = [];
  @observable
  public positionCount: number = 5;
  @observable
  public dayTimeRange: DateRange = moment.range(
    moment()
      .startOf('day')
      .hour(8),
    moment()
      .startOf('day')
      // .hour(17),
      .hour(11),
  );

  @observable
  public persons: { [id: string]: IPerson } = {};

  @action
  public updatePositionCount(count: number) {
    this.positionCount = count;
  }

  @action.bound
  public loadPerson(id: string) {
    console.log('load', id);
    if (!(id in this.persons)) {
      const person = {
        id,
        loaded: false,
      };
      this.addPersons([person as IPerson]);
    }

    setTimeout(async () => {
      const newPerson = await fetchPerson(id);
      this.updatePerson(id, newPerson);
    });

    return this.persons[id];
  }

  @action
  public updatePerson(id: string, instance: IPerson) {
    Object.assign(this.persons[id], instance);
  }

  public async loadMultiplePerson(ids: string[]) {
    console.log('load persons', ids);

    const persons = ids.map(id => ({ id, loaded: false }));

    persons.forEach(p => (persons[p.id] = p));

    const promises = ids.map(id => fetchPerson(id));

    const loadedPersons = await Promise.all(promises);
    loadedPersons.forEach(p => (persons[p.id] = p));

    this.addPersons(persons as IPerson[]);
  }

  @action
  public addPersons(persons: IPerson[]) {
    persons.forEach(person => (this.persons[person.id] = person));
  }

  @action.bound
  public async loadDay(date: IMoment) {
    const dayDate = date.startOf('day');

    if (this.calendarDaysPending.find(d => d.diff(dayDate, 'days') === 0))
      return;

    this.calendarDaysPending.push(dayDate);

    const day = await fetchDay(dayDate);

    const appointmentsPromises = day.appointments.map(
      async (app: IAppointment): Promise<Appointment> => {
        // if (!(app.personId in this.persons)) this.loadPerson(app.personId);
        // const person = this.persons[app.personId];
        const person =
          app.personId in this.persons
            ? this.persons[app.personId]
            : this.loadPerson(app.personId);
        return new Appointment({
          date: app.date,
          personId: app.personId,
          personInstance: person,
          position: app.position,
        });
      },
    );

    day.appointments = await Promise.all(appointmentsPromises);

    this.addDay(day);
  }

  @action.bound
  public updateAppointment(
    date: IMoment,
    position: number,
    personId: string,
    targetDate: IMoment,
    targetPosition: number,
  ) {
    console.log(toJS(this.calendarDays[0]));
    console.log(date.hour(), '=>', targetDate.hour());
    console.log(position, '=>', targetPosition);

    const currentDay = this.calendarDays.find(
      day =>
        day.date
          .clone()
          .startOf('day')
          .diff(date, 'day') === 0,
    ) as ICalendarDay;
    const newDay = this.calendarDays.find(
      day =>
        day.date
          .clone()
          .startOf('day')
          .diff(targetDate, 'day') === 0,
    ) as ICalendarDay;

    const appointment = currentDay.appointments.find(
      app =>
        app.date.startOf('day').diff(date, 'day') === 0 &&
        position === app.position &&
        personId === app.personId,
    ) as Appointment;

    // change the appointment
    console.log(position, targetPosition);
    appointment.update({
      // date: targetDate,
      position: targetPosition,
    });
    console.log(toJS(this.calendarDays[0]));
    // if day wasn't changed
    if (currentDay.date.diff(newDay.date, 'day') === 0) return;
    console.log('change day');

    // remove from current day
    currentDay.appointments.splice(
      currentDay.appointments.indexOf(appointment),
      1,
    );

    // append to new day
    newDay.appointments.push(appointment);
  }

  @action
  public updateDayTimeRange(range: DateRange) {
    this.dayTimeRange = range;
  }

  @action
  public addDay(day: ICalendarDay) {
    this.calendarDays.push(day);
  }

  @action
  public updateCurrentUser(user: IPerson) {
    this.currentUser = user;
  }

  @action
  public updateCurrentUserProp(arr: Array<[string, any]>) {
    if (this.currentUser) {
      const user = this.currentUser as IPerson;
      arr.forEach(entrie => (user[entrie[0]] = entrie[1]));
    }
  }
}

const appStore = new AppStore();

export default appStore;
