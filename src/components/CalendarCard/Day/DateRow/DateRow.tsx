import { reaction } from 'mobx';
import { observer } from 'mobx-react';
import { Moment as IMoment } from 'moment';
import * as React from 'react';
import CalendarDay from 'structures/CalendarDay';
import * as interact from 'levabala_interactjs';

import bezierEasing from 'bezier-easing';

import './DateRow.scss';
import * as DateRowVariables from './DateRow.scss';
import moize from 'moize';
import rootStore from 'stores/RootStore';
import MonthRow from '../MonthRow';
import * as Moment from 'moment';
import { extendMoment } from 'moment-range';

const moment = extendMoment(Moment);

const dayWidth = parseFloat(DateRowVariables.dayWidth);
const daySpaceBetweenMin = parseFloat(DateRowVariables.daySpaceBetweenMin);

export interface IProps {
  visitsPerDay: { [dayIndex: number]: number };
  dayJumpCallback: (targetDay: IMoment) => void;
}

export interface IState {
  leftBorder: IMoment;
  rightBorder: IMoment;
}

interface IDayGeneratorArgs {
  visitsPerDay: number;
  isChoosen: boolean;
  day: IMoment;
  opacity: number;
}

@observer
export default class DateRow extends React.Component<IProps, IState> {
  private dateRowWrapperRef = React.createRef<HTMLDivElement>();
  private reactions: Array<() => void> = [];
  private offset = 0;
  private fixedOffset = 0;
  private doneOffset = 0;
  private spaceBetween = daySpaceBetweenMin;
  private dayWidthAround = dayWidth + this.spaceBetween;

  private buffer = 2;

  private previosDaysCount = 0;
  private previosContainerWidth = 0;
  private currentChosenDay = rootStore.uiStore.currentDay.clone();
  private currentAnimationID = 0;
  private isAnimating = false;
  private daysCount = 0;
  private lastBorderOffset = 0;
  private offsetRemainderAccumulator = 0;
  private loadVisitsId: NodeJS.Timeout;
  private loadVisitsDelay = 2000;

  private dayGenerator = moize(
    ({ day, visitsPerDay, isChoosen, opacity }: IDayGeneratorArgs) => {
      const handler = () => this.clickHandler(day);
      return (
        <div
          key={day.valueOf()}
          id={`day${day.format('DD_MM_YYYY')}`}
          className={`day ${isChoosen ? 'chosen' : ''}`}
          onClick={handler}
          style={{ opacity }}
        >
          <span className="main">
            <span className="name">
              <span className="weekdayName">{day.format('dd')}</span>
            </span>
            <span className="index">{day.date()}</span>
            <span className="weekdayVisits">
              {visitsPerDay ? visitsPerDay : '0'}
            </span>
          </span>
        </div>
      );
    },
    {
      equals: (prevArgs: IDayGeneratorArgs, nowArgs: IDayGeneratorArgs) => {
        const equal =
          prevArgs.day.valueOf() === nowArgs.day.valueOf() &&
          prevArgs.visitsPerDay === nowArgs.visitsPerDay &&
          prevArgs.isChoosen === nowArgs.isChoosen;

        return equal;
      },
      profileName: 'dayGenerator',
    },
  );

  constructor(props: IProps) {
    super(props);

    this.reactions.push(
      reaction(
        () => rootStore.uiStore.currentDay.valueOf(),
        () => (this.currentChosenDay = rootStore.uiStore.currentDay),
      ),
      reaction(
        () => rootStore.uiStore.screenWidth,
        () => this.updateBorders(true),
      ),
    );

    this.state = {
      leftBorder: rootStore.uiStore.currentDay.clone(),
      rightBorder: rootStore.uiStore.currentDay.clone(),
    };
  }

  public setStateAsync = (newState: IState) =>
    new Promise(resolve => this.setState(newState, () => resolve()));

