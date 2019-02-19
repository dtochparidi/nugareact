import { observer } from 'mobx-react';
import * as Moment from 'moment';
import { Duration as IDuration, Moment as IMoment } from 'moment';
import { DateRange, extendMoment } from 'moment-range';
import * as React from 'react';
import { v4 } from 'uuid';

import ICalendarDay from '../../interfaces/ICalendarDay';
import Card from '../Card';
import Day from './Day';
import LeftColumn from './LeftColumn';

import * as StyleVariables from '../../common/variables.scss';
import * as CardVariables from './CalendarCard.scss';
import './CalendarCard.scss';

import * as interact from 'levabala_interactjs';
import CalendarDay from 'structures/CalendarDay';
import { clientSide } from '../../dev/clientSide';
import Appointment from '../../structures/Appointment';
import createDragConfig from './dragConfig';
import ToggleArea from './ToggleArea';

import * as Emitter from 'events';
import IUpdateAppProps from 'interfaces/IUpdateAppProps';
import { action, observable } from 'mobx';
import TopRow from './Day/TopRow';

const calendarCellMinWidth = parseFloat(CardVariables.calendarCellWidthMin);
const thinWidth = parseFloat(StyleVariables.thinWidth);

const moment = extendMoment(Moment);

if (clientSide) (interact as any).dynamicDrop(true);

export interface IProps {
  days: CalendarDay[];
  dayTimeRange: DateRange;
  positionCount: number;
  subGridColumns: number;
  requestCallback: (date: Moment.Moment) => void;
  mainColumnStep: IDuration;
  updateAppointment: (props: IUpdateAppProps) => void;
}

export interface IState {
  requiredDays: IMoment[];
  columnsPerPage: number;
  columnsPerDay: number;
  dayWidth: string;
  cellWidth: number;
  loading: boolean;
  stamps: IMoment[];
}

enum Direction {
  Top = -1,
  Bottom = 1,
  None = 0,
}

@observer
export default class CalendarCard extends React.Component<IProps, IState> {
  private static detectShiftDirectionAndCollisions(
    movingApp: { uniqueId: string; position: number; dateRange: DateRange },
    fixed: { uniqueId: string; position: number; dateRange: DateRange } | null,
    fullColumn: Appointment[][],
    priorityDirection: Direction,
  ): [Direction, Appointment[]] {
    let collisions: Appointment[] = [];
    const shifter = fixed || movingApp;
    console.log("shifter's position:", shifter.position);

    const checkTop = (): [Direction, Appointment[]] | false => {
      const firstOverlaps = fullColumn[shifter.position].filter(
        app =>
          app.uniqueId !== shifter.uniqueId &&
          app.dateRange.overlaps(shifter.dateRange),
      );
      collisions.push(...firstOverlaps);

      for (let i = shifter.position; i > 0; i--) {
        const overlappingApps = fullColumn[i - 1].filter(
          app =>
            app.uniqueId !== movingApp.uniqueId &&
            fullColumn[i].some(prevApp =>
              app.dateRange.overlaps(prevApp.dateRange),
            ),
        );

        if (overlappingApps.length) collisions.push(...overlappingApps);
        else break;
      }

      if (collisions.length) return [Direction.Top, collisions];

      collisions = [];
      return false;
    };

    const checkBottom = (): [Direction, Appointment[]] | false => {
      const firstOverlaps = fullColumn[shifter.position].filter(
        app =>
          app.uniqueId !== shifter.uniqueId &&
          app.dateRange.overlaps(shifter.dateRange),
      );
      collisions.push(...firstOverlaps);

      for (let i = shifter.position; i < fullColumn.length; i++) {
        const overlappingApps = fullColumn[i + 1].filter(
          app =>
            app.uniqueId !== movingApp.uniqueId &&
            fullColumn[i].some(prevApp =>
              app.dateRange.overlaps(prevApp.dateRange),
            ),
        );

        if (overlappingApps.length) collisions.push(...overlappingApps);
        else break;
      }

      if (collisions.length) return [Direction.Top, collisions];

      collisions = [];
      return false;
    };

    if (priorityDirection === Direction.Top)
      return checkTop() || checkBottom() || [Direction.None, []];
    else return checkBottom() || checkTop() || [Direction.None, []];
  }

  private static calcDaySize(
    columnsPerPage: number,
    columnsPerDay: number,
    containerWidth: number,
  ) {
    const dayWidth =
      (containerWidth / columnsPerPage) * columnsPerDay - thinWidth;
    return dayWidth;
  }

  private static calcColumnsCount(
    containerWidth: number,
    calendarCellWidthMin: number,
  ) {
    const columnsCount = Math.floor(containerWidth / calendarCellWidthMin);
    return columnsCount;
  }

  private static getCellInfo(target: HTMLElement) {
    const targetDay = (((target.parentNode as HTMLElement) // Grid
      .parentNode as HTMLElement) as HTMLElement).parentNode as HTMLElement; // Day // DayWrapper
    const dayString = targetDay.id.split('_')[1];
    const stamp = moment(dayString, 'DD-MM-YYYY');
    const hour = parseInt(target.getAttribute('data-hour') || '-1', 10);
    const minute = parseInt(target.getAttribute('data-minute') || '-1', 10);
    const position = parseInt(target.getAttribute('data-y') || '-1', 10);

    stamp.hour(hour);
    stamp.minute(minute);
    return { stamp, position };
  }

  @observable
  public shiftsHash: { [dayId: string]: string } = {};
  @observable
  public shifts: {
    [dayId: string]: {
      [x: number]: {
        [y: number]: {
          dx: number;
          dy: number;
        };
      };
    };
  } = {};

  @observable
  public movingId: string = '';
  public currentLeftColumnIndex: number = 0;
  private daysContainerRef: React.RefObject<HTMLDivElement>;
  private containerScrollTimeout: NodeJS.Timeout;
  private shouldUpdateVisibility: boolean = false;
  private currentFirstDay: ICalendarDay;
  private currentDaysCount: number = 0;
  private isScrolling: boolean = false;
  private pageTurnEmitter: Emitter;
  private clientRect: ClientRect;
  private shiftsCache: {
    [dayId: number]: {
      [shiftId: string]: { [uniqueId: string]: { dx: number; dy: number } };
    };
  } = {};

