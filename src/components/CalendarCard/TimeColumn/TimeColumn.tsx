import { Moment } from 'moment';
import * as React from 'react';

export interface IProps {
  stamps: Moment[];
}

export default class TimeColumn extends React.Component<IProps> {
  public render() {
    return (
      <div className="timeColumn">
        <div className="item" key="zero" />
        {this.props.stamps.map(stamp => {
          const s = stamp.format("HH:mm");
          return (
            <div className="item" key={s}>
              {s}
            </div>
          );
        })}
      </div>
    );
  }
}