  public async updateBorders(reset = false, rounding = true) {
    const rowWidth = (this.dateRowWrapperRef.current as HTMLDivElement)
      .offsetWidth;

    const daysCountRaw = Math.floor(rowWidth / (dayWidth + daySpaceBetweenMin));

    this.daysCount = daysCountRaw;

    this.spaceBetween =
      daySpaceBetweenMin +
      ((rowWidth + daySpaceBetweenMin) % (dayWidth + daySpaceBetweenMin)) /
        this.daysCount;

    this.dayWidthAround = dayWidth + this.spaceBetween;

    reset =
      reset ||
      this.daysCount !== this.previosDaysCount ||
      rowWidth !== this.previosContainerWidth;
    this.previosDaysCount = this.daysCount;
    this.previosContainerWidth = rowWidth;

    let newLeftBorder;
    let newRightBorder;

    if (reset) {
      this.offset = 0;
      this.fixedOffset = -this.buffer * this.dayWidthAround;
      this.doneOffset = 0;
      this.offsetRemainderAccumulator = 0;

      newLeftBorder = this.currentChosenDay
        .clone()
        .subtract(Math.floor(this.daysCount / 2) + this.buffer, 'days');
      newRightBorder = this.currentChosenDay
        .clone()
        .add(Math.ceil(this.daysCount / 2) + this.buffer, 'days');
    } else {
      const offsetDelta = this.offset - this.doneOffset;
      const deltaFloat =
        (offsetDelta + this.offsetRemainderAccumulator) / this.dayWidthAround;

      const delta = Math.round(Math.abs(deltaFloat)) * Math.sign(deltaFloat);
      const offsetRemainder = offsetDelta - delta * this.dayWidthAround;

      this.offsetRemainderAccumulator += offsetRemainder;

      let daysCorrect = 0;
      if (rounding) {
        this.offset -= offsetRemainder;
        this.fixedOffset -= this.offset - this.doneOffset - offsetRemainder;
        this.doneOffset = this.offset;

        const daysCorrecting =
          Math.round((this.offset + this.fixedOffset) / this.dayWidthAround) +
          2;

        this.fixedOffset -= daysCorrecting * this.dayWidthAround;

        daysCorrect = daysCorrecting;
      } else {
        this.fixedOffset -= this.offset - offsetRemainder - this.doneOffset;
        this.doneOffset = this.offset + offsetRemainder;
      }

      newLeftBorder = this.state.leftBorder
        .clone()
        .subtract(delta + daysCorrect, 'days');
      newRightBorder = newLeftBorder
        .clone()
        .add(this.daysCount + daysCorrect + this.buffer * 2, 'days');
    }

    const promise = this.setStateAsync({
      leftBorder: newLeftBorder.startOf('day'),
      rightBorder: newRightBorder.startOf('day'),
    });
    this.updateTransform();

    rootStore.uiStore.setBorderDays(newLeftBorder, newRightBorder);

    return promise;
  }

  public scrollDelta(offsetDelta: number, scrollDuration: number = 600) {
    this.isAnimating = true;
    cancelAnimationFrame(this.currentAnimationID);

    const startOffset = this.offset;
    const endOffset = startOffset + offsetDelta;
    const startTime = Date.now();
    const endTime = startTime + scrollDuration;

    const parametricBlend = bezierEasing(0.165, 0.84, 0.44, 1);
    const getCurrentOffset = (time: number) => {
      const timeDelta = time - startTime;
      const progress = timeDelta / scrollDuration;

      const offsetRaw = startOffset + parametricBlend(progress) * offsetDelta;
      const offset =
        Math.sign(offsetDelta) > 0
          ? Math.min(offsetRaw, endOffset)
          : Math.max(offsetRaw, endOffset);

      return offset;
    };

    let resolver: () => void;

    const scroller = () => {
      const time = Date.now();
      if (time >= endTime) {
        const offset = getCurrentOffset(endTime);
        const dx = offset - this.offset;

        this.handleDragging({ dx } as any, true);
        this.isAnimating = false;

        resolver();
      } else {
        const offset = getCurrentOffset(time);
        const dx = offset - this.offset;
        this.handleDragging({ dx } as any, undefined, false);

        this.currentAnimationID = requestAnimationFrame(scroller);
      }
    };

    const promise: Promise<void> = new Promise(r => (resolver = r));

    this.onStart({} as any);
    scroller();

    return promise;
  }

  public scrollToDay(
    day: IMoment,
    scrollDuration: number = 600,
  ): Promise<void> {
    const currentCenterDay = this.state.leftBorder
      .clone()
      .add(Math.floor(this.daysCount / 2) + this.buffer, 'days');

    const daysDelta = -1 * day.diff(currentCenterDay, 'days');
    const offsetDelta = daysDelta * this.dayWidthAround;

    return this.scrollDelta(offsetDelta, scrollDuration);
  }

  public componentWillUnmount() {
    this.reactions.forEach(r => r());
  }

  public componentDidMount() {
    this.currentChosenDay = rootStore.uiStore.currentDay;

    interact('.dateRowWrapper')
      .draggable({
        inertia: false,
        onend: this.onDragEnded,
        onmove: this.onUserDrag,
        onstart: this.onStart,
      })
      .styleCursor(false);

    this.updateBorders(true);
    (window as any).dateRow = this;
  }

  public clickHandler = (day: IMoment) => {
    if (this.isAnimating) return;

    this.currentChosenDay = day;
    this.forceUpdate();

    this.updateBorders(false, true);
    this.updateBorders(false, false);
    this.scrollToDay(day)
      .then(() => this.updateBorders(true, false))
      .then(() => this.props.dayJumpCallback(day));
  };

