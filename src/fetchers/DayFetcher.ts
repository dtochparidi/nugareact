import * as Moment from 'moment';
import { Moment as IMoment } from 'moment';
import { DateRange, extendMoment } from 'moment-range';

const moment = extendMoment(Moment);

import IAppointment from 'interfaces/IAppointment';
import ICalendarDay from '../interfaces/ICalendarDay';
import IFetcher from '../interfaces/IFetcher';
import Appointment from '../structures/Appointment';

function random(to: number, from: number = 0) {
  return Math.floor(Math.random() * (to - from)) + from;
}

export function generateRandomDay(date: IMoment): ICalendarDay {
  const littleStepMinutes = 9;
  const largeStepMinutes = 45;
  const hours = 3;
  const stepsPerColumn = Math.floor(largeStepMinutes / littleStepMinutes);
  const maxStepsCount = Math.floor(
    (Math.floor((hours * 60) / largeStepMinutes) * largeStepMinutes) /
      littleStepMinutes,
  );

  const ranges: Array<[number, DateRange]> = [];

  return {
    appointments: new Array(random(55, 10))
      .fill(null)
      .map(
        (): Appointment | null => {
          const app: IAppointment = {
            date: date
              .clone()
              // .hour(random(17, 8))
              .hour(8)
              .add(littleStepMinutes * random(maxStepsCount, 0), 'minute'),
            duration: Moment.duration(
              littleStepMinutes *
                random(stepsPerColumn * 2, Math.floor(stepsPerColumn * 0.75)),
              'minute',
            ),
            personId: `${random(99)
              .toString()
              .padStart(3, '0')}`,
            position: random(0, 14),
            // position: random(0, 4),
          };

          const range = moment.range(
            app.date,
            app.date.clone().add(app.duration),
          );

          if (ranges.some(([p, r]) => app.position === p && range.overlaps(r)))
            return null;

          ranges.push([app.position, range]);

          return new Appointment(app);
        },
      )
      .filter(app => app !== null)
      .reduce((acc, app: Appointment) => {
        acc[app.uniqueId] = app;
        return acc;
      }, {}),
    date,
  };
}

const fetchDay: IFetcher<IMoment, ICalendarDay> = async function DayFetcher(
  date,
) {
  await new Promise(resolve => setTimeout(resolve, 300));

  return generateRandomDay(date);
};

export default fetchDay;
