import { Moment } from 'moment';
import * as React from 'react';

import ICalendarDay from '../../interfaces/ICalendarDay';
import Card from '../Card';
import Day from './Day';
import TimeColumn from './TimeColumn';

import './CalendarCard.scss';

export interface IProps {
  days: ICalendarDay[];
  requestCallback: (date: Moment) => void;
}

export default class CalendarCard extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    return (
      <Card cardClass="calendarCard">
        <TimeColumn />
        <Day />
      </Card>
    );
  }
}
