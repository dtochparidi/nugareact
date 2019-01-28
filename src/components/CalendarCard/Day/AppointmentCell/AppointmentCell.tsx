import { observer } from 'mobx-react';
import * as React from 'react';
import IAppointment from 'src/interfaces/IAppointment';
import { IPerson } from 'src/interfaces/IPerson';

import './AppointmentCell.scss';

// import * as interact from 'interactjs';

// interact('.appointmentCell').draggable({

// });

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

    if (!personInstance) {
      console.warn('missing instance');
      return null;
    }

    if (!personInstance.loaded)
      return (
        <div className="appointmentCell">
          <div className="marker loading" />
          <div className="avatar loading" />
          <div className="mainInfoWrapper">
            <div className="subWrapper">
              <div className="content loading" />
              <div className="content loading" />
            </div>
          </div>
          <div className="pointsWrapper">
            <div className="content loading">{personInstance.id}</div>
          </div>
        </div>
      );
    else {
      const person = personInstance as IPerson;
      return (
        <div className="appointmentCell">
          <div className="marker" />
          <div className="avatar" />
          <div className="mainInfoWrapper">
            <div className="subWrapper">
              <div className="content">
                <span className="surname">{person.surname}</span>{' '}
                <span className="name">{person.name}</span>{' '}
                {person.patronymic ? (
                  <span className="patronymic">{person.patronymic} </span>
                ) : null}
                <span className="visits">v</span>{' '}
                <span className="grade">g</span>
              </div>
              <div className="content">
                <span className="number">{person.phone}</span>
              </div>
            </div>
          </div>
          <div className="pointsWrapper">
            {/* <div className="content">19</div> */}
            <div className="content">{person.id}</div>
          </div>
        </div>
      );
    }
  }
}
