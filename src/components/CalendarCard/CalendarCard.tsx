import { observer } from 'mobx-react';
import * as Moment from 'moment';
import { Moment as IMoment } from 'moment';
import { DateRange, extendMoment } from 'moment-range';
import * as React from 'react';

import ICalendarDay from '../../interfaces/ICalendarDay';
import Card from '../Card';
import Day from './Day';
import LeftColumn from './LeftColumn';

import * as StyleVariables from '../../common/variables.scss';
import * as CardVariables from './CalendarCard.scss';
import './CalendarCard.scss';

const calendarCellMinWidth = parseFloat(CardVariables.calendarCellWidthMin);
const thinWidth = parseFloat(StyleVariables.thinWidth);

const moment = extendMoment(Moment);

export interface IProps {
  days: ICalendarDay[];
  daysPending: IMoment[];
  dayTimeRange: DateRange;
  positionCount: number;
  requestCallback: (date: Moment.Moment) => void;
}

export interface IState {
  requiredDays: IMoment[];
  columnsPerPage: number;
  columnsPerDay: number;
  stamps: IMoment[];
  dayWidth: string;
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

  public selectedDay: number = 0;
  public currentLeftColumnIndex: number = 0;
  private daysContainerRef: React.RefObject<HTMLDivElement>;
  private containerScrollTimeout: NodeJS.Timeout;
  private shouldUpdateVisibility: boolean = false;

  constructor(props: IProps) {
    super(props);

    this.daysContainerRef = React.createRef();

    const stamps = Array.from(
      this.props.dayTimeRange.by('minutes', { step: 60 }),
    );

    // this.state = {
    //   columnsPerDay: this.props.positionCount,
    //   columnsPerPage: 4,
    //   dayWidth: '100%',
    //   requiredDays: new Array(5)
    //     .fill(null)
    //     .map((v, i) => moment().add(i, 'day')),
    //   rows: stamps.length,
    //   stamps,
    // };
    this.state = {
      columnsPerDay: stamps.length,
      columnsPerPage: 4,
      dayWidth: '100%',
      requiredDays: new Array(12)
        .fill(null)
        .map((v, i) => moment().add(i, 'day')),
      stamps,
    };
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
    this.updateColumnsCount();
    setTimeout(() => this.updateDaysWidth());
  }

  public componentDidUpdate() {
    // OPTIMIZE
    this.state.requiredDays.forEach(day => {
      if (!this.props.daysPending.find(d => d.diff(day, 'days') === 0))
        this.props.requestCallback(day);
    });

    if (this.shouldUpdateVisibility) {
      this.updateVisibility([
        this.currentLeftColumnIndex,
        this.currentLeftColumnIndex + this.state.columnsPerPage,
      ]);
      this.shouldUpdateVisibility = false;
    }
  }

  public turnPage(delta: -1 | 1) {
    this.updateVisibility([
      this.currentLeftColumnIndex,
      Math.min(
        Math.max(
          this.currentLeftColumnIndex + this.state.columnsPerPage * 2 * delta,
          0,
        ),
        this.props.days.length * this.state.columnsPerDay - 1,
      ),
    ]);

    const newIndex = Math.min(
      Math.max(this.selectedDay + delta, 0),
      this.props.days.length - 1,
    );
    this.selectedDay = newIndex;
    this.currentLeftColumnIndex = Math.min(
      Math.max(
        this.currentLeftColumnIndex + delta * this.state.columnsPerPage,
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

  public updateScrollByDay(force = false) {
    const container = this.daysContainerRef.current as HTMLDivElement;
    const target = container.children[this.selectedDay] as HTMLElement;
    const left = Math.round(
      target.getBoundingClientRect().left -
        container.getBoundingClientRect().left +
        container.scrollLeft,
    );

    container.scrollTo({
      behavior: force ? 'auto' : 'smooth',
      left,
    });

    const callback = () => {
      clearTimeout(this.containerScrollTimeout);
      this.containerScrollTimeout = setTimeout(() => {
        this.updateVisibility([
          this.currentLeftColumnIndex,
          this.currentLeftColumnIndex + this.state.columnsPerPage,
        ]);
        container.removeEventListener('scroll', callback);
      }, 500);
    };

    container.addEventListener('scroll', callback);
  }

  public updateScroll(force = false) {
    const container = this.daysContainerRef.current as HTMLDivElement;
    const dayIndex = Math.floor(
      this.currentLeftColumnIndex / this.state.columnsPerDay,
    );
    const day = container.children[dayIndex] as HTMLElement;
    const grid = day.querySelector('.grid') as HTMLElement;
    const dayColumnIndex =
      this.currentLeftColumnIndex - dayIndex * this.state.columnsPerDay;
    const appointmentCell = grid.children[dayColumnIndex];

    const left = Math.round(
      appointmentCell.getBoundingClientRect().left -
        container.getBoundingClientRect().left +
        container.scrollLeft,
    );

    container.scrollTo({
      behavior: force ? 'auto' : 'smooth',
      left,
    });

    const callback = () => {
      clearTimeout(this.containerScrollTimeout);
      this.containerScrollTimeout = setTimeout(() => {
        this.updateVisibility([
          this.currentLeftColumnIndex,
          this.currentLeftColumnIndex + this.state.columnsPerPage,
        ]);
        container.removeEventListener('scroll', callback);
      }, 500);
    };

    container.addEventListener('scroll', callback);
  }

  public updateVisibility(indexes: number[]) {
    const minColumn = Math.min(...indexes);
    const maxColumn = Math.max(...indexes);
    const minDay = Math.floor(minColumn / this.state.columnsPerDay) - 1;
    const maxDay = Math.ceil(maxColumn / this.state.columnsPerDay) + 1;

    Array.from(
      (this.daysContainerRef.current as HTMLDivElement).children,
    ).forEach((child, index) => {
      if (index >= minDay && index <= maxDay) child.classList.remove('hidden');
      else child.classList.add('hidden');
    });
  }

  public updateDaysWidth() {
    const dayWidth = this.calcDaysWidth();
    this.setState({ dayWidth });
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

  public render() {
    const { columnsPerDay, stamps, dayWidth } = this.state;
    const rows = this.props.positionCount;

    return (
      <Card
        cardClass="calendarCard"
        style={{ '--rows-count': rows } as React.CSSProperties}
      >
        {/* <TimeColumn stamps={stamps} /> */}
        <LeftColumn positionCount={rows} />
        <div className="daysContainer" ref={this.daysContainerRef}>
          {this.props.days.map(day => (
            <Day
              key={day.date.toString()}
              rows={rows}
              cols={columnsPerDay || 0}
              dayData={day}
              stamps={stamps}
              dayWidth={dayWidth}
            />
          ))}
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
      }, boundTime);
    });
  }
}
