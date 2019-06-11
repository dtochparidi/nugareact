import { Moment } from 'moment';
import * as React from 'react';

export interface IProps {
  keyStamp: string;
  stamps: Moment[];
  style: React.CSSProperties;
  visible: boolean;
}

export default class TopRow extends React.Component<IProps> {
  public shouldComponentUpdate(prevProps: IProps) {
    const shouldUpdate =
      prevProps.keyStamp !== this.props.keyStamp ||
      prevProps.style.width !== this.props.style.width;

    return shouldUpdate;
  }

  public render() {
    return (
      <div className="timeRow" style={this.props.style}>
        {this.props.visible
          ? this.props.stamps.map((stamp, i, arr) => {
              const hours = stamp.format('H');
              const minutes = stamp.format('mm');

              return (
                <div
                  className={`item ${
                    i === 0 ? 'first' : i === arr.length - 1 ? 'last' : ''
                  }`}
                  key={hours + minutes}
                >
                  <div className="time">
                    <span className="hours">{hours}</span>
                    <span className="minutes">{' ' + minutes}</span>
                  </div>
                </div>
              );
            })
          : null}
      </div>
    );
  }
}
