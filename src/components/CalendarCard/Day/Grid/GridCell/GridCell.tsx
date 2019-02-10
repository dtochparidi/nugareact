import { observer } from 'mobx-react';
import { Duration as IDuration, Moment as IMoment } from 'moment';
import * as React from 'react';
import Appointment from 'structures/Appointment';
import AppointmentCell from '../../AppointmentCell';

export interface IProps {
  stamp: IMoment;
  subGridStep: number;
  gridColumnDuration: IDuration;
  x: number;
  y: number;
  cols: number;
  app: Appointment | object;
  shift: { dx: number; dy: number };
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
export default class GridCell extends React.Component<IProps> {
  public render() {
    const {
      x,
      y,
      cols,
      stamp,
      subGridStep,
      app,
      gridColumnDuration,
      updateAppointment,
      shift,
    } = this.props;

    const appExists = Object.keys(app).length > 0;
    let appointmentNode = null;
    if (appExists) {
      const appointment = app as Appointment;

      const { dx, dy } = shift;
      const d = appointment.date;
      const s = d
        .clone()
        .hour(stamp.hour())
        .minute(stamp.minute());

      const coeffX =
        (d.diff(s, 'second') / gridColumnDuration.asSeconds() + dx) * 100;

      const coeffY = dy * 100;

      appointmentNode = (
        <AppointmentCell
          translateX={coeffX}
          translateY={coeffY}
          appointment={app as Appointment}
          updateAppointment={updateAppointment}
          subGridColumns={subGridStep}
          gridColumnDuration={gridColumnDuration}
        />
      );
    }

    return (
      <div
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
        {appointmentNode}
      </div>
    );
  }
}
