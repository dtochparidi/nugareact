import { reaction } from 'mobx';
import { observer } from 'mobx-react';
import { Moment as IMoment } from 'moment';
import * as React from 'react';
import CalendarDay from 'structures/CalendarDay';
import * as interact from 'levabala_interactjs';
import bezierEasing from 'bezier-easing';
// import interact from 'interactjs';

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

// import moize, { collectStats } from 'moize';

// collectStats();

// setInterval(() => {
//   // console.log(moize.getStats('dayGenerator'));
//   // console.log(compares);
// }, 1500);

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
}

// let compares = 0;

@observer
export default class DateRow extends React.Component<IProps, IState> {
  private dateRowWrapperRef = React.createRef<HTMLDivElement>();
  private reactions: Array<() => void> = [];
  private offset = 0;
  private fixedOffset = 0;
  private doneOffset = 0;
  private gapDaysOffset = 0;
  private spaceBetween = daySpaceBetweenMin;
  private dayWidthAround = dayWidth + this.spaceBetween;
  // private dayWidthAroundMin = dayWidth + daySpaceBetweenMin;
  private dayWidthAroundActual = this.dayWidthAround;
  private buffer = 2;
  private nextCheckTimeout = this.dayWidthAround;
  private previosDaysCount = 0;
  private previosContainerWidth = 0;
  private currentChosenDay = rootStore.uiStore.currentDay.clone();
  private currentAnimationID = 0;

