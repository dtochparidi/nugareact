import * as Moment from 'moment';
import { Duration as IDuration, Moment as IMoment } from 'moment';
import { DateRange, extendMoment } from 'moment-range';
import * as React from 'react';

import ICalendarDay from '../../interfaces/ICalendarDay';
import Card from '../Card';
import Day, { DateRow, GridP, StickyDaysRow } from './Day';
import LeftColumn from './LeftColumn';

import * as StyleVariables from '../../common/variables.scss';
import * as CardVariables from './CalendarCard.scss';
import './CalendarCard.scss';

import * as interact from 'levabala_interactjs';
import VisibilityStore from 'stores/UI/VisibilityStote';
import CalendarDay from 'structures/CalendarDay';
import { clientSide } from '../../dev/clientSide';
import Appointment from '../../structures/Appointment';
import createDragConfig from './modules/dragConfig';
import ToggleArea from './ToggleArea';

import * as Emitter from 'events';
import IUpdateAppFunction from 'interfaces/IUpdateAppFunction';
import { action, observable, reaction } from 'mobx';
import moize from 'moize';
import rootStore from 'stores/RootStore';
import TopRow from './Day/TopRow';
import { generateDropzoneConfig } from './modules/dropzoneConfig';
import {
  calcColumnsCount,
  calcDaySize,
  calcGridsCount,
  updateStickyElements,
} from './modules/staticMethods';
import lazyTaskManager from '@levabala/lazytask/build/dist/LazyTaskManager';
import { RightColumn } from '.';
import { LazyTask } from '@levabala/lazytask/build/dist';
import * as uuid from 'uuid';

const calendarCellMinWidth = parseFloat(CardVariables.calendarCellWidthMin);
const timeColumnWidth = parseFloat(CardVariables.timeColumnWidth);
const calendarCellHeight = parseFloat(CardVariables.calendarCellHeight);
const thinWidth = parseFloat(StyleVariables.thinWidth);

const moment = extendMoment(Moment);

const daysStore = rootStore.domainStore.calendarDayStore;

if (clientSide) (interact as any).dynamicDrop(true);

export interface IProps {
  fastMode: boolean;
  dayTimeRange: DateRange;
  dayTimeRangeActual: DateRange;
  positionCount: number;
  subGridColumns: number;
  requestCallback: (date: Moment.Moment[]) => Promise<CalendarDay[]>;
  removeDays: (indexStart: number, indexEnd: number) => void;
  mainColumnStep: IDuration;
  updateAppointment: IUpdateAppFunction;
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
  firstLoad: boolean;
  gridsCount: number;
  renderedDays: JSX.Element[];
  gridsContainer: JSX.Element;
}

export enum Direction {
  Top = -1,
  Bottom = 1,
  None = 0,
}

// @observer
export default class CalendarCard extends React.Component<IProps, IState> {
  @observable
  public shiftsHash: { [dayId: string]: string } = {};
  @observable
  public shifts: {
    [dayId: string]: {
      [uniqueId: string]: {
        dx: number;
        dy: number;
      };
    };
  } = {};
  @observable
  public movingId: string = '';
  @observable
  public monthStartDate: IMoment = moment();

  public visibilityStore: VisibilityStore = new VisibilityStore();
  public currentDayIndex: number = 0;

  public currentLeftColumnIndex: number = 0;
  public lazyLoadDays: IMoment[] = [];
  public shiftsCache: {
    [dayId: string]: {
      [shiftId: string]: { [uniqueId: string]: { dx: number; dy: number } };
    };
  } = {};

  private calendarContainerRef: React.RefObject<HTMLDivElement>;
  private currentDaysCount: number = 0;
  private isScrolling: boolean = false;
  private pageTurnEmitter: Emitter;
  private scrollingUpdateTimeout: NodeJS.Timeout;
  private dropzoneConfig = generateDropzoneConfig.bind(this)();
  private firstLoadDays: IMoment[] = [];
  private fullfilledDays: string[] = [];
  private renderedDaysIds: string[] = [];
  private daysContainerRef = React.createRef<HTMLDivElement>();
  private instantRender = { value: true };

