import CalendarDay from 'structures/CalendarDay';

import { serverDaysData } from './DayFetcher';

export default function updateDay(day: CalendarDay) {
  console.log('extracting data');
  serverDaysData[day.id] = day.extractData();
  console.log('send data to server', day.id);
}
