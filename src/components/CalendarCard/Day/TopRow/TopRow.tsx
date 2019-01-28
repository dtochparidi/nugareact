import { Moment } from 'moment';
import * as React from 'react';

export interface IProps {
  // positionCount: number;
  stamps: Moment[];
}

export default class TopRow extends React.Component<IProps> {
  public render() {
    return (
      <div className="topRow">
        {/* {new Array(this.props.positionCount).fill(null).map((v, i) => (
          <div className="item" key={i}>{`Position ${i}`}</div>
        ))} */}
        {this.props.stamps.map(stamp => {
          const s = stamp.format('HH:mm');
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