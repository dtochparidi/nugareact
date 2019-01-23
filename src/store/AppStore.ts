import { action, configure, observable } from "mobx";
import { Moment } from "moment";

import fetchDay from "../fetchers/DayFetcher";
import fetchPerson from "../fetchers/PersonFetcher";
import ICalendarDay from "../interfaces/ICalendarDay";
import { IPerson } from "../interfaces/IPerson";

configure({ enforceActions: "observed" });

export class AppStore {
  @observable
  public currentUser?: IPerson;
  @observable
  public calendarDays: ICalendarDay[] = [];
  @observable
  public calendarDaysPending: Moment[] = [];

  public persons: { [id: string]: IPerson } = {};

  public async loadPerson(id: string) {
    const person = await fetchPerson(id);
    this.addPersons([person]);
  }

  @action
  public addPersons(persons: IPerson[]) {
    persons.forEach(person => (this.persons[person.id] = person));
  }

  @action.bound
  public async loadDay(date: Moment) {
    const dayDate = date.startOf("day");

    if (this.calendarDaysPending.find(d => d.diff(dayDate, "days") === 0))
      return;

    this.calendarDaysPending.push(dayDate);

    const day = await fetchDay(dayDate);
    this.addDay(day);
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
//     const obj = Object.entries(toJS(appStore.currentUser));
//     console.table(obj);
//   }
// });

export default appStore;
