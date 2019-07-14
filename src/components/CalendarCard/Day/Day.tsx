import { LazyTask } from '@levabala/lazytask/build/dist';
import lazyTaskManager from '@levabala/lazytask/build/dist/LazyTaskManager';
import IUpdateAppFunction from 'interfaces/IUpdateAppFunction';
import {
  IReactionDisposer,
  observable,
  reaction,
  runInAction,
  transaction,
} from 'mobx';
import { observer } from 'mobx-react';
import moize from 'moize';
import * as moment from 'moment';
import * as React from 'react';
import VisibilityStore from 'stores/UI/VisibilityStote';
import Appointment from 'structures/Appointment';
import CalendarDay from 'structures/CalendarDay';

import AppointmentCell from './AppointmentCell';
import { IAppointmentCellProps } from './AppointmentCell';

import './AppointmentCell/AppointmentCell.scss';
import { AppsBlock } from '.';

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
  stateIndex: number;
}

const MAX_CHUNK_APPS_COUNT = 350;

@observer
export default class Day extends React.Component<IProps, IState> {
  @observable
  public displayMap: { [key: string]: { value: boolean } } = {};

  @observable
  public appsChunkStates: { [key: number]: number } = {};
  @observable
  public chunks: {
    [key: number]: {
      apps: { [uniqueI: string]: { element: JSX.Element; stateHash: string } };
      chunkInfo: { chunkHash: string; chunkId: number };
    };
  } = {};
  public appsToChunksIds: { [uniqueId: string]: number } = {};

  public dayElemRef = React.createRef<HTMLDivElement>();
  public visibility = false;

