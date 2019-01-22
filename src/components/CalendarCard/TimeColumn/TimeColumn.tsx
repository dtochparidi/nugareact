import * as React from 'react';

export interface IProps {
  children?: React.ReactNode;
}

export default class TimeColumn extends React.Component<IProps> {
  public render() {
    return <div>{this.props.children}</div>;
  }
}
