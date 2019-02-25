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
      parseInt(e.currentTarget.textContent || '0', 10),
    );
  };

  public render() {
    return (
      <div className="dateRow">
        {new Array(this.monthLength).fill(null).map((v, i) => (
          <div key={i} className="day">
            <span className="name">
              {this.props.monthStartDate
                .clone()
                .date(i + 1)
                .format('dd')}
            </span>
            <span
              onClick={this.indexClickHandler}
              className={`index ${
                i + 1 === this.props.dayChosenIndex ? 'chosen' : ''
              }`}
            >
              {i + 1}
            </span>
          </div>
        ))}
      </div>
    );
  }
}
