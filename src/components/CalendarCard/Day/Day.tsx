import ICalendarDay from 'interfaces/ICalendarDay';
import { observer } from 'mobx-react';
import * as moment from 'moment';
import { Moment as IMoment } from 'moment';
import * as React from 'react';
import Appointment from '../../../structures/Appointment';
import Grid from './Grid';
import TopRow from './TopRow';

export interface IProps {
  rows: number;
  cols: number;
  dayData: ICalendarDay;
  stamps: moment.Moment[];
  dayWidth: string;
  subGridColumns: number;
  shifts: {
    [x: number]: {
      [x: number]: {
        dx: number;
        dy: number;
      };
    };
  };
  updateAppointment: ({
    date,
    position,
    personId,
    targetDate,
    targetPosition,
    appointment,
  }:
    | {
        date: IMoment;
        position: number;
        personId: string;
        targetDate: IMoment;
        appointment: undefined;
        targetPosition: number;
      }
    | {
        date: undefined;
        position: undefined;
        personId: undefined;
        appointment: Appointment;
        targetDate: IMoment;
        targetPosition: number;
      }) => void;
}

@observer
export default class Day extends React.Component<IProps> {
  public render() {
    const {
      subGridColumns: subGridStep,
      rows,
      cols,
      dayData,
      dayWidth,
      stamps,
    } = this.props;
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
            shifts={this.props.shifts}
            updateAppointment={this.props.updateAppointment}
            subGridColumns={subGridStep}
          />
        </div>
      </div>
    );
  }
}
