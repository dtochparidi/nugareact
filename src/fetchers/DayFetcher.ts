import * as moment from 'moment';

import ICalendarDay from '../interfaces/ICalendarDay';
import IFetcher from '../interfaces/IFetcher';

function random(to: number, from: number = 0) {
  return Math.floor(Math.random() * (to - from)) + from;
}

export function generateRandomDay(date: moment.Moment): ICalendarDay {
  return {
    date,
    personIds: new Array(random(10)).fill(null).map(
      () =>
        `#${random(10)
          .toString()
          .padStart(3, "0")}`
    )
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
