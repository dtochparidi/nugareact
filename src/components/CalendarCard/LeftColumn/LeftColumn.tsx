// import { Moment } from 'moment';
import * as React from 'react';
import rootStore from 'stores/RootStore';
import { observer } from 'mobx-react';

export interface IProps {
  // stamps: Moment[];
  visible: boolean;
  positionCount: number;
}

@observer
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
              .map((v, i) => [
                <div className="item" key={i}>{`${i}`}</div>,
                rootStore.uiStore.positionGaps.includes(i) ? (
                  <div className="gap" key={i + 'gap'} />
                ) : null,
              ])
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
