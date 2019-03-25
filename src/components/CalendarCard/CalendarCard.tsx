import { observer } from 'mobx-react';
import * as Moment from 'moment';
import { Duration as IDuration, Moment as IMoment } from 'moment';
import { DateRange, extendMoment } from 'moment-range';
import * as React from 'react';
import * as ReactCSSTransitionReplace from 'react-css-transition-replace';
import { v4 } from 'uuid';

import ICalendarDay from '../../interfaces/ICalendarDay';
import Card from '../Card';
import Day, { DateRow } from './Day';
import LeftColumn from './LeftColumn';

import * as StyleVariables from '../../common/variables.scss';
import * as CardVariables from './CalendarCard.scss';
import './CalendarCard.scss';

import * as interact from 'levabala_interactjs';
import CalendarDay from 'structures/CalendarDay';
import { clientSide } from '../../dev/clientSide';
import Appointment from '../../structures/Appointment';
import createDragConfig from './modules/dragConfig';
import ToggleArea from './ToggleArea';

import * as Emitter from 'events';
import IUpdateAppProps from 'interfaces/IUpdateAppProps';
import { action, observable } from 'mobx';
import MonthRow from './Day/MonthRow';
import TopRow from './Day/TopRow';
import { generateDropzoneConfig } from './modules/dropzoneConfig';
import { generateResizeConfig } from './modules/resizeConfig';
import {
  calcColumnsCount,
  calcDaySize,
  getCellInfo,
  updateStickyElements,
} from './modules/staticMethods';

const calendarCellMinWidth = parseFloat(CardVariables.calendarCellWidthMin);
const thinWidth = parseFloat(StyleVariables.thinWidth);

const moment = extendMoment(Moment);

if (clientSide) (interact as any).dynamicDrop(true);

export interface IProps {
  fastMode: boolean;
  days: CalendarDay[];
  dayTimeRange: DateRange;
  dayTimeRangeActual: DateRange;
  positionCount: number;
  subGridColumns: number;
  requestCallback: (date: Moment.Moment) => void;
  removeDays: (indexStart: number, indexEnd: number) => void;
  mainColumnStep: IDuration;
  updateAppointment: (props: IUpdateAppProps) => void;
}

export interface IState {
  requiredDays: IMoment[];
  columnsPerPage: number;
  columnsPerDay: number;
  dayWidth: string;
  cellWidth: number;
  leftColumnWidth: number;
  loading: boolean;
  stamps: IMoment[];
}

export enum Direction {
  Top = -1,
  Bottom = 1,
  None = 0,
}

@observer
export default class CalendarCard extends React.Component<IProps, IState> {
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
  @observable
  public currentDayNumber: number;
  @observable
  public monthStartDate: IMoment = moment();
  @observable
  public visibilityMap: { [dayId: string]: boolean } = {};
  public currentDayIndex: number = 0;

  public currentLeftColumnIndex: number = 0;
  public lazyLoadDays: IMoment[] = [];
  public shiftsCache: {
    [dayId: string]: {
      [shiftId: string]: { [uniqueId: string]: { dx: number; dy: number } };
    };
  } = {};

  private daysContainerRef: React.RefObject<HTMLDivElement>;
  private containerScrollTimeout: NodeJS.Timeout;
  private currentDaysCount: number = 0;
  private isScrolling: boolean = false;
  private pageTurnEmitter: Emitter;
  // private clientRect: ClientRect;
  private activatedDropzones: string[] = [];
  private tooFarPagesTrigger = 2;
  private jumpToDayHandler: (index: number) => void;
  private dropzoneConfig = generateDropzoneConfig.bind(this)();

