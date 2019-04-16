import { LazyTask } from '@levabala/lazytask/build/dist';
import lazyTaskManager from '@levabala/lazytask/build/dist/LazyTaskManager';
import { IPerson } from 'interfaces/IPerson';
import IUpdateAppProps from 'interfaces/IUpdateAppProps';
import { reaction } from 'mobx';
import { observer } from 'mobx-react';
import * as moment from 'moment';
import * as React from 'react';
import rootStore from 'stores/RootStore';

import Appointment from '../../../../structures/Appointment';

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
  updateAppointment: (props: IUpdateAppProps) => void;
  isDisplaying: boolean;
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

const condFun = () => !rootStore.uiStore.isScrollingUnbinded;

@observer
export default class AppointmentCell extends React.Component<IProps, IState> {
  public onMouseWheelHandler: (e: React.WheelEvent<any> | WheelEvent) => void;
  public mouseWheelStep: number = 150;
  private mouseDeltaBuffer: number = 0;
  private widthDivRef: React.RefObject<HTMLDivElement> = React.createRef();
  private rebuildLayoutTimeout: NodeJS.Timeout;
  private unMounted = false;
  private isTryingToUpgrade = false;
  private goingDown = true;

  constructor(props: IProps) {
    super(props);

    this.onMouseWheelHandler = this.onMouseWheel.bind(this);

    this.state = {
      initialized: false,
      tempWidth: '',
      widthClass: widthCache[this.props.appointment.uniqueId] || WidthClass.Max,
    };

    if (
      !this.props.appointment.personInstance ||
      !this.props.appointment.personInstance.loaded
    )
      reaction(
        () =>
          this.props.appointment.personInstance &&
          this.props.appointment.personInstance.loaded,
        loaded => {
          lazyTaskManager.addTask(
            new LazyTask(() => this.appLoadedHandler(), 1, condFun),
          );
        },
      );

    reaction(
      () => this.props.isDisplaying,
      val => {
        if (this.props.isDisplaying)
          lazyTaskManager.addTask(
            new LazyTask(() => this.appLoadedHandler(), 1, condFun),
          );
      },
    );
  }

  public updateLayout = (positiveResizing = false) => {
    if (this.unMounted || !this.props.isDisplaying) return;

    const elem = this.widthDivRef.current;
    if (!elem) {
      console.warn('null container');
      return;
    }

    if (!elem.offsetWidth) return;

    const cellRect = elem.getBoundingClientRect();

    const maxRightReducer = (children: Element[], max = 0) =>
      children.reduce((acc: number, child: Element): number => {
        if (child.children.length)
          return maxRightReducer(Array.from(child.children), acc);

        const right = child.getBoundingClientRect().right;
        return Math.max(acc, right);
      }, max);

    const innerContainer = elem.querySelector(
      '.realContainer .subWrapper',
    ) as HTMLElement;
    const innerRect = innerContainer.getBoundingClientRect();
    const maxRight = maxRightReducer(Array.from(innerContainer.children));

    if (
      (innerRect.height >= cellRect.height ||
        maxRight > Math.max(cellRect.right - 5, 0)) &&
      this.state.widthClass !== WidthClass.Min
    ) {
      this.goingDown = true;
      this.setState({ widthClass: downgradeWidthMap[this.state.widthClass] });

      lazyTaskManager.addTask(
        new LazyTask(() => this.updateLayout(false), 1, condFun),
      );
    } else if (
      this.state.widthClass !== WidthClass.Max &&
      positiveResizing &&
      !this.isTryingToUpgrade
    ) {
      const topElem = (elem.parentNode as HTMLElement)
        .parentNode as HTMLElement;
      const virtualNode = topElem.cloneNode(true) as HTMLElement;
      virtualNode.style.height = topElem.getBoundingClientRect().height + 'px';
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
      layoutController.style.visibility = 'hidden';

      const virtualInnerContainer = virtualNode.querySelector(
        '.subWrapper',
      ) as HTMLElement;

      document.body.appendChild(virtualNode);
      this.isTryingToUpgrade = true;

      lazyTaskManager.addTask(
        new LazyTask(
          () => {
            // const virtualRect = virtualNode.getBoundingClientRect();
            const virtualInnerRect = virtualInnerContainer.getBoundingClientRect();
            const newHeight = virtualInnerRect.height;
            // const newRight = reducer(Array.from(virtualInnerContainer.children));

            document.body.removeChild(virtualNode);
            this.isTryingToUpgrade = false;

            if (newHeight < cellRect.height) {
              this.setState({
                widthClass: upgradeWidthMap[this.state.widthClass],
              });

              if (this.state.widthClass !== WidthClass.Max) {
                console.log('go max');
                this.updateLayout(positiveResizing);
              }
            }
          },
          1,
          condFun,
        ),
      );
    } else if (!this.state.initialized && this.goingDown)
      this.setState({ initialized: true });
  };

