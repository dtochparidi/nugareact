import * as React from 'react';

export interface IProps {
  apps: JSX.Element[];
  hash: string;
}

export default class AppsBlock extends React.Component<IProps> {
  public shouldComponentUpdate(prevProps: IProps) {
    const notEqual = prevProps.hash !== this.props.hash;
    // if (!notEqual) console.log('hashes are equal');

    return notEqual;
  }

  public render() {
    return <div className="appsBlock">{this.props.apps}</div>;
  }
}
