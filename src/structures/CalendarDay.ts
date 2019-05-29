import ICalendarDay from 'interfaces/ICalendarDay';
import { action, observable } from 'mobx';
import { Moment as IMoment } from 'moment';
import * as moment from 'moment';

import Appointment from './Appointment';

export default class CalendarDay implements ICalendarDay {
  public static fromId(id: string) {
    const arr = id.split('_');
    return {
      date: moment(arr, 'DD-MM-YYYY'),
    };
  }

  public static calcId(date: IMoment) {
    const id = `day_${date.format('DD-MM-YYYY')}`;
    return id;
  }

  @observable
  public appointments: { [uniqueId: string]: Appointment };

  public date: IMoment;
  public id: string;
  public weightfulUpdates: Set<number> = new Set();

  @observable
  public stateIndex: number = 0;

  constructor(
    date: IMoment,
    appointments: { [uniqueId: string]: Appointment } = {},
  ) {
    this.date = date;
    this.id = CalendarDay.calcId(date);

    this.setAppointments(appointments);
  }

  @action
  public setAppointments(apps: { [uniqueId: string]: Appointment }) {
    this.appointments = apps;

    Object.values(this.appointments).forEach(app =>
      app.registerListener('dayHandler', this.appointmentDidUpdated),
    );

    this.registerStateUpdate();
  }

  @action
  public removeAppointment(uniqueId: string) {
    delete this.appointments[uniqueId];

    this.registerStateUpdate();
  }

  @action
  public addAppointments(apps: Appointment[]) {
    apps.forEach(app => (this.appointments[app.uniqueId] = app));

    Object.values(this.appointments).forEach(app =>
      app.registerListener('dayHandler', this.appointmentDidUpdated),
    );

    this.registerStateUpdate();
  }

  public appointmentDidUpdated = (
    app: Appointment,
    weightful: boolean,
    final: boolean,
  ) => {
    if (final) this.registerStateUpdate(weightful);
  };

  @action
  public registerStateUpdate(weightful: boolean = true) {
    this.stateIndex++;

    if (weightful) this.weightfulUpdates.add(this.stateIndex);
  }
}
