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
  private doneOffset = 0;
  private gapDaysOffset = 0;
  private spaceBetween = daySpaceBetweenMin;
  private dayWidthAround = dayWidth + this.spaceBetween;
  // private buffer = 2;
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
    console.log('---');
    const rowWidth = (this.dateRowWrapperRef.current as HTMLDivElement)
      .offsetWidth;

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
      console.log('reset');
      this.offset = 0;
      this.fixedOffset = 0;
    }

    const deltaFloat = (this.offset - this.doneOffset) / dayWidthAroundMin;
    const delta =
      Math.floor(Math.abs(deltaFloat)) * Math.sign(deltaFloat) -
      this.gapDaysOffset;
    this.fixedOffset -=
      this.offset - this.doneOffset - this.gapDaysOffset * dayWidthAroundMin;
    this.doneOffset = this.offset;

    const newLeftBorder = this.state.leftBorder.clone().subtract(delta, 'days');
    const newRightBorder = newLeftBorder.clone().add(daysCount, 'days');

    const leftChangeGap = Math.sign(
      Math.max(newLeftBorder.month() - this.state.leftBorder.month(), 0),
    );
    this.gapDaysOffset =
      leftChangeGap - Math.abs(this.gapDaysOffset) * Math.sign(leftChangeGap);

    newLeftBorder.subtract(this.gapDaysOffset, 'days');
    newRightBorder.subtract(this.gapDaysOffset, 'days');
    this.fixedOffset -= this.gapDaysOffset * dayWidthAroundMin;

    console.log(
      [
        ['delta', delta],
        ['leftChangeGap', leftChangeGap],
        ['gapOffset', this.gapDaysOffset],
        ['leftBorder', this.state.leftBorder.format('DD:MM')],
        ['newLeftBorder', newLeftBorder.format('DD:MM')],
      ]
        .map(([n, v]) => `${n}: ${v}`)
        .join('\n'),
    );

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
