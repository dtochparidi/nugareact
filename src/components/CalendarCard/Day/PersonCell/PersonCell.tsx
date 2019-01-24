import * as React from 'react';
import { IPerson } from 'src/interfaces/IPerson';

import './PersonCell.scss';

export interface IProps {
  person: IPerson;
}

export default class PersonCell extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    return (
      <div className="personCell">
        <span>{this.props.person.surname}</span>
        <span>{this.props.person.name}</span>
        <span>{this.props.person.patronymic}</span>
        <span>G</span>
        <span>V</span>
      </div>
    );
  }
}
