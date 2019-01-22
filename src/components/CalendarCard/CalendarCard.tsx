import * as React from "react";
import ICalendarDay from "src/interfaces/ICalendarDay";

export interface IProps {
  days: ICalendarDay[];
}

// export interface IState {
// }

export default class CalendarCard extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);

    this.state = {};
  }

  public render() {
    return <div>{this.props.children}</div>;
  }
}
