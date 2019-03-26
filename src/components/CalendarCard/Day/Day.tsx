import IUpdateAppProps from 'interfaces/IUpdateAppProps';
import { observer } from 'mobx-react';
import * as moment from 'moment';
import * as React from 'react';
import CalendarDay from 'structures/CalendarDay';

import Grid from './Grid';

export interface IProps {
  rows: number;
  cols: number;
  dayData: CalendarDay;
  stamps: moment.Moment[];
  mainColumnStep: moment.Duration;
  dayWidth: string;
  subGridColumns: number;
  movingId: string;
  shifts: {
    [x: number]: {
      [x: number]: {
        dx: number;
        dy: number;
      };
    };
  };
  isDisplaying: boolean;
  shiftsHash: string;
  updateAppointment: (props: IUpdateAppProps) => void;
  instantRender: boolean;
  startLoadSide: 'left' | 'right';
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
      movingId,
      updateAppointment,
      instantRender,
      isDisplaying,
      startLoadSide,
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
          <Grid
            isDisplaying={isDisplaying}
            rows={rows}
            cols={cols}
            movingId={movingId}
            appointments={dayData.appointments}
            stamps={stamps}
            shifts={shifts}
            shiftsHash={shiftsHash}
            updateAppointment={updateAppointment}
            subGridColumns={subGridStep}
            mainColumnStep={mainColumnStep}
            instantRender={instantRender}
            startLoadSide={startLoadSide}
          />
        </div>
      </div>
    );
  }
}
