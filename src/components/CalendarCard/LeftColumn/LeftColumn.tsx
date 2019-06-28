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
          ? new Array(this.props.positionCount).fill(null).map((v, i) => {
              const gapIndex = rootStore.uiStore.positionGaps.indexOf(i);
              return [
                <div className="item" key={i}>{`${i}`}</div>,
                gapIndex !== -1 ? (
                  <div className="gap" key={i + 'gap'}>
                    <span className="title">
                      {rootStore.uiStore.positionGapsTitles[gapIndex]}
                    </span>
                  </div>
                ) : null,
              ];
            })
          : null}
      </div>
    );
  }
}
