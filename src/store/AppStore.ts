import { action, configure, observable } from 'mobx';
import { Moment as IMoment } from 'moment';
import * as Moment from 'moment';
import { DateRange, extendMoment } from 'moment-range';
import IAppointment from 'src/interfaces/IAppointment';

import fetchDay from '../fetchers/DayFetcher';
import fetchPerson from '../fetchers/PersonFetcher';
import ICalendarDay from '../interfaces/ICalendarDay';
import { IPerson } from '../interfaces/IPerson';

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
  public positionCount: number = 11;
  @observable
  public dayTimeRange: DateRange = moment.range(
    moment()
      .startOf('day')
      .hour(8),
    moment()
      .startOf('day')
      .hour(17),
  );

  @observable
  public persons: { [id: string]: IPerson } = {};

  @action
  public updatePositionCount(count: number) {
    this.positionCount = count;
  }

  @action.bound
  public loadPerson(id: string) {
    const person = {
      id,
      loaded: false,
    };
    this.addPersons([person as IPerson]);

    setTimeout(async () => {
      const newPerson = await fetchPerson(id);
      this.updatePerson(id, newPerson);
    });
    return person;
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
      async (app: IAppointment): Promise<IAppointment> => {
        const person =
          app.personId in this.persons
            ? this.persons[app.personId]
            : this.loadPerson(app.personId);
        return {
          date: app.date,
          personId: app.personId,
          personInstance: person,
          position: app.position,
        };
      },
    );

    day.appointments = await Promise.all(appointmentsPromises);

    this.addDay(day);
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

// autorun(r => {
//   if (appStore.currentUser) {
//     console.clear();
//     console.log(toJS(appStore));
//   }
// });

export default appStore;
