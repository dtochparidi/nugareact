import { Moment } from 'moment';
import * as React from 'react';

export interface IProps {
  stamps: Moment[];
  style: React.CSSProperties;
  visible: boolean;
}

export default class TopRow extends React.Component<IProps> {
  public render() {
    return (
      <div className="topRow" style={this.props.style}>
        {this.props.visible
          ? this.props.stamps.map((stamp, i, arr) => {
              const s = stamp.format('HH:mm');
              return (
                <div
                  className={`item ${
                    i === 0 ? 'first' : i === arr.length - 1 ? 'last' : ''
                  }`}
                  key={s}
                >
                  {s}
                </div>
              );
            })
          : null}
      </div>
    );
  }
}
