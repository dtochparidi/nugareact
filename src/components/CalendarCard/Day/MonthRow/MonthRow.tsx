// import ArrowLeft from '@material-ui/icons/KeyboardArrowLeft';
// import ArrowRight from '@material-ui/icons/KeyboardArrowRight';
import { computed } from 'mobx';
import { observer } from 'mobx-react';
import { Moment as IMoment } from 'moment';
// import * as moment from 'moment';
import * as React from 'react';

// import * as StyleVariables from '../../../../common/variables.scss';

import './MonthRow.scss';

// const headerTextFontSize = parseFloat(StyleVariables.headerTextFontSize);

export interface IProps {
  monthDate: IMoment;
  dayJumpCallback: (index: number) => void;
}

export interface IState {
  maxMonthWidth: number;
}

// const maxMonthByWidth = moment
//   .months()
//   .reduce((acc, val) => (val.length > acc.length ? val : acc));

@observer
export default class MonthRow extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      maxMonthWidth: 0,
    };
  }

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

  public async componentDidMount() {
    // await this.updateMaxMonthWidth();
  }

  public render() {
    return (
      <div
        className="monthRowWrapper"
        key={this.props.monthDate.format('MMMM')}
      >
        <span
          className="monthName"
          // style={{ width: this.state.maxMonthWidth + 'px' }}
        >
          {this.props.monthDate.format('MMMM')}
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
