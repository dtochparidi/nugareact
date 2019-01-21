import { action, autorun, configure, decorate, observable, toJS } from "mobx";
import { IPerson } from "../interfaces/IPerson";

configure({ enforceActions: "observed" });

export class AppStore {
  public currentUser?: IPerson;

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
