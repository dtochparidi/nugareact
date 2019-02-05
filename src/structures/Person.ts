import { action, observable } from 'mobx';
import { Moment as IMoment } from 'moment';
import { IPerson } from 'src/interfaces/IPerson';

export default class Person implements IPerson {
  @observable
  public id: string;
  @observable
  public name: string;
  @observable
  public surname: string;
  @observable
  public patronymic: string;
  @observable
  public address: string;
  @observable
  public phone: string;
  @observable
  public birthdate: IMoment;
  @observable
  public rate: number;
  @observable
  public friends: string[];
  @observable
  public averageBill: string;
  @observable
  public invitedBy: string;
  @observable
  public loaded: boolean;

  constructor(data: IPerson | object) {
    this.setData(data);
  }

  /**
   * Assign provided params only to undefined props
   *
   * @param data - partially filled IPerson object
   */

  @action
  public addData(data: IPerson | object) {
    Object.entries(data).forEach(([prop, val]) =>
      !(typeof this[prop] !== 'undefined') ? (this[prop] = val) : null,
    );
  }

  /**
   * Override this with passed data
   *
   * @param data - partially filled IPerson object
   */

  @action
  public setData(data: IPerson | object) {
    Object.entries(data).forEach(([prop, val]) => (this[prop] = val));
  }
}
