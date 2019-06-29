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
  public itemPress = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const position = parseInt(
      (event.target as HTMLDivElement).textContent as string,
      10,
    );

    if (!rootStore.uiStore.positionGaps.find(g => g.position === position))
      rootStore.uiStore.addGap(position, 'Title Unknown');
  };

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
              const gapIndex = rootStore.uiStore.positionGaps.findIndex(
                g => g.position === i,
              );
              return [
                <div
                  className="item"
                  key={i}
                  onClick={this.itemPress}
                >{`${i}`}</div>,
                gapIndex !== -1 ? (
                  <div className="gap" key={i + 'gap'}>
                    <span className="title">
                      {rootStore.uiStore.positionGaps[gapIndex].title}
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
