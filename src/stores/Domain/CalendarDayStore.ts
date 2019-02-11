import fetchDay from 'fetchers/DayFetcher';
import IAppointment from 'interfaces/IAppointment';
import ICalendarDay from 'interfaces/ICalendarDay';
import { action, observable } from 'mobx';
import { Duration as IDuration, Moment as IMoment } from 'moment';
import Appointment from 'structures/Appointment';
import CalendarDay from 'structures/CalendarDay';

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
    targetDuration,
    appointment,
  }: {
    date: IMoment;
    position?: number;
    personId?: string;
    targetDate?: IMoment;
    appointment?: Appointment;
    targetPosition: number;
    targetDuration?: IDuration;
  }) {
    date = date || (appointment as Appointment).date;
    personId = personId || (appointment as Appointment).personId;
    targetDate = targetDate || date;
    if (appointment) position = (appointment as Appointment).position;

    const { dayTimeRangeActual } = this.rootStore.uiStore;

    // BUG
    // when dropping close to day's border cell is jumping in haotic direction

    // check if date is in borders
    const { start, end } = dayTimeRangeActual;
    const startDiff = start
      .clone()
      .hour(targetDate.hour())
      .minute(targetDate.minute())
      .diff(dayTimeRangeActual.start, 'minute');
    const endDiff = start
      .clone()
      .hour(targetDate.hour())
      .minute(targetDate.minute())
      .diff(dayTimeRangeActual.end, 'minute');

    if (startDiff < 0) {
      const actualEnd = end.clone().subtract(startDiff, 'minute');
      targetDate
        .subtract(1, 'day')
        .hour(actualEnd.hour())
        .minute(actualEnd.minute());
    } else if (endDiff > 0)
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
          .diff((targetDate as IMoment).clone().startOf('day'), 'day') === 0,
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
    appointment.update(
      Object.assign(
        Object.assign(
          position
            ? {
                position: targetPosition,
              }
            : {},
          targetDuration ? { duration: targetDuration } : {},
        ),
        targetDate ? { date: targetDate } : {},
      ),
    );

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
          duration: app.duration,
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
