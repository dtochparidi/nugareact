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
  public updateMarks: string[][] = [[]];

  @observable
  public stateIndex: number = 0;

  private unfinalUpdatesStack: string[] = [];

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

    this.registerStateUpdate(Object.keys(apps));
  }

  @action
  public removeAppointments(ids: string[]) {
    ids.forEach(uniqueId => {
      delete this.appointments[uniqueId];
    });
    this.registerStateUpdate(ids);
  }

  @action
  public mergeAppointments(apps: Appointment[]) {
    const newApps = apps.filter(app => !(app.uniqueId in this.appointments));
    const updatedApps = apps.filter(app => app.uniqueId in this.appointments);

    const newIds = apps.map(app => app.uniqueId);
    const removedAppIds = Object.keys(this.appointments).filter(
      appId => !newIds.includes(appId),
    );

    this.addAppointments(newApps);
    updatedApps.forEach((app, i, { length }) => {
      if (this.appointments[app.uniqueId].stateHash !== app.stateHash)
        this.appointments[app.uniqueId].update(
          app,
          undefined,
          i === length - 1,
        );
    });

    if (removedAppIds.length) this.removeAppointments(removedAppIds);
  }

  @action
  public addAppointments(apps: Appointment[]) {
    apps.forEach(app => (this.appointments[app.uniqueId] = app));

    Object.values(this.appointments).forEach(app =>
      app.registerListener('dayHandler', this.appointmentDidUpdated),
    );

    this.registerStateUpdate(apps.map(app => app.uniqueId));
  }

  public appointmentDidUpdated = (
    app: Appointment,
    weightful: boolean,
    final: boolean,
  ) => {
    if (final) {
      this.registerStateUpdate(
        [app.uniqueId].concat(this.unfinalUpdatesStack),
        weightful,
      );
      this.unfinalUpdatesStack = [];
    } else this.unfinalUpdatesStack.push(app.uniqueId);
  };

  @action
  public registerStateUpdate(
    updatedAppIds: string[],
    weightful: boolean = true,
  ) {
    this.stateIndex++;

    this.updateMarks.push(updatedAppIds);

    if (weightful) this.weightfulUpdates.add(this.stateIndex);
  }
}
