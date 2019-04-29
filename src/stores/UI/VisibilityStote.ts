import { action, observable } from 'mobx';
import moize from 'moize';

export default class VisibilityStore {
  @observable
  public observables: { [id: string]: boolean } = {};

  public contains = moize(id => id in this.observables);

  @action
  public makeVisible(id: string) {
    this.observables[id] = true;
  }

  @action
  public makeUnvisible(id: string) {
    this.observables[id] = false;
  }

  public isVisible(id: string) {
    return this.observables[id];
  }
}
