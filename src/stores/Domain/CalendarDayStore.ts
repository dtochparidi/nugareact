import fetchDay from 'fetchers/DayFetcher';
import IAppointment from 'interfaces/IAppointment';
import IUpdateAppFunction from 'interfaces/IUpdateAppFunction';
import IUpdateAppProps from 'interfaces/IUpdateAppProps';
import { action, observable } from 'mobx';
import * as moment from 'moment';
import { Moment as IMoment } from 'moment';
import Appointment from 'structures/Appointment';
import CalendarDay from 'structures/CalendarDay';

import { RootStore } from '../RootStore';
import { LazyTask } from '@levabala/lazytask/build/dist';
import lazyTaskManager from '@levabala/lazytask/build/dist/LazyTaskManager';
import fetchVisitsCount from 'fetchers/VisitsCountFetcher';

export default class CalendarDayStore {
  @observable
  public visitsPerDay: { [id: string]: number } = {};

  @observable
  public daysMap: { [id: string]: CalendarDay } = {};

  @observable
  public days: CalendarDay[] = [];

  private rootStore: RootStore;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
  }

  @action
  public async updateDays(lazy = false) {
    if (lazy)
      await Promise.all(
        this.days.map(async day => {
          await lazyTaskManager.addTask(
            new LazyTask(async () => {
              const apps = await this.loadDayApps(day);
              await lazyTaskManager.addTask(
                new LazyTask(async () => {
                  day.mergeAppointments(apps, true);
                }),
              );
            }),
          );
        }),
      );
    else
      await Promise.all(
        this.days.map(async day => {
          const apps = await this.loadDayApps(day);
          day.mergeAppointments(apps, true);
        }),
      );
  }

  @action.bound
  public async loadDays(dates: IMoment[]) {
    // let pushes = 0;
    const loadDataPromises: Array<Promise<CalendarDay>> = dates.map(date => {
      const day = new CalendarDay(date.startOf('day'));

      const promise = this.loadDayData(day);
      // console.log('a promise for', day.id);

      if (day.id in this.daysMap) return promise;

      this.daysMap[day.id] = day;

      if (this.days.length === 0) this.days.push(day);
      // pushes++;
      else {
        let i = -1;
        let insertIndex = null;
        while (++i < this.days.length && insertIndex === null)
          if (this.days[i].date.diff(day.date) > 0) insertIndex = i;

        if (insertIndex !== null) this.days.splice(insertIndex, 0, day);
        else this.days.push(day);

        // pushes++;
      }

      return promise;
    });

    // console.log('pushes:', pushes);

    // performance.mark('load days end');
    // performance.measure('load days', 'load days start', 'load days end');

    // console.log('promises to load:', loadDataPromises);
    return Promise.all(loadDataPromises);
    // });
  }

  @action
  public updateVisitsPerDay(visitsPerDay: { [id: string]: number }) {
    Object.assign(this.visitsPerDay, visitsPerDay);
  }

  public async loadVisitsPerDay() {
    const monthes: { [key: string]: IMoment } = this.days
      .map(day => [day.date.format('MM-YYYY'), day.date])
      .reduce((acc, [month, date]: [string, IMoment]) => {
        acc[month] = date;
        return acc;
      }, {});

    console.log(monthes);

    Object.values(monthes).forEach(async date => {
      const data = await fetchVisitsCount(date);
      console.log(data);
      this.updateVisitsPerDay(data);
    });
  }

  @action.bound
  public removeDays(indexStart: number, indexEnd: number) {
    const days = this.days.splice(indexStart, indexEnd - indexStart + 1);
    days.forEach(day => delete this.daysMap[day.id]);
  }

  @action.bound
  public updateAppointment: IUpdateAppFunction = (
    {
      targetDate,
      targetPosition,
      targetDuration,
      appointment,
      uniqueId,
      date,
    }: IUpdateAppProps,
    weightful = true,
    final = true,
    serverSide = false,
  ) => {
    date = date || (appointment as Appointment).date;
    targetDate = targetDate || date;

    const { dayTimeRangeActual } = this.rootStore.uiStore;

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
    ) as CalendarDay;
    const newDay = this.days.find(
      day =>
        day.date
          .clone()
          .startOf('day')
          .diff((targetDate as IMoment).clone().startOf('day'), 'day') === 0,
    );

    appointment = appointment || currentDay.appointments[uniqueId as string];

    if (!appointment) throw Error('no such appointment');

    // check if we need to load day
    if (!newDay) {
      this.loadDays([targetDate.clone().startOf('day')]);
      return;
    }

    // check duration not overlap the day's end
    const possibleDuration = moment.duration(
      targetDate
        .clone()
        .hour(dayTimeRangeActual.end.hour())
        .minute(dayTimeRangeActual.end.minute())
        .diff(targetDate, 'minute'),
      'minute',
    );
    if (
      (targetDuration || appointment.duration).asMinutes() >
      possibleDuration.asMinutes()
    )
      targetDuration = possibleDuration;

    // if day was changed
    if (currentDay.date.diff(newDay.date, 'day') !== 0) {
      // append to new day
      newDay.addAppointments([appointment], {
        serverSide: false,
        weightful: false,
      });

      // remove from current day
      currentDay.removeAppointments([appointment.uniqueId], {
        serverSide: false,
        weightful: false,
      });
    }

    // change the appointment
    appointment.update(
      Object.assign(
        Object.assign(
          targetPosition || targetPosition === 0
            ? {
                position: targetPosition,
              }
            : {},
          targetDuration ? { duration: targetDuration } : {},
        ),
        targetDate ? { date: targetDate } : {},
      ),
      weightful,
      final,
      serverSide,
    );
  };

  private async loadDayApps(day: CalendarDay) {
    const data = await fetchDay(day.date);
    const { personStore } = this.rootStore.domainStore;

    const promises = Object.values(data.appointments).map(
      async (app: IAppointment): Promise<Appointment> => {
        if (!app) throw Error('app is undefined');

        // check if the same app already exists
        if (
          day.id in this.daysMap &&
          app.uniqueId in this.daysMap[day.id].appointments &&
          app.stateHash ===
            this.daysMap[day.id].appointments[app.uniqueId].stateHash
        )
          return this.daysMap[day.id].appointments[app.uniqueId];

        const person =
          app.personId in personStore.persons
            ? personStore.persons[app.personId]
            : personStore.loadPerson(app.personId);
        return new Appointment({
          date: app.date,
          duration: app.duration,
          personId: app.personId,
          personInstance: person,
          points: app.points,
          position: app.position,
          stateHash: app.stateHash,
          uniqueId: app.uniqueId,
          visits: app.visits,
        });
      },
    );

    return await Promise.all(promises);
  }

  private async loadDayData(day: CalendarDay) {
    return this.loadDayApps(day).then(appointments => {
      day.setAppointments(
        appointments.reduce((acc, app) => {
          acc[app.uniqueId] = app;
          return acc;
        }, {}),
        true,
      );

      // console.log('loaded', day.id);

      return day;
    });
  }
}