  public smoothSnap(speed = 0, sign = 1) {
    const maxSpeed = 500;
    const speedScale = 0.1;
    const offsetDeltaRaw = Math.min(speed * speedScale, maxSpeed) * sign;

    const newOffsetRaw = this.offset + offsetDeltaRaw;
    const newOffsetTotalRaw = newOffsetRaw + this.fixedOffset;

    function minByAbs(a: number, b: number) {
      const A = Math.abs(a);
      const B = Math.abs(b);

      return A < B ? a : b;
    }

    const c1 = newOffsetTotalRaw % this.dayWidthAround;
    const c2 = (newOffsetTotalRaw + this.dayWidthAround) % this.dayWidthAround;
    const c3 = (newOffsetTotalRaw - this.dayWidthAround) % this.dayWidthAround;

    const corrector = minByAbs(c1, minByAbs(c2, c3));
    const newOffset = newOffsetRaw - corrector;
    const offsetDelta = newOffset - this.offset;

    return this.scrollDelta(offsetDelta, 700).then(() =>
      this.updateBorders(false, false),
    );
  }

  public onDragEnded = (e: interact.InteractEvent) => {
    if (this.isAnimating) return;

    const { speed } = e;
    const sign = Math.sign(e.velocityX);

    this.smoothSnap(speed, sign).then(() => this.loadVisitsPerDayDebounced());
  };

  public loadVisitsPerDayDebounced() {
    const func = () => {
      rootStore.uiStore.setBorderDays(
        this.state.leftBorder,
        this.state.rightBorder,
      );
      rootStore.domainStore.calendarDayStore.loadVisitsPerDay();
    };

    clearTimeout(this.loadVisitsId);
    this.loadVisitsId = setTimeout(func, this.loadVisitsDelay);
  }

  public render() {
    const visitsPerDay = Object.entries(this.props.visitsPerDay)
      .map(([dayId, visitsCount]) => [
        CalendarDay.fromId(dayId).date,
        visitsCount,
      ])
      .reduce((acc, [date, visitsCount]: [IMoment, number]) => {
        acc[date.valueOf()] = visitsCount;
        return acc;
      }, {});

    const { leftBorder, rightBorder } = this.state;

    const daysCount =
      rightBorder.diff(leftBorder, 'days') *
      (rootStore.uiStore.firstLoadDone ? 1 : 0);

    const pastOpacity = 1;
    const futureOpacity = 0.7;

    const now = moment().startOf('day');
    const monthes = new Array(daysCount)
      .fill(null)
      .map((v, i) => leftBorder.clone().add(i, 'days'))
      .reduce(
        (acc: IMoment[][], val) => {
          const last = acc[acc.length - 1];
          const currentMonth =
            !last.length || last[0].month() === val.month()
              ? last
              : acc.append([]);
          currentMonth.push(val);

          return acc;
        },
        [[]],
      )
      .map((month, i) =>
        month.map(day =>
          this.dayGenerator({
            day,
            isChoosen: day.valueOf() === this.currentChosenDay.valueOf(),
            opacity:
              day.valueOf() > now.valueOf() ? futureOpacity : pastOpacity,
            visitsPerDay: visitsPerDay[day.valueOf()],
          }),
        ),
      )
      .joinObj(gapIndex => <div className="gap" key={`gap${gapIndex}`} />);

    return (
      <div
        key={rootStore.uiStore.currentDay.format('DD_MM_YYYY')}
        className="topRow"
      >
        <MonthRow
          monthDates={Array.from(
            moment
              .range(this.state.leftBorder, this.state.rightBorder)
              .by('month'),
          )}
          dayJumpCallback={this.props.dayJumpCallback}
        />
        <div
          className="dateRowWrapper"
          ref={this.dateRowWrapperRef}
          style={
            {
              '--day-space-between': `${this.spaceBetween}px`,
              transform: `translate(${this.offset + this.fixedOffset}px, 0px)`,
            } as React.CSSProperties
          }
        >
          <div
            className="dateRow"
            key={`${rootStore.uiStore.currentDay.format(
              'DD_MM_YYYY',
            )}${leftBorder}${rightBorder}`}
          >
            {monthes}
          </div>
        </div>
      </div>
    );
  }

  public onStart = (e: interact.InteractEvent) => {
    this.lastBorderOffset = this.offset;
  };

  public handleDragging(
    e: interact.InteractEvent,
    silently = false,
    rounding = true,
  ): boolean {
    const { dx } = e;

    if (dx === 0) return false;
    const newOffset = this.offset + dx;

    const delta = newOffset - this.lastBorderOffset;

    this.offset += dx;
    const borderPassed = !silently && Math.abs(delta) >= this.dayWidthAround;

    if (borderPassed) {
      this.updateBorders(undefined, rounding);
      this.lastBorderOffset = newOffset;
    }

    this.updateTransform();

    return borderPassed;
  }

  public onUserDrag = (
    e: interact.InteractEvent,
    silently = false,
    rounding = true,
  ): boolean => {
    if (this.isAnimating) return false;

    return this.handleDragging(e, silently, rounding);
  };

  public updateTransform() {
    const dateRowWrapper = this.dateRowWrapperRef.current as HTMLDivElement;
    dateRowWrapper.style.transform = `translate(${this.offset +
      this.fixedOffset}px, 0px)`;
  }
}
