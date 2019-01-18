import * as React from 'react';
import './Card.scss';

export interface ICardProps {
  cardClass: string;
}

export default class Card extends React.Component<ICardProps, any> {
  public render() {
    return (
      <div className={`card ${this.props.cardClass}`}>
        {this.props.children}
      </div>
    );
  }
}
