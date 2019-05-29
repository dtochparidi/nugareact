import * as Moment from 'moment';
// import { Duration as IDuration, Moment as IMoment } from 'moment';
import { Moment as IMoment } from 'moment';
import { DateRange, extendMoment } from 'moment-range';
import { v4 } from 'uuid';
import * as store from 'store';

const moment = extendMoment(Moment);

import { LazyTask } from '@levabala/lazytask/build/dist';
import lazyTaskManager from '@levabala/lazytask/build/dist/LazyTaskManager';

import IAppointment from 'interfaces/IAppointment';
import ICalendarDay from '../interfaces/ICalendarDay';
import IFetcher from '../interfaces/IFetcher';
import Appointment from '../structures/Appointment';
import CalendarDay from 'structures/CalendarDay';
import Person from 'structures/Person';

function random(to: number, from: number = 0) {
  return Math.floor(Math.random() * (to - from)) + from;
}

const littleStepMinutes = 9;
const largeStepMinutes = 45;
const daysCache = {};

export const serverDaysData: { [dayId: string]: ICalendarDay } = {};

// const daysDeepCache = JSON.parse(store.get('cachedDays', '{}'));

function cacheDays(from: string, to: string) {
  const fromDate = Moment(from, 'DD:MM:YYYY');
  const toDate = Moment(to, 'DD:MM:YYYY');

  const range = moment.range(fromDate, toDate);
  const days = Array.from(range.by('day'));

  const json = JSON.stringify(
    days.reduce((acc, val) => {
      acc[val.valueOf()] = generateAppointments(val, 8, 17, 24, true);
      return acc;
    }, {}),
  );

  console.log(json);

  store.set('cachedDays', json);
}

(window as any).cacheDays = cacheDays;

export async function generateAppointments(
  date: IMoment,
  fromHour: number,
  toHour: number,
  positions: number,
  toJSON: boolean = false,
  count: number = random(255, 250),
) {
  const ranges: Array<[number, DateRange]> = [];
  const maxStepsCount = Math.floor(
    (Math.floor(((toHour - fromHour) * 60) / largeStepMinutes) *
      largeStepMinutes) /
      littleStepMinutes,
  );

  const generateApp = () => {
    const app: IAppointment = {
      date: date
        .clone()
        // .hour(random(17, 8))
        .hour(fromHour)
        // .add(littleStepMinutes * random(maxStepsCount, 0), 'minute'),
        .add(
          Math.floor(
            (littleStepMinutes * random(maxStepsCount, 0)) / largeStepMinutes,
          ) * largeStepMinutes,
          'minute',
        ),
      duration: Moment.duration(largeStepMinutes, 'minutes'),
      personId: Person.generateRandomId(),
      position: random(0, positions),
      uniqueId: v4(),
      // position: random(0, 4),
    };

    const range = moment.range(app.date, app.date.clone().add(app.duration));

    if (ranges.some(([p, r]) => app.position === p && range.overlaps(r)))
      return null;

    ranges.push([app.position, range]);

    return new Appointment(app);
  };

  const generatedApps: Appointment[] = await Promise.all(
    new Array(count)
      .fill(null)
      .map(
        async () => await lazyTaskManager.addTask(new LazyTask(generateApp)),
      ),
  );

  const finalTask = new LazyTask(() =>
    generatedApps
      .filter(app => app !== null)
      .reduce((acc, app: Appointment) => {
        acc[app.uniqueId] = toJSON ? app.toJSON() : app;
        return acc;
      }, {}),
  );

  const data: {
    [uniqueId: string]: Appointment;
  } = await lazyTaskManager.addTask(finalTask);

  return data;
}

export async function generateRandomDay(date: IMoment): Promise<ICalendarDay> {
  const key = date.format('DD:MM:YYYY');
  if (key in daysCache) return daysCache[key];

  const data = {
    appointments: await generateAppointments(date, 8, 17, 24),
    date,
  };

  daysCache[key] = data;

  return data;
}

async function getDayFromServer(date: IMoment) {
  const id = CalendarDay.calcId(date);
  const day =
    serverDaysData[id] || (serverDaysData[id] = await generateRandomDay(date));

  return day;
}

const fetchDay: IFetcher<IMoment, ICalendarDay> = async function DayFetcher(
  date,
) {
  // await new Promise(resolve => setTimeout(resolve, 300));

  return getDayFromServer(date);
};

export default fetchDay;
