import * as React from 'react';

export interface IProps {
  children?: React.ReactNode;
}

export default class StickyDaysRow extends React.Component<IProps> {
  public render() {
    return <div className="stickyDaysRow">days are here</div>;
  }
}
