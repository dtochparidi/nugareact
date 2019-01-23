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
}

@observer
export default class CalendarCard extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      requiredDays: [moment(), moment().add(1, "day")]
    };
  }

  public componentDidUpdate() {
    this.state.requiredDays.forEach(day => {
      if (!this.props.daysPending.find(d => d.diff(day, "days") === 0))
        this.props.requestCallback(day);
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
        <div className="daysContainer">
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
