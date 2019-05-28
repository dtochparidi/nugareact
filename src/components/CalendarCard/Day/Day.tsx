// import { LazyTask } from '@levabala/lazytask/build/dist';
import { LazyTask } from '@levabala/lazytask/build/dist';
import lazyTaskManager from '@levabala/lazytask/build/dist/LazyTaskManager';
import IUpdateAppFunction from 'interfaces/IUpdateAppFunction';
import { IReactionDisposer, observable, reaction, runInAction } from 'mobx';
import { observer } from 'mobx-react';
import moize from 'moize';
import * as moment from 'moment';
import * as React from 'react';
import VisibilityStore from 'stores/UI/VisibilityStote';
import Appointment from 'structures/Appointment';
import CalendarDay from 'structures/CalendarDay';

import AppointmentCell from './AppointmentCell';

import './AppointmentCell/AppointmentCell.scss';

// import lazyTaskManager from '@levabala/lazytask/build/dist/LazyTaskManager';
// import Grid from './Grid';
// import { GridP } from '.';

// moize.collectStats();

// setInterval(() => {
//   console.log((moize.getStats().profiles as any).generateApp);
// }, 3000);

const renderCounts = {};

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
    [uniqueId: string]: {
      dx: number;
      dy: number;
    };
  };
  visibilityStore: VisibilityStore;
  shiftsHash: string;
  updateAppointment: IUpdateAppFunction;
  instantRender: { value: boolean };
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

  public dayElemRef = React.createRef<HTMLDivElement>();
  public visibility = false;

  private reactions: IReactionDisposer[] = [];
  private unmounted = false;

  private generateAppElementMoized = moize(this.generateAppElement, {
    equals: (
      {
        app: appPrev,
        shiftsCloned: shiftsPrev,
        appStateHash: appStateHashPrev,
      }: {
        app: Appointment;
        shiftsCloned: object;
        appStateHash: string;
      },
      {
        app: appNow,
        shiftsCloned: shiftsNow,
        appStateHash: appStateHashNow,
      }: {
        app: Appointment;
        shiftsCloned: object;
        appStateHash: string;
      },
    ) => {
      if (!appStateHashPrev || !appStateHashNow) return false;
      const shiftPrev = shiftsPrev[appPrev.uniqueId];
      const shiftNow = shiftsNow[appNow.uniqueId];
      const equal =
        appStateHashPrev === appStateHashNow &&
        ((!shiftPrev && !shiftNow) ||
          (shiftPrev &&
            shiftNow &&
            shiftPrev.dx === shiftNow.dx &&
            shiftPrev.dy === shiftNow.dy)); // const equal = appStateHashPrev === appStateHashNow;

      return equal;
    },
    onCacheHit: () => this.generateAppElemenetHits++,

    profileName: 'generateApp',
  });

  private generateAppElemenetCalls = 0;
  private generateAppElemenetHits = 0;

  get appElementsStateIndex() {
    return this.generateAppElemenetCalls - this.generateAppElemenetHits;
  }

  constructor(props: IProps) {
    super(props);

    // appointments change reaction
    const r1 = reaction(
      () => this.props.dayData.stateIndex,
      stateIndex => {
        // console.log('!!!!!!!!!!!!!!!! apps updated');

        const weightful = this.props.dayData.weightfulUpdates.has(stateIndex);
        const instant = !weightful;

        this.registerNewApps();
        this.updateApps(instant);
      },
    );

    const r2 = reaction(
      () => this.props.visibilityStore.isVisible(this.props.dayData.id),
      () => (!this.visibility ? this.turnOnVisibility() : null),
    );
    this.reactions = [r1, r2];

    this.state = {
      apps: [],
      stateIndex: 0,
    };
  }

  public generateAppElement({
    app,
    stamps,
    minutesStep,
    shifts,
    cellWidth,
    cellHeight,
    getCellWidth,
    updateAppointment,
    subGridColumns,
    gridColumnDuration,
  }: {
    [key: string]: any;
  }) {
    const x = Math.floor(
      (app.date.hour() * 60 +
        app.date.minute() -
        (stamps[0].hour() * 60 + stamps[0].minute())) /
        minutesStep,
    );
    const y = app.position;

    if (!(app.uniqueId in shifts)) shifts[app.uniqueId] = { dx: 0, dy: 0 };

    const shift = shifts[app.uniqueId];

    const left = x * cellWidth;
    const top = y * cellHeight;

    return (
      <AppointmentCell
        shiftObservable={observable(shift)}
        getCellWidth={getCellWidth}
        isDisplaying={this.displayMap[app.uniqueId]}
        // isDisplaying={{ value: true }}
        moving={false}
        key={app.uniqueId}
        translateX={left}
        translateY={top}
        cellHeight={cellHeight}
        appointment={app as Appointment}
        updateAppointment={updateAppointment}
        subGridColumns={subGridColumns}
        gridColumnDuration={gridColumnDuration}
      />
    );
  }

  public componentWillUnmount() {
    this.reactions.forEach(r => r());
    this.unmounted = true;
  }

  public componentDidMount() {
    setTimeout(() => this.updateApps(this.props.instantRender.value));
  }

  public registerNewApps() {
    const apps = Object.values(this.props.dayData.appointments);
    apps.forEach(app => {
      if (!(app.uniqueId in this.displayMap))
        this.displayMap[app.uniqueId] = { value: false };
    });
  }

  public turnOnVisibility() {
    this.visibility = true;

    const { dayData, instantRender } = this.props;

    this.registerNewApps();

    // console.log(`turn on visibility (instantly: ${instantRender.value})`);
    if (instantRender.value)
      runInAction(() => {
        Object.values(dayData.appointments).forEach(app => {
          this.displayMap[app.uniqueId].value = true;
        });
      });
    else
      Object.values(dayData.appointments).forEach(app => {
        lazyTaskManager.addTask(
          new LazyTask(
            () => {
              runInAction(() => {
                this.displayMap[app.uniqueId].value = true;
              });
            },
            undefined,
            () =>
              !!this.dayElemRef.current &&
              !(this.dayElemRef.current as HTMLDivElement).classList.contains(
                'hidden',
              ),
            () => !this.dayElemRef.current,
          ),
          false,
        );
      });

    // Object.values(this.props.dayData.appointments).forEach(app => {
    //   if (this.displayMap[app.uniqueId].value === false)
    //     lazyTaskManager.addTask(
    //       new LazyTask(() => {
    //         runInAction(() => {
    //           this.displayMap[app.uniqueId].value = true;
    //         });
    //       }),
    //       false,
    //     );
    // });
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

    const apps = Object.values(dayData.appointments);
    this.registerNewApps();

    const shiftsCloned = Object.entries(shifts).reduce(
      (acc, [key, { dx, dy }]: [string, { dx: number; dy: number }]) => {
        acc[key] = { dx, dy };
        return acc;
      },
      {},
    );

    const func = () => {
      const markPrefix = `generateAppElements (count: ${apps.length})`;
      performance.mark(`${markPrefix}-start`);

      const stateIndexBefore = this.appElementsStateIndex;
      const newApps = apps.map(app => {
        this.generateAppElemenetCalls++;
        return this.generateAppElementMoized({
          app,
          appStateHash: app.stateHash,
          cellHeight,
          cellWidth,
          getCellWidth,
          gridColumnDuration,
          minutesStep,
          shifts,
          shiftsCloned,
          stamps,
          subGridColumns,
          updateAppointment,
        });
      });
      performance.mark(`${markPrefix}-end`);

      // const stats = (moize.getStats().profiles as any).generateApp;
      // console.log(stats.calls - stats.hits);

      console.log(this.appElementsStateIndex, this.props.dayData.id);
      if (this.appElementsStateIndex === stateIndexBefore) {
        console.log('unchanged');
        return;
      }
      this.setState({ apps: newApps, stateIndex: this.state.stateIndex + 1 });

      // console.log('do instantly:', instant);
      if (this.props.visibilityStore.isVisible(this.props.dayData.id))
        this.turnOnVisibility();

      performance.measure(
        markPrefix,
        `${markPrefix}-start`,
        `${markPrefix}-end`,
      );
    };

    if (instant) func();
    else
      lazyTaskManager.addTask(
        new LazyTask(func, undefined, this.mountCondition, this.mountCondition),
      );

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
    renderCounts[this.props.dayData.id] =
      (renderCounts[this.props.dayData.id] || 0) + 1;

    const { cols, dayData, dayWidth } = this.props;

    return (
      <div
        className="dayWrapper"
        style={
          { '--columns-count': cols, width: dayWidth } as React.CSSProperties
        }
        id={`${dayData.id}`}
        ref={this.dayElemRef}
      >
        <div className="day">{this.state.apps}</div>
      </div>
    );
  }

  private mountCondition = () => !this.unmounted;
}
