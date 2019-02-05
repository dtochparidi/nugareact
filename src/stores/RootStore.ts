import DomainStore from './DomainStore';
import UIStore from './UI/UIStore';

export class RootStore {
  public domainStore: DomainStore;
  public uiStore: UIStore;

  constructor() {
    this.uiStore = new UIStore();
    this.domainStore = new DomainStore(this);
  }
}

const rootStore = new RootStore();

export default rootStore;
