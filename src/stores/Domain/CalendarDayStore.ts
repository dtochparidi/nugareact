import { action, observable } from 'mobx';
import { Moment as IMoment } from 'moment';
import fetchDay from 'src/fetchers/DayFetcher';
import IAppointment from 'src/interfaces/IAppointment';
import ICalendarDay from 'src/interfaces/ICalendarDay';
import Appointment from 'src/structures/Appointment';
import CalendarDay from 'src/structures/CalendarDay';

import { RootStore } from '../RootStore';

export default class CalendarDayStore {
  @observable
  public daysMap: { [id: string]: CalendarDay } = {};

  @observable
  public days: CalendarDay[] = [];

  private rootStore: RootStore;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
  }

  @action.bound
  public loadDay(date: IMoment): CalendarDay {
    const day = new CalendarDay(date.startOf('day'));

    this.loadDayData(day);

    if (day.id in this.daysMap) return day;

    this.daysMap[day.id] = day;
    if (
      this.days.length === 0 ||
      day.date.diff(this.days[this.days.length - 1].date, 'hour') > 0
    )
      this.days.push(day);
    else this.days.unshift(day);

    return day;
  }

  @action.bound
  public updateAppointment({
    date,
    position,
    personId,
    targetDate,
    targetPosition,
    appointment,
  }:
    | {
        date: IMoment;
        position: number;
        personId: string;
        targetDate: IMoment;
        appointment?: undefined;
        targetPosition: number;
      }
    | {
        date?: undefined;
        position?: undefined;
        personId?: undefined;
        appointment: Appointment;
        targetDate: IMoment;
        targetPosition: number;
      }) {
    date = date || (appointment as Appointment).date;
    personId = personId || (appointment as Appointment).personId;
    if (appointment) position = (appointment as Appointment).position;

    const { dayTimeRange } = this.rootStore.uiStore;

    // check if date is in borders
    const { start, end } = dayTimeRange;
    const startDiff = start
      .clone()
      .hour(targetDate.hour())
      .minute(targetDate.minute())
      .diff(dayTimeRange.start, 'hour');
    const endDiff = start
      .clone()
      .hour(targetDate.hour())
      .minute(targetDate.minute())
      .diff(dayTimeRange.end, 'hour');

    if (startDiff < 0)
      targetDate
        .subtract(1, 'day')
        .hour(end.hour())
        .minute(end.minute());
    else if (endDiff > 0)
      targetDate
        .add(1, 'day')
        .hour(start.hour())
        .minute(start.minute());

    // update day
    const currentDay = this.days.find(
      day =>
        day.date
          .clone()
          .startOf('day')
          .diff((date as IMoment).clone().startOf('day'), 'day') === 0,
    ) as ICalendarDay;
    const newDay = this.days.find(
      day =>
        day.date
          .clone()
          .startOf('day')
          .diff(targetDate.clone().startOf('day'), 'day') === 0,
    );

    appointment =
      appointment ||
      currentDay.appointments.find(
        app =>
          app.date
            .clone()
            .startOf('day')
            .diff((date as IMoment).clone().startOf('day'), 'day') === 0 &&
          position === app.position &&
          personId === app.personId,
      );

    if (!appointment) throw Error('no such appointment');

    // check if we need to load day
    if (!newDay) {
      this.loadDay(targetDate.clone().startOf('day'));
      return;
    }

    // change the appointment
    appointment.update({
      date: targetDate,
      position: targetPosition,
    });

    // if day wasn't changed
    if (currentDay.date.diff(newDay.date, 'day') === 0) return;
    console.log('change day');

    // remove from current day
    currentDay.appointments.splice(
      currentDay.appointments.indexOf(appointment),
      1,
    );

    // append to new day
    newDay.appointments.push(appointment);
  }

  private async loadDayData(day: CalendarDay) {
    const data = await fetchDay(day.date);
    const { personStore } = this.rootStore.domainStore;

    const promises = data.appointments.map(
      async (app: IAppointment): Promise<Appointment> => {
        if (!app) throw Error('app is undefined');

        const person =
          app.personId in personStore.persons
            ? personStore.persons[app.personId]
            : personStore.loadPerson(app.personId);
        return new Appointment({
          date: app.date,
          personId: app.personId,
          personInstance: person,
          position: app.position,
        });
      },
    );

    const appointments = await Promise.all(promises);

    day.setAppointments(appointments);
  }
}
