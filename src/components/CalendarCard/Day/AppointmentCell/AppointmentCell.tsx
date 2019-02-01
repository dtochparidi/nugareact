import { observer } from 'mobx-react';
import { Moment as IMoment } from 'moment';
import * as moment from 'moment';
import * as React from 'react';
import { IPerson } from 'src/interfaces/IPerson';

import Appointment from '../../../../structures/Appointment';

import './AppointmentCell.scss';

export interface IProps {
  appointment: Appointment;
  translateX?: number;
  translateY?: number;
  subGridStep: moment.Duration;
  updateAppointment: (
    {
      date,
      position,
      personId,
      targetDate,
      targetPosition,
      appointment,
    }:
      | {
          date: IMoment;
          position: number;
          personId: string;
          targetDate: IMoment;
          appointment: undefined;
          targetPosition: number;
        }
      | {
          date: undefined;
          position: undefined;
          personId: undefined;
          appointment: Appointment;
          targetDate: IMoment;
          targetPosition: number;
        },
  ) => void;
}

@observer
export default class AppointmentCell extends React.Component<IProps> {
  public onMouseWheelHandler: (e: React.WheelEvent<any> | WheelEvent) => void;
  public mouseWheelStep: number = 30;
  private mouseDeltaBuffer: number = 0;

  constructor(props: IProps) {
    super(props);

    this.onMouseWheelHandler = this.onMouseWheel.bind(this);
  }

  public onMouseWheel(e: React.WheelEvent<any> | WheelEvent) {
    if (!e.ctrlKey) return;

    e.preventDefault();
    e.stopPropagation();

    window.onmousewheel = (we: WheelEvent) => {
      this.onMouseWheelHandler(we);
    };

    this.mouseDeltaBuffer += e.deltaY;
    if (Math.abs(this.mouseDeltaBuffer) < this.mouseWheelStep) return;

    const s = this.mouseDeltaBuffer / this.mouseWheelStep;
    const steps = Math.floor(Math.abs(s)) * Math.sign(s);
    const amount = steps * this.mouseWheelStep;

    const lastSign = Math.sign(this.mouseDeltaBuffer);
    this.mouseDeltaBuffer -= amount;

    this.mouseDeltaBuffer =
      Math.sign(this.mouseDeltaBuffer) === lastSign ? this.mouseDeltaBuffer : 0;

    // update appointment
    const { updateAppointment, appointment, subGridStep } = this.props;
    const duration = moment.duration(subGridStep.asMilliseconds() * steps);
    updateAppointment({
      appointment,
      date: undefined,
      personId: undefined,
      position: undefined,
      targetDate: appointment.date.clone().add(duration),
      targetPosition: appointment.position,
    });
  }

  public render() {
    const { personInstance, identifier } = this.props.appointment;
    let { translateX, translateY } = this.props;
    translateX = translateX || 0;
    translateY = translateY || 0;

    const translated = translateX || translateY;

    if (!personInstance) {
      console.warn('missing instance');
      return null;
    }

    const person = personInstance as IPerson;
    return (
      <div
        className={`appointmentCell ${translated ? 'translated' : ''}`}
        id={identifier}
        onWheel={this.onMouseWheelHandler}
      >
        <div
          className="container"
          style={
            translated
              ? {
                  transform: `translate(${translateX}%,${translateY}%)`,
                }
              : {}
          }
        >
          {!personInstance.loaded
            ? [
                <div className="marker loading" key="marker" />,
                <div className="avatar loading" key="avatar" />,
                <div className="mainInfoWrapper" key="mainInfoWrapper">
                  <div className="subWrapper">
                    <div className="content loading" />
                    <div className="content loading" />
                  </div>
                </div>,
                <div className="pointsWrapper" key="poinsWrapper">
                  <div className="content loading" />
                </div>,
              ]
            : [
                <div className="marker" key="marker" />,
                <div className="avatar" key="avatar" />,
                <div className="mainInfoWrapper" key="mainInfoWrapper">
                  <div className="subWrapper">
                    <div className="content">
                      <span className="surname">{person.surname}</span>{' '}
                      <span className="name">{person.name}</span>{' '}
                      {person.patronymic ? (
                        <span className="patronymic">{person.patronymic} </span>
                      ) : null}
                      <span>
                        <span className="visits">13</span>{' '}
                        <span className="grade">A</span>
                      </span>
                    </div>
                    <div className="content">
                      <span className="number">{person.phone}</span>
                    </div>
                  </div>
                </div>,
                <div className="pointsWrapper" key="poinsWrapper">
                  <div className="content">19</div>
                </div>,
              ]}
        </div>
      </div>
    );
  }
}
