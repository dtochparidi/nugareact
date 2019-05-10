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

  @observable
  public stateIndex: number = 0;

  constructor(
    date: IMoment,
    appointments: { [uniqueId: string]: Appointment } = {},
  ) {
    this.date = date;
    this.appointments = appointments;
    this.id = CalendarDay.calcId(date);

    Object.values(this.appointments).forEach(app =>
      app.registerListener('dayHandler', this.appointmentDidUpdated),
    );
  }

  @action
  public setAppointments(apps: { [uniqueId: string]: Appointment }) {
    this.appointments = apps;

    Object.values(this.appointments).forEach(app =>
      app.registerListener('dayHandler', this.appointmentDidUpdated),
    );

    this.stateIndex++;
  }

  public appointmentDidUpdated = (app: Appointment) => {
    this.stateIndex++;
  };
}