  private dayGenerator = moize(
    ({ day, visitsPerDay, isChoosen }: IDayGeneratorArgs) => {
      const handler = () => this.clickHandler(day);
      return (
        <div
          key={day.valueOf()}
          className={`day ${isChoosen ? 'chosen' : ''}`}
          onClick={handler}
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
        // compares++;
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
        () => this.updateBorders(true),
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

  public componentDidUpdate(prevProps: IProps) {
    if (
      this.currentChosenDay.valueOf() !== rootStore.uiStore.currentDay.valueOf()
    ) {
      this.currentChosenDay = rootStore.uiStore.currentDay.clone();
      this.updateBorders(true);
    }
  }

  public updateBorders(reset = false) {
    // console.log('---');
    const rowWidth = (this.dateRowWrapperRef.current as HTMLDivElement)
      .offsetWidth;

    const daysCount =
      Math.floor((rowWidth + daySpaceBetweenMin) / this.dayWidthAroundActual) +
      this.buffer;

    this.spaceBetween =
      daySpaceBetweenMin +
      ((rowWidth + daySpaceBetweenMin) % this.dayWidthAroundActual) /
        (daysCount - this.buffer);
    this.dayWidthAround = dayWidth + this.spaceBetween;

    reset =
      reset ||
      daysCount !== this.previosDaysCount ||
      rowWidth !== this.previosContainerWidth;
    this.previosDaysCount = daysCount;
    this.previosContainerWidth = rowWidth;

    // console.log('update borders', daysCount);
    let newLeftBorder;
    let newRightBorder;

    if (reset) {
      // console.log('reset');
      this.offset = 0;
      this.fixedOffset = (-this.buffer / 2) * this.dayWidthAroundActual;
      this.doneOffset = 0;
      this.gapDaysOffset = 0;

      const day = (this.dateRowWrapperRef
        .current as HTMLDivElement).querySelector('.day');
      if (day) this.dayWidthAroundActual = day.getBoundingClientRect().width;
      console.log('dayWidthAroundActual:', this.dayWidthAroundActual);

      newLeftBorder = this.currentChosenDay
        .clone()
        .subtract(Math.floor(daysCount / 2), 'days');
      newRightBorder = this.currentChosenDay
        .clone()
        .add(Math.floor(daysCount / 2), 'days');
    } else {
      const deltaFloat =
        (this.offset - this.doneOffset) / this.dayWidthAroundActual;
      const delta =
        Math.floor(Math.abs(deltaFloat)) * Math.sign(deltaFloat) -
        this.gapDaysOffset;
      this.fixedOffset -=
        this.offset -
        this.doneOffset -
        this.gapDaysOffset * this.dayWidthAroundActual;
      this.doneOffset = this.offset;

      newLeftBorder = this.state.leftBorder.clone().subtract(delta, 'days');
      newRightBorder = newLeftBorder.clone().add(daysCount, 'days');

      const leftChangeGap =
        Math.sign(
          Math.max(newLeftBorder.month() - this.state.leftBorder.month(), 0),
        ) * 0;
      this.gapDaysOffset =
        leftChangeGap - Math.abs(this.gapDaysOffset) * Math.sign(leftChangeGap);

      newLeftBorder.subtract(this.gapDaysOffset, 'days');
      newRightBorder.subtract(this.gapDaysOffset, 'days');
      this.fixedOffset -= this.gapDaysOffset * this.dayWidthAroundActual;

      // console.log(
      //   [
      //     ['delta', delta],
      //     ['leftChangeGap', leftChangeGap],
      //     ['gapOffset', this.gapDaysOffset],
      //     ['leftBorder', this.state.leftBorder.format('DD:MM')],
      //     ['newLeftBorder', newLeftBorder.format('DD:MM')],
      //   ]
      //     .map(([n, v]) => `${n}: ${v}`)
      //     .join('\n'),
      // );
    }

    // console.log('fixedOffset:', this.fixedOffset);
    this.setState({
      leftBorder: newLeftBorder.startOf('day'),
      rightBorder: newRightBorder.startOf('day'),
    });
    this.updateTransform();

    rootStore.uiStore.setBorderDays(newLeftBorder, newRightBorder);
  }

  public componentWillUnmount() {
    this.reactions.forEach(r => r());
  }

  public componentDidMount() {
    interact('.dateRowWrapper').draggable({
      // inertia: {
      //   allowResume: true,
      //   smoothEndDuration: 1000,
      // },
      inertia: false,
      onend: this.onDragEnded,
      onmove: this.onDrag,
      onstart: this.onStart,
    });
  }

  public clickHandler = (day: IMoment) => {
    this.props.dayJumpCallback(day);
  };

  public smoothInertiaSnap(
    offsetDeltaRaw: number,
    animationDuration: number,
    eps: number = 0.1,
  ) {
    cancelAnimationFrame(this.currentAnimationID);

    function minByAbs(a: number, b: number) {
      const A = Math.abs(a);
      const B = Math.abs(b);

      return A < B ? a : b;
    }

    const parametricBlend = bezierEasing(0.165, 0.84, 0.44, 1);

    interface IOffsetData {
      delta: number;
      end: number;
    }

    const offsetData: IOffsetData = {
      delta: 0,
      end: 0,
    };

    const startOffset = this.offset;
    let offsetDone = 0;

    const refreshOffsetData = () => {
      const offsetEndRawRaw = startOffset + offsetDeltaRaw - offsetDone;
      const offsetEndRaw =
        offsetEndRawRaw - (offsetEndRawRaw % this.dayWidthAroundActual);
      const c1 = (offsetEndRaw + this.fixedOffset) % this.dayWidthAroundActual;
      const c2 =
        this.dayWidthAroundActual +
        ((offsetEndRaw + this.fixedOffset) % this.dayWidthAroundActual);
      const corrector = minByAbs(c1, c2);
      const offsetEnd = offsetEndRaw - corrector;
      const offsetDelta = offsetEnd - startOffset;

      Object.assign(offsetData, {
        delta: offsetDelta,
        end: offsetEnd,
      } as IOffsetData);

      // console.log('offset data refreshed');
    };
    refreshOffsetData();

    // const cc1 = (offsetEnd + this.fixedOffset) % this.dayWidthAroundActual;
    // const cc2 =
    //   this.dayWidthAroundActual +
    //   ((offsetEnd + this.fixedOffset) % this.dayWidthAroundActual);

    // console.log('substracted:', offsetDeltaRaw % this.dayWidthAroundActual);
    // console.log(c1, c2, corrector, cc1, cc2, this.dayWidthAroundActual);
    // console.log(
    //   offsetData.end + this.fixedOffset,
    //   (offsetData.end + this.fixedOffset) % this.dayWidthAroundActual,
    // );

    const startTime = Date.now();
    // const endOffset = this.offset + offsetDelta;
    const timeEnd = startTime + animationDuration;
    const animationFrame = () => {
      const nowTime = Date.now();
      const timeDelta = nowTime - startTime;
      const changeCoeff = parametricBlend(timeDelta / animationDuration);

      // console.log('delta:', offsetData.delta);
      const newOffset = startOffset + offsetData.delta * changeCoeff;
      const bordersUpdated = this.onDrag({
        dx: newOffset - this.offset,
      } as any);
      offsetDone += newOffset - this.offset;

      if (bordersUpdated) refreshOffsetData();

      if (timeEnd > nowTime)
        this.currentAnimationID = requestAnimationFrame(animationFrame);
      else {
        const cc1 =
          (this.offset + this.fixedOffset) % this.dayWidthAroundActual;
        const cc2 =
          this.dayWidthAroundActual +
          ((this.offset + this.fixedOffset) % this.dayWidthAroundActual);
        const mistake = minByAbs(cc1, cc2);

        // console.log('mistake:', mistake);

        if (Math.abs(mistake) > eps) this.onDrag({ dx: -mistake } as any);
        // if (Math.abs(mistake) > eps) this.smoothInertiaSnap(0, 100);
      }
    };
    animationFrame();
  }

  public onDragEnded = (e: interact.InteractEvent) => {
    const { speed } = e;
    const sign = Math.sign(e.velocityX);

    const animationDuration = 1000;
    const maxSpeed = 500;
    const speedScale = 0.1;
    const offsetDeltaRaw = Math.min(speed * speedScale, maxSpeed) * sign;

    this.smoothInertiaSnap(offsetDeltaRaw, animationDuration);
  };

  public render() {
    const visitsPerDay = Object.entries(this.props.visitsPerDay)
      .map(([dayId, visitsCount]) => [
        CalendarDay.fromId(dayId).date,
        visitsCount,
      ])
      // .filter(
      //   ([date, visitsCount]: [IMoment, number]) =>
      //     date.format('MM-YYYY') ===
      //     this.props.monthStartDate.format('MM-YYYY'),
      // )
      .reduce((acc, [date, visitsCount]: [IMoment, number]) => {
        acc[date.valueOf()] = visitsCount;
        return acc;
      }, {});

    const { leftBorder, rightBorder } = this.state;

    // leftBorder = leftBorder.clone().subtract(this.buffer, 'days');
    // rightBorder = rightBorder.clone().add(this.buffer, 'days');
    // console.log(
    //   leftBorder.format('DD:MM:YYYY'),
    //   rightBorder.format('DD:MM:YYYY'),
    // );
    const daysCount =
      rightBorder.diff(leftBorder, 'days') *
      (rootStore.uiStore.firstLoadDone ? 1 : 0);
    // console.log('daysCount:', daysCount);

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
      .map(month =>
        month.map(day =>
          this.dayGenerator({
            day,
            isChoosen: day.valueOf() === rootStore.uiStore.currentDay.valueOf(),
            visitsPerDay: visitsPerDay[day.valueOf()],
          }),
        ),
      )
      .joinObj(gapIndex => <div className="gap" key={`gap${gapIndex}`} />);

    return (
      <div
        key={rootStore.uiStore.currentDay.format('DD:MM:YYYY')}
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
            } as React.CSSProperties
          }
        >
          <div
            className="dateRow"
            key={`${rootStore.uiStore.currentDay.format(
              'DD:MM:YYYY',
            )}${leftBorder}${rightBorder}`}
          >
            {monthes}
          </div>
        </div>
      </div>
    );
  }

  private onStart = (e: interact.InteractEvent) => {
    //
  };

  private onDrag = (e: interact.InteractEvent): boolean => {
    this.offset += e.dx;
    // this.offset.y += e.dy;

    this.nextCheckTimeout += e.dx;
    let updatedBorders = false;
    if (
      this.nextCheckTimeout <= 0 ||
      this.nextCheckTimeout >= this.dayWidthAroundActual * 2
    ) {
      this.updateBorders();
      this.nextCheckTimeout = this.dayWidthAroundActual;

      updatedBorders = true;
    }

    this.updateTransform();

    return updatedBorders;
  };

  private updateTransform() {
    const dateRowWrapper = this.dateRowWrapperRef.current as HTMLDivElement;
    dateRowWrapper.style.transform = `translate(${this.offset +
      this.fixedOffset}px, 0px)`;
  }
}
