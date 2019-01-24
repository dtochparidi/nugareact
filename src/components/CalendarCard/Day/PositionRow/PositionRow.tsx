import * as React from 'react';

export interface IProps {
  positionCount: number;
}

export default class PositionRow extends React.Component<IProps> {
  public render() {
    return (
      <div className="positionRow">
        {new Array(this.props.positionCount).fill(null).map((v, i) => (
          <div className="item" key={i}>{`Position ${i}`}</div>
        ))}
      </div>
    );
  }
}
 