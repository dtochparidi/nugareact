import { reaction } from 'mobx';
import { observer } from 'mobx-react';
import { Moment as IMoment } from 'moment';
import * as React from 'react';
import CalendarDay from 'structures/CalendarDay';
import * as interact from 'levabala_interactjs';

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
//   console.log(moize.getStats('dayGenerator'));
//   console.log(compares);
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
  private spaceBetween = daySpaceBetweenMin;
  private dayWidthAround = dayWidth + this.spaceBetween;
  private buffer = this.dayWidthAround * 2;
  private nextCheckTimeout = this.dayWidthAround;
  private previosDaysCount = 0;
  private previosContainerWidth = 0;

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
      leftBorder: rootStore.uiStore.currentDay.clone().subtract(5, 'days'),
      rightBorder: rootStore.uiStore.currentDay.clone().add(5, 'days'),
    };
  }

  public componentDidUpdate(prevProps: IProps) {
    // console.log(prevProps.choosenDay.format('DD:MM'));
    // if (prevProps.choosenDay.valueOf() !== rootStore.uiStore.currentDay.valueOf())
    //   this.updateBorders(true);
  }

  public updateBorders(reset = false) {
    // const rowWidth = (this.dateRowWrapperRef.current as HTMLDivElement)
    //   .offsetWidth;
    const rowWidth = (this.dateRowWrapperRef
      .current as HTMLDivElement).getBoundingClientRect().width;

    const dayWidthAroundMin = dayWidth + daySpaceBetweenMin;
    const daysCount = Math.floor(
      (rowWidth + daySpaceBetweenMin) / dayWidthAroundMin,
    );

    this.spaceBetween =
      daySpaceBetweenMin +
      ((rowWidth + daySpaceBetweenMin) % dayWidthAroundMin) / daysCount;
    this.dayWidthAround = dayWidth + this.spaceBetween;

    reset =
      reset ||
      daysCount !== this.previosDaysCount ||
      rowWidth !== this.previosContainerWidth;
    this.previosDaysCount = daysCount;
    this.previosContainerWidth = rowWidth;

    // console.log('update borders', daysCount);

    if (reset) {
      this.offset = 0;
      this.fixedOffset = 0;
    }

    const daysOffset = Math.ceil(this.offset / this.dayWidthAround);
    const daysBuffer = Math.ceil(this.buffer / this.dayWidthAround);

    const newLeftBorder = rootStore.uiStore.currentDay
      .clone()
      .subtract(daysCount / 2 + daysOffset, 'days');
    const newRightBorder = rootStore.uiStore.currentDay
      .clone()
      .add(daysCount / 2 - daysOffset + daysBuffer, 'days');

    if (!reset) {
      const delta = newLeftBorder.diff(this.state.leftBorder, 'days');

      this.fixedOffset += delta * this.dayWidthAround;
    }

    this.setState({
      leftBorder: newLeftBorder,
      rightBorder: newRightBorder,
    });

    rootStore.uiStore.setBorderDays(newLeftBorder, newRightBorder);
  }

  public componentWillUnmount() {
    this.reactions.forEach(r => r());
  }

  public componentDidMount() {
    interact('.dateRowWrapper').draggable({
      onmove: this.onDrag,
      onstart: this.onStart,
    });
  }

  public clickHandler = (day: IMoment) => {
    this.props.dayJumpCallback(day);
  };

  public animationEnded = () => {
    console.log('ended!');
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
    // console.log(
    //   leftBorder.format('DD:MM:YYYY'),
    //   rightBorder.format('DD:MM:YYYY'),
    // );
    const daysCount =
      rightBorder.diff(leftBorder, 'days') *
      (rootStore.uiStore.firstLoadDone ? 1 : 0);
    // console.log('daysCount:', daysCount);

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
            {new Array(daysCount).fill(null).map((v, i) => {
              const day = leftBorder.clone().add(i, 'days');
              return this.dayGenerator({
                day,
                isChoosen:
                  day.valueOf() === rootStore.uiStore.currentDay.valueOf(),
                visitsPerDay: visitsPerDay[day.valueOf()],
              });
            })}
          </div>
        </div>
      </div>
    );
  }

  private onStart = (e: interact.InteractEvent) => {
    //
  };

  private onDrag = (e: interact.InteractEvent) => {
    this.offset += e.dx;
    // this.offset.y += e.dy;

    this.nextCheckTimeout += e.dx;
    if (
      this.nextCheckTimeout <= 0 ||
      this.nextCheckTimeout >= this.dayWidthAround * 2
    ) {
      this.updateBorders();
      this.nextCheckTimeout = this.dayWidthAround;
    }

    this.updateTransform();
  };

  private updateTransform() {
    const dateRowWrapper = this.dateRowWrapperRef.current as HTMLDivElement;
    dateRowWrapper.style.transform = `translate(${this.offset +
      this.fixedOffset}px, 0px)`;
  }
}
