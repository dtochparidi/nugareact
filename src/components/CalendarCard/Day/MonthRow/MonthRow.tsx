import { observer } from 'mobx-react';
import { Moment as IMoment } from 'moment';
import * as React from 'react';

import './MonthRow.scss';

export interface IProps {
  monthDate: IMoment;
}

@observer
export default class MonthRow extends React.Component<IProps> {
  public render() {
    return (
      <div className="monthRowWrapper">
        {this.props.monthDate.format('MMMM')}
      </div>
    );
  }
}