  constructor(props: IProps) {
    super(props);

    this.daysContainerRef = React.createRef();
    this.pageTurnEmitter = new Emitter();

    const mainColumnStep = Moment.duration(45, 'minutes');
    const stamps = Array.from(
      this.props.dayTimeRange.by('seconds', {
        step: mainColumnStep.asSeconds(),
      }),
    );

    if (clientSide)
      interact('.appointmentCell .container .containerTempWidth')
        .draggable(
          createDragConfig(
            this.onAppointmentDraggingStart.bind(this),
            () => null,
            this.onAppointmentDraggingEnd.bind(this),
          ),
        )
        .resizable(
          ((): interact.ResizableOptions => {
            return {
              edges: {
                right: true,
              },
              onend: (e: interact.InteractEvent) => {
                let { target }: { target: HTMLElement } = e;
                target = target.parentNode as HTMLElement;

                const appCell = target.parentNode as HTMLElement;
                const gridCell = appCell.parentNode as HTMLElement;
                const cellRect = gridCell.getBoundingClientRect();

                const appointmentId = appCell.id;
                const app = Appointment.fromIdentifier(appointmentId);

                const widthNode = target.querySelector(
                  '.containerTempWidth',
                ) as HTMLElement;

                const rect = widthNode.getBoundingClientRect();
                const step = cellRect.width / this.props.subGridColumns;
                const subGridScale = Math.max(Math.ceil(rect.width / step), 1);

                const minutes =
                  (this.props.mainColumnStep.asMinutes() /
                    this.props.subGridColumns) *
                  subGridScale;
                const duration = Moment.duration(
                  Math.max(
                    minutes,
                    this.props.mainColumnStep.asMinutes() /
                      this.props.subGridColumns,
                  ),
                  'minute',
                );

                widthNode.style.width = '';
                this.props.updateAppointment({
                  date: app.date,
                  targetDuration: duration,
                  uniqueId: app.uniqueId,
                });
              },
              onmove: (e: interact.InteractEvent & { rect: ClientRect }) => {
                let { target }: { target: HTMLElement } = e;
                target = target.parentNode as HTMLElement;

                const minWidth =
                  (target.parentNode as HTMLElement).getBoundingClientRect()
                    .width / this.props.subGridColumns;
                if (e.rect.width < minWidth) return;

                const widthNode = target.querySelector(
                  '.containerTempWidth',
                ) as HTMLElement;

                widthNode.style.width = `${e.rect.width}px`;
                widthNode.dispatchEvent(new Event('resize'));
              },
            };
          })(),
        );

    this.state = {
      cellWidth: 0,
      columnsPerDay: stamps.length,
      columnsPerPage: 4,
      dayWidth: '100%',
      loading: true,
      requiredDays: [
        moment()
          .startOf('day')
          .add(1, 'day'),
        moment().startOf('day'),
        moment()
          .startOf('day')
          .subtract(1, 'day'),
      ],
      stamps,
    };

    this.updateBoundingRect();
  }
  public turnPageRight = () => {
    this.turnPage(1);
  };

  public turnPageLeft = () => {
    this.turnPage(-1);
  };

  @action
  public updateMovingId(movingId: string) {
    this.movingId = movingId;
  }

  public onAppointmentDraggingStart(e: interact.InteractEvent) {
    const appCell = ((e.target as Element).parentNode as Element)
      .parentNode as Element;
    ((((appCell.parentNode as Element).parentNode as Element)
      .parentNode as Element).parentNode as Element).classList.add(
      'dragOrigin',
    );

    this.updateMovingId(appCell.id);

    this.shiftsCache = {};
    console.log('clear cache');

    this.clearShifts();
  }

  public onAppointmentDraggingEnd(e: interact.InteractEvent) {
    const appCell = ((e.target as Element).parentNode as Element)
      .parentNode as Element;
    ((((appCell.parentNode as Element).parentNode as Element)
      .parentNode as Element).parentNode as Element).classList.remove(
      'dragOrigin',
    );
  }

  public unshiftWholeColumn(target: HTMLElement) {
    const { stamp } = CalendarCard.getCellInfo(target);
    const day = this.getDayByStamp(stamp);
    const column = this.getColumnByStamp(stamp, day);

    const x = parseInt(target.dataset.x || '0', 10);

    const changed = column.reduce(
      (acc, app) => this.unShiftCell(day.id, x, app.position, true) || acc,
      false,
    );

    if (changed) this.shiftsHash[day.id] = v4();
  }

  public checkForOverlaps(dayStamp: IMoment) {
    const day = this.getDayByStamp(dayStamp);

    const checked: string[] = [];
    const apps = Object.values(day.appointments);
    const overlappingApps = apps.reduce((acc: Appointment[], app) => {
      const overlaps = apps.reduce((secAcc: Appointment[], secApp) => {
        const overlapping =
          secApp.uniqueId !== app.uniqueId &&
          secApp.position === app.position &&
          !checked.includes(secApp.uniqueId) &&
          secApp.dateRange.overlaps(app.dateRange);

        if (overlapping) secAcc.push(secApp);

        return secAcc;
      }, []);

      if (overlaps.length) acc.push(...overlaps.concat([app]));

      checked.push(app.uniqueId);

      return acc;
    }, []);

    apps.forEach(app => {
      const overlapping = !!overlappingApps.find(
        secApp => secApp.uniqueId === app.uniqueId,
      );

      if (overlapping !== app.overlapping) app.update({ overlapping });
    });
  }