  constructor(props: IProps) {
    super(props);

    this.daysContainerRef = React.createRef();
    this.pageTurnEmitter = new Emitter();

    this.jumpToDayHandler = this.jumpToDay.bind(this);

    const mainColumnStep = Moment.duration(45, 'minutes');
    const actualRange = this.props.dayTimeRangeActual.clone();
    actualRange.end.subtract(mainColumnStep);

    const stamps = Array.from(
      actualRange.by('seconds', {
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
        .resizable(generateResizeConfig.bind(this)());

    this.state = {
      cellWidth: 0,
      columnsPerDay: stamps.length,
      columnsPerPage: 4,
      dayWidth: '100%',
      leftColumnWidth: 30,
      loading: true,
      requiredDays: [moment().startOf('day')],
      stamps,
    };

    // this.updateBoundingRect();
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

  public removeTooFarDays() {
    let from: number | null = null;
    let to: number | null = null;
    Object.values(this.props.days).forEach((day, i) => {
      const dayLeftColumnIndex = i * this.state.columnsPerDay;
      const dayRightColumnIndex = dayLeftColumnIndex + this.state.columnsPerDay;
      const diffs = Math.min(
        Math.abs(dayLeftColumnIndex - this.currentLeftColumnIndex),
        Math.abs(
          dayLeftColumnIndex +
            dayRightColumnIndex -
            this.currentLeftColumnIndex,
        ),
        Math.abs(
          dayLeftColumnIndex -
            this.currentLeftColumnIndex -
            this.state.columnsPerDay,
        ),
        Math.abs(
          dayLeftColumnIndex +
            dayRightColumnIndex -
            this.currentLeftColumnIndex -
            this.state.columnsPerDay,
        ),
      );
      const pagesDiff = diffs / this.state.columnsPerPage;

      const dayElem = document.querySelector(`#${day.id}`) as HTMLElement;
      if (
        pagesDiff > this.tooFarPagesTrigger &&
        !dayElem.classList.contains('dragOrigin')
      ) {
        if (from === null) from = i;
        to = i;
      }
    });

    if (from !== null && to !== null) {
      const reduceColumnIndexAmount =
        from < this.currentDayIndex
          ? this.state.columnsPerDay * (to - from + 2)
          : 0;
      this.currentLeftColumnIndex -= reduceColumnIndexAmount;
      this.currentLeftColumnIndex = Math.max(this.currentLeftColumnIndex, 0);

      console.log(this.currentLeftColumnIndex, -1 * reduceColumnIndexAmount);

      this.state.requiredDays.splice(from, to - from + 1);
      this.setState({ requiredDays: this.state.requiredDays });

      this.props.removeDays(from, to);

      this.updateScroll(true);
    }
  }

  public unshiftWholeColumn(target: HTMLElement) {
    const { stamp } = getCellInfo(target);
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
            const { stamp: targetStamp, position } = getCellInfo(gridCell);

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

    return shiftsIsEmpty;
  }

  @action
  public mergeShifts(
    dayId: string,
    shifts: Array<{ x: number; y: number; dx: number; dy: number }>,
  ) {
    if (!(dayId in this.shifts)) this.shifts[dayId] = {};

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

  public updateDropzones(minDay: number, maxDay: number) {
    Array.from(
      (this.daysContainerRef.current as HTMLDivElement).querySelectorAll(
        '.dayWrapper',
      ),
    ).forEach((child, index) => {
      const selector = `#${child.id} .grid`;

      const includes = this.activatedDropzones.includes(selector);
      if (index >= minDay && index <= maxDay && !includes) {
        interact(selector).dropzone(this.dropzoneConfig);
        this.activatedDropzones.push(selector);
      } else if (includes) {
        interact(selector).dropzone({});
        this.activatedDropzones.splice(
          this.activatedDropzones.indexOf(selector),
          1,
        );
      }
    });
  }

  public updateRequiredDays(compensate = true, pendingOffset = 0) {
    const container = this.daysContainerRef.current as HTMLDivElement;

    const { days } = this.props;
    const firstDay = days[0];
    const firstDayElem = document.getElementById(firstDay.id) as HTMLElement;

    const firstDayRect = firstDayElem.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const buffer = Math.max(containerRect.width, firstDayRect.width);

    const leftBorderOffset =
      firstDayRect.left + buffer - (containerRect.left + pendingOffset);
    const rightBorderOffset =
      containerRect.right +
      buffer -
      (firstDayRect.left + firstDayRect.width * days.length + pendingOffset);

    let leftAddCount = Math.max(
      Math.ceil(leftBorderOffset / firstDayRect.width),
      0,
    );
    let rightAddCount = Math.max(
      Math.ceil(rightBorderOffset / firstDayRect.width),
      0,
    );

    const changeDeltaAbs = leftAddCount + rightAddCount;

    if (compensate)
      this.currentLeftColumnIndex += leftAddCount * this.state.columnsPerDay;

    while (leftAddCount--)
      this.state.requiredDays.unshift(
        this.state.requiredDays[0].clone().subtract(1, 'day'),
      );

    while (rightAddCount--)
      this.state.requiredDays.push(
        this.state.requiredDays[this.state.requiredDays.length - 1]
          .clone()
          .add(1, 'day'),
      );

    this.setState({ requiredDays: this.state.requiredDays });

    return compensate && changeDeltaAbs > 0;
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

    this.startResizeHandling();
    this.startScrollHandling();
    this.updateColumnsCount();
    // this.updateBoundingRect();

    setTimeout(() => {
      this.setState({ loading: false });
      this.updateDaysWidth();
      this.updateScroll(true);

      this.updateRequiredDays(false);

      this.currentLeftColumnIndex =
        Math.floor((this.state.requiredDays.length - 1) / 2) *
        this.state.columnsPerDay;

      this.updateVisibility([
        this.currentLeftColumnIndex,
        this.currentLeftColumnIndex + this.state.columnsPerPage,
      ]);

      setTimeout(() => {
        this.updateDaysWidth();
        this.updateScroll(true);
      });
    });
  }

  @action
  public updateVisibilityMap() {
    this.props.days.forEach(day => {
      if (!(day.id in this.visibilityMap)) this.visibilityMap[day.id] = true;
    });
  }

  public componentDidUpdate(prevProps: IProps) {
    if (this.props.days.length !== this.currentDaysCount)
      this.currentDaysCount = this.props.days.length;

    this.updateVisibilityMap();

    this.state.requiredDays
      .filter(day => !this.lazyLoadDays.includes(day))
      .forEach(day => {
        if (!this.props.days.find(d => d.date.diff(day, 'days') === 0))
          this.props.requestCallback(day);
      });

    // step-by-step
    const medianDay = this.state.requiredDays
      .map(m => m.clone())
      .sort((a, b) => (a.diff(b) > 0 ? 1 : -1))[
      Math.floor(this.state.requiredDays.length / 2)
    ];
    const sorted = this.state.requiredDays
      .filter(day => this.lazyLoadDays.includes(day))
      .sort((a, b) =>
        Math.abs(medianDay.diff(a)) - Math.abs(medianDay.diff(b)) > 0 ? 1 : -1,
      );
    const unloadedDay = sorted.find(
      day => !this.props.days.find(d => d.date.diff(day, 'days') === 0),
    );
    if (unloadedDay) {
      if (!this.props.days.length) {
        this.props.requestCallback(unloadedDay);
        this.updateCurrentDayData(0);
      } else
        setTimeout(() => {
          this.props.requestCallback(unloadedDay);
        });
      this.lazyLoadDays.splice(this.lazyLoadDays.indexOf(unloadedDay), 1);
    }
  }

  public turnPage(delta: -1 | 1) {
    if (this.isScrolling) return;

    const columnsPerTurn = Math.ceil(this.state.columnsPerPage / 3);
    const pendingOffset = columnsPerTurn * this.state.cellWidth * delta;

    const needUpdateScroll = this.updateRequiredDays(true, pendingOffset);
    if (needUpdateScroll) this.updateScroll(true);

    if (delta > 0)
      this.updateVisibility([
        this.currentLeftColumnIndex,
        this.currentLeftColumnIndex +
          this.state.columnsPerPage +
          columnsPerTurn * delta,
      ]);
    else
      this.updateVisibility([
        this.currentLeftColumnIndex + columnsPerTurn * delta,
        this.currentLeftColumnIndex + this.state.columnsPerPage,
      ]);

    this.currentLeftColumnIndex += columnsPerTurn * delta;

    this.updateScroll();
  }

  @action
  public updateCurrentDayData(dayIndex: number) {
    const newMonthStartDate = this.props.days[dayIndex].date
      .clone()
      .startOf('month');
    this.currentDayNumber = this.props.days[dayIndex].date.date();
    this.currentDayIndex = dayIndex;

    if (
      !this.monthStartDate ||
      newMonthStartDate.format('DD:MM:YYYY') !==
        this.monthStartDate.format('DD:MM:YYYY')
    )
      this.monthStartDate = newMonthStartDate;
  }

  public updateScroll(force = false) {
    const container = this.daysContainerRef.current as HTMLDivElement;
    const dayIndex = Math.floor(
      this.currentLeftColumnIndex / this.state.columnsPerDay,
    );

    this.updateCurrentDayData(dayIndex);

    const gridsContainer = container.querySelector(
      '.gridsContainer',
    ) as HTMLElement;
    const topRowsContainer = container.querySelector(
      '.topRowsContainer .scrollingContainer',
    ) as HTMLElement;

    const gridWidth = gridsContainer.scrollWidth;
    const cellWidth =
      gridWidth / this.state.columnsPerDay / this.state.requiredDays.length;

    const left =
      this.currentLeftColumnIndex * cellWidth - this.state.leftColumnWidth;

    const instantScroll = this.props.fastMode;

    gridsContainer.scrollTo({
      behavior: force || instantScroll ? 'auto' : 'smooth',
      left,
    });

    topRowsContainer.scrollTo({
      behavior: force || instantScroll ? 'auto' : 'smooth',
      left,
    });

    if (force || Math.abs(left - gridsContainer.scrollLeft) < 5) return;

    this.pageTurnEmitter.emit('freeze');
    this.isScrolling = true;

    const callback = () => {
      clearTimeout(this.containerScrollTimeout);

      this.containerScrollTimeout = setTimeout(() => {
        // this.removeTooFarDays();

        this.updateVisibility([
          this.currentLeftColumnIndex,
          this.currentLeftColumnIndex + this.state.columnsPerPage,
        ]);
        gridsContainer.removeEventListener('scroll', callback);

        this.isScrolling = false;

        this.pageTurnEmitter.emit('resume');
      }, 50);
    };

    // callback();
    gridsContainer.addEventListener('scroll', callback);
  }

  @action
  public updateVisibility(indexes: number[]) {
    if ((window as any).lockVisibility) return;

    const minColumn = Math.min(...indexes);
    const maxColumn = Math.max(...indexes);
    const minDay = Math.floor(minColumn / this.state.columnsPerDay);
    const maxDay = Math.floor(maxColumn / this.state.columnsPerDay);

    Array.from(
      (this.daysContainerRef.current as HTMLDivElement).querySelectorAll(
        '.dayWrapper',
      ),
    ).forEach((child, index) => {
      const day = this.props.days[index];
      if (index >= minDay && index <= maxDay) {
        child.classList.remove('hidden');
        this.visibilityMap[day.id] = true;
      } else {
        child.classList.add('hidden');
        this.visibilityMap[day.id] = false;
      }
    });

    this.updateDropzones(minDay, maxDay);
  }

  public jumpToDay(dayIndex: number) {
    const targetDate = this.monthStartDate.clone().date(dayIndex);
    this.currentLeftColumnIndex = 0;
    this.props.removeDays(0, this.props.days.length);

    const requiredDays = [targetDate.subtract(1, 'day')];
    this.lazyLoadDays = requiredDays.map(m => m);

    this.setState({
      // loading: true,
      requiredDays,
    });

    const container = this.daysContainerRef.current as HTMLDivElement;

    const gridsContainer = container.querySelector(
      '.gridsContainer',
    ) as HTMLElement;
    const topRowsContainer = container.querySelector(
      '.topRowsContainer .scrollingContainer',
    ) as HTMLElement;

    gridsContainer.scrollLeft = 0;
    topRowsContainer.scrollLeft = 0;

    setTimeout(() => {
      this.updateRequiredDays();
      this.updateScroll(true);

      // this.setState({ loading: false });

      console.log(this.currentLeftColumnIndex);
      this.updateVisibility([
        this.currentLeftColumnIndex,
        this.currentLeftColumnIndex + this.state.columnsPerPage,
      ]);
    });
  }

  public say(s: string) {
    return () => console.log(s);
  }

  public updateDaysWidth() {
    const dayWidth = this.calcDaysWidth();
    const leftColumn = document.querySelector('.leftColumn') as HTMLElement;
    const state = {
      dayWidth,
      leftColumnWidth: leftColumn.getBoundingClientRect().width,
    };

    const justACell = document.querySelector(
      '.dayWrapper:not(.hidden) .gridCell.item',
    );
    if (justACell)
      Object.assign(state, {
        cellWidth: justACell.getBoundingClientRect().width,
      });

    this.setState(state);
  }

  public updateColumnsCount() {
    const containerWidth = (this.daysContainerRef.current as HTMLDivElement)
      .offsetWidth;
    const count = calcColumnsCount(containerWidth, calendarCellMinWidth);
    this.setState({ columnsPerPage: count });
  }

  public calcDaysWidth() {
    const { columnsPerDay, columnsPerPage, leftColumnWidth } = this.state;
    const containerWidth = (this.daysContainerRef.current as HTMLDivElement)
      .offsetWidth;
    const dayWidth = calcDaySize(
      columnsPerPage,
      columnsPerDay,
      containerWidth,
      thinWidth,
      leftColumnWidth,
    );

    return dayWidth <= 0 ? '100%' : `${dayWidth}px`;
  }

  // public updateBoundingRect() {
  //   this.clientRect = this.daysContainerRef.current
  //     ? (this.daysContainerRef.current as HTMLElement).getBoundingClientRect()
  //     : { top: 0, right: 0, left: 0, bottom: 0, width: 0, height: 0 };
  // }

  public render() {
    const { columnsPerDay, stamps, dayWidth } = this.state;
    const { days, subGridColumns, positionCount, mainColumnStep } = this.props;

    const instantRender = false;

    days.forEach(day => {
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
        <div
          className={`daysContainer ${this.state.loading ? 'loading' : ''}`}
          ref={this.daysContainerRef}
        >
          <div className="topRowsContainer">
            <ReactCSSTransitionReplace
              transitionName="cross-fade"
              transitionEnterTimeout={1000}
              transitionLeaveTimeout={1000}
              style={{ width: '100%' }}
            >
              <div key={this.monthStartDate.format('MM')}>
                <MonthRow
                  monthDate={this.monthStartDate}
                  dayJumpCallback={this.jumpToDayHandler}
                />
                <DateRow
                  dayChosenIndex={this.currentDayNumber}
                  monthStartDate={this.monthStartDate}
                  dayJumpCallback={this.jumpToDayHandler}
                />
              </div>
            </ReactCSSTransitionReplace>
            <div className="stickyWrapper">
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
          </div>
          <div className="gridsContainer">
            {this.props.days.map(day => (
              <Day
                isDisplaying={this.visibilityMap[day.id]}
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
                instantRender={instantRender}
              />
            ))}
          </div>
        </div>
        <LeftColumn positionCount={positionCount} />
        <ToggleArea
          id="leftToggleArea"
          style={{
            bottom: `0px`,
            left: '0px',
            right: ``,
            top: `0px`,
            width: `${calendarCellMinWidth / 2}px`,
          }}
          action={this.turnPageLeft}
          delay={200}
          controller={this.pageTurnEmitter}
        />
        <ToggleArea
          id="rightToggleArea"
          style={{
            bottom: `0px`,
            left: '',
            right: '0px',
            top: `0px`,
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
        // this.updateBoundingRect();
        this.updateVisibility([
          this.currentLeftColumnIndex,
          this.currentLeftColumnIndex + this.state.columnsPerPage,
        ]);

        updateStickyElements(true);
      }, boundTime);
    });
  }

  private startScrollHandling(
    { boundTime }: { boundTime: number } = { boundTime: 250 },
  ) {
    window.addEventListener('scroll', () => {
      updateStickyElements();
    });
  }
}
