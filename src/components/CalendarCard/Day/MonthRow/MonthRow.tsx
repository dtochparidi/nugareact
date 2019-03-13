import ArrowLeft from '@material-ui/icons/KeyboardArrowLeft';
import ArrowRight from '@material-ui/icons/KeyboardArrowRight';
import { computed } from 'mobx';
import { observer } from 'mobx-react';
import { Moment as IMoment } from 'moment';
import * as React from 'react';

import './MonthRow.scss';

export interface IProps {
  monthDate: IMoment;
  dayJumpCallback: (index: number) => void;
}
@observer
export default class MonthRow extends React.Component<IProps> {
  @computed
  public get monthLength() {
    return this.props.monthDate.daysInMonth() || 0;
  }

  public goPreviousMonth = () => {
    this.props.dayJumpCallback(1);
  };

  public goNextMonth = () => {
    this.props.dayJumpCallback(this.monthLength + 2);
  };

  public render() {
    return (
      <div
        className="monthRowWrapper"
        key={this.props.monthDate.format('MMMM')}
      >
        <div className="arrowWrapper">
          <ArrowLeft onClick={this.goPreviousMonth} />
        </div>
        {this.props.monthDate.format('MMMM')}
        <div className="arrowWrapper">
          <ArrowRight onClick={this.goNextMonth} />
        </div>
      </div>
    );
  }
}