  public freePlaceToDrop(movingApp: {
    uniqueId: string;
    position: number;
    dateRange: DateRange;
  }): boolean {
    interface IOffsetMap {
      [uniqueId: string]: { dx: number; dy: number };
    }

    const applyShifts = (currentDay: CalendarDay, offsets: IOffsetMap) => {
      const shifts = Object.entries(offsets).map(([id, deltas]) => {
        const app = currentDay.appointments[id];

        return {
          dx: 0,
          dy: deltas.dy,
          x: this.getColumnIndex(app.date),
          y: app.position,
        };
      });

      this.mergeShifts(currentDay.id, shifts);
    };

    console.log(' ------ free iteration ------');

    const day = this.getDayByStamp(movingApp.dateRange.start);

    const restoreShiftsFromCache = (id: string): IOffsetMap | false =>
      day.id in this.shiftsCache && this.shiftsCache[day.id][id];

    const calcShiftCascadeIdentifier = (
      fixedApp: {
        uniqueId: string;
        position: number;
        dateRange: DateRange;
      },
      ordinateApps: Appointment[],
    ) =>
      movingApp.position +
      fixedApp.uniqueId +
      ordinateApps.reduce((acc, app) => {
        return acc + app.uniqueId + app.position.toString();
      }, '');

    // TODO:
    // ordinate column for each app
    const columnsMap = Object.entries(day.appointments)
      .reduceObject.values(day.appointments)
      .filter(
        app =>
          app.uniqueId !== movingApp.uniqueId &&
          fixedApp.dateRange.overlaps(moment.range(app.date, app.endDate)),
      );

    // const counter = 0;
    const calcOffsetMap = (
      fixedApp: {
        uniqueId: string;
        position: number;
        dateRange: DateRange;
      },
      positionsOffset: IOffsetMap,
      fixedIds: string[] = [],
    ): IOffsetMap | false => {
      // console.log(
      //   `--- calc offset map (${counter++}) for ${
      //     fixedApp.uniqueId.split('-')[0]
      //   }`,
      // );

      const ordinateCollisingApps = Object.values(day.appointments).filter(
        app =>
          app.uniqueId !== movingApp.uniqueId &&
          fixedApp.dateRange.overlaps(moment.range(app.date, app.endDate)),
      );

      if (!ordinateCollisingApps.length) {
        console.log('no ordinate apps');
        return positionsOffset;
      }

      // try to restore cache
      const shiftCascadeIdentifier = calcShiftCascadeIdentifier(
        fixedApp,
        ordinateCollisingApps,
      );
      const restoredShifts = restoreShiftsFromCache(shiftCascadeIdentifier);

      if (restoredShifts) return restoredShifts;

      // now let's calculate shifts
      const filledColumn = new Array(this.props.positionCount)
        .fill(null)
        .map(() => [] as Appointment[]);

      ordinateCollisingApps.forEach(app =>
        filledColumn[
          app.position + (positionsOffset[app.uniqueId] || { dy: 0 }).dy
        ].push(app),
      );

      const fixedAppPosition =
        fixedApp.position +
        (positionsOffset[fixedApp.uniqueId] || { dy: 0 }).dy;
      if (!filledColumn[fixedAppPosition].length) {
        console.log('no inline collising apps');
        return positionsOffset;
      }

      // function for finding collising apps
      const getAppsToShift = (
        originIndex: number,
        delta: Direction,
      ): [Appointment[], Direction] | false => {
        const condition: (i: number) => boolean =
          delta > 0 ? i => i < filledColumn.length : i => i >= 0;

        const toShift: Appointment[] = [];
        const toShiftColumn: Appointment[][] = filledColumn.map(() => []);
        for (let i = originIndex; condition(i); i += delta) {
          // check if collising with a fixed app
          if (
            fixedIds.length &&
            filledColumn[i].length &&
            filledColumn[i].some(app =>
              fixedIds.some(fixedId => app.uniqueId === fixedId),
            )
          )
            return false;

          const apps = filledColumn[i].filter(
            app =>
              app.uniqueId !== fixedApp.uniqueId &&
              (i === originIndex ||
                (i === movingApp.position &&
                  app.dateRange.overlaps(movingApp.dateRange, {
                    adjacent: false,
                  })) ||
                toShiftColumn[i - delta].some(prevApp =>
                  prevApp.dateRange.overlaps(app.dateRange, {
                    adjacent: false,
                  }),
                )),
          );

          toShift.push(...apps);
          toShiftColumn[i].push(...apps);

          if (!apps.length) return [toShift, delta];
        }

        // if there no free space
        return false;
      };

      // now get apps to shift
      const [appsToShift, shiftDirection] =
        // firstly try top
        getAppsToShift(fixedAppPosition, Direction.Top) ||
          // the bottom direction
          getAppsToShift(fixedAppPosition, Direction.Bottom) || [
            // no free direction :(
            [],
            Direction.None,
          ];

      fixedIds.push(fixedApp.uniqueId);

      if (shiftDirection === Direction.None) {
        console.log('cannot shift');
        return false;
      }

      if (!appsToShift.length) {
        console.log('no apps to shift');
        return positionsOffset;
      }

      const currentOffsetMap = appsToShift.reduce(
        (offsets: IOffsetMap, app) => {
          if (!(app.uniqueId in offsets))
            offsets[app.uniqueId] = {
              dx: 0,
              dy: 0,
            };

          offsets[app.uniqueId].dy += shiftDirection;

          return offsets;
        },
        Object.entries(positionsOffset).reduce((newObj, [id, deltas]) => {
          newObj[id] = { dx: deltas.dx, dy: deltas.dy };
          return newObj;
        }, {}),
      );

      // quite complex function just for... nothing?

      // const mergeOffsetMaps = (map1: IOffsetMap, map2: IOffsetMap): IOffsetMap => {
      //   const keysChecked: string[] = [];
      //   const firstAccMap = Object.entries(map1).map(([uniqueId, deltas]) => {
      //     const otherDeltas = uniqueId in map2 ? map2[uniqueId] : {dx: 0, dy: 0};
      //     keysChecked.push(uniqueId);

      //     return [uniqueId, {dx: deltas.dx + otherDeltas.dx, dy: deltas.dy + otherDeltas.dy}]
      //   });

      //   const secondAccMap = Object.entries(map2).filter(([uniqueId]) => !keysChecked.includes(uniqueId));

      //   const finalMap = firstAccMap.concat(secondAccMap).reduce(
      //     (acc: IOffsetMap, [uniqueId, deltas]: [string, {dx: number, dy: number}]) => acc[uniqueId] = deltas,
      //     {}
      //   )

      //   return finalMap;
      // }

      const configurations = [
        // sorted by distance from origin
        appsToShift.sort((app1, app2) =>
          Math.abs(app1.position - fixedAppPosition) >
          Math.abs(app2.position - fixedAppPosition)
            ? 1
            : -1,
        ),
      ];
      const finalOffsetMap: IOffsetMap | false = configurations.reduce(
        (acc: IOffsetMap | false, config, i) => {
          if (acc) return acc;

          console.log('try config', i);

          const map = config.reduce(
            (offsets: IOffsetMap | false, app: Appointment) =>
              !offsets ? false : calcOffsetMap(app, offsets, fixedIds),
            // : calcOffsetMap(app, offsets, fixedIds.map(id => id)),
            currentOffsetMap,
          );

          return map;
        },
        false,
      );

      // console.log('new offsets map', finalOffsetMap);

      return finalOffsetMap;
    };

    const offsetMap = calcOffsetMap(movingApp, {});

    if (!offsetMap) {
      this.clearShifts();
      return false;
    }

    applyShifts(day, offsetMap);

    return true;
  }

