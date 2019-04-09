// import { Moment } from 'moment';
import * as React from 'react';

export interface IProps {
  // stamps: Moment[];
  visible: boolean;
  positionCount: number;
}

export default class LeftColumn extends React.Component<IProps> {
  public render() {
    return (
      <div
        className="leftColumn"
        style={{ visibility: this.props.visible ? 'visible' : 'hidden' }}
      >
        <div className="item" key="minusOne" />
        <div className="item" key="zero" />
        {this.props.positionCount
          ? new Array(this.props.positionCount)
              .fill(null)
              .map((v, i) => <div className="item" key={i}>{`${i}`}</div>)
          : null}
        {/* {this.props.stamps.map(stamp => {
          const s = stamp.format("HH:mm");
          return (
            <div className="item" key={s}>
              {s}
            </div>
          );
        })} */}
      </div>
    );
  }
}
