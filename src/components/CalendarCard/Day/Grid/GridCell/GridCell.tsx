import IUpdateAppProps from 'interfaces/IUpdateAppProps';
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
  apps: { [uniqueId: string]: Appointment };
  shift: { dx: number; dy: number };
  movingIdObj: { id: string };
  updateAppointment: (props: IUpdateAppProps) => void;
}

@observer
export default class GridCell extends React.Component<IProps> {
  private mainRef: React.RefObject<HTMLDivElement> = React.createRef();

  public render() {
    const {
      x,
      y,
      cols,
      stamp,
      subGridStep,
      apps,
      gridColumnDuration,
      updateAppointment,
      shift,
      movingIdObj,
    } = this.props;
    const appNodes = Object.values(apps).map(app => {
      const appointment = app as Appointment;

      let coeffX = 0;
      let coeffY = 0;

      const isMoving = appointment.identifier === movingIdObj.id;
      if (!isMoving) {
        const { dx, dy } = shift;
        const d = appointment.date;
        const s = d
          .clone()
          .hour(stamp.hour())
          .minute(stamp.minute());

        coeffX =
          (d.diff(s, 'second') / gridColumnDuration.asSeconds() + dx) * 100;

        coeffY = dy * 100;
      }

      return (
        <AppointmentCell
          moving={isMoving}
          key={appointment.uniqueId}
          translateX={coeffX}
          translateY={coeffY}
          appointment={app as Appointment}
          updateAppointment={updateAppointment}
          subGridColumns={subGridStep}
          gridColumnDuration={gridColumnDuration}
        />
      );
    });

    return (
      <div
        className={`gridCell item ${
          x === 0 ? 'first' : x === cols - 1 ? 'last' : ''
        }`}
        data-x={x}
        data-y={y}
        data-hour={stamp.hour()}
        data-minute={stamp.minute()}
        ref={this.mainRef}
      >
        <div className="subGrid">
          {new Array(subGridStep).fill(null).map((v, i) => (
            <div className="subGridElem" key={i} />
          ))}
        </div>
        {appNodes}
      </div>
    );
  }
}