  public freePlaceToDropDeprecated(
    movingApp: {
      uniqueId: string;
      position: number;
      dateRange: DateRange;
    },
    fixedApp: {
      uniqueId: string;
      position: number;
      dateRange: DateRange;
    } | null = null,
    positionsOffset: { [uniqueId: string]: { dx: number; dy: number } } = {},
    root = true,
    priorityDirection = Direction.Top,
  ): boolean {
    const applyShifts = (offsets: {
      [uniqueId: string]: { dx: number; dy: number };
    }) => {
      const shifts = Object.entries(offsets).map(([id, deltas]) => {
        const app = day.appointments[id];

        return {
          dx: 0,
          dy: deltas.dy,
          x: this.getColumnIndex(app.date),
          y: app.position,
        };
      });

      // this.shiftMultipleCells(day.id, shifts);
      this.mergeShifts(day.id, shifts);
    };

    if (root) console.log('start recursion');
    else console.log('deeper');

    const day = this.getDayByStamp(movingApp.dateRange.start);
    const ordinateCollisingApps = Object.values(day.appointments).filter(
      app =>
        app.uniqueId !== movingApp.uniqueId &&
        ((fixedApp && fixedApp.dateRange) || movingApp.dateRange).overlaps(
          moment.range(app.date, app.endDate),
        ),
    );

    const calcShiftCascadeIdentifier = () => {
      return (
        movingApp.position +
        ((fixedApp && fixedApp.uniqueId) || movingApp.uniqueId) +
        ordinateCollisingApps.reduce((acc, app) => {
          return acc + app.uniqueId + app.position.toString();
        }, '')
      );
    };

    const currentShiftCascadeId = calcShiftCascadeIdentifier();

    if (root && (window as any).shiftsCaching) {
      this.shiftsCache[day.id] = this.shiftsCache[day.id] || {};
      const cachedShiftsExist =
        this.shiftsCache[day.id] &&
        currentShiftCascadeId in this.shiftsCache[day.id];

      if (cachedShiftsExist) {
        const cachedShifts = this.shiftsCache[day.id][currentShiftCascadeId];
        applyShifts(cachedShifts);

        console.log('cached shifts restored');

        return true;
      }
    }

    // just no collisions
    if (!ordinateCollisingApps.length) {
      if (root) this.clearShifts();
      return true;
    }

    const filledColumn = new Array(this.props.positionCount)
      .fill(null)
      .map(() => [] as Appointment[]);

    ordinateCollisingApps.forEach(app =>
      filledColumn[
        app.position + (positionsOffset[app.uniqueId] || { dy: 0 }).dy
      ].push(app),
    );

    // getting potential shifting direction
    const [
      shiftDirection,
      collisingApps,
    ] = CalendarCard.detectShiftDirectionAndCollisions(
      movingApp,
      fixedApp,
      filledColumn,
      priorityDirection,
    );

    // so we cannot shift anything anywhere
    if (shiftDirection === Direction.None) {
      if (root) this.clearShifts();
      return false;
    }

    // we have no collisions. place is free and safe to drop!
    if (!collisingApps.length) {
      if (root) this.clearShifts();
      return true;
    }

    console.log(
      collisingApps.forEach(app => console.log(app.position, app.uniqueId)),
    );

    // transforming enum to int delta
    const delta = shiftDirection === Direction.Top ? -1 : 1;

    // updating temp offsets
    collisingApps.forEach(app => {
      if (!(app.uniqueId in positionsOffset))
        positionsOffset[app.uniqueId] = { dx: 0, dy: 0 };

      positionsOffset[app.uniqueId].dy += delta;
    });

    // recursive deep-shifting
    const possibleConfigurations = [
      collisingApps,
      collisingApps.reverse(),
      // TODO: sort by distance from current app
      // collisingApps.reduce((acc: Appointment[], app, i, arr) => {
      //   const index =
      //     i % 2 === 0 ? Math.floor(i / 2) : arr.length - 1 - Math.floor(i / 2);

      //   console.log(i, index, arr.length);

      //   acc[index] = app;
      //   return acc;
      // }, []),
    ];

    const [success] = possibleConfigurations.reduce(
      (
        accumulator: [
          boolean,
          { [uniqueId: string]: { dx: number; dy: number } }
        ],
        configuration,
      ) => {
        const [ableToShift, shifts] = accumulator;

        if (ableToShift) return [true, shifts];

        // cloning shifts before trying to free place
        const shiftsCopy = Object.entries(shifts).reduce(
          (newObj, [id, deltas]) => {
            newObj[id] = { dx: deltas.dx, dy: deltas.dy };
            return newObj;
          },
          {},
        );

        // try to free up the place
        const isAppropriateConfig = configuration.reduce((acc, app) => {
          // if something goes wrong
          if (!acc) return acc;

          // check if this branch
          const able = this.freePlaceToDropDeprecated(
            movingApp,
            app,
            shiftsCopy,
            false,
            movingApp.position - app.position >= 0
              ? Direction.Top
              : Direction.Bottom,
          );

          return able;
        }, true);

        // if success then write new shifts to global shifts
        if (isAppropriateConfig) Object.assign(shifts, shiftsCopy);

        return [isAppropriateConfig, shifts];
      },
      [false, positionsOffset],
    ) as [boolean, { [uniqueId: string]: { dx: number; dy: number } }];

    // do shifting
    if (root && success) {
      applyShifts(positionsOffset);

      // cache shifts
      if ((window as any).shiftsCaching)
        this.shiftsCache[day.id][currentShiftCascadeId] = positionsOffset;

      return true;
    }

    // move dataflow up
    return success;
  }

  public getDayByStamp(stamp: IMoment) {
    const day = this.props.days.find(
      d =>
        d.date
          .clone()
          .startOf('day')
          .diff(stamp, 'day') === 0,
    ) as CalendarDay;

    return day;
  }

  public getColumnIndex(time: IMoment) {
    const { start: absStart } = this.props.dayTimeRange;

    const start = time
      .clone()
      .hour(absStart.hour())
      .minute(absStart.minute());
    const step = this.props.mainColumnStep;
    return Math.floor(time.diff(start, 'minute') / step.asMinutes());
  }

