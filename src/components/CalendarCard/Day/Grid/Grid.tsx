import { observer } from 'mobx-react';
import * as moment from 'moment';
import * as React from 'react';
import IAppointment from 'src/interfaces/IAppointment';

import AppointmentCell from '../AppointmentCell';

export interface IProps {
  cols: number;
  rows: number;
  appointments: IAppointment[];
  stamps: moment.Moment[];
  shifts: {
    [x: number]: {
      [x: number]: {
        dx: number;
        dy: number;
      };
    };
  };
}

@observer
export default class Grid extends React.Component<IProps> {
  public render() {
    const { rows, cols, appointments, stamps, shifts } = this.props;

    const timeRange = stamps[stamps.length - 1].valueOf() - stamps[0].valueOf();
    const step = timeRange / stamps.length;

    const personCells = appointments
      .map(app => ({
        appointment: app,
        x: Math.min(
          Math.floor(
            (stamps[0]
              .clone()
              .hour(app.date.hour())
              .minute(app.date.minute())
              .valueOf() -
              stamps[0].valueOf()) /
              step,
          ),
          stamps.length - 1,
        ),
        y: app.position,
        // x: app.position,
        // y: Math.floor(
        //   (stamps[0]
        //     .clone()
        //     .hour(app.date.hour())
        //     .minute(app.date.minute())
        //     .valueOf() -
        //     stamps[0].valueOf()) /
        //     step,
        // ),
      }))
      .reduce(
        (
          acc: Array<{ x: number; y: number; appointment: IAppointment }>,
          app,
        ) => {
          acc[app.y * cols + app.x] = app;
          return acc;
        },
        [],
      );

    const gridCells: React.ReactNode[] = [];
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const app = personCells[y * cols + x];
        const shiftExists = x in shifts && y in shifts[x];
        const shift = !shiftExists ? { dx: 0, dy: 0 } : shifts[x][y];
        const { dx, dy } = shift;

        gridCells.push(
          <div
            key={`${x}:${y}`}
            className={`gridCell item ${
              x === 0 ? 'first' : x === cols - 1 ? 'last' : ''
            }`}
            data-x={x}
            data-y={y}
            data-hour={stamps[x].hour()}
            data-minute={stamps[x].minute()}
          >
            {app ? (
              shiftExists ? (
                <AppointmentCell
                  appointment={app.appointment}
                  translateX={dx}
                  translateY={dy}
                />
              ) : (
                <AppointmentCell appointment={app.appointment} />
              )
            ) : null}
          </div>,
        );
      }
    return <div className="grid">{gridCells}</div>;
  }
}
