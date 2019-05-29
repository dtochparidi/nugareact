import { IPerson } from 'interfaces/IPerson';
import IUpdateAppProps from 'interfaces/IUpdateAppProps';
import { observer } from 'mobx-react';
import * as moment from 'moment';
import * as React from 'react';

import Appointment from '../../../../structures/Appointment';

import { Lambda, observe } from 'mobx';
import './AppointmentCell.scss';

// import * as StyleVariables from '../../../../common/variables.scss';
export interface IProps {
  style?: React.CSSProperties;
  appointment: Appointment;
  translateX?: number;
  translateY?: number;
  moving: boolean;
  subGridColumns: number;
  gridColumnDuration: moment.Duration;
  getCellWidth: () => number;
  updateAppointment: (props: IUpdateAppProps, weightful?: boolean) => void;
  isDisplaying: { value: boolean };
  shiftObservable: { dx: number; dy: number };
  cellHeight: number;
}

export interface IState {
  shift: { dx: number; dy: number };
}

@observer
export default class AppointmentCell extends React.Component<IProps, IState> {
  public onMouseWheelHandler: (e: React.WheelEvent<any> | WheelEvent) => void;
  public mouseWheelStep: number = 150;
  private mouseDeltaBuffer: number = 0;
  private reactions: Lambda[] = [];
  private unmounted = false;

  constructor(props: IProps) {
    super(props);

    this.onMouseWheelHandler = this.onMouseWheel.bind(this);

    const r = observe(this.props.shiftObservable, () => {
      if (!this.unmounted) this.setState({ shift: this.props.shiftObservable });
    });

    this.reactions = [r];

    this.state = {
      shift: { dx: 0, dy: 0 },
    };
  }

  public componentWillUnmount() {
    this.unmounted = true;
    this.reactions.forEach(r => r());
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
    const steps = Math.floor(Math.min(Math.abs(s), 1) * Math.sign(s));
    const amount = steps * this.mouseWheelStep;

    const lastSign = Math.sign(this.mouseDeltaBuffer);
    this.mouseDeltaBuffer -= amount;

    this.mouseDeltaBuffer =
      Math.sign(this.mouseDeltaBuffer) === lastSign ? this.mouseDeltaBuffer : 0;

    // update appointment
    const {
      updateAppointment,
      appointment,
      gridColumnDuration,
      subGridColumns,
    } = this.props;
    const duration = moment.duration(
      (gridColumnDuration.asMilliseconds() / subGridColumns) * steps,
    );
    updateAppointment({
      appointment,
      targetDate: appointment.date.clone().add(duration),
      targetPosition: appointment.position,
    });
  }

  public render() {
    const {
      personInstance,
      identifier,
      overlapping,
      visits,
      points,
    } = this.props.appointment;

    const { isDisplaying } = this.props;
    if (!isDisplaying.value) return null;

    let { translateX, translateY } = this.props;
    const { moving, getCellWidth, cellHeight } = this.props;

    if (!personInstance) {
      console.warn('missing instance');
      return null;
    }

    const { dx, dy } = this.state.shift;

    const cellWidth = getCellWidth();
    const coeffX = cellWidth * dx;
    const coeffY = cellHeight * dy;

    translateX = (translateX || 0) + coeffX;
    translateY = (translateY || 0) + coeffY;

    const translated = true;

    const widthScale = 1;
    const width = `${cellWidth * widthScale}px`;

    const person = personInstance as IPerson;
    const transformString = `translate3d(${translateX}px, ${translateY}px, 0px)`;

    return (
      <div
        className={`appointmentCell ${translated ? 'translated' : ''} ${
          moving ? 'moving' : ''
        } ${overlapping ? 'overlapping' : ''}`}
        id={identifier}
        onWheel={this.onMouseWheelHandler}
        style={Object.assign(
          { width, transform: transformString },
          this.props.style || {},
        )}
      >
        {!person || !person.loaded ? (
          <div className="loadingMask">
            <div className="marker loading" key="marker" />
            <div className="avatar loading" key="avatar" />
            <div className="mainInfoWrapper" key="mainInfoWrapper">
              <div className="subWrapper">
                <div className="content loading" />
                <div className="content loading" />
              </div>
            </div>
            <div className="pointsWrapper" key="poinsWrapper">
              <div className="content loading" />
            </div>
          </div>
        ) : null}
        {person && person.loaded ? (
          <div className="realContainer">
            <div className="marker" key="marker" />
            <div className="avatar" key="avatar" />
            <div className="mainInfoWrapper" key="mainInfoWrapper">
              <div className="subWrapper">
                <div className="content">
                  <span className="surname">{person.surname}</span>{' '}
                  <span className="name">{person.name}</span>{' '}
                  {person.patronymic ? (
                    <span className="patronymic">{person.patronymic} </span>
                  ) : null}
                  <span className="additionalInfo">
                    <span className="visits">{visits}</span>{' '}
                    <span className="grade">A</span>
                  </span>
                </div>
                <div className="content">
                  <span className="number">{person.phone}</span>
                </div>
              </div>
            </div>
            <div className="pointsWrapper" key="poinsWrapper">
              <div className="content">{points}</div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }
}