  public getColumnByRange(range: DateRange, calendarDay?: ICalendarDay) {
    const day = calendarDay || this.getDayByStamp(range.start);
    const columnIndexes = this.state.stamps
      .map((stamp, index) => [stamp, index])
      .filter(([stamp, index]) => {
        const startDiff = range.start.diff(stamp, 'minute');
        const endDiff = range.end.diff(stamp, 'minute');

        const { mainColumnStep } = this.props;
        const step = mainColumnStep.asMinutes();

        const startIn = startDiff >= 0 && startDiff < step;
        const endIn = endDiff >= 0 && endDiff < step;
        const centerIn = startDiff < 0 && endDiff > 0;

        return startIn || endIn || centerIn;
      })
      .map(([stamp, index]) => index);

    const appointments = Object.values(day.appointments).filter(app =>
      columnIndexes.includes(app.date),
    );

    return appointments;
  }

  public getColumnByStamp(stamp: IMoment, calendarDay?: ICalendarDay) {
    const day = calendarDay || this.getDayByStamp(stamp);
    const targetIndex = this.getColumnIndex(stamp);

    const appointments = Object.values(day.appointments).filter(
      app => this.getColumnIndex(app.date) === targetIndex,
    );

    return appointments;
  }

  @action
  public clearShifts() {
    let shiftsIsEmpty = true;

    Object.entries(this.shifts).forEach(entrie0 => {
      const [dayId] = entrie0;

      if (Object.keys(this.shifts[dayId]).length) {
        for (const x in this.shifts[dayId])
          for (const y in this.shifts[dayId][x])
            this.shifts[dayId][x][y] = { dx: 0, dy: 0 };

        shiftsIsEmpty = false;
        this.shiftsHash[dayId] = v4();
      }
    });
    return shiftsIsEmpty;
  }

  @action
  public lockShifts() {
    const { shifts } = this;
    let shiftsIsEmpty = true;

    Object.entries(shifts).forEach(entrie0 => {
      const [dayId, dayShifts] = entrie0;
      Object.entries(dayShifts).forEach(entrie1 => {
        const [x, row] = entrie1;
        Object.entries(row).forEach(entrie2 => {
          const [y] = entrie2;
          const elem: { dx: number; dy: number } = row[y];

          const day = (this.daysContainerRef
            .current as HTMLElement).querySelector(`#${dayId}`) as HTMLElement;
          const gridCell = day.querySelector(
            `[data-x="${x}"][data-y="${y}"]`,
          ) as HTMLElement;

          const appCells = gridCell.querySelectorAll('.appointmentCell');

          appCells.forEach(appCell => {
            const appointmentId = appCell.id;
            const app = Appointment.fromIdentifier(appointmentId);
            const { stamp: targetStamp, position } = CalendarCard.getCellInfo(
              gridCell,
            );

            targetStamp.hour(app.date.hour()).minute(app.date.minute());

            this.props.updateAppointment({
              date: app.date,
              targetDate: targetStamp.add(
                this.props.mainColumnStep.asMinutes() * elem.dx,
                'minute',
              ),
              targetPosition: position + elem.dy,
              uniqueId: app.uniqueId,
            });
          });
        });
      });

      if (Object.keys(this.shifts[dayId]).length) {
        this.shifts[dayId] = {};
        shiftsIsEmpty = false;

        this.shiftsHash[dayId] = v4();

        console.log('locked');
      } else console.log('nothing to lock');
    });

    // console.log('shift', JSON.stringify(this.shifts));

    return shiftsIsEmpty;
  }

  @action
  public mergeShifts(
    dayId: string,
    shifts: Array<{ x: number; y: number; dx: number; dy: number }>,
  ) {
    if (!(dayId in this.shifts)) {
      console.log('init day', dayId);
      this.shifts[dayId] = {};
    }

    Object.entries(this.shifts[dayId]).forEach(entrie0 => {
      const [x, row] = entrie0;
      const ix = parseInt(x, 10);
      Object.keys(row).forEach(y => {
        const iy = parseInt(y, 10);
        if (!shifts.find(shift => shift.x === ix && shift.y === iy))
          shifts.push({ x: ix, y: iy, dx: 0, dy: 0 });
      });
    });

    shifts.forEach(({ x, y, dx, dy }) => {
      if (!(x in this.shifts[dayId])) this.shifts[dayId][x] = {};

      if (!this.shifts[dayId][x][y])
        this.shifts[dayId][x][y] = { dx: 0, dy: 0 };
      const shift = this.shifts[dayId][x][y];

      if (shift.dx !== dx || shift.dy !== dy) {
        this.shifts[dayId][x][y].dx = dx;
        this.shifts[dayId][x][y].dy = dy;
      }
    });

    this.shiftsHash[dayId] = v4();
  }

  @action
  public shiftMultipleCells(
    dayId: string,
    shifts: Array<{ x: number; y: number; dx: number; dy: number }>,
  ) {
    if (!shifts.length) return;

    if (!(dayId in this.shifts)) this.shifts[dayId] = {};

    shifts.forEach(({ x, y, dx, dy }) => {
      if (!(x in this.shifts[dayId])) this.shifts[dayId][x] = {};

      this.shifts[dayId][x][y] = { dx, dy };
    });

    this.shiftsHash[dayId] = v4();
  }

  @action
  public shiftCell(
    dayId: string,
    x: number,
    y: number,
    dx: number,
    dy: number,
  ) {
    if (!(dayId in this.shifts)) this.shifts[dayId] = {};

    if (!(x in this.shifts[dayId])) this.shifts[dayId][x] = {};

    this.shifts[dayId][x][y] = { dx, dy };

    // console.log('shift', JSON.stringify(this.shifts[dayId]));
  }

  public unShiftCell(dayId: string, x: number, y: number, stack = false) {
    if (x in this.shifts[dayId]) {
      if (!(y in this.shifts[dayId][x])) return;

      this.unShitsCellActually.apply(this, arguments);

      return true;
    }

    return false;
  }

  @action
  public unShitsCellActually(
    dayId: string,
    x: number,
    y: number,
    stack = false,
  ) {
    delete this.shifts[dayId][x][y];
    if (!Object.keys(this.shifts[dayId][x]).length)
      delete this.shifts[dayId][x];

    if (!stack) this.shiftsHash[dayId] = v4();
  }

