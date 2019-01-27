import { observer } from 'mobx-react';
import * as moment from 'moment';
import * as React from 'react';
import ICalendarDay from 'src/interfaces/ICalendarDay';

import Grid from './Grid';
import PositionRow from './PositionRow';

export interface IProps {
  rows: number;
  cols: number;
  dayData: ICalendarDay;
  stamps: moment.Moment[];
}

@observer
export default class Day extends React.Component<IProps> {
  public render() {
    const { rows, cols, dayData } = this.props;
    return (
      <div
        className="dayWrapper"
        style={{ '--columns-count': cols } as React.CSSProperties}
      >
        <div className="day">
          <PositionRow positionCount={cols} />
          <Grid
            rows={rows}
            cols={cols}
            appointments={dayData.appointments}
            stamps={this.props.stamps}
          />
        </div>
      </div>
    );
  }
}
