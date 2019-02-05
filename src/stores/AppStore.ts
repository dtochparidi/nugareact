import { action, configure, observable } from 'mobx';
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
  public positionCount: number = 15;
  @observable
  public dayTimeRange: DateRange = moment.range(
    moment()
      .startOf('day')
      .hour(8),
    moment()
      .startOf('day')
      .hour(12),
    // .hour(11),
  );

  @observable
  public persons: { [id: string]: IPerson } = {};

  @action
  public updatePositionCount(count: number) {
    this.positionCount = count;
  }

  public loadPerson(id: string) {
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
    const dayDate = date.clone().startOf('day');

    const existingDay = this.calendarDaysPending.find(
      d => d.diff(dayDate, 'days') === 0,
    );
    if (existingDay) return existingDay;

    this.calendarDaysPending.push(dayDate);

    const day = await fetchDay(dayDate);

    // const personsToLoad = day.appointments
    //   .filter(app => app.personId in this.persons)
    //   .map(app => app.personId);
    // this.loadMultiplePerson(personsToLoad);

    const appointmentsPromises = day.appointments.map(
      async (app: IAppointment): Promise<Appointment> => {
        if (!app) throw Error('app is undefined');

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
    return day;
  }

  @action.bound
  public updateAppointment({
    date,
    position,
    personId,
    targetDate,
    targetPosition,
    appointment,
  }:
    | {
        date: IMoment;
        position: number;
        personId: string;
        targetDate: IMoment;
        appointment?: undefined;
        targetPosition: number;
      }
    | {
        date?: undefined;
        position?: undefined;
        personId?: undefined;
        appointment: Appointment;
        targetDate: IMoment;
        targetPosition: number;
      }) {
    date = date || (appointment as Appointment).date;
    personId = personId || (appointment as Appointment).personId;
    if (appointment) position = (appointment as Appointment).position;

    // check if date is in borders
    const { start, end } = this.dayTimeRange;
    const startDiff = start
      .clone()
      .hour(targetDate.hour())
      .minute(targetDate.minute())
      .diff(this.dayTimeRange.start, 'hour');
    const endDiff = start
      .clone()
      .hour(targetDate.hour())
      .minute(targetDate.minute())
      .diff(this.dayTimeRange.end, 'hour');

    if (startDiff < 0)
      targetDate
        .subtract(1, 'day')
        .hour(end.hour())
        .minute(end.minute());
    else if (endDiff > 0)
      targetDate
        .add(1, 'day')
        .hour(start.hour())
        .minute(start.minute());

    // update day
    const currentDay = this.calendarDays.find(
      day =>
        day.date
          .clone()
          .startOf('day')
          .diff((date as IMoment).clone().startOf('day'), 'day') === 0,
    ) as ICalendarDay;
    const newDay = this.calendarDays.find(
      day =>
        day.date
          .clone()
          .startOf('day')
          .diff(targetDate.clone().startOf('day'), 'day') === 0,
    );

    appointment =
      appointment ||
      currentDay.appointments.find(
        app =>
          app.date
            .clone()
            .startOf('day')
            .diff((date as IMoment).clone().startOf('day'), 'day') === 0 &&
          position === app.position &&
          personId === app.personId,
      );

    if (!appointment) throw Error('no such appointment');

    // check if we need to load day
    if (!newDay) {
      this.loadDay(targetDate.clone().startOf('day'));
      return;
    }

    // change the appointment
    appointment.update({
      date: targetDate,
      position: targetPosition,
    });

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
    if (!day) throw Error('day is undefined');

    if (
      this.calendarDays.length === 0 ||
      day.date.diff(
        this.calendarDays[this.calendarDays.length - 1].date,
        'hour',
      ) > 0
    )
      this.calendarDays.push(day);
    else this.calendarDays.unshift(day);
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