  public updateDropzones() {
    function getDropStamp(
      targetStamp: IMoment,
      target: HTMLElement,
      pos: { x: number; y: number },
      subGridColumns: number,
      mainColumnStep: Moment.Duration,
    ) {
      const cellRect = target.getBoundingClientRect();
      const leftOffset = pos.x - cellRect.left;
      const step = cellRect.width / subGridColumns;
      let subGridScale = Math.floor(leftOffset / step);

      if (subGridScale < 0) {
        subGridScale += subGridColumns;
        targetStamp.subtract(mainColumnStep);
      }

      const subGridDuration = Moment.duration(
        (mainColumnStep.asSeconds() / subGridColumns) * subGridScale,
        'second',
      );

      targetStamp.add(subGridDuration);
      return targetStamp;
    }

    const minColumn = this.currentLeftColumnIndex;
    const maxColumn = this.currentLeftColumnIndex + this.state.columnsPerPage;
    const minDay = Math.floor(minColumn / this.state.columnsPerDay);
    const maxDay = Math.ceil(maxColumn / this.state.columnsPerDay) + 1;

    Array.from(
      (this.daysContainerRef.current as HTMLDivElement).querySelectorAll(
        '.dayWrapper',
      ),
    ).forEach((child, index) => {
      const selector = `#${child.id} .gridCell`;
      let lastRange: DateRange | null = null;
      let lastPosition: number | null = null;

      if (index >= minDay && index <= maxDay)
        interact(selector).dropzone(
          ((): interact.DropZoneOptions => {
            const lastCoords = { x: 0, y: 0 };

            return {
              accept: '.appointmentCell .container .containerTempWidth',
              ondragenter: e => {
                const {
                  target,
                }: {
                  target: HTMLElement;
                } = e;
                let {
                  relatedTarget,
                }: {
                  relatedTarget: HTMLElement;
                } = e;
                relatedTarget = (relatedTarget.parentNode as HTMLElement)
                  .parentNode as HTMLElement; // go up from .containerTempWidth to .appointmentCell

                target.classList.add('enter');
              },
              ondragleave: e => {
                const {
                  target,
                }: {
                  target: HTMLElement;
                } = e;
                let {
                  relatedTarget,
                }: {
                  relatedTarget: HTMLElement;
                } = e;
                relatedTarget = (relatedTarget.parentNode as HTMLElement)
                  .parentNode as HTMLElement; // go up from .containerTempWidth to .appointmentCell

                target.classList.remove('enter', 'locked');
                target.style.background = '';
              },
              ondrop: e => {
                const {
                  target,
                }: {
                  target: HTMLElement;
                } = e;
                let {
                  relatedTarget,
                }: {
                  relatedTarget: HTMLElement;
                } = e;
                relatedTarget = (relatedTarget.parentNode as HTMLElement)
                  .parentNode as HTMLElement; // go up from .containerTempWidth to .appointmentCell

                const appointmentId = relatedTarget.id;
                const app = Appointment.fromIdentifier(appointmentId);
                const { stamp, position } = CalendarCard.getCellInfo(target);

                const dropStamp = getDropStamp(
                  stamp,
                  target,
                  lastCoords,
                  this.props.subGridColumns,
                  this.props.mainColumnStep,
                );
                const isFree = this.freePlaceToDrop({
                  dateRange: moment.range(
                    dropStamp,
                    dropStamp.clone().add(app.duration),
                  ),
                  position,
                  uniqueId: app.uniqueId,
                });

                this.shiftsCache = {};
                console.log('clear cache');

                if (!isFree) {
                  console.log('locked');
                  return;
                }
                console.log('drop');

                this.lockShifts();

                this.props.updateAppointment({
                  date: app.date,
                  targetDate: dropStamp,
                  targetPosition: position,
                  uniqueId: app.uniqueId,
                });

                this.checkForOverlaps(stamp);

                this.updateMovingId('');
              },
              ondropactivate: e => {
                const {
                  target,
                }: {
                  target: HTMLElement;
                } = e;
                let {
                  relatedTarget,
                }: {
                  relatedTarget: HTMLElement;
                } = e;
                relatedTarget = (relatedTarget.parentNode as HTMLElement)
                  .parentNode as HTMLElement; // go up from .containerTempWidth to .appointmentCell

                // target.classList.add('dropzone', 'active');
                target.classList.remove('locked');
                // target.style.background = '';

                // console.warn('activate');
              },
              ondropdeactivate: e => {
                const {
                  target,
                }: {
                  target: HTMLElement;
                } = e;
                let {
                  relatedTarget,
                }: {
                  relatedTarget: HTMLElement;
                } = e;
                relatedTarget = (relatedTarget.parentNode as HTMLElement)
                  .parentNode as HTMLElement; // go up from .containerTempWidth to .appointmentCell

                target.classList.remove(
                  'dropzone',
                  'active',
                  'enter',
                  'locked',
                );
                target.style.background = '';
              },
              ondropmove: e => {
                const {
                  target,
                }: {
                  target: HTMLElement;
                } = e;
                let {
                  relatedTarget,
                }: {
                  relatedTarget: HTMLElement;
                } = e;
                relatedTarget = (relatedTarget.parentNode as HTMLElement)
                  .parentNode as HTMLElement; // go up from .containerTempWidth to .appointmentCell

                const rect = relatedTarget.getBoundingClientRect();
                lastCoords.x = rect.left;
                lastCoords.y = rect.top;

                // const app = target.querySelector(`#${relatedTarget.id}`);
                // if (app) target.classList.remove('locked');

                const appointmentId = relatedTarget.id;
                const app = Appointment.fromIdentifier(appointmentId);
                const { stamp, position } = CalendarCard.getCellInfo(target);

                // const isFree = this.freeCell(relatedTarget, target);
                const dropStamp = getDropStamp(
                  stamp,
                  target,
                  lastCoords,
                  this.props.subGridColumns,
                  this.props.mainColumnStep,
                );

                const range = moment.range(
                  dropStamp,
                  dropStamp.clone().add(app.duration),
                );

                if (
                  lastRange &&
                  lastRange.isSame(range) &&
                  lastPosition &&
                  lastPosition === position
                )
                  return;

                lastRange = range;
                lastPosition = position;

                this.freePlaceToDrop({
                  dateRange: range,
                  position,
                  uniqueId: app.uniqueId,
                });
              },
              overlap: 'leftCenter',
            };
          })(),
        );
      else interact(selector).dropzone({});
    });
  }

