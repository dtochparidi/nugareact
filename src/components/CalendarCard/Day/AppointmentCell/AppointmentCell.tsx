import { observer } from 'mobx-react';
import * as React from 'react';
import IAppointment from 'src/interfaces/IAppointment';
import { IPerson } from 'src/interfaces/IPerson';

import './AppointmentCell.scss';

export interface IProps {
  appointment: IAppointment;
}

@observer
export default class AppointmentCell extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    const { personInstance } = this.props.appointment;
    if (!personInstance || !personInstance.loaded) return null;

    const person = personInstance as IPerson;
    return (
      <div className="appointmentCell">
        <div className="leftBlock">
          <span>{person.surname}</span>
          <span>{person.name}</span>
          <span>{person.patronymic}</span>
          <span>G</span>
          <span>V</span>
        </div>
        <div className="rightBlock">
          <span>12</span>
        </div>
      </div>
    );
  }
}
