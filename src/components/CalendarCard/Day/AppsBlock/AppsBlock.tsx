import IUpdateAppProps from 'interfaces/IUpdateAppProps';
// import moize from 'moize';
import * as moment from 'moment';
import * as React from 'react';
import Appointment from 'structures/Appointment';

// import AppointmentCell from '../AppointmentCell';

export interface IProps {
  apps: { [uniqueId: string]: Appointment };
  stamps: moment.Moment[];
  minutesStep: number;
  getCellWidth: () => number;
  cellHeight: number;
  gridColumnDuration: moment.Duration;
  shifts: {
    [x: number]: {
      [y: number]: {
        dx: number;
        dy: number;
      };
    };
  };
  displayMap: { [key: string]: { value: boolean } };
  subGridColumns: number;
  updateAppointment: (props: IUpdateAppProps) => void;
}

export default class AppsBlock extends React.Component<IProps> {
  // public generateAppElement = moize.reactSimple(
  //   (app: Appointment) => {
  //     const {
  //       stamps,
  //       minutesStep,
  //       cellHeight,
  //       gridColumnDuration,
  //       getCellWidth,
  //       shifts,
  //       displayMap,
  //       updateAppointment,
  //       subGridColumns,
  //     } = this.props;

  //     const cellWidth = getCellWidth();

  //     const x = Math.floor(
  //       (app.date.hour() * 60 +
  //         app.date.minute() -
  //         (stamps[0].hour() * 60 + stamps[0].minute())) /
  //         minutesStep,
  //     );
  //     const y = app.position;

  //     const shift = (x in shifts
  //       ? y in shifts[x]
  //         ? shifts[x][y]
  //         : null
  //       : null) || { dx: 0, dy: 0 };

  //     const stamp = this.props.stamps[x];
  //     const { dx, dy } = shift;
  //     const d = app.date;
  //     const s = d
  //       .clone()
  //       .hour(stamp.hour())
  //       .minute(stamp.minute());

  //     const coeffX = d.diff(s, 'second') / gridColumnDuration.asSeconds() + dx;
  //     const coeffY = dy;

  //     return (
  //       <AppointmentCell
  //         shift={{ dx: 0, dy: 0 }}
  //         style={{
  //           left: (x + coeffX) * cellWidth,
  //           top: (y + coeffY) * cellHeight,
  //         }}
  //         getCellWidth={getCellWidth}
  //         isDisplaying={displayMap[app.uniqueId]}
  //         // isDisplaying={{ value: true }}
  //         moving={false}
  //         key={app.uniqueId}
  //         // translateX={x * 100}
  //         // translateY={y * 100}
  //         appointment={app as Appointment}
  //         updateAppointment={updateAppointment}
  //         subGridColumns={subGridColumns}
  //         gridColumnDuration={gridColumnDuration}
  //       />
  //     );
  //   },
  //   {
  //     equals: (appPrev: Appointment, appNow: Appointment) =>
  //       appPrev.stateHash === appNow.stateHash,
  //     profileName: 'appCellGenerator',
  //   },
  // );

  // public shouldComponentUpdate(prevProps: IProps) {
  //   const needUpdate = Object.values(this.props.apps).some(
  //     newApp =>
  //       !(newApp.uniqueId in prevProps.apps) ||
  //       prevProps.apps[newApp.uniqueId].stateHash === newApp.stateHash,
  //   );

  //   return needUpdate;
  // }

  public render() {
    return <div>{this.props.children}</div>;
  }
}
