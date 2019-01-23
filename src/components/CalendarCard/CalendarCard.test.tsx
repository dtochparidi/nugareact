import * as enzyme from 'enzyme';
import * as moment from 'moment';
import * as React from 'react';

import { generateRandomDay } from '../../fetchers/DayFetcher';
import CalendarCard from './CalendarCard';

const dates = [moment()];
const daysPending = dates;

function requestDay(date: moment.Moment) {
  dates.push(date);
}

it("renders without crashing", () => {
  const component = enzyme.render(
    <CalendarCard
      days={dates.map(generateRandomDay)}
      daysPending={daysPending}
      requestCallback={requestDay}
      positionCount={6}
    />
  );
  expect(component);
});
