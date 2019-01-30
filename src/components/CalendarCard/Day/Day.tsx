import { observer } from 'mobx-react';
import * as moment from 'moment';
import * as React from 'react';
import ICalendarDay from 'src/interfaces/ICalendarDay';

import Grid from './Grid';
import TopRow from './TopRow';

export interface IProps {
  rows: number;
  cols: number;
  dayData: ICalendarDay;
  stamps: moment.Moment[];
  dayWidth: string;
}

@observer
export default class Day extends React.Component<IProps> {
  public render() {
    const { rows, cols, dayData, dayWidth, stamps } = this.props;
    return (
      <div
        className="dayWrapper"
        style={
          { '--columns-count': cols, width: dayWidth } as React.CSSProperties
        }
        id={`day_${dayData.date.format('DD-MM-YYYY')}`}
      >
        <div className="day">
          {/* <PositionRow positionCount={cols} /> */}
          <TopRow stamps={stamps} />
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
