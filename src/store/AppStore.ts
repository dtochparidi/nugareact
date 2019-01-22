import { action, autorun, configure, decorate, observable, toJS } from "mobx";
import { Moment } from "moment";
import fetchDay from "../fetchers/DayFetcher";
import fetchPerson from "../fetchers/PersonFetcher";
import ICalendarDay from "../interfaces/ICalendarDay";
import { IPerson } from "../interfaces/IPerson";

configure({ enforceActions: "observed" });

export class AppStore {
  public currentUser?: IPerson;
  public persons: { [id: string]: IPerson } = {};
  public calendarDays: ICalendarDay[] = [];

  public async loadPerson(id: string) {
    const person = await fetchPerson(id);
    this.addPersons([person]);
  }

  @action
  public addPersons(persons: IPerson[]) {
    persons.forEach(person => (this.persons[person.id] = person));
  }

  public async loadDay(date: Moment) {
    const day = await fetchDay(date);
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

decorate(AppStore, {
  currentUser: observable
});

const appStore = new AppStore();

autorun(r => {
  if (appStore.currentUser) {
    const obj = Object.entries(toJS(appStore.currentUser));
    console.table(obj);
  }
});

export default appStore;
