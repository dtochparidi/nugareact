import './CalendarCard.scss';

import * as Moment from 'moment';
import { extendMoment } from 'moment-range';
import * as React from 'react';

import ICalendarDay from '../../interfaces/ICalendarDay';
import Card from '../Card';
import Day from './Day';
import TimeColumn from './TimeColumn';

const moment = extendMoment(Moment);

export interface IProps {
  days: ICalendarDay[];
  requestCallback: (date: Moment.Moment) => void;
}

export default class CalendarCard extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    const stamps = Array.from(
      moment
        .range(
          moment()
            .startOf("day")
            .hour(9),
          moment()
            .startOf("day")
            .hour(21)
        )
        .by("minutes", { step: 60 })
    );

    return (
      <Card
        cardClass="calendarCard"
        style={{ "--rows-count": stamps.length } as React.CSSProperties}
      >
        <TimeColumn stamps={stamps} />
        <div className="daysContainer">
          <Day />
          <Day />
          <Day />
        </div>
      </Card>
    );
  }
}
