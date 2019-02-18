import IAppointment from 'interfaces/IAppointment';
import { IPerson } from 'interfaces/IPerson';
import { IPersonLoading } from 'interfaces/IPersonLoading';
import { action, observable } from 'mobx';
import * as Moment from 'moment';
import { Duration as IDuration, Moment as IMoment } from 'moment';
import { DateRange, extendMoment } from 'moment-range';
import { v4 } from 'uuid';

const moment = extendMoment(Moment);

export default class Appointment implements IAppointment {
  public static fromIdentifier(id: string) {
    const arr = id.split('_');
    const data = {
      date: moment(arr[1], 'mm-HH-DD-MM-YYYY'),
      duration: Moment.duration(parseFloat(arr[4]), 'minute'),
      identifier: id,
      personId: arr[3],
      position: parseInt(arr[2], 10),
      uniqueId: arr[5],
    };

    return Object.assign(data, {
      dateRange: moment.range(data.date, data.date.clone().add(data.duration)),
    });
  }

  private static getStateHash() {
    return v4();
  }

  private static calcId(
    date: IMoment,
    position: number,
    personId: string,
    duration: IDuration,
    uniqueId: string,
  ) {
    const id = `app_${date.format(
      'mm-HH-DD-MM-YYYY',
    )}_${position}_${personId}_${duration.asMinutes()}_${uniqueId}`;
    return id;
  }

  @observable
  public date: IMoment;
  @observable
  public endDate: IMoment;
  @observable
  public duration: IDuration;
  @observable
  public position: number;
  @observable
  public personId: string;
  @observable
  public personInstance?: IPerson | IPersonLoading;
  @observable
  public identifier: string;
  @observable
  public overlapping: boolean = false;
  @observable
  public stateHash: string;

  public uniqueId: string;
  public dateRange: DateRange;

  constructor(obj: {
    date: IMoment;
    position: number;
    personId: string;
    personInstance?: IPerson | IPersonLoading;
    duration: IDuration;
  }) {
    this.uniqueId = v4();

    this.update(obj);
  }

  @action
  public update({
    date,
    position,
    personId,
    personInstance,
    duration,
    overlapping,
  }: {
    date?: IMoment;
    position?: number;
    personId?: string;
    personInstance?: IPerson | IPersonLoading;
    duration?: IDuration;
    overlapping?: boolean;
  }) {
    if (date) this.date = date;
    if (position || position === 0) this.position = position;
    if (personId) this.personId = personId;
    if (personInstance) this.personInstance = personInstance;
    if (duration) this.duration = duration;
    if (overlapping === true || overlapping === false)
      this.overlapping = overlapping;

    this.endDate = this.date.clone().add(this.duration);
    this.dateRange = moment.range(this.date, this.endDate);

    this.identifier = Appointment.calcId(
      this.date,
      this.position,
      this.personId,
      this.duration,
      this.uniqueId,
    );
    this.stateHash = Appointment.getStateHash();
  }
}