  public componentDidMount() {
    window.addEventListener('keydown', e => {
      switch (e.code) {
        case 'ArrowRight':
          this.turnPage(1);
          break;
        case 'ArrowLeft':
          this.turnPage(-1);
          break;
      }
    });

    this.currentLeftColumnIndex =
      Math.floor(this.state.requiredDays.length / 2) * this.state.columnsPerDay;

    this.startResizeHandling();
    this.startScrollHandling();
    this.updateColumnsCount();
    this.updateBoundingRect();

    setTimeout(() => {
      this.updateDaysWidth();

      this.updateScroll(true);

      this.setState({ loading: false });
    });
  }

  public componentDidUpdate(prevProps: IProps) {
    if (this.props.days.length !== this.currentDaysCount) {
      this.updateDropzones();
      this.currentDaysCount = this.props.days.length;
    }

    if (this.props.days.length)
      if (!this.currentFirstDay) this.currentFirstDay = this.props.days[0];
      else {
        const lastDayNowIndex = this.props.days.findIndex(
          d =>
            d.date
              .clone()
              .startOf('day')
              .diff(this.currentFirstDay.date.clone().startOf('day'), 'day') ===
            0,
        );
        this.currentFirstDay = this.props.days[0];

        if (lastDayNowIndex !== 0) {
          this.currentLeftColumnIndex += this.state.columnsPerDay;
          this.updateScroll(true);
        }
        // if (lastDayNowIndex !== 0) this.updateScroll(false);
      }

    // OPTIMIZE
    this.state.requiredDays.forEach(day => {
      if (!this.props.days.find(d => d.date.diff(day, 'days') === 0))
        this.props.requestCallback(day);
    });

    // if (prevProps.days.length !== this.props.days.length) this.updateScroll();

    if (this.shouldUpdateVisibility) {
      this.updateVisibility([
        this.currentLeftColumnIndex,
        this.currentLeftColumnIndex + this.state.columnsPerPage,
      ]);
      this.shouldUpdateVisibility = false;
    }
  }

  public turnPage(delta: -1 | 1) {
    if (this.isScrolling) return;

    const index =
      this.currentLeftColumnIndex + this.state.columnsPerPage * 2 * delta;
    if (index < 0) {
      this.shouldUpdateVisibility = true;
      this.props.requestCallback(
        this.props.days[0].date.clone().subtract(1, 'day'),
      );

      this.turnPage(delta);
      return;
    } else if (
      index + this.state.columnsPerPage * 2 >
      this.props.days.length * this.state.columnsPerDay - 1
    )
      this.props.requestCallback(
        this.props.days[
          this.props.days.length === 0 ? 0 : this.props.days.length - 1
        ].date
          .clone()
          .add(1, 'day'),
      );

    setTimeout(() =>
      this.updateVisibility([
        this.currentLeftColumnIndex,
        Math.min(
          Math.max(index, 0),
          this.props.days.length * this.state.columnsPerDay - 1,
        ),
      ]),
    );

    this.currentLeftColumnIndex = Math.min(
      Math.max(
        this.currentLeftColumnIndex +
          Math.floor((delta * this.state.columnsPerPage) / 2),
        0,
      ),
      this.props.days.length * this.state.columnsPerDay - 1,
    );

    this.updateScroll();
  }

  public getSnapshotBeforeUpdate(prevProps: IProps) {
    this.shouldUpdateVisibility =
      this.props.days.length === prevProps.days.length;

    return true;
  }

  public updateStickyElements(force = false) {
    enum StringBoolean {
      false = '',
      true = 'true',
    }

    interface IStickyProps {
      initialized?: StringBoolean;
      isSticky?: StringBoolean;
    }

    interface IStickyHTMLElement extends HTMLElement {
      dataset: DOMStringMap & IStickyProps;
    }

    function init(elem: IStickyHTMLElement) {
      elem.dataset.isSticky = StringBoolean.false;
      elem.dataset.initialized = StringBoolean.true;
    }

    function makeSticky(
      elem: IStickyHTMLElement,
      parentR: ClientRect,
      f: boolean,
    ) {
      if (elem.dataset.isSticky && !f) return;

      elem.style.position = 'fixed';
      elem.style.top = '0px';
      elem.style.zIndex = '1000';
      elem.style.width = `${parentR.width}px`;

      elem.dataset.isSticky = StringBoolean.true;
    }

    function makeUnSticky(elem: IStickyHTMLElement, f: boolean) {
      if (!elem.dataset.isSticky && !f) return;

      elem.style.position = '';
      elem.style.top = '';

      elem.dataset.isSticky = StringBoolean.false;
    }

    const stickyElement = document.querySelector(
      '.viewPortContainer',
    ) as IStickyHTMLElement;
    const { dataset }: { dataset: IStickyProps } = stickyElement;
    const { initialized } = dataset;

    if (!initialized) init(stickyElement);

    const rect = stickyElement.getBoundingClientRect();
    const parentRect = (stickyElement.parentElement as HTMLElement).getBoundingClientRect();

    const overflowTop = parentRect.top <= 0 && rect.top >= parentRect.top;

    if (overflowTop || force) makeSticky(stickyElement, parentRect, force);
    else makeUnSticky(stickyElement, force);
  }

