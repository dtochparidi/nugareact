import CalendarDayStore from './Domain/CalendarDayStore';
import PersonStore from './Domain/PersonStore';
import { RootStore } from './RootStore';

export default class DomainStore {
  public calendarDayStore: CalendarDayStore;
  public personStore: PersonStore;

  constructor(rootStore: RootStore) {
    this.calendarDayStore = new CalendarDayStore(rootStore);
    this.personStore = new PersonStore();
  }
}