  public componentDidUpdate() {
    widthCache[this.props.appointment.uniqueId] = this.state.widthClass;

    // this.appLoadedHandler();
  }

  public componentDidMount() {
    // const elem = this.widthDivRef.current as HTMLElement;
    // elem.onresize = (e: UIEvent) => this.updateLayout((e.detail as any).dx > 0);

    if (widthCache[this.props.appointment.uniqueId])
      this.appLoadedHandler(true);
    else if (
      this.props.appointment.personInstance &&
      this.props.appointment.personInstance.loaded
    )
      lazyTaskManager.addTask(
        new LazyTask(() => this.appLoadedHandler(), 1, condFun),
      );
  }

  public appLoadedHandler(instant = false) {
    const { appointment } = this.props;
    if (
      appointment &&
      appointment.personInstance &&
      appointment.personInstance.loaded
    )
      if (instant) this.updateLayout(false);
      else
        lazyTaskManager.addTask(
          new LazyTask((() => this.updateLayout(false)).bind(this), 1, condFun),
        );
    else console.log('not loaded!');
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

    const { isDisplaying } = this.props;
    if (!isDisplaying) return null;

    let { translateX, translateY } = this.props;
    const { gridColumnDuration, moving, getCellWidth } = this.props;

    if (!personInstance) {
      console.warn('missing instance');
      return null;
    }

    // const borderWidth = parseFloat(StyleVariables.thinWidth);

    translateX = translateX || 0;
    translateY = translateY || 0;

    // const offsetX = (Math.floor((translateX / 100) * 2) - 1) * borderWidth;
    // const offsetY = Math.floor((translateY / 100) * 2) * borderWidth;
    // const offsetX = 0;
    // const offsetY = 0;

    const translated = true;

    const widthScale = duration.asMinutes() / gridColumnDuration.asMinutes();
    // const widthCorrect = Math.floor(widthScale) * 2;

    const cellWidth = getCellWidth();
    const width = `${cellWidth * widthScale}px`;
    // const width = `calc(${widthScale * 100}% + ${widthCorrect}px)`;

    const person = personInstance as IPerson;

    return (
      <div
        className={`appointmentCell ${translated ? 'translated' : ''} ${
          moving ? 'moving' : ''
        } ${overlapping ? 'overlapping' : ''}`}
        id={identifier}
        onWheel={this.onMouseWheelHandler}
        style={this.props.style}
        // style={Object.assign(
        //   this.props.style || {},
        //   translated && !moving
        //     ? {
        //         transform: `translate(calc(${translateX}% + ${offsetX}px), calc(${translateY}% + ${offsetY}px))`,
        //       }
        //     : {},
        // )}
      >
        <div
          className="container"
          style={{
            width,
          }}
        >
          <div className="containerTempWidth" ref={this.widthDivRef}>
            <div className={`layoutController ${this.state.widthClass}`}>
              {!person || !person.loaded || !this.state.initialized ? (
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
                <div
                  className="realContainer"
                  style={{
                    visibility: this.state.initialized ? 'visible' : 'hidden',
                  }}
                >
                  <div className="marker" key="marker" />
                  <div className="avatar" key="avatar" />
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
                  </div>
                  <div className="pointsWrapper" key="poinsWrapper">
                    <div className="content">19</div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
