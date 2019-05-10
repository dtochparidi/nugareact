import * as Moment from 'moment';
// import { Duration as IDuration, Moment as IMoment } from 'moment';
import { Moment as IMoment } from 'moment';
import { DateRange, extendMoment } from 'moment-range';
import * as store from 'store';

const moment = extendMoment(Moment);

import { LazyTask } from '@levabala/lazytask/build/dist';
import lazyTaskManager from '@levabala/lazytask/build/dist/LazyTaskManager';

import IAppointment from 'interfaces/IAppointment';
import ICalendarDay from '../interfaces/ICalendarDay';
import IFetcher from '../interfaces/IFetcher';
import Appointment from '../structures/Appointment';

function random(to: number, from: number = 0) {
  return Math.floor(Math.random() * (to - from)) + from;
}

const littleStepMinutes = 9;
const largeStepMinutes = 45;
const daysCache = {};

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

// function restoreDay(date: IMoment): ICalendarDay | undefined {
//   const floorDate = date.startOf('day');
//   const cachedDay: { [key: string]: {} } = daysDeepCache[floorDate.valueOf()];

//   if (cachedDay)
//     return {
//       appointments: Object.entries(cachedDay).reduce(
//         (
//           acc,
//           [key, val]: [
//             string,
//             {
//               date: IMoment;
//               position: number;
//               personId: string;
//               duration: IDuration;
//             }
//           ],
//         ) => {
//           acc[key] = new Appointment({
//             date: Moment(val.date),
//             duration: Moment.duration(val.duration),
//             personId: val.personId,
//             position: val.position,
//           });

//           return acc;
//         },
//         {},
//       ),
//       date,
//     } as ICalendarDay;

//   return;
// }

(window as any).cacheDays = cacheDays;

// function appsToJSON(apps: Appointment[]) {
//   return JSON.stringify(apps.map(app => app.toJSON()));
// }

// function appsFromJSON(json: string): Appointment[] {
//   return Object.values(JSON.parse(json)).map((text: string) => Appointment.fromJSON(text))
// }

async function generateAppointments(
  date: IMoment,
  fromHour: number,
  toHour: number,
  positions: number,
  toJSON: boolean = false,
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
      personId: `${random(99)
        .toString()
        .padStart(3, '0')}`,
      position: random(0, positions),
      // position: random(0, 4),
    };

    const range = moment.range(app.date, app.date.clone().add(app.duration));

    if (ranges.some(([p, r]) => app.position === p && range.overlaps(r)))
      return null;

    ranges.push([app.position, range]);

    return new Appointment(app);
  };

  const generatedApps = await Promise.all(
    new Array(random(255, 250))
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

  const data = await lazyTaskManager.addTask(finalTask);

  return data;
}

export async function generateRandomDay(date: IMoment): Promise<ICalendarDay> {
  const key = date.format('DD:MM:YYYY');
  if (key in daysCache) return daysCache[key];

  // const data = restoreDay(date) || {
  //   appointments: await generateAppointments(date, 8, 17, 24),
  //   date,
  // };

  const data = {
    appointments: await generateAppointments(date, 8, 17, 24),
    date,
  };

  daysCache[key] = data;

  return data;
}

const fetchDay: IFetcher<IMoment, ICalendarDay> = async function DayFetcher(
  date,
) {
  // await new Promise(resolve => setTimeout(resolve, 300));

  return generateRandomDay(date);
};

export default fetchDay;
