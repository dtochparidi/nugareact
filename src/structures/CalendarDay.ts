import ICalendarDay from 'interfaces/ICalendarDay';
import { action, observable } from 'mobx';
import { Moment as IMoment } from 'moment';

import Appointment from './Appointment';

export default class CalendarDay implements ICalendarDay {
  private static calcId(date: IMoment) {
    const id = `day_${date.format('DD-MM-YYYY')}`;
    return id;
  }

  @observable
  public appointments: { [uniqueId: string]: Appointment };

  public date: IMoment;
  public id: string;

  constructor(
    date: IMoment,
    appointments: { [uniqueId: string]: Appointment } = {},
  ) {
    this.date = date;
    this.appointments = appointments;
    this.id = CalendarDay.calcId(date);
  }

  @action
  public setAppointments(apps: { [uniqueId: string]: Appointment }) {
    this.appointments = apps;
  }
}
