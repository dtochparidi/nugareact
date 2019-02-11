import { observer } from 'mobx-react';
import * as moment from 'moment';
import { Duration as IDuration, Moment as IMoment } from 'moment';
import * as React from 'react';
import CalendarDay from 'structures/CalendarDay';
import Appointment from '../../../structures/Appointment';
import Grid from './Grid';

export interface IProps {
  rows: number;
  cols: number;
  dayData: CalendarDay;
  stamps: moment.Moment[];
  mainColumnStep: moment.Duration;
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
  shiftsHash: string;
  updateAppointment: ({
    date,
    position,
    personId,
    targetDate,
    targetPosition,
    appointment,
  }: {
    date: IMoment;
    position: number;
    personId: string;
    targetDate: IMoment;
    appointment?: Appointment;
    targetPosition: number;
    targetDuration?: IDuration;
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
      shifts,
      shiftsHash,
      mainColumnStep,
      updateAppointment,
    } = this.props;

    return (
      <div
        className="dayWrapper"
        style={
          { '--columns-count': cols, width: dayWidth } as React.CSSProperties
        }
        id={`${dayData.id}`}
      >
        <div className="day">
          {/* <PositionRow positionCount={cols} /> */}
          <Grid
            rows={rows}
            cols={cols}
            appointments={dayData.appointments}
            stamps={stamps}
            shifts={shifts}
            shiftsHash={shiftsHash}
            updateAppointment={updateAppointment}
            subGridColumns={subGridStep}
            mainColumnStep={mainColumnStep}
          />
        </div>
      </div>
    );
  }
}
