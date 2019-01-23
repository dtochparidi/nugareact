import * as React from 'react';

export interface IProps {
  children?: React.ReactNode;
}

export default class PositionRow extends React.Component<IProps> {
  public render() {
    return <div className="positionRow" />;
  }
}
