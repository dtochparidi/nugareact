import { Moment as IMoment } from 'moment';
import CalendarDay from 'structures/CalendarDay';
import { fetchDayFromServer } from './DayFetcher';
import lazyTaskManager from '@levabala/lazytask/build/dist/LazyTaskManager';
import { LazyTask } from '@levabala/lazytask/build/dist';

export default async function fetchVisitsCount(
  date: IMoment,
): Promise<{ [id: string]: number }> {
  const data = await lazyTaskManager.addTask(
    new LazyTask(async () =>
      (await Promise.all(
        new Array(date.daysInMonth()).fill(null).map(async (val, i) => {
          const d = date.clone().date(i + 1);
          const id = CalendarDay.calcId(d);
          const count = Object.keys(
            (await fetchDayFromServer(d, id)).appointments,
          ).length;

          return [id, count];
        }),
      )).reduce((acc, [id, count]) => {
        acc[id] = count;
        return acc;
      }, {}),
    ),
  );

  return data;
}
