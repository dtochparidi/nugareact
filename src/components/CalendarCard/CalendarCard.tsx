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

                const range = moment.range(
                  app.date,
                  app.date.clone().add(duration),
                );
                const day = this.getDayByStamp(app.date);

                const overlapping = Object.values(day.appointments).some(
                  otherApp =>
                    otherApp.position === app.position &&
                    otherApp.uniqueId !== app.uniqueId &&
                    otherApp.dateRange.overlaps(range),
                );
                if (overlapping) {
                  console.log('overlaps!');
                  return;
                }

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

    const day = this.getDayByStamp(movingApp.dateRange.start);

    const shiftsCache = this.shiftsCache;

    const restoreShiftsFromCache = (id: string): IOffsetMap | false =>
      day.id in shiftsCache && shiftsCache[day.id][id];

    const cacheShifts = (id: string, offsets: IOffsetMap) => {
      if (!(day.id in shiftsCache)) shiftsCache[day.id] = {};
      shiftsCache[day.id][id] = offsets;
    };

    const calcShiftCascadeIdentifier = (
      fixedApp: {
        uniqueId: string;
        position: number;
        dateRange: DateRange;
      },
      fixedIds: string[],
      collisingApp: Appointment[],
      priorityDirection: Direction,
    ) =>
      movingApp.dateRange.start.format('mm:HH') +
      movingApp.position +
      fixedApp.uniqueId +
      fixedApp.position +
      priorityDirection.toString() +
      collisingApp.map(app => app.uniqueId).join('') +
      fixedIds.join('');

    const calcOffsetMap = (
      fixedApp: {
        uniqueId: string;
        position: number;
        dateRange: DateRange;
      },
      positionsOffset: IOffsetMap,
      priorityDirection: Direction = Direction.Top,
      fixedIds: string[] = [],
    ): IOffsetMap | false => {
      const filledColumn = new Array(this.props.positionCount).fill(null).map(
        () =>
          [] as Array<{
            uniqueId: string;
            position: number;
            dateRange: DateRange;
          }>,
      );
      const nearCollisingApps = Object.values(day.appointments).filter(
        app =>
          app.uniqueId !== fixedApp.uniqueId &&
          app.uniqueId !== movingApp.uniqueId &&
          app.dateRange.overlaps(fixedApp.dateRange),
      );

      // try to restore cache
      const shiftCascadeIdentifier = calcShiftCascadeIdentifier(
        fixedApp,
        fixedIds,
        nearCollisingApps,
        priorityDirection,
      );
      const restoredShifts = restoreShiftsFromCache(shiftCascadeIdentifier);

      if (restoredShifts) {
        console.log('restored from cache');
        return restoredShifts;
      }

      nearCollisingApps.forEach(app =>
        filledColumn[
          app.position + (positionsOffset[app.uniqueId] || { dy: 0 }).dy
        ].push(app),
      );

      const fixedAppPosition =
        fixedApp.position +
        (positionsOffset[fixedApp.uniqueId] || { dy: 0 }).dy;

      // add moving app
      if (movingApp.uniqueId !== fixedApp.uniqueId)
        filledColumn[movingApp.position].push(movingApp);

      if (!filledColumn[fixedAppPosition].length) return positionsOffset;

      const getOvelaps = (
        position: number,
        app: {
          uniqueId: string;
          position: number;
          dateRange: DateRange;
        },
        d: number,
      ):
        | [
            Array<
              | Appointment
              | {
                  uniqueId: string;
                  position: number;
                  dateRange: DateRange;
                }
            >,
            number
          ]
        | false => {
        const nextPosition = position + d;
        const inBound = nextPosition >= 0 && nextPosition < filledColumn.length;

        if (!inBound) return false;

        const apps = filledColumn[position].filter(nextApp =>
          nextApp.dateRange.overlaps(app.dateRange),
        );

        if (
          apps.some(
            a =>
              a.uniqueId === movingApp.uniqueId ||
              fixedIds.some(fixedId => a.uniqueId === fixedId),
          )
        )
          return false;

        return [apps, d];
      };

      const startDelta = priorityDirection === Direction.Top ? -1 : 1;
      const possibleDeltas = [startDelta, startDelta * -1];

      const finalOffsets = possibleDeltas.reduce((acc: IOffsetMap, delta) => {
        if (acc) return acc;

        const overlaps = getOvelaps(fixedAppPosition, fixedApp, delta);

        if (!overlaps) return false;

        const [overlappingApps, shiftDelta] = overlaps;

        const newFixedIds = fixedIds.map(id => id);
        if (fixedApp.uniqueId !== movingApp.uniqueId)
          newFixedIds.push(fixedApp.uniqueId);

        if (!overlappingApps) return false;

        // copy of positionsOffset object
        const newOffsets = Object.entries(positionsOffset).reduce(
          (newObj, [id, deltas]) => {
            newObj[id] = { dx: deltas.dx, dy: deltas.dy };
            return newObj;
          },
          {},
        );

        // add offsets
        overlappingApps.forEach(app => {
          if (!(app.uniqueId in newOffsets))
            newOffsets[app.uniqueId] = { dx: 0, dy: shiftDelta };
          else newOffsets[app.uniqueId].dy += shiftDelta;
        });

        const currentOffsetMap = overlappingApps.reduce(
          (offsets: IOffsetMap | false, app) => {
            if (!offsets) return false;

            const newOffsetMap = calcOffsetMap(
              app,
              offsets,
              priorityDirection,
              newFixedIds,
            );

            return newOffsetMap;
          },
          newOffsets,
        );

        return currentOffsetMap;
      }, false);

      if (finalOffsets) cacheShifts(shiftCascadeIdentifier, finalOffsets);

      return finalOffsets;
    };

    const offsetMap = calcOffsetMap(movingApp, {});

    if (!offsetMap) {
      this.clearShifts();
      return false;
    }

    applyShifts(day, offsetMap);

    return true;
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
      }
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
        </div>
        <ToggleArea
          id="leftToggleArea"
          style={{
            height: `${this.clientRect.height}px`,
            left: '0px',
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
            left: '',
            right: '0px',
            top: `${this.clientRect.top}px`,
            width: `${calendarCellMinWidth / 2}px`,
          }}
          action={this.turnPageRight}
          delay={200}
          controller={this.pageTurnEmitter}
        />
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
