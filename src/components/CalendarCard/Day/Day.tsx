import { LazyTask } from '@levabala/lazytask/build/dist';
import lazyTaskManager from '@levabala/lazytask/build/dist/LazyTaskManager';
import IUpdateAppProps from 'interfaces/IUpdateAppProps';
import { reaction } from 'mobx';
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
  getCellWidth: () => number;
  cellHeight: number;
  subGridColumns: number;
  movingId: string;
  shifts: {
    [x: number]: {
      [y: number]: {
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

export interface IState {
  apps: JSX.Element[];
}

export default class Day extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);

    // appointments change reaction
    reaction(
      // OPTIMIZE
      () =>
        Object.values(this.props.dayData.appointments)
          .map(app => app.stateHash)
          .join(),
      apps => {
        this.updateApps(), console.log('apps updated');
      },
    );

    this.state = {
      apps: [],
    };

    this.updateApps();
  }

  public updateApps() {
    const {
      dayData,
      updateAppointment,
      stamps,
      subGridColumns,
      mainColumnStep,
      getCellWidth,
      cellHeight,
      shifts,
    } = this.props;

    const gridColumnDuration = moment.duration(
      stamps[1].diff(stamps[0]).valueOf(),
      'millisecond',
    );
    const minutesStep = mainColumnStep.asMinutes();

    const cellWidth = getCellWidth();

    const generateAppElement = (app: Appointment) => {
      const x = Math.floor(
        (app.date.hour() * 60 +
          app.date.minute() -
          (stamps[0].hour() * 60 + stamps[0].minute())) /
          minutesStep,
      );
      const y = app.position;

      const shift = (x in shifts
        ? y in shifts[x]
          ? shifts[x][y]
          : null
        : null) || { dx: 0, dy: 0 };

      const stamp = this.props.stamps[x];
      const { dx, dy } = shift;
      const d = app.date;
      const s = d
        .clone()
        .hour(stamp.hour())
        .minute(stamp.minute());

      const coeffX = d.diff(s, 'second') / gridColumnDuration.asSeconds() + dx;

      const coeffY = dy;

      return (
        <AppointmentCell
          style={{
            left: (x + coeffX) * cellWidth,
            top: (y + coeffY) * cellHeight,
          }}
          getCellWidth={getCellWidth}
          isDisplaying={true}
          moving={false}
          key={app.uniqueId}
          // translateX={x * 100}
          // translateY={y * 100}
          appointment={app as Appointment}
          updateAppointment={updateAppointment}
          subGridColumns={subGridColumns}
          gridColumnDuration={gridColumnDuration}
        />
      );
    };

    Object.values(dayData.appointments).forEach(app => {
      lazyTaskManager.addTask(
        new LazyTask(() => {
          const appElem = generateAppElement(app);
          this.state.apps.push(appElem);

          this.setState({ apps: this.state.apps });
        }),
      );
    });
  }

  public render() {
    const { cols, dayData, dayWidth } = this.props;

    console.log('render');

    return (
      <div
        className="dayWrapper"
        style={
          { '--columns-count': cols, width: dayWidth } as React.CSSProperties
        }
        id={`${dayData.id}`}
      >
        <div className="day">{this.state.apps}</div>
      </div>
    );
  }
}