  public updateScroll(force = false) {
    const container = this.daysContainerRef.current as HTMLDivElement;
    const dayIndex = Math.floor(
      this.currentLeftColumnIndex / this.state.columnsPerDay,
    );
    const day = container.querySelectorAll('.dayWrapper')[
      dayIndex
    ] as HTMLElement;

    const gridsContainer = container.querySelector(
      '.gridsContainer',
    ) as HTMLElement;
    const topRowsContainer = container.querySelector(
      '.topRowsContainer .scrollingContainer',
    ) as HTMLElement;

    const grid = day.querySelector('.grid') as HTMLElement;
    const dayColumnIndex =
      this.currentLeftColumnIndex - dayIndex * this.state.columnsPerDay;
    const appointmentCell = grid.children[dayColumnIndex];

    const left = Math.round(
      appointmentCell.getBoundingClientRect().left -
        gridsContainer.getBoundingClientRect().left +
        gridsContainer.scrollLeft,
    );

    // container.scrollTo({
    //   behavior: force ? 'auto' : 'smooth',
    //   left,
    // });

    gridsContainer.scrollTo({
      behavior: force ? 'auto' : 'smooth',
      left,
    });

    topRowsContainer.scrollTo({
      behavior: force ? 'auto' : 'smooth',
      left,
    });

    if (force || Math.abs(left - gridsContainer.scrollLeft) < 5) return;

    this.pageTurnEmitter.emit('freeze');
    this.isScrolling = true;

    const callback = () => {
      clearTimeout(this.containerScrollTimeout);

      this.containerScrollTimeout = setTimeout(() => {
        this.updateVisibility([
          this.currentLeftColumnIndex,
          this.currentLeftColumnIndex + this.state.columnsPerPage,
        ]);
        gridsContainer.removeEventListener('scroll', callback);

        this.isScrolling = false;
        this.pageTurnEmitter.emit('resume');

        // window.dispatchEvent(new Event('scroll'));
        // setTimeout(() => window.dispatchEvent(new Event('scroll')));
      }, 50);

      // too perfomance-heavy
      // window.dispatchEvent(new Event('scroll'));
    };

    gridsContainer.addEventListener('scroll', callback);
  }

  public updateVisibility(indexes: number[]) {
    const minColumn = Math.min(...indexes);
    const maxColumn = Math.max(...indexes);
    const minDay = Math.floor(minColumn / this.state.columnsPerDay) - 1;
    const maxDay = Math.ceil(maxColumn / this.state.columnsPerDay) + 1;

    Array.from(
      (this.daysContainerRef.current as HTMLDivElement).querySelectorAll(
        '.dayWrapper',
      ),
    ).forEach((child, index) => {
      if (index >= minDay && index <= maxDay) child.classList.remove('hidden');
      else child.classList.add('hidden');
    });
  }

  public updateDaysWidth() {
    const dayWidth = this.calcDaysWidth();
    const state = { dayWidth };

    const justACell = (this.daysContainerRef
      .current as HTMLElement).querySelector('.appointmentCell') as HTMLElement;
    if (justACell)
      Object.assign(state, {
        cellWidth: justACell.getBoundingClientRect().width,
      });

    this.setState(state);
  }

  public updateColumnsCount() {
    const containerWidth = (this.daysContainerRef.current as HTMLDivElement)
      .offsetWidth;
    const count = CalendarCard.calcColumnsCount(
      containerWidth,
      calendarCellMinWidth,
    );
    this.setState({ columnsPerPage: count });
  }

  public calcDaysWidth() {
    const { columnsPerDay, columnsPerPage } = this.state;
    const containerWidth = (this.daysContainerRef.current as HTMLDivElement)
      .offsetWidth;
    const dayWidth = CalendarCard.calcDaySize(
      columnsPerPage,
      columnsPerDay,
      containerWidth,
    );

    return dayWidth <= 0 ? '100%' : `${dayWidth}px`;
  }

  public updateBoundingRect() {
    this.clientRect = this.daysContainerRef.current
      ? (this.daysContainerRef.current as HTMLElement).getBoundingClientRect()
      : { top: 0, right: 0, left: 0, bottom: 0, width: 0, height: 0 };
  }

  public render() {
    const { columnsPerDay, stamps, dayWidth } = this.state;
    const { subGridColumns, positionCount, mainColumnStep } = this.props;

    this.props.days.forEach(day => {
      const { id } = day;
      const dayId = `${id}`;
      if (!(dayId in this.shifts)) this.shifts[dayId] = {};
    });

    return (
      <Card
        cardClass="calendarCard"
        style={
          {
            '--rows-count': positionCount,
            '--sub-columns-count:': subGridColumns,
          } as React.CSSProperties
        }
      >
        <LeftColumn positionCount={positionCount} />
        <div
          className={`daysContainer ${this.state.loading ? 'loading' : ''}`}
          ref={this.daysContainerRef}
        >
          <div className="topRowsContainer">
            <div className="viewPortContainer">
              <div className="scrollingContainer">
                <div className="stickyContainer">
                  {this.props.days.map(day => (
                    <TopRow
                      stamps={stamps}
                      key={day.date.toString()}
                      style={{ width: dayWidth }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="gridsContainer">
            {this.props.days.map(day => (
              <Day
                key={day.date.toString()}
                rows={positionCount}
                cols={columnsPerDay || 0}
                dayData={day}
                stamps={stamps}
                dayWidth={dayWidth}
                shifts={this.shifts[day.id]}
                shiftsHash={this.shiftsHash[day.id]}
                updateAppointment={this.props.updateAppointment}
                subGridColumns={subGridColumns}
                mainColumnStep={mainColumnStep}
                movingId={this.movingId}
              />
            ))}
          </div>
          <ToggleArea
            id="leftToggleArea"
            style={{
              height: `${this.clientRect.height}px`,
              left: `${this.clientRect.left}px`,
              top: `${this.clientRect.top}px`,
              width: `${calendarCellMinWidth / 2}px`,
            }}
            action={this.turnPageLeft}
            delay={200}
            controller={this.pageTurnEmitter}
          />
          <ToggleArea
            id="rightToggleArea"
            style={{
              height: `${this.clientRect.height}px`,
              left: `calc(${this.clientRect.left +
                this.clientRect.width}px - ${calendarCellMinWidth / 2}px)`,
              top: `${this.clientRect.top}px`,
              width: `${calendarCellMinWidth / 2}px`,
            }}
            action={this.turnPageRight}
            delay={200}
            controller={this.pageTurnEmitter}
          />
        </div>
      </Card>
    );
  }

  private startResizeHandling(
    { boundTime }: { boundTime: number } = { boundTime: 250 },
  ) {
    let resizeTimeout: NodeJS.Timeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.updateColumnsCount();
        this.updateDaysWidth();
        this.updateScroll(true);
        this.updateBoundingRect();

        setTimeout(() => this.updateStickyElements(true));
      }, boundTime);
    });
  }

  private startScrollHandling(
    { boundTime }: { boundTime: number } = { boundTime: 250 },
  ) {
    // let scrollTimeout: NodeJS.Timeout;
    window.addEventListener('scroll', () => {
      this.updateStickyElements();
      // clearTimeout(scrollTimeout);
      // scrollTimeout = setTimeout(() => {

      // }, boundTime);
    });
  }
}
