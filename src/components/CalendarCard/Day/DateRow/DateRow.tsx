import { reaction } from 'mobx';
import { observer } from 'mobx-react';
import { Moment as IMoment } from 'moment';
import * as React from 'react';
import CalendarDay from 'structures/CalendarDay';
import * as interact from 'levabala_interactjs';

import './DateRow.scss';
import moize from 'moize';

console.log('asdasds');
// import moize, { collectStats } from 'moize';

// collectStats();

// setInterval(() => {
//   console.log(moize.getStats('dayGenerator'));
//   console.log(compares);
// }, 1500);

export interface IProps {
  choosenDay: IMoment;
  visitsPerDay: { [dayIndex: number]: number };
  dayJumpCallback: (index: number) => void;
}

export interface IState {
  leftBorder: IMoment;
  rightBorder: IMoment;
}

interface IDayGeneratorArgs {
  i: number;
  visitsPerDay: number;
  isChoosen: boolean;
  monthStartDate: IMoment;
}

// let compares = 0;

@observer
export default class DateRow extends React.Component<IProps, IState> {
  private dateRowWrapperRef = React.createRef<HTMLDivElement>();
  private reactions: Array<() => void> = [];
  private offset = { x: 0, y: 0 };
  // private buffer = 50;

  private dayGenerator = moize(
    ({ i, visitsPerDay, isChoosen, monthStartDate }: IDayGeneratorArgs) => {
      return (
        <div
          key={i}
          className={`day ${isChoosen ? 'chosen' : ''}`}
          onClick={this.indexClickHandler}
        >
          <span className="main">
            <span className="name">
              <span className="weekdayName">
                {monthStartDate
                  .clone()
                  .date(i + 1)
                  .format('dd')}
              </span>
            </span>
            <span className="index">{i + 1}</span>
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
          prevArgs.i === nowArgs.i &&
          prevArgs.visitsPerDay === nowArgs.visitsPerDay &&
          prevArgs.isChoosen === nowArgs.isChoosen &&
          prevArgs.monthStartDate.valueOf() ===
            nowArgs.monthStartDate.valueOf();

        return equal;
      },
      profileName: 'dayGenerator',
    },
  );

  constructor(props: IProps) {
    super(props);

    this.reactions.push(
      reaction(
        () => this.props.choosenDay.format('DD:MM:YYYY'),
        () => this.forceUpdate(),
      ),
    );

    this.state = {
      leftBorder: props.choosenDay.clone().subtract(5, 'days'),
      rightBorder: props.choosenDay.clone().add(5, 'days'),
    };
  }

  public componentDidUpdate(prevProps: IProps) {
    if (prevProps.choosenDay.valueOf() !== this.props.choosenDay.valueOf())
      this.setState({
        leftBorder: this.props.choosenDay.clone().subtract(5, 'days'),
        rightBorder: this.props.choosenDay.clone().add(5, 'days'),
      });
  }

  public componentWillUnmount() {
    this.reactions.forEach(r => r());
  }

  public componentDidMount() {
    interact(this.dateRowWrapperRef.current).draggable({
      onmove: this.onDrag,
      onstart: this.onStart,
    });
  }

  public indexClickHandler = (e: React.MouseEvent) => {
    this.props.dayJumpCallback(
      parseInt(
        (e.currentTarget.querySelector('.index') as HTMLElement).textContent ||
          '0',
        10,
      ),
    );
  };

  public animationEnded = () => {
    console.log('ended!');
  };

  public render() {
    const { choosenDay } = this.props;

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
    console.log(
      leftBorder.format('DD:MM:YYYY'),
      rightBorder.format('DD:MM:YYYY'),
      'asd',
    );
    const daysCount = rightBorder.diff(leftBorder, 'days');
    console.log('daysCount:', daysCount);

    return (
      <div className="dateRowWrapper" ref={this.dateRowWrapperRef}>
        <div
          className="dateRow"
          key={`${this.props.choosenDay.format(
            'DD:MM:YYYY',
          )}${leftBorder}${rightBorder}`}
        >
          {new Array(daysCount).fill(null).map((v, i) => {
            const day = leftBorder.clone().add(i, 'days');
            return this.dayGenerator({
              i,
              isChoosen: day.valueOf() === choosenDay.valueOf(),
              monthStartDate: day.startOf('month'),
              visitsPerDay: visitsPerDay[day.valueOf()],
            });
          })}
        </div>
      </div>
    );
  }

  private onStart = (e: interact.InteractEvent) => {
    //
  };

  private onDrag = (e: interact.InteractEvent) => {
    this.offset.x += e.dx;
    // this.offset.y += e.dy;

    this.updateTransform();
  };

  private updateTransform() {
    const { x, y } = this.offset;

    const dateRowWrapper = this.dateRowWrapperRef.current as HTMLDivElement;
    dateRowWrapper.style.transform = `translate(${x}px, ${y}px)`;
  }
}
