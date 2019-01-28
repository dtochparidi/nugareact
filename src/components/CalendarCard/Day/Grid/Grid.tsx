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
}

@observer
export default class Grid extends React.Component<IProps> {
  public render() {
    const { rows, cols, appointments, stamps } = this.props;

    const timeRange = stamps[stamps.length - 1].valueOf() - stamps[0].valueOf();
    const step = timeRange / stamps.length;

    const personCells = appointments
      .map(app => ({
        appointment: app,
        x: Math.floor(
          (stamps[0]
            .clone()
            .hour(app.date.hour())
            .minute(app.date.minute())
            .valueOf() -
            stamps[0].valueOf()) /
            step,
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
        // if (app) console.log(app.x, app.y);

        gridCells.push(
          <div
            key={`${x}:${y}`}
            className={`item ${
              x === 0 ? 'first' : x === cols - 1 ? 'last' : ''
            }`}
            data-x={x}
            data-y={y}
          >
            {app ? <AppointmentCell appointment={app.appointment} /> : null}
          </div>,
        );
      }
    return <div className="grid">{gridCells}</div>;
  }
}