  constructor(props: IProps) {
    super(props);

    (window as any).calendarCard = this;

    this.calendarContainerRef = React.createRef();
    this.pageTurnEmitter = new Emitter();

    const mainColumnStep = Moment.duration(45, 'minutes');
    const actualRange = this.props.dayTimeRangeActual.clone();
    actualRange.end.subtract(mainColumnStep);

    const stamps = Array.from(
      actualRange.by('seconds', {
        step: mainColumnStep.asSeconds(),
      }),
    );

    if (clientSide)
      interact('.appointmentCell')
        .draggable(
          createDragConfig(
            this.onAppointmentDraggingStart.bind(this),
            () => null,
            this.onAppointmentDraggingEnd.bind(this),
          ),
        )
        .styleCursor(false);

    this.state = {
      cellWidth: 0,
      columnsPerDay: stamps.length,
      columnsPerPage: 4,
      dayWidth: '100%',
      firstLoad: true,
      gridsContainer: <div className="gridsContainer" />,
      gridsCount: 0,
      leftColumnWidth: timeColumnWidth,
      loading: true,
      renderedDays: [],
      requiredDays: [moment().startOf('day')],
      stamps,
    };

    reaction(
      () =>
        rootStore.uiStore.positionGaps
          .map(({ position }) => position.toString())
          .join(),
      () => this.updateParalaxGrids(true),
    );
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
    const appCell = e.target as Element;
    (((appCell.parentNode as Element).parentNode as Element)
      .parentNode as Element).classList.add('dragOrigin');

    this.updateMovingId(appCell.id);
  }

