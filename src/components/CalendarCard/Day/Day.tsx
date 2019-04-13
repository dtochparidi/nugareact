import IUpdateAppProps from 'interfaces/IUpdateAppProps';
import { observer } from 'mobx-react';
import * as moment from 'moment';
import * as React from 'react';
import Appointment from 'structures/Appointment';
import CalendarDay from 'structures/CalendarDay';

import AppointmentCell from './AppointmentCell';

import './AppointmentCell/AppointmentCell.scss';

// import Grid from './Grid';
// import { GridP } from '.';

export interface IProps {
  rows: number;
  cols: number;
  dayData: CalendarDay;
  stamps: moment.Moment[];
  mainColumnStep: moment.Duration;
  dayWidth: string;
  cellHeight: number;
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
      cols,
      // rows,
      dayData,
      dayWidth,
      updateAppointment,
      stamps,
      subGridColumns,
      mainColumnStep,
      // cellHeight,
      // instantRender,
    } = this.props;

    const gridColumnDuration = moment.duration(
      stamps[1].diff(stamps[0]).valueOf(),
      'millisecond',
    );
    const minutesStep = mainColumnStep.asMinutes();

    return (
      <div
        className="dayWrapper"
        style={
          { '--columns-count': cols, width: dayWidth } as React.CSSProperties
        }
        id={`${dayData.id}`}
      >
        <div className="day">
          {Object.values(dayData.appointments).map(app => {
            const x = Math.floor(
              (app.date.hour() * 60 +
                app.date.minute() -
                (stamps[0].hour() * 60 + stamps[0].minute())) /
                minutesStep,
            );
            const y = app.position;

            return (
              <AppointmentCell
                isDisplaying={true}
                moving={false}
                key={app.uniqueId}
                translateX={x * 100}
                translateY={y * 100}
                appointment={app as Appointment}
                updateAppointment={updateAppointment}
                subGridColumns={subGridColumns}
                gridColumnDuration={gridColumnDuration}
              />
            );
          })}
        </div>
      </div>
    );
  }
}
