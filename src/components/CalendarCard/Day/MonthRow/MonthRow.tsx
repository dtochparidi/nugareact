// import ArrowLeft from '@material-ui/icons/KeyboardArrowLeft';
// import ArrowRight from '@material-ui/icons/KeyboardArrowRight';
import { observer } from 'mobx-react';
import { Moment as IMoment } from 'moment';
import * as React from 'react';

import './MonthRow.scss';

export interface IProps {
  monthDates: IMoment[];
  dayJumpCallback: any;
}

export interface IState {
  maxMonthWidth: number;
}

@observer
export default class MonthRow extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      maxMonthWidth: 0,
    };
  }

  public render() {
    return (
      <div
        className="monthRowWrapper"
        key={this.props.monthDates.map(month => month.format('MM')).join()}
      >
        <span
          className="monthName"
          // style={{ width: this.state.maxMonthWidth + 'px' }}
        >
          {this.props.monthDates.map(month => month.format('MMMM')).join(' - ')}
        </span>
        {/* <div className="arrowWrapper">
          <ArrowLeft onClick={this.goPreviousMonth} />
        </div>
        <div className="arrowWrapper">
          <ArrowRight onClick={this.goNextMonth} />
        </div> */}
      </div>
    );
  }

  // private async updateMaxMonthWidth() {
  //   const fontSize = headerTextFontSize;
  //   const textNode = document.createElement('span');
  //   textNode.style.fontSize = fontSize + 'px';
  //   textNode.style.visibility = 'hidden';
  //   textNode.textContent = maxMonthByWidth;

  //   document.body.appendChild(textNode);

  //   await new Promise(resolve =>
  //     setTimeout(() => {
  //       const width = textNode.offsetWidth;
  //       this.setState({ maxMonthWidth: width });

  //       document.body.removeChild(textNode);

  //       resolve();
  //     }),
  //   );
  // }
}
