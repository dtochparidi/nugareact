// import { LazyTask } from '@levabala/lazytask/build/dist';
// import lazyTaskManager from '@levabala/lazytask/build/dist/LazyTaskManager';
import { LazyTask } from '@levabala/lazytask/build/dist';
import lazyTaskManager from '@levabala/lazytask/build/dist/LazyTaskManager';
import IUpdateAppProps from 'interfaces/IUpdateAppProps';
import { IReactionDisposer, observable, reaction, runInAction } from 'mobx';
import { observer } from 'mobx-react';
import moize from 'moize';
import * as moment from 'moment';
import * as React from 'react';
import Appointment from 'structures/Appointment';
import CalendarDay from 'structures/CalendarDay';

import AppointmentCell from './AppointmentCell';

import './AppointmentCell/AppointmentCell.scss';

// import Grid from './Grid';
// import { GridP } from '.';

// moize.collectStats();

// setInterval(() => {
//   console.log((moize.getStats().profiles as any).appCellGenerator);
// }, 3000);

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
  stateIndex: number;
}

@observer
export default class Day extends React.Component<IProps, IState> {
  @observable
  public displayMap: { [key: string]: { value: boolean } } = {};

  public moizedRenderer = moize.reactSimple(
    ({ props, stateIndex }: { props: IProps; stateIndex: number }) => {
      const { cols, dayData, dayWidth } = props;

      // console.log('render');

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
    },
    {
      equals: (
        { props: p1, stateIndex: s1 }: { props: IProps; stateIndex: number },
        { props: p2, stateIndex: s2 }: { props: IProps; stateIndex: number },
      ) =>
        s1 === s2 &&
        p1.cols === p2.cols &&
        p1.dayData.stateIndex === p2.dayData.stateIndex &&
        p1.dayWidth === p2.dayWidth,
    },
  );

  private reactions: IReactionDisposer[] = [];

  constructor(props: IProps) {
    super(props);

    // appointments change reaction
    const r1 = reaction(
      () => {
        // console.log(
        //   this.props.dayData.stateIndex,
        //   Object.keys(this.props.dayData.appointments).length,
        // );
        console.log('check to update', this.props.dayData.stateIndex);
        return this.props.dayData.stateIndex;
      },
      apps => {
        this.updateApps(this.props.instantRender);
        console.log('apps updated');
      },
    );

    const r2 = reaction(
      () => this.props.isDisplaying,
      () => this.updateVisibility(),
    );
    this.reactions = [r1, r2];

    this.state = {
      apps: [],
      stateIndex: 0,
    };
  }

  public componentWillUnmount() {
    this.reactions.forEach(r => r());
  }

  public componentDidMount() {
    // this.updateApps(this.props.instantRender);
  }

  public updateVisibility() {
    Object.values(this.props.dayData.appointments).forEach(app => {
      if (this.displayMap[app.uniqueId].value === false)
        lazyTaskManager.addTask(
          new LazyTask(() => {
            runInAction(() => {
              this.displayMap[app.uniqueId].value = true;
            });
          }),
          false,
        );
    });
  }

  public updateApps(instant = false) {
    const prefix = `updateApps instant:${instant} ${this.props.dayData.date.format(
      'DD.MM',
    )}`;
    performance.mark(`${prefix}-start`);

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
          isDisplaying={this.displayMap[app.uniqueId]}
          // isDisplaying={{ value: true }}
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

    const apps = Object.values(dayData.appointments);
    this.displayMap = apps.reduce((acc, val) => {
      acc[val.uniqueId] = { value: false };
      return acc;
    }, this.displayMap);

    const newApps = apps.map(app => generateAppElement(app));
    this.setState({ apps: newApps, stateIndex: this.state.stateIndex + 1 });

    console.log('-----------------------', instant);
    if (this.props.isDisplaying)
      if (instant)
        runInAction(() => {
          Object.values(dayData.appointments).forEach(app => {
            this.displayMap[app.uniqueId].value = true;
          });
        });
      else
        Object.values(dayData.appointments).forEach(app => {
          lazyTaskManager.addTask(
            new LazyTask(() => {
              runInAction(() => {
                this.displayMap[app.uniqueId].value = true;
              });
            }),
            false,
          );
        });

    // this.setState({ apps: [] });
    // Object.values(dayData.appointments).forEach(app => {
    //   lazyTaskManager.addTask(
    //     new LazyTask(() => {
    //       const appElem = generateAppElement(app);
    //       this.state.apps.push(appElem);

    //       this.setState({ apps: this.state.apps });
    //     }),
    //   );
    // });

    performance.mark(`${prefix}-end`);
    performance.measure(prefix, `${prefix}-start`, `${prefix}-end`);
  }

  public render() {
    return this.moizedRenderer({
      props: this.props,
      stateIndex: this.state.stateIndex,
    });
    // const { cols, dayData, dayWidth } = this.props;

    // // console.log('render');

    // return (
    //   <div
    //     className="dayWrapper"
    //     style={
    //       { '--columns-count': cols, width: dayWidth } as React.CSSProperties
    //     }
    //     id={`${dayData.id}`}
    //   >
    //     <div className="day">{this.state.apps}</div>
    //   </div>
    // );
  }
}
