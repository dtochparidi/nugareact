import { observer } from 'mobx-react';
import * as moment from 'moment';
import { Moment as IMoment } from 'moment';
import * as React from 'react';
import Appointment from '../../../../structures/Appointment';
import AppointmentCell from '../AppointmentCell';

export interface IProps {
  cols: number;
  rows: number;
  appointments: Appointment[];
  stamps: moment.Moment[];
  mainColumnStep: moment.Duration;
  shifts: {
    [x: number]: {
      [x: number]: {
        dx: number;
        dy: number;
      };
    };
  };
  subGridColumns: number;
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
export default class Grid extends React.Component<IProps> {
  public render() {
    const {
      rows,
      cols,
      appointments,
      stamps,
      mainColumnStep,
      shifts,
      subGridColumns: subGridStep,
    } = this.props;

    const minutesStep = mainColumnStep.asMinutes();
    const personCells = appointments
      .map(app => ({
        appointment: app,
        x: Math.floor(
          (app.date.hour() * 60 +
            app.date.minute() -
            (stamps[0].hour() * 60 + stamps[0].minute())) /
            minutesStep,
        ),
        y: app.position,
      }))
      .reduce(
        (
          acc: Array<{ x: number; y: number; appointment: Appointment }>,
          app,
        ) => {
          const { x, y } = app;

          acc[y * cols + x] = app;

          return acc;
        },
        [],
      );

    const gridColumnDuration = moment.duration(
      stamps[1].diff(stamps[0]).valueOf(),
      'millisecond',
    );

    const gridCells: React.ReactNode[] = [];
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const app = personCells[y * cols + x];
        const stamp = stamps[x];
        let coeffX = 0;
        let coeffY = 0;

        if (app) {
          const shiftExists = x in shifts && y in shifts[x];
          const shift = !shiftExists ? { dx: 0, dy: 0 } : shifts[x][y];
          const { dx, dy } = shift;

          const d = app.appointment.date;
          const s = d
            .clone()
            .hour(stamp.hour())
            .minute(stamp.minute());

          coeffX =
            (d.diff(s, 'second') / this.props.mainColumnStep.asSeconds() + dx) *
            100;

          coeffY = dy * 100;
        }

        gridCells.push(
          <div
            key={`${x}:${y}`}
            className={`gridCell item ${
              x === 0 ? 'first' : x === cols - 1 ? 'last' : ''
            }`}
            data-x={x}
            data-y={y}
            data-hour={stamp.hour()}
            data-minute={stamp.minute()}
          >
            <div className="subGrid">
              {new Array(subGridStep).fill(null).map((v, i) => (
                <div className="subGridElem" key={i} />
              ))}
            </div>
            {app ? (
              coeffX !== 0 || coeffY !== 0 ? (
                <AppointmentCell
                  appointment={app.appointment}
                  translateX={coeffX}
                  translateY={coeffY}
                  updateAppointment={this.props.updateAppointment}
                  subGridColumns={subGridStep}
                  gridColumnDuration={gridColumnDuration}
                />
              ) : (
                <AppointmentCell
                  appointment={app.appointment}
                  updateAppointment={this.props.updateAppointment}
                  subGridColumns={subGridStep}
                  gridColumnDuration={gridColumnDuration}
                />
              )
            ) : null}
          </div>,
        );
      }
    return <div className="grid">{gridCells}</div>;
  }
}
