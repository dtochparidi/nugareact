import { computed } from 'mobx';
import { observer } from 'mobx-react';
import { Moment as IMoment } from 'moment';
import * as React from 'react';

import './DateRow.scss';

export interface IProps {
  dayChosenIndex: number;
  monthStartDate: IMoment;
  dayJumpCallback: (index: number) => void;
}

@observer
export default class DateRow extends React.Component<IProps> {
  @computed
  public get monthLength() {
    return (
      (this.props.monthStartDate && this.props.monthStartDate.daysInMonth()) ||
      0
    );
  }

  public indexClickHandler = (e: React.MouseEvent) => {
    this.props.dayJumpCallback(
      parseInt(
        (e.currentTarget.querySelector('.index') as HTMLElement).textContent ||
          '0',
        10,
      ) + 1,
    );
  };

  public goPreviousMonth = () => {
    this.props.dayJumpCallback(1);
  };

  public goNextMonth = () => {
    this.props.dayJumpCallback(this.monthLength + 2);
  };

  public animationEnded = () => {
    console.log('ended!');
  };

  public render() {
    return (
      <div className="dateRowWrapper">
        <div className="dateRow" key={this.props.monthStartDate.format('MM')}>
          {new Array(this.monthLength).fill(null).map((v, i) => (
            <div
              key={i}
              className={`day ${
                i + 1 === this.props.dayChosenIndex ? 'chosen' : ''
              }`}
              onClick={this.indexClickHandler}
            >
              <span className="name">
                {this.props.monthStartDate
                  .clone()
                  .date(i + 1)
                  .format('dd')}
              </span>
              <span className="index">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
}
