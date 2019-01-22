import { Moment } from 'moment';
import * as React from 'react';
import ICalendarDay from 'src/interfaces/ICalendarDay';

import { Grid } from '.';
import Card from '../Card';

export interface IProps {
  days: ICalendarDay[];
  requestCallback: (date: Moment) => void;
}

// export interface IState {
// }

export default class CalendarCard extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    return (
      <Card cardClass="calendarCard">
        <Grid rows={4} cols={5} />
      </Card>
    );
  }
}
