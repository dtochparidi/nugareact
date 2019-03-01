import * as CardVariables from 'components/CalendarCard/CalendarCard.scss';
import { IPerson } from 'interfaces/IPerson';
import IUpdateAppProps from 'interfaces/IUpdateAppProps';
import { observer } from 'mobx-react';
import * as moment from 'moment';
import * as React from 'react';

import * as StyleVariables from '../../../../common/variables.scss';
import Appointment from '../../../../structures/Appointment';

import './AppointmentCell.scss';

const MIN_CELL_WIDTH = parseFloat(CardVariables.calendarCellWidthMin);

export interface IProps {
  appointment: Appointment;
  translateX?: number;
  translateY?: number;
  moving: boolean;
  subGridColumns: number;
  gridColumnDuration: moment.Duration;
  updateAppointment: (props: IUpdateAppProps) => void;
}

export interface IState {
  widthClass: WidthClass;
  tempWidth: string;
}

enum WidthClass {
  Min = 'widthMin',
  Slim = 'widthSlim',
  Medium = 'widthMedium',
  Wide = 'widthWide',
  Max = 'widthMax',
}

@observer
export default class AppointmentCell extends React.Component<IProps, IState> {
  public onMouseWheelHandler: (e: React.WheelEvent<any> | WheelEvent) => void;
  public mouseWheelStep: number = 150;
  private mouseDeltaBuffer: number = 0;
  private widthDivRef: React.RefObject<HTMLDivElement> = React.createRef();
  private rebuildLayoutTimeout: NodeJS.Timeout;
  private unMounted = false;

  constructor(props: IProps) {
    super(props);

    this.onMouseWheelHandler = this.onMouseWheel.bind(this);

    this.state = {
      tempWidth: '',
      widthClass: WidthClass.Max,
    };
  }

  public updateLayout = () => {
    if (this.unMounted) return;

    const elem = this.widthDivRef.current;
    if (!elem) {
      console.log('null container');
      this.rebuildLayoutTimeout = setTimeout(
        () => this.updateLayout(),
        300 + Math.random() * 100,
      );
      return;
    }

    const cellRect = elem.getBoundingClientRect();
    const { width } = cellRect;

    // BUG
    // 'display: none' is not taking into account - perfomance issue (not very big)
    if (width === 0) {
      // console.log('width zero');
      this.rebuildLayoutTimeout = setTimeout(
        () => this.updateLayout(),
        300 + Math.random() * 100,
      );
      return;
    }

    const newWidthClass =
      width < MIN_CELL_WIDTH * 0.5
        ? WidthClass.Min
        : width < MIN_CELL_WIDTH * 0.8
        ? WidthClass.Slim
        : width < MIN_CELL_WIDTH * 0.9
        ? WidthClass.Medium
        : width < MIN_CELL_WIDTH
        ? WidthClass.Wide
        : WidthClass.Max;

    if (newWidthClass !== this.state.widthClass)
      this.setState({ widthClass: newWidthClass });
  };

  public componentDidUpdate() {
    setTimeout(() => this.updateLayout());
  }

  public componentDidMount() {
    const elem = this.widthDivRef.current as HTMLElement;

    elem.onresize = this.updateLayout;

    this.updateLayout();
    setTimeout(() => this.updateLayout());
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

  public componentWillUnmount() {
    clearTimeout(this.rebuildLayoutTimeout);
    this.unMounted = true;
  }

  public render() {
    const {
      personInstance,
      identifier,
      duration,
      overlapping,
    } = this.props.appointment;

    let { translateX, translateY } = this.props;
    const { gridColumnDuration, moving } = this.props;

    if (!personInstance) {
      console.warn('missing instance');
      return null;
    }

    const borderWidth = parseFloat(StyleVariables.thinWidth);

    translateX = translateX || 0;
    translateY = translateY || 0;

    const offsetX = Math.floor((translateX / 100) * 2) * borderWidth;
    const offsetY = Math.floor((translateY / 100) * 2) * borderWidth;

    const translated = true;

    const widthScale = duration.asMinutes() / gridColumnDuration.asMinutes();
    const widthCorrect = Math.floor(widthScale) * 2;
    const width = `calc(${widthScale * 100}% + ${widthCorrect}px)`;

    const person = personInstance as IPerson;
    return (
      <div
        className={`appointmentCell ${translated ? 'translated' : ''} ${
          moving ? 'moving' : ''
        } ${overlapping ? 'overlapping' : ''}`}
        id={identifier}
        onWheel={this.onMouseWheelHandler}
        style={
          translated && !moving
            ? {
                transform: `translate(calc(${translateX}% + ${offsetX}px), calc(${translateY}% + ${offsetY}px))`,
              }
            : {}
        }
      >
        <div
          className="container"
          style={{
            width,
          }}
        >
          <div className="containerTempWidth" ref={this.widthDivRef}>
            <div className={`layoutController ${this.state.widthClass}`}>
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
                            <span className="patronymic">
                              {person.patronymic}{' '}
                            </span>
                          ) : null}
                          <span className="additionalInfo">
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
        </div>
      </div>
    );
  }
}
