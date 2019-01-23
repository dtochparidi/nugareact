import * as enzyme from 'enzyme';
import { Moment as IMoment } from 'moment';
import * as Moment from 'moment';
import { DateRange, extendMoment } from 'moment-range';
import * as React from 'react';

import { generateRandomDay } from '../../fetchers/DayFetcher';
import CalendarCard from './CalendarCard';

const moment = extendMoment(Moment);

const dates: IMoment[] = [moment()];
const daysPending = dates;

function requestDay(date: IMoment) {
  dates.push(date);
}

const dayTimeRange: DateRange = moment.range(
  moment()
    .startOf("day")
    .hour(9),
  moment()
    .startOf("day")
    .hour(21)
);

it("renders without crashing", () => {
  const component = enzyme.render(
    <CalendarCard
      days={dates.map(generateRandomDay)}
      daysPending={daysPending}
      requestCallback={requestDay}
      positionCount={6}
      dayTimeRange={dayTimeRange}
    />
  );
  expect(component);
});
