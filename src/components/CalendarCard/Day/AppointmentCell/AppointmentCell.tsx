import { IPerson } from 'interfaces/IPerson';
import IUpdateAppProps from 'interfaces/IUpdateAppProps';
import { reaction } from 'mobx';
import { observer } from 'mobx-react';
import * as moment from 'moment';
import * as React from 'react';

import * as StyleVariables from '../../../../common/variables.scss';
import Appointment from '../../../../structures/Appointment';

import './AppointmentCell.scss';

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
  initialized: boolean;
}

enum WidthClass {
  Min = 'widthMin',
  Slim = 'widthSlim',
  Medium = 'widthMedium',
  Wide = 'widthWide',
  Max = 'widthMax',
}

const upgradeWidthMap = {
  [WidthClass.Min]: WidthClass.Slim,
  [WidthClass.Slim]: WidthClass.Medium,
  [WidthClass.Medium]: WidthClass.Wide,
  [WidthClass.Wide]: WidthClass.Max,
  [WidthClass.Max]: WidthClass.Max,
};

const downgradeWidthMap = {
  [WidthClass.Min]: WidthClass.Min,
  [WidthClass.Slim]: WidthClass.Min,
  [WidthClass.Medium]: WidthClass.Slim,
  [WidthClass.Wide]: WidthClass.Medium,
  [WidthClass.Max]: WidthClass.Wide,
};

const widthCache: { [uniqueId: string]: WidthClass } = {};

@observer
export default class AppointmentCell extends React.Component<IProps, IState> {
  public onMouseWheelHandler: (e: React.WheelEvent<any> | WheelEvent) => void;
  public mouseWheelStep: number = 150;
  private mouseDeltaBuffer: number = 0;
  private widthDivRef: React.RefObject<HTMLDivElement> = React.createRef();
  private rebuildLayoutTimeout: NodeJS.Timeout;
  private unMounted = false;
  private isTryingToUpgrade = false;

  constructor(props: IProps) {
    super(props);

    this.onMouseWheelHandler = this.onMouseWheel.bind(this);

    this.state = {
      initialized: false,
      tempWidth: '',
      widthClass: widthCache[this.props.appointment.uniqueId] || WidthClass.Max,
    };

    reaction(
      () =>
        this.props.appointment.personInstance &&
        this.props.appointment.personInstance.loaded,
      loaded => {
        this.appLoadedHandler();
      },
    );
  }

  public updateLayout = (positiveResizing = false) => {
    if (this.unMounted) return;

    // console.log('updateLayout');

    const elem = this.widthDivRef.current;
    if (!elem) {
      console.log('null container');
      this.rebuildLayoutTimeout = setTimeout(
        () => this.updateLayout(),
        300 + Math.random() * 100,
      );
      return;
    }

    // BUG
    // 'display: none' is not taking into account - perfomance issue (not very big)
    if (!elem.offsetWidth) {
      clearTimeout(this.rebuildLayoutTimeout);
      this.rebuildLayoutTimeout = setTimeout(
        () => this.updateLayout(),
        300 + Math.random() * 100,
      );
      return;
    }

    const cellRect = elem.getBoundingClientRect();

    const maxRightReducer = (children: Element[], max = 0) =>
      children.reduce((acc: number, child: Element): number => {
        if (child.children.length)
          return maxRightReducer(Array.from(child.children), acc);

        const right = child.getBoundingClientRect().right;
        return Math.max(acc, right);
      }, max);

    const innerContainer = elem.querySelector('.subWrapper') as HTMLElement;
    const innerRect = innerContainer.getBoundingClientRect();
    const maxRight = maxRightReducer(Array.from(innerContainer.children));

    // console.log('rebuild');

    if (
      innerRect.height >= cellRect.height ||
      maxRight > Math.max(cellRect.right, 0)
    )
      this.setState({ widthClass: downgradeWidthMap[this.state.widthClass] });
    else {
      if (positiveResizing && !this.isTryingToUpgrade) {
        const topElem = (elem.parentNode as HTMLElement)
          .parentNode as HTMLElement;
        const virtualNode = topElem.cloneNode(true) as HTMLElement;
        virtualNode.style.height =
          topElem.getBoundingClientRect().height + 'px';
        virtualNode.style.visibility = 'hidden';
        virtualNode.style.left = '0px';
        virtualNode.style.top = '0px';
        virtualNode.style.position = 'fixed';

        const upgradedClass = upgradeWidthMap[this.state.widthClass];
        const layoutController = virtualNode.querySelector(
          '.layoutController',
        ) as HTMLElement;
        layoutController.classList.remove(this.state.widthClass);
        layoutController.classList.add(upgradedClass);

        const virtualInnerContainer = virtualNode.querySelector(
          '.subWrapper',
        ) as HTMLElement;

        document.body.appendChild(virtualNode);
        this.isTryingToUpgrade = true;

        setTimeout(() => {
          // const virtualRect = virtualNode.getBoundingClientRect();
          const virtualInnerRect = virtualInnerContainer.getBoundingClientRect();
          const newHeight = virtualInnerRect.height;
          // const newRight = reducer(Array.from(virtualInnerContainer.children));

          document.body.removeChild(virtualNode);
          this.isTryingToUpgrade = false;

          if (newHeight < cellRect.height) {
            // && newRight < virtualRect.right) {
            this.setState({
              widthClass: upgradeWidthMap[this.state.widthClass],
            });

            if (this.state.widthClass !== WidthClass.Max)
              this.updateLayout(positiveResizing);
          }
        });
      }

      if (!this.state.initialized) this.setState({ initialized: true });
    }
  };

  public componentDidUpdate() {
    widthCache[this.props.appointment.uniqueId] = this.state.widthClass;

    this.appLoadedHandler();
  }

  public componentDidMount() {
    const elem = this.widthDivRef.current as HTMLElement;

    elem.onresize = (e: UIEvent) => this.updateLayout((e.detail as any).dx > 0);

    this.appLoadedHandler();

    // this.updateLayout(false);
    // setTimeout(() => this.updateLayout(true), Math.random() * 1000 + 1000);
  }

  public appLoadedHandler() {
    const { appointment } = this.props;
    if (
      appointment &&
      appointment.personInstance &&
      appointment.personInstance.loaded
    )
      this.updateLayout(false);
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

    const offsetX = (Math.floor((translateX / 100) * 2) - 1) * borderWidth;
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
              {!this.state.initialized
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
