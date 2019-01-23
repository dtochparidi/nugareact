import * as React from "react";

import ICalendarDay from "src/interfaces/ICalendarDay";
import Grid from "./Grid";
import PositionRow from "./PositionRow";

export interface IProps {
  rows: number;
  cols: number;
  dayData: ICalendarDay;
}

export default class Day extends React.Component<IProps> {
  public render() {
    const { rows, cols } = this.props;
    return (
      <div className="dayWrapper">
        <div
          className="day"
          style={{ "--columns-count": cols } as React.CSSProperties}
        >
          <PositionRow />
          <Grid rows={rows} cols={cols} />
        </div>
      </div>
    );
  }
}
