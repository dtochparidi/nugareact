import { action, configure, decorate, observable } from "mobx";
import { IPerson } from "src/interfaces/IPerson";

configure({ enforceActions: "observed" });

export class AppStore {
  public currentUser?: IPerson;

  @action
  public updateCurrentUser(user: IPerson) {
    this.currentUser = user;
  }

  @action
  public updateCurrentUserProp(propKey: string, propValue: any) {
    if (this.currentUser) this.currentUser[propKey] = propValue;
  }
}

decorate(AppStore, {
  currentUser: observable
});

const appStore = new AppStore();

export default appStore;
