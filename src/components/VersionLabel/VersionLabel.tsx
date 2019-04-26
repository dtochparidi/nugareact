import * as React from 'react';

export interface IProps {
  patch: number;
  minor: number;
  major: number;
}

export default class VersionLabel extends React.Component<IProps> {
  public render() {
    const { patch, major, minor } = this.props;
    return (
      <div
        style={{
          background: 'rgba(200, 200, 200, 0.3)',
          bottom: 0,
          padding: '0.2em',
          position: 'fixed',
          right: 0,
          zIndex: 1000000000000,
        }}
      >{`${major}.${minor}.${patch}`}</div>
    );
  }
}
