import { action, observable } from 'mobx';
import fetchPerson from 'src/fetchers/PersonFetcher';
import Person from 'src/structures/Person';

export default class PersonStore {
  @observable
  public persons: { [id: string]: Person } = {};

  @observable
  public currentUser: Person | undefined;

  @action
  public setCurrentUser(id: string) {
    this.currentUser = this.loadPerson(id);
  }

  @action.bound
  public loadPerson(id: string): Person {
    const person = new Person({ id, loaded: false });

    this.loadPersonData(person);
    this.persons[person.id] = person;

    return person;
  }

  private async loadPersonData(person: Person) {
    const data = await fetchPerson(person.id);
    person.addData(data);
    person.setData({ loaded: true });
  }
}
