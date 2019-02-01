import * as moment from 'moment';

import ICalendarDay from '../interfaces/ICalendarDay';
import IFetcher from '../interfaces/IFetcher';
import Appointment from '../structures/Appointment';

function random(to: number, from: number = 0) {
  return Math.floor(Math.random() * (to - from)) + from;
}

export function generateRandomDay(date: moment.Moment): ICalendarDay {
  return {
    appointments: new Array(25).fill(null).map(
      (): Appointment => {
        const app = {
          date: date
            .clone()
            // .hour(random(17, 8))
            .hour(random(13, 8))
            .minute(Math.floor(random(59, 1) / 10) * 10),
          personId: `#${random(10)
            .toString()
            .padStart(3, '0')}`,
          position: random(0, 10),
          // position: random(0, 4),
        };
        return new Appointment(app);
      },
    ),
    date,
  };
}

const fetchDay: IFetcher<
  moment.Moment,
  ICalendarDay
> = async function DayFetcher(date) {
  await new Promise(resolve => setTimeout(resolve, 300));

  return generateRandomDay(date);
};

export default fetchDay;
