import * as enzyme from 'enzyme';
import { Moment as IMoment } from 'moment';
import * as Moment from 'moment';
import { DateRange, extendMoment } from 'moment-range';
import * as React from 'react';

import CalendarCard from './CalendarCard';

const moment = extendMoment(Moment);

let dates: IMoment[] = [moment()];

function requestDay(newDates: IMoment[]) {
  dates = dates.concat(newDates);
}

function removeDays() {
  //
}

const dayTimeRange: DateRange = moment.range(
  moment()
    .startOf('day')
    .hour(9),
  moment()
    .startOf('day')
    .hour(21),
);

const ua = () => null;

it('renders without crashing', () => {
  const component = enzyme.render(
    <CalendarCard
      fastMode={false}
      subGridColumns={4}
      days={[]}
      requestCallback={requestDay}
      positionCount={6}
      removeDays={removeDays}
      dayTimeRange={dayTimeRange}
      dayTimeRangeActual={dayTimeRange}
      updateAppointment={ua}
      mainColumnStep={Moment.duration(45, 'minutes')}
    />,
  );
  expect(component);
});
