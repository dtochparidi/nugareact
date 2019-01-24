import { observer } from 'mobx-react';
import * as moment from 'moment';
import * as React from 'react';
import IAppointment from 'src/interfaces/IAppointment';

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

    const personCells = appointments.map(app => ({
      x: app.position,
      y: Math.floor(
        (stamps[0]
          .clone()
          .hour(app.date.hour())
          .minute(app.date.minute())
          .valueOf() -
          stamps[0].valueOf()) /
          step,
      ),
    }));
    personCells.forEach(p => console.log(p.x, p.y));

    const elements = [];
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++)
        elements.push(
          <div key={`${x}:${y}`} className="item" data-x={x} data-y={y} />,
        );

    return <div className="grid">{elements}</div>;
  }
}
