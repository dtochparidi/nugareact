import * as moment from 'moment';
import IAppointment from 'src/interfaces/IAppointment';

import ICalendarDay from '../interfaces/ICalendarDay';
import IFetcher from '../interfaces/IFetcher';

function random(to: number, from: number = 0) {
  return Math.floor(Math.random() * (to - from)) + from;
}

export function generateRandomDay(date: moment.Moment): ICalendarDay {
  return {
    appointments: new Array(10).fill(null).map(
      (): IAppointment => ({
        date: date
          .clone()
          .hour(random(17, 8))
          .minute(random(59, 1)),
        personId: `#${random(10)
          .toString()
          .padStart(3, '0')}`,
        position: random(0, 10),
      }),
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
