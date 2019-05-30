import IAppointment from 'interfaces/IAppointment';
import { IPerson } from 'interfaces/IPerson';
import { IPersonLoading } from 'interfaces/IPersonLoading';
import { action, observable } from 'mobx';
import * as Moment from 'moment';
import { Duration as IDuration, Moment as IMoment } from 'moment';
import { DateRange, extendMoment } from 'moment-range';
import { v4 } from 'uuid';

const moment = extendMoment(Moment);

type IUpdateAppFun = (
  app: Appointment,
  weightful: boolean,
  final: boolean,
  serverSide: boolean,
) => void;

export default class Appointment implements IAppointment {
  public static fromJSON(json: string) {
    const parsed = JSON.parse(json);
    const { personId, position, uniqueId, stateHash, points, visits } = parsed;
    let { duration, date } = parsed;

    duration = Moment.duration(duration);
    date = Moment(date);

    return new Appointment({
      date,
      duration,
      personId,
      points,
      position,
      stateHash,
      uniqueId,
      visits,
    });
  }

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

  public static getStateHash() {
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
  public identifier: string;
  @observable
  public overlapping: boolean = false;
  @observable
  public stateHash: string;
  @observable
  public points: number;
  @observable
  public visits: number;

  public uniqueId: string;
  public dateRange: DateRange;
  public updateListeners: {
    [key: string]: IUpdateAppFun;
  } = {};

  constructor(obj: {
    date: IMoment;
    position: number;
    personId: string;
    personInstance?: IPerson | IPersonLoading;
    duration: IDuration;
    uniqueId: string;
    stateHash: string;
    visits: number;
    points: number;
  }) {
    this.uniqueId = obj.uniqueId;
    this.update(obj);
  }

  @action
  public update(
    {
      date,
      position,
      personId,
      personInstance,
      duration,
      overlapping,
      stateHash,
      visits,
      points,
    }: {
      date?: IMoment;
      position?: number;
      personId?: string;
      personInstance?: IPerson | IPersonLoading;
      duration?: IDuration;
      overlapping?: boolean;
      stateHash?: string;
      visits?: number;
      points?: number;
    },
    weightful = true,
    final = true,
    serverSide = false,
  ) {
    if (date) this.date = date;
    if (position || position === 0) this.position = position;
    if (personId) this.personId = personId;
    if (personInstance) this.personInstance = personInstance;
    if (duration) this.duration = duration;
    if (points) this.points = points;
    if (visits) this.visits = visits;
    if (overlapping === true || overlapping === false)
      this.overlapping = overlapping;

    this.stateHash = stateHash || Appointment.getStateHash();

    this.endDate = this.date.clone().add(this.duration);
    this.dateRange = moment.range(this.date, this.endDate);

    this.identifier = Appointment.calcId(
      this.date,
      this.position,
      this.personId,
      this.duration,
      this.uniqueId,
    );

    Object.values(this.updateListeners).forEach(listener => {
      // console.log('app updated');
      listener(this, weightful, final, serverSide);
    });
  }

  public toJSON() {
    return {
      date: this.date.valueOf(),
      duration: this.duration.asMilliseconds(),
      personId: this.personId,
      position: this.position,
    };
  }

  public registerListener(key: string, listener: IUpdateAppFun) {
    this.updateListeners[key] = listener;
  }

  public clone() {
    return new Appointment(this);
  }

  public extractData(): IAppointment {
    return {
      date: this.date.clone(),
      duration: this.duration.clone(),
      personId: this.personId,
      points: this.points,
      position: this.position,
      stateHash: this.stateHash,
      uniqueId: this.uniqueId,
      visits: this.visits,
    };
  }
}
