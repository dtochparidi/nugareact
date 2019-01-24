import { observer } from 'mobx-react';
import * as Moment from 'moment';
import { Moment as IMoment } from 'moment';
import { DateRange, extendMoment } from 'moment-range';
import * as React from 'react';

import ICalendarDay from '../../interfaces/ICalendarDay';
import Card from '../Card';
import Day from './Day';
import TimeColumn from './TimeColumn';

import './CalendarCard.scss';

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
}

@observer
export default class CalendarCard extends React.Component<IProps, IState> {
  public selectedDay: number = 0;
  private daysContainerRef: React.RefObject<HTMLDivElement>;
  private containerScrollTimeout: NodeJS.Timeout;
  private shouldUpdateVisibility: boolean = false;

  constructor(props: IProps) {
    super(props);

    this.daysContainerRef = React.createRef();
    this.state = {
      requiredDays: new Array(10)
        .fill(null)
        .map((v, i) => moment().add(i, 'day')),
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
  }

  public componentDidUpdate() {
    // OPTIMIZE
    this.state.requiredDays.forEach(day => {
      if (!this.props.daysPending.find(d => d.diff(day, 'days') === 0))
        this.props.requestCallback(day);
    });

    if (this.shouldUpdateVisibility) {
      this.updateVisibility([this.selectedDay]);
      this.shouldUpdateVisibility = false;
    }
  }

  public turnPage(delta: -1 | 1) {
    this.updateVisibility([this.selectedDay, this.selectedDay + delta]);

    const newIndex = Math.min(
      Math.max(this.selectedDay + delta, 0),
      this.props.days.length - 1,
    );
    this.selectedDay = newIndex;

    this.updateScroll();
  }

  public getSnapshotBeforeUpdate(prevProps: IProps) {
    this.shouldUpdateVisibility =
      this.props.days.length === prevProps.days.length;

    return true;
  }

  public updateScroll(force = false) {
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
        this.updateVisibility([this.selectedDay]);
        container.removeEventListener('scroll', callback);
      }, 500);
    };

    container.addEventListener('scroll', callback);
  }

  public updateVisibility(indexes: number[]) {
    Array.from(
      (this.daysContainerRef.current as HTMLDivElement).children,
    ).forEach((child, index) => {
      if (indexes.includes(index)) child.classList.remove('hidden');
      else child.classList.add('hidden');
    });
  }

  public render() {
    const stamps = Array.from(
      this.props.dayTimeRange.by('minutes', { step: 60 }),
    );
    const [rows, cols] = [stamps.length, this.props.positionCount];

    return (
      <Card
        cardClass="calendarCard"
        style={{ '--rows-count': rows } as React.CSSProperties}
      >
        <TimeColumn stamps={stamps} />
        <div className="daysContainer" ref={this.daysContainerRef}>
          {this.props.days.map(day => (
            <Day
              key={day.date.toString()}
              rows={rows}
              cols={cols || 0}
              dayData={day}
              stamps={stamps}
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
        console.log('resize handled');
        this.updateScroll();
      }, 250);
    });
  }
}