  public onAppointmentDraggingEnd(e: interact.InteractEvent) {
    const appCell = e.target as Element;
    (((appCell.parentNode as Element).parentNode as Element)
      .parentNode as Element).classList.remove('dragOrigin');
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
    const day = daysStore.days.find(
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

  public updateDropzones(minDay: number, maxDay: number) {
    interact('.day').dropzone(this.dropzoneConfig);
  }

  public updateParalaxGrids(force = false) {
    const gridsCount = calcGridsCount(
      (this.calendarContainerRef.current as HTMLElement).offsetWidth,
      parseFloat(this.state.dayWidth),
    );

    const gridsContainer = (
      <div className="gridsContainer">
        {new Array(gridsCount).fill(null).map((v, i) => (
          <GridP
            style={{ display: 'inline-block' }}
            key={uuid.v4()}
            width={parseFloat(this.state.dayWidth)}
            cellHeight={calendarCellHeight}
            rows={this.props.positionCount}
            cols={this.state.columnsPerDay}
            subGridColumns={this.props.subGridColumns}
            instantRender={true}
          />
        ))}
        }
      </div>
    );

    this.setState({ gridsCount, gridsContainer });
  }

  public async updateRequiredDays(
    compensate = true,
    pendingOffset = 0,
    beforeRequest: (res: boolean) => void = () => null,
  ) {
    const container = this.calendarContainerRef.current as HTMLDivElement;

    const { days } = daysStore;
    const firstDay = days[0];
    const firstDayElem = document.getElementById(firstDay.id) as HTMLElement;
    const lastDay = days[days.length - 1];
    const lastDayElem = document.getElementById(lastDay.id) as HTMLElement;

    const firstDayRect = firstDayElem.getBoundingClientRect();
    const lastDayRect = lastDayElem.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const dayWidth = Math.max(containerRect.width, firstDayRect.width);
    const buffer = dayWidth * 1;

    const leftBorderOffset =
      firstDayRect.left + buffer - (containerRect.left + pendingOffset);
    const rightBorderOffset = Math.max(buffer - lastDayRect.right + dayWidth);

    let leftAddCount = Math.max(
      Math.round(leftBorderOffset / firstDayRect.width),
      0,
    );
    let rightAddCount = Math.max(
      Math.round(rightBorderOffset / firstDayRect.width),
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

    const needUpdateScroll = compensate && changeDeltaAbs > 0;
    beforeRequest(needUpdateScroll);

    const daysToLoad = this.state.requiredDays
      .filter(day => !this.lazyLoadDays.includes(day))
      .filter(day => !daysStore.days.find(d => d.date.diff(day, 'days') === 0));

    if (daysToLoad.length) {
      this.updateVisibilityMap(daysToLoad.map(CalendarDay.calcId));
      await this.requestDays(daysToLoad);
    }

    return needUpdateScroll;
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

    this.daysDidUpdate();

    setTimeout(() => {
      this.setState({ loading: false });
      this.updateDaysWidth();

      this.firstLoadDays = this.state.requiredDays.map(d => d);

      this.currentLeftColumnIndex =
        Math.floor((this.state.requiredDays.length - 1) / 2) *
        this.state.columnsPerDay;

      this.updateVisibility();

      this.updateDaysWidth();
      this.updateParalaxGrids(true);
      this.updateScroll(true);
    });
  }

  @action
  public updateVisibilityMap(additionalIds: string[] = []) {
    daysStore.days
      .map(day => day.id)
      .concat(additionalIds)
      .forEach(id => {
        if (this.visibilityStore.contains(id))
          this.visibilityStore.makeVisible(id);
      });
  }

  public renderDay(day: CalendarDay, i: number) {
    const { columnsPerDay } = this.state;
    const { mainColumnStep } = this.props;

    const cellWidthGetter = () => this.state.cellWidth;

    const { stamps, dayWidth } = this.state;
    const { subGridColumns, positionCount } = this.props;

    if (!(day.id in this.shifts)) this.shifts[day.id] = {};

    const dayElem = (
      <Day
        startLoadSide={
          this.currentLeftColumnIndex <= this.state.columnsPerDay * i
            ? 'left'
            : 'right'
        }
        getCellWidth={cellWidthGetter}
        visibilityStore={this.visibilityStore}
        key={day.date.toISOString()}
        rows={positionCount}
        cols={columnsPerDay || 0}
        dayData={day}
        stamps={stamps}
        dayWidth={dayWidth}
        cellHeight={calendarCellHeight}
        shifts={this.shifts[day.id]}
        shiftsHash={this.shiftsHash[day.id]}
        updateAppointment={this.props.updateAppointment}
        subGridColumns={subGridColumns}
        mainColumnStep={mainColumnStep}
        movingId={this.movingId}
        instantRender={this.instantRender}
      />
    );

    this.renderedDaysIds.push(day.id);

    const keyTransformer = moize((s: string) => moment(s).valueOf());
    const newRenderedDays = this.state.renderedDays
      .concat([dayElem])
      .sort((a, b) =>
        keyTransformer((a.key || '').toString()).valueOf() >
        keyTransformer((b.key || '').toString()).valueOf()
          ? 1
          : -1,
      );

    return new Promise(resolve => {
      this.setState({ renderedDays: newRenderedDays }, () => {
        resolve();
      });
    });
  }

  public clearRenderedDays() {
    this.setState({ renderedDays: [] });
  }

  public renderNewDays(newAllDays: CalendarDay[]) {
    const newSpecialDays = newAllDays.filter(
      ({ id }) => !this.renderedDaysIds.includes(id),
    );

    const promises = newSpecialDays.map(day =>
      this.renderDay(day, daysStore.days.findIndex(({ id }) => id === day.id)),
    );
    return Promise.all(promises);
  }

  public renderAllDays() {
    this.setState({ renderedDays: [] });
    daysStore.days.forEach((day, i) => this.renderDay(day, i));
  }

  public async daysDidUpdate() {
    const { days } = daysStore;

    if (days.length !== this.currentDaysCount)
      this.currentDaysCount = days.length;

    const daysToLoad = this.state.requiredDays
      .filter(day => !this.lazyLoadDays.includes(day))
      .filter(day => !days.find(d => d.date.diff(day, 'days') === 0));
    if (daysToLoad.length) {
      this.updateVisibilityMap(daysToLoad.map(CalendarDay.calcId));

      await this.requestDays(daysToLoad);
    }
  }

  public async requestDays(daysToLoad: Moment.Moment[]) {
    const { days } = daysStore;

    const pr = await this.props.requestCallback(daysToLoad);
    this.fullfilledDays.push(...pr.map(d => d.id));

    const loadedDays = days.filter(({ id }) =>
      this.fullfilledDays.includes(id),
    );

    const promise = this.renderNewDays(loadedDays);

    if (this.state.firstLoad) {
      const isLoaded =
        this.state.firstLoad &&
        this.firstLoadDays.length &&
        this.firstLoadDays.every(date =>
          this.fullfilledDays.includes(CalendarDay.calcId(date)),
        );
      if (isLoaded) this.processFirstLoad();
    }

    return promise;
  }

  public processFirstLoad() {
    this.setState({ firstLoad: false }, async () => {
      await this.updateRequiredDays(true);

      this.updateScroll(true);
      this.updateVisibility([
        this.currentLeftColumnIndex,
        this.currentLeftColumnIndex + this.state.columnsPerPage,
      ]);

      this.instantRender.value = false;

      rootStore.uiStore.firstLoadCompeleted();
      rootStore.domainStore.calendarDayStore.loadVisitsPerDay();

      this.updateCurrentDayData();
    });
  }

  public componentDidUpdate() {
    //
  }

  @action
  public lockShifts() {
    const { shifts } = this;

    Object.entries(shifts).forEach(([dayId, dayShifts]) => {
      const day: CalendarDay =
        rootStore.domainStore.calendarDayStore.daysMap[dayId];
      const apps = day.appointments;

      Object.entries(dayShifts).forEach(([appId, deltas], i, { length }) => {
        const { dx, dy } = deltas;
        if (dx === 0 && dy === 0) return;

        const app = apps[appId];

        this.props.updateAppointment(
          {
            date: app.date,
            targetDate: app.date
              .clone()
              .add(this.props.mainColumnStep.asMinutes() * dx, 'minute'),
            targetPosition: app.position + dy,
            uniqueId: app.uniqueId,
          },
          false,
          !(i === length - 1),
        );
      });
    });

    this.clearShifts();
  }

  @action
  public deleteShifts() {
    Object.keys(this.shifts).forEach(key => delete this.shifts[key]);
  }

  @action
  public clearShifts() {
    Object.values(this.shifts).forEach(appIds =>
      Object.keys(appIds).forEach(id => {
        appIds[id].dx = 0;
        appIds[id].dy = 0;
      }),
    );
  }

  @action
  public mergeShifts(
    dayId: string,
    shifts: Array<{ appId: string; dx: number; dy: number }>,
  ) {
    if (!(dayId in this.shifts)) {
      this.shifts[dayId] = shifts.reduce((acc, val) => {
        acc[val.appId] = { dx: val.dx, dy: val.dy };
        return acc;
      }, {});

      return;
    }

    const dayShifts = this.shifts[dayId];
    shifts.forEach(({ appId, dx, dy }) => {
      if (!(appId in dayShifts)) dayShifts[appId] = { dx, dy };
      else {
        dayShifts[appId].dx = dx;
        dayShifts[appId].dy = dy;
      }
    });
  }

  public async turnPage(delta: -1 | 1) {
    if (this.isScrolling || this.state.loading) return;

    const columnsPerTurn = Math.ceil(this.state.columnsPerPage / 3);
    const pendingOffset = columnsPerTurn * this.state.cellWidth * delta;

    this.isScrolling = true;
    const needUpdateScroll = await this.updateRequiredDays(true, pendingOffset);

    if (needUpdateScroll) this.updateScroll(true);

    this.currentLeftColumnIndex += columnsPerTurn * delta;

    // MARK
    if (delta > 0)
      this.updateVisibility([
        this.currentLeftColumnIndex - columnsPerTurn,
        this.currentLeftColumnIndex + this.state.columnsPerPage,
      ]);
    else
      this.updateVisibility([
        this.currentLeftColumnIndex,
        this.currentLeftColumnIndex +
          this.state.columnsPerPage +
          columnsPerTurn,
      ]);

    this.updateScroll();

    this.updateCurrentDayData();
  }

  @action
  public updateCurrentDayData() {
    const dayIndex = Math.floor(
      this.currentLeftColumnIndex / this.state.columnsPerDay,
    );

    if (
      rootStore.uiStore.currentDay.valueOf() ===
      daysStore.days[dayIndex].date.valueOf()
    )
      return;

    setTimeout(() =>
      lazyTaskManager.addTask(
        new LazyTask({
          func: () => rootStore.domainStore.calendarDayStore.loadVisitsPerDay(),
          priority: 10,
          taskName: 'loadVisitsPerDay',
        }),
      ),
    );
    rootStore.uiStore.setCurrentDay(daysStore.days[dayIndex].date);
  }

  public updateScroll(force = false) {
    const container = this.calendarContainerRef.current as HTMLDivElement;

    const gridsContainer = container.querySelector(
      '.gridsContainer',
    ) as HTMLElement;
    const daysContainer = container.querySelector(
      '.daysContainer',
    ) as HTMLElement;
    const timeRowsContainer = container.querySelector(
      '.timeRowsContainer .scrollingContainer',
    ) as HTMLElement;

    const daysListWidth =
      parseFloat(this.state.dayWidth) * daysStore.days.length;
    const cellWidth =
      daysListWidth / this.state.columnsPerDay / this.state.requiredDays.length;

    const left = this.currentLeftColumnIndex * cellWidth;

    const instantScroll = this.props.fastMode;

    const pageWidth = this.state.columnsPerPage * cellWidth;
    const dayWidth = this.state.columnsPerDay * cellWidth;
    const pageCeiledWidth =
      Math.floor((pageWidth + dayWidth) / dayWidth) * dayWidth;

    let gridFrom = gridsContainer.scrollLeft;
    let gridTo = left - Math.floor(left / pageCeiledWidth) * pageCeiledWidth;

    if (force && gridFrom < pageCeiledWidth) {
      gridFrom += cellWidth;

      gridsContainer.scrollLeft = gridFrom;
    }

    if (!force)
      if (gridTo < gridFrom && daysContainer.scrollLeft < left) {
        gridFrom -= pageCeiledWidth;
        gridTo -= 0;

        gridsContainer.scrollLeft = gridFrom;
      } else if (gridTo > gridFrom && daysContainer.scrollLeft > left) {
        gridFrom += pageCeiledWidth;
        gridTo -= 0;

        gridsContainer.scrollLeft = gridFrom;
      }

    gridsContainer.scrollTo({
      behavior: force || instantScroll ? 'auto' : 'smooth',
      left: gridTo,
    });

    daysContainer.scrollTo({
      behavior: force || instantScroll ? 'auto' : 'smooth',
      left,
    });

    timeRowsContainer.scrollTo({
      behavior: force || instantScroll ? 'auto' : 'smooth',
      left,
    });

    if (force || Math.abs(left - daysContainer.scrollLeft) < 5) return;

    this.pageTurnEmitter.emit('freeze');
    this.isScrolling = true;

    const callback = () => {
      clearTimeout(this.scrollingUpdateTimeout);

      const delta = Math.floor(Math.abs(daysContainer.scrollLeft - left));
      if (delta > 5) return;

      daysContainer.removeEventListener('scroll', callback);

      // MARK
      this.updateVisibility();

      this.isScrolling = false;

      this.pageTurnEmitter.emit('resume');
    };

    callback();
    daysContainer.addEventListener('scroll', callback);
  }

  @action
  public updateVisibility(
    indexes: number[] = [
      this.currentLeftColumnIndex,
      this.currentLeftColumnIndex + this.state.columnsPerPage,
    ],
  ) {
    if ((window as any).lockVisibility) return;

    const buffer = 0;
    const minColumn = Math.min(...indexes);
    const maxColumn = Math.max(...indexes);
    const minDay = Math.floor(minColumn / this.state.columnsPerDay) - buffer;
    const maxDay = Math.floor(maxColumn / this.state.columnsPerDay) + buffer;

    Array.from(
      (this.calendarContainerRef.current as HTMLDivElement).querySelectorAll(
        '.dayWrapper',
      ),
    ).forEach((child, index) => {
      const day = daysStore.days[index];
      if (index >= minDay && index <= maxDay) {
        child.classList.remove('hidden');
        this.visibilityStore.makeVisible(day.id);
      } else {
        child.classList.add('hidden');
        this.visibilityStore.makeUnvisible(day.id);
      }
    });

    this.updateDropzones(minDay, maxDay);
  }

  public jumpToDay = (targetDate: IMoment): Promise<void> => {
    this.currentLeftColumnIndex = 0;
    this.props.removeDays(0, daysStore.days.length);

    this.renderedDaysIds = [];
    const requiredDays = [targetDate];
    this.deleteShifts();

    let resolver: () => void;

    this.instantRender.value = true;
    this.setState(
      {
        renderedDays: [],
        requiredDays,
      },
      async () => {
        await this.daysDidUpdate();

        setTimeout(() => {
          this.updateRequiredDays(true).then(() => {
            this.updateScroll(true);
            this.updateVisibility();
            setTimeout(() => (this.instantRender.value = false));

            this.updateCurrentDayData();

            resolver();
          });
        });
      },
    );

    const promise: Promise<void> = new Promise(resolve => (resolver = resolve));

    const container = this.calendarContainerRef.current as HTMLDivElement;

    const gridsContainer = container.querySelector(
      '.gridsContainer',
    ) as HTMLElement;
    const timeRowsContainer = container.querySelector(
      '.timeRowsContainer .scrollingContainer',
    ) as HTMLElement;

    gridsContainer.scrollLeft = 0;
    timeRowsContainer.scrollLeft = 0;

    return promise;
  };

  public updateDaysWidth() {
    const dayWidth = this.calcDaysWidth();

    const cellWidth = parseInt(dayWidth, 10) / this.state.columnsPerDay;
    this.setState({
      cellWidth,
      dayWidth,
    });
  }

  public updateColumnsCount() {
    const containerWidth = (this.calendarContainerRef.current as HTMLDivElement)
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
  public render() {
    const { stamps, dayWidth } = this.state;
    const { subGridColumns, positionCount } = this.props;

    return (
      <Card
        cardClass="calendarCard"
        style={
          {
            '--mainGridColumnWidth': `${this.state.cellWidth}px`,
            '--rows-count': positionCount,
            '--sub-columns-count:': subGridColumns,
            visibility: this.state.firstLoad ? 'hidden' : 'visible',
          } as React.CSSProperties
        }
      >
        <div
          className={`calendarContainer ${this.state.loading ? 'loading' : ''}`}
          ref={this.calendarContainerRef}
        >
          <div
            className="timeRowsContainer"
            style={{
              visibility: !this.state.firstLoad ? 'visible' : 'hidden',
            }}
          >
            <DateRow
              dayJumpCallback={this.jumpToDay}
              visitsPerDay={daysStore.visitsPerDay}
            />
            <div className="stickyWrapper">
              <div className="viewPortContainer">
                <StickyDaysRow />
                <div className="scrollingContainer">
                  <div className="stickyContainer">
                    {daysStore.days.map(day => {
                      const k = day.date.startOf('day').format('DD:MM:YYYY');
                      return (
                        <TopRow
                          visible={true}
                          stamps={stamps}
                          keyStamp={k}
                          key={k}
                          style={{ width: dayWidth }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mainContainer">
            {this.state.gridsContainer}
            {/* <div className="daysContainer">{this.state.renderedDays}</div> */}
            <div className="daysContainer" ref={this.daysContainerRef}>
              {this.state.renderedDays}
            </div>
          </div>
        </div>
        <LeftColumn
          positionCount={positionCount}
          visible={!this.state.firstLoad}
        />
        <RightColumn visible={!this.state.firstLoad} />
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
    let lastWidth = window.innerWidth;
    // let lastHeight = window.innerHeight;
    window.addEventListener('resize', () => {
      const currentWidth = window.innerWidth;
      // const currentHeight = window.innerHeight;

      if (currentWidth === lastWidth) return;

      lastWidth = currentWidth;
      // lastHeight = currentHeight;

      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.updateScreenSize();

        this.updateColumnsCount();
        this.updateDaysWidth();
        this.updateScroll(true);
        this.updateVisibility([
          this.currentLeftColumnIndex,
          this.currentLeftColumnIndex + this.state.columnsPerPage,
        ]);
        this.updateParalaxGrids(true);

        updateStickyElements(true);

        this.clearRenderedDays();
        this.renderAllDays();
      }, boundTime);
    });
  }

  private updateScreenSize() {
    rootStore.uiStore.setScreenWidth(window.innerWidth);
  }

  private startScrollHandling(
    { boundTime }: { boundTime: number } = { boundTime: 250 },
  ) {
    window.addEventListener('scroll', () => {
      updateStickyElements();
    });
  }
}
