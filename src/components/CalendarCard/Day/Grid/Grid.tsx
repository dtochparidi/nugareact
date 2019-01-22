import * as React from 'react';

export interface IProps {
  cols: number;
  rows: number;
}
export default class Grid extends React.Component<IProps> {
  public render() {
    const { rows, cols } = this.props;
    const elements = [];
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++)
        elements.push(
          <div key={`${x}:${y}`} className="item" data-x={x} data-y={y} />
        );

    return <div className="grid">{elements}</div>;
  }
}
