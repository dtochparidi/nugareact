import CalendarDayStore from 'stores/Domain/CalendarDayStore';
import PersonStore from 'stores/Domain/PersonStore';
import { RootStore } from 'stores/RootStore';

export default class DomainStore {
  public calendarDayStore: CalendarDayStore;
  public personStore: PersonStore;

  constructor(rootStore: RootStore) {
    this.calendarDayStore = new CalendarDayStore(rootStore);
    this.personStore = new PersonStore();
  }
}
