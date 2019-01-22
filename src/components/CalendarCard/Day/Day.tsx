import * as React from 'react';

import Grid from './Grid';
import PositionRow from './PositionRow';

export interface IProps {
  children?: React.ReactNode;
}

export default class Day extends React.Component<IProps> {
  public render() {
    return (
      <div className="day">
        <PositionRow />
        <Grid rows={4} cols={5} />
      </div>
    );
  }
}
