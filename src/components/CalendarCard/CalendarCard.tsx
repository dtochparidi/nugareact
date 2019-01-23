import { observer } from "mobx-react";
import * as Moment from "moment";
import { Moment as IMoment } from "moment";
import { extendMoment } from "moment-range";
import * as React from "react";

import ICalendarDay from "../../interfaces/ICalendarDay";
import Card from "../Card";
import Day from "./Day";
import TimeColumn from "./TimeColumn";

import "./CalendarCard.scss";

const moment = extendMoment(Moment);

export interface IProps {
  days: ICalendarDay[];
  daysPending: IMoment[];
  requestCallback: (date: Moment.Moment) => void;
}

export interface IState {
  requiredDays: IMoment[];
  selectedDay: number;
}

@observer
export default class CalendarCard extends React.Component<IProps, IState> {
  private daysContainerRef: React.RefObject<HTMLDivElement>;

  constructor(props: IProps) {
    super(props);

    this.daysContainerRef = React.createRef();
    this.state = {
      requiredDays: [
        moment(),
        moment().add(1, "day"),
        moment().add(2, "day"),
        moment().add(3, "day")
      ],
      selectedDay: 0
    };
  }

  public componentDidMount() {
    window.addEventListener("keydown", e => {
      switch (e.code) {
        case "ArrowRight":
          this.turnPage(1);
          break;
        case "ArrowLeft":
          this.turnPage(-1);
          break;
      }
    });
  }

  public componentDidUpdate() {
    // OPTIMIZE
    this.state.requiredDays.forEach(day => {
      if (!this.props.daysPending.find(d => d.diff(day, "days") === 0))
        this.props.requestCallback(day);
    });
  }

  public turnPage(delta: -1 | 1) {
    const newIndex = Math.min(
      Math.max(this.state.selectedDay + delta, 0),
      this.props.days.length - 1
    );
    this.setState({ selectedDay: newIndex });

    const container = this.daysContainerRef.current as HTMLDivElement;
    const target = container.children[newIndex] as HTMLElement;
    const left = Math.ceil(
      target.getBoundingClientRect().left -
        container.getBoundingClientRect().left +
        container.scrollLeft
    );

    container.scrollTo({
      behavior: "smooth",
      left
    });
  }

  public render() {
    const stamps = Array.from(
      moment
        .range(
          moment()
            .startOf("day")
            .hour(9),
          moment()
            .startOf("day")
            .hour(21)
        )
        .by("minutes", { step: 60 })
    );
    const [rows, cols] = [stamps.length, 4];

    return (
      <Card
        cardClass="calendarCard"
        style={{ "--rows-count": rows } as React.CSSProperties}
      >
        <TimeColumn stamps={stamps} />
        <div className="daysContainer" ref={this.daysContainerRef}>
          {this.props.days.map(day => (
            <Day
              key={day.date.toString()}
              rows={rows}
              cols={cols}
              dayData={day}
            />
          ))}
        </div>
      </Card>
    );
  }
}
