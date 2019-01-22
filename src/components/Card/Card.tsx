import './Card.scss';

import * as React from 'react';

export interface ICardProps extends React.HTMLProps<any> {
  cardClass: string;
}

export default class Card extends React.Component<ICardProps, any> {
  public render() {
    return (
      <div className={`card ${this.props.cardClass}`} style={this.props.style}>
        {this.props.children}
      </div>
    );
  }
}
