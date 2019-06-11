// import { Moment } from 'moment';
import * as React from 'react';

export interface IProps {
  // stamps: Moment[];
  visible: boolean;
}

export default class LeftColumn extends React.Component<IProps> {
  public render() {
    return (
      <div
        className="rightColumn"
        style={{ visibility: this.props.visible ? 'visible' : 'hidden' }}
      />
    );
  }
}