  private reactions: IReactionDisposer[] = [];
  private unmounted = false;
  private lastAppsCount = 0;

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
            shiftPrev.dy === shiftNow.dy));

      return equal;
    },
    onCacheHit: () => this.generateAppElemenetHits++,

    profileName: 'generateApp',
  });

  private generateAppElementCalls = 0;
  private generateAppElemenetHits = 0;
  private appsCountIndex = 0;
  private lastDayStateIndex = 0;
  private lastAppointmentElements: { [uniqueId: string]: JSX.Element } = {};

  get appElementsStateIndex() {
    return (
      this.generateAppElementCalls -
      this.generateAppElemenetHits +
      this.appsCountIndex
    );
  }

  constructor(props: IProps) {
    super(props);

    ((window as any).days = (window as any).days || []).push(this);

    // appointments change reaction
    const r1 = reaction(
      () => this.props.dayData.stateIndex,
      stateIndex => {
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
      stateIndex: 0,
    };
  }

  public findChunkDublicates() {
    const keys = Object.values(this.chunks)
      .map(chunk => Object.values(chunk.apps).map(app => app.element.key))
      .flat();
    const set = new Set(keys);

    return keys.length - set.size;
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

  public turnOnVisibility(instant: boolean = this.props.instantRender.value) {
    this.visibility = true;

    const { dayData } = this.props;

    this.registerNewApps();

    if (instant)
      runInAction(() => {
        Object.values(dayData.appointments).forEach(app => {
          this.displayMap[app.uniqueId].value = true;
        });
      });
    else
      Object.values(dayData.appointments).forEach(app => {
        lazyTaskManager.addTask(
          new LazyTask({
            condition: () =>
              !!this.dayElemRef.current &&
              !(this.dayElemRef.current as HTMLDivElement).classList.contains(
                'hidden',
              ),
            destructer: () => !this.dayElemRef.current,
            func: () => {
              runInAction(() => {
                this.displayMap[app.uniqueId].value = true;
              });
            },
            taskName: 'makeAppsVisible',
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
      const appsToProcess = dayData.updateMarks
        .slice(this.lastDayStateIndex + 1, dayData.stateIndex + 1)
        .flat();

      const actualApps = apps.map(app => {
        this.generateAppElementCalls++;
        const element =
          appsToProcess.includes(app.uniqueId) ||
          !(app.uniqueId in this.lastAppointmentElements)
            ? this.generateAppElementMoized({
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
              })
            : this.lastAppointmentElements[app.uniqueId];

        return [app.uniqueId, element] as [string, JSX.Element];
      });

      this.lastAppointmentElements = actualApps.reduce(
        (acc, [uniqueId, element]) => {
          acc[uniqueId] = element;
          return acc;
        },
        {},
      );

      performance.mark(`${markPrefix}-end`);

      this.lastDayStateIndex = dayData.stateIndex;
      this.appsCountIndex += +(this.lastAppsCount !== apps.length);

      if (this.appElementsStateIndex === stateIndexBefore) return;

      const processApps = () => {
        const elements = actualApps.map(([_, element]) => element);

        const previousChunksCount = Object.keys(this.chunks).length;

        const elementsGroups = elements.reduce(
          (acc: JSX.Element[][], val) => {
            if (acc[acc.length - 1].length > MAX_CHUNK_APPS_COUNT) acc.push([]);

            acc[acc.length - 1].push(val);
            return acc;
          },
          [[]],
        );

        const calcChunkHash = (
          appointments: Array<{ element: JSX.Element; stateHash: string }>,
        ) => appointments.map(({ stateHash }) => stateHash).join('');

        const promizes = elementsGroups.map(group => {
          const groupProcessor = () =>
            runInAction(() =>
              transaction(() => {
                const existingApps = group.filter(
                  app => (app.key as string) in this.appsToChunksIds,
                );
                const newApps = group.filter(
                  app => !((app.key as string) in this.appsToChunksIds),
                );

                newApps.forEach(app => {
                  const key = app.key as string;
                  let chunk = Object.values(this.chunks).find(
                    c => Object.keys(c.apps).length < MAX_CHUNK_APPS_COUNT,
                  );
                  if (!chunk) {
                    this.chunks[Object.keys(this.chunks).length] = {
                      apps: {},
                      chunkInfo: {
                        chunkHash: '',
                        chunkId: Object.keys(this.chunks).length,
                      },
                    };
                    chunk = this.chunks[Object.keys(this.chunks).length - 1];
                  }
                  this.appsToChunksIds[key] = chunk.chunkInfo.chunkId;
                  const stateHash = (app.props as IAppointmentCellProps)
                    .appointment.stateHash;

                  chunk.apps[key] = {
                    element: app,
                    stateHash,
                  };
                  chunk.chunkInfo.chunkHash += stateHash;
                });

                // updating existing apps
                existingApps.forEach(app => {
                  const chunkId = this.appsToChunksIds[app.key as string];
                  const chunk = this.chunks[chunkId];

                  const currentStateHash = (app.props as IAppointmentCellProps)
                    .appointment.stateHash;
                  const recordedStateHash =
                    chunk.apps[app.key as string].stateHash;

                  if (currentStateHash !== recordedStateHash) {
                    chunk.apps[app.key as string] = {
                      element: app,
                      stateHash: (app.props as IAppointmentCellProps)
                        .appointment.stateHash,
                    };

                    chunk.chunkInfo.chunkHash = calcChunkHash(
                      Object.values(chunk.apps),
                    );
                  }
                });
              }),
            );

          return instant
            ? groupProcessor()
            : lazyTaskManager.addFunc(groupProcessor);
        });

        const removeApps = () => {
          const removedElements = Object.keys(this.appsToChunksIds).filter(
            uniqueId => !elements.find(el => el.key === uniqueId),
          );

          runInAction(() =>
            transaction(() =>
              removedElements.forEach(key => {
                const chunk = this.chunks[this.appsToChunksIds[key]];

                delete chunk.apps[key];
                chunk.chunkInfo.chunkHash = calcChunkHash(
                  Object.values(chunk.apps),
                );
              }),
            ),
          );
        };

        const removeAppsFunc = () =>
          instant ? removeApps() : lazyTaskManager.addFunc(removeApps);

        if (promizes.some(Boolean)) Promise.all(promizes).then(removeAppsFunc);
        else removeAppsFunc();

        if (previousChunksCount !== Object.keys(this.chunks).length)
          this.setState({ stateIndex: this.state.stateIndex + 1 });

        if (this.props.visibilityStore.isVisible(this.props.dayData.id))
          this.turnOnVisibility(instant);

        this.lastAppsCount = apps.length;
      };

      if (instant) processApps();
      else lazyTaskManager.addFunc(processApps);

      performance.measure(
        markPrefix,
        `${markPrefix}-start`,
        `${markPrefix}-end`,
      );
    };

    if (instant) func();
    else
      lazyTaskManager.addTask(
        new LazyTask({
          condition: this.mountCondition,
          destructer: this.mountCondition,
          func,
          taskName: 'generateAppointments',
        }),
        true,
      );

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
        <div className="day">
          {Object.values(this.chunks).map(
            ({ apps, chunkInfo: { chunkHash } }, i) => (
              <AppsBlock
                key={i}
                apps={Object.values(apps).map(({ element }) => element)}
                hash={chunkHash}
                index={i.toString()}
              />
            ),
          )}{' '}
        </div>
      </div>
    );
  }

  private mountCondition = () => !this.unmounted;
}
