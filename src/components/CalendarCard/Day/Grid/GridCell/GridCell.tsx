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
  // movingIdObj: { id: string };
  movingId: string;
  updateAppointment: (props: IUpdateAppProps) => void;
  isDisplaying: { value: boolean };
}

const GridCell = ({
  x,
  y,
  cols,
  stamp,
  subGridStep,
  apps,
  gridColumnDuration,
  updateAppointment,
  shift,
  movingId,
  isDisplaying,
}: IProps) => {
  const appNodes = Object.values(apps).map(app => {
    const appointment = app as Appointment;

    let coeffX = 0;
    let coeffY = 0;

    const isMoving = appointment.identifier === movingId;
    if (isMoving) console.log(isMoving);
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

    const getCellWidth = () => 0;

    return (
      <AppointmentCell
        getCellWidth={getCellWidth}
        isDisplaying={isDisplaying.value}
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
    >
      <div className="subGrid">
        {new Array(subGridStep).fill(null).map((v, i) => (
          <div className="subGridElem" key={i} />
        ))}
      </div>
      {appNodes}
    </div>
  );
};

export default observer(GridCell);

// @observer
// export default class GridCell extends React.Component<IProps> {
//   public render() {
//     const {
//       x,
//       y,
//       cols,
//       stamp,
//       subGridStep,
//       apps,
//       gridColumnDuration,
//       updateAppointment,
//       shift,
//       movingId,
//       isDisplaying,
//     } = this.props;
//     const appNodes = Object.values(apps).map(app => {
//       const appointment = app as Appointment;

//       let coeffX = 0;
//       let coeffY = 0;

//       const isMoving = appointment.identifier === movingId;
//       if (isMoving) console.log(isMoving);
//       if (!isMoving) {
//         const { dx, dy } = shift;
//         const d = appointment.date;
//         const s = d
//           .clone()
//           .hour(stamp.hour())
//           .minute(stamp.minute());

//         coeffX =
//           (d.diff(s, 'second') / gridColumnDuration.asSeconds() + dx) * 100;

//         coeffY = dy * 100;
//       }

//       return (
//         <AppointmentCell
//           isDisplaying={isDisplaying.value}
//           moving={isMoving}
//           key={appointment.uniqueId}
//           translateX={coeffX}
//           translateY={coeffY}
//           appointment={app as Appointment}
//           updateAppointment={updateAppointment}
//           subGridColumns={subGridStep}
//           gridColumnDuration={gridColumnDuration}
//         />
//       );
//     });

//     return (
//       <div
//         className={`gridCell item ${
//           x === 0 ? 'first' : x === cols - 1 ? 'last' : ''
//         }`}
//         data-x={x}
//         data-y={y}
//         data-hour={stamp.hour()}
//         data-minute={stamp.minute()}
//       >
//         <div className="subGrid">
//           {new Array(subGridStep).fill(null).map((v, i) => (
//             <div className="subGridElem" key={i} />
//           ))}
//         </div>
//         {appNodes}
//       </div>
//     );
//   }
// }
