import IAppointment from 'interfaces/IAppointment';
import { IPerson } from 'interfaces/IPerson';
import { IPersonLoading } from 'interfaces/IPersonLoading';
import { action, observable } from 'mobx';
import * as moment from 'moment';

export default class Appointment implements IAppointment {
  public static fromIdentifier(id: string) {
    const arr = id.split('_');
    return {
      date: moment(arr[1], 'mm-HH-DD-MM-YYYY'),
      identifier: id,
      personId: arr[3],
      position: parseInt(arr[2], 10),
    };
  }

  private static calcId(
    date: moment.Moment,
    position: number,
    personId: string,
  ) {
    const id = `app_${date.format('mm-HH-DD-MM-YYYY')}_${position}_${personId}`;
    return id;
  }

  @observable
  public date: moment.Moment;
  @observable
  public position: number;
  @observable
  public personId: string;
  @observable
  public personInstance?: IPerson | IPersonLoading;
  @observable
  public identifier: string;

  constructor(obj: {
    date: moment.Moment;
    position: number;
    personId: string;
    personInstance?: IPerson | IPersonLoading;
  }) {
    this.update(obj);
  }

  @action
  public update({
    date,
    position,
    personId,
    personInstance,
  }: {
    date?: moment.Moment;
    position?: number;
    personId?: string;
    personInstance?: IPerson | IPersonLoading;
  }) {
    if (date) this.date = date;
    if (position || position === 0) this.position = position;
    if (personId) this.personId = personId;
    if (personInstance) this.personInstance = personInstance;

    this.identifier = Appointment.calcId(
      this.date,
      this.position,
      this.personId,
    );
  }
}
