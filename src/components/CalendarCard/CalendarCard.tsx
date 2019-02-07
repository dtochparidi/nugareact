import { observer } from 'mobx-react';
import * as Moment from 'moment';
import { Duration as IDuration, Moment as IMoment } from 'moment';
import { DateRange, extendMoment } from 'moment-range';
import * as React from 'react';

import ICalendarDay from '../../interfaces/ICalendarDay';
import Card from '../Card';
import Day from './Day';
import LeftColumn from './LeftColumn';

import * as StyleVariables from '../../common/variables.scss';
import * as CardVariables from './CalendarCard.scss';
import './CalendarCard.scss';

import * as interact from 'interactjs';
import CalendarDay from 'structures/CalendarDay';
import { clientSide } from '../../dev/clientSide';
import Appointment from '../../structures/Appointment';
import createDragConfig from './dragConfig';
import ToggleArea from './ToggleArea';

import * as Emitter from 'events';
import TopRow from './Day/TopRow';

const calendarCellMinWidth = parseFloat(CardVariables.calendarCellWidthMin);
const thinWidth = parseFloat(StyleVariables.thinWidth);

const moment = extendMoment(Moment);

if (clientSide) (interact as any).dynamicDrop(true);

export interface IProps {
  days: CalendarDay[];
  dayTimeRange: DateRange;
  positionCount: number;
  subGridColumns: number;
  requestCallback: (date: Moment.Moment) => void;
  updateAppointment: ({
    date,
    position,
    personId,
    targetDate,
    targetPosition,
    appointment,
  }: {
    date?: IMoment;
    position?: number;
    personId?: string;
    targetDate: IMoment;
    appointment?: Appointment;
    targetPosition: number;
  }) => void;
}

export interface IState {
  requiredDays: IMoment[];
  columnsPerPage: number;
  columnsPerDay: number;
  mainColumnStep: IDuration;
  dayWidth: string;
  cellWidth: number;
  loading: boolean;
  stamps: IMoment[];
  shifts: {
    [x: number]: {
      [x: number]: {
        dx: number;
        dy: number;
      };
    };
  };
}

@observer
export default class CalendarCard extends React.Component<IProps, IState> {
  private static calcDaySize(
    columnsPerPage: number,
    columnsPerDay: number,
    containerWidth: number,
  ) {
    const dayWidth =
      (containerWidth / columnsPerPage) * columnsPerDay - thinWidth;
    return dayWidth;
  }

  private static calcColumnsCount(
    containerWidth: number,
    calendarCellWidthMin: number,
  ) {
    const columnsCount = Math.floor(containerWidth / calendarCellWidthMin);
    return columnsCount;
  }

  private static getCellInfo(target: HTMLElement) {
    const targetDay = (((target.parentNode as HTMLElement) // Grid
      .parentNode as HTMLElement) as HTMLElement).parentNode as HTMLElement; // Day // DayWrapper
    const dayString = targetDay.id.split('_')[1];
    const stamp = moment(dayString, 'DD-MM-YYYY');
    const hour = parseInt(target.getAttribute('data-hour') || '-1', 10);
    const minute = parseInt(target.getAttribute('data-minute') || '-1', 10);
    const position = parseInt(target.getAttribute('data-y') || '-1', 10);

    stamp.hour(hour);
    stamp.minute(minute);
    return { stamp, position };
  }

  public selectedDay: number = 0;
  public currentLeftColumnIndex: number = 0;
  private daysContainerRef: React.RefObject<HTMLDivElement>;
  private containerScrollTimeout: NodeJS.Timeout;
  private shouldUpdateVisibility: boolean = false;
  private currentFirstDay: ICalendarDay;
  private currentDaysCount: number = 0;
  private isScrolling: boolean = false;
  private pageTurnEmitter: Emitter;
  // private isDragging: boolean = false;

  constructor(props: IProps) {
    super(props);

    this.daysContainerRef = React.createRef();
    this.pageTurnEmitter = new Emitter();

    const mainColumnStep = Moment.duration(45, 'minutes');
    const stamps = Array.from(
      this.props.dayTimeRange.by('seconds', {
        step: mainColumnStep.asSeconds(),
      }),
    );

    if (clientSide)
      interact('.appointmentCell').draggable(
        createDragConfig(
          this.onAppointmentDraggingStart.bind(this),
          () => null,
          this.onAppointmentDraggingEnd.bind(this),
        ),
      );

    this.state = {
      cellWidth: 0,
      columnsPerDay: stamps.length,
      columnsPerPage: 4,
      dayWidth: '100%',
      loading: true,
      mainColumnStep,
      requiredDays: [
        moment()
          .startOf('day')
          .add(1, 'day'),
        moment().startOf('day'),
        moment()
          .startOf('day')
          .subtract(1, 'day'),
      ],
      shifts: {
        0: {
          0: {
            dx: 1,
            dy: 2,
          },
        },
      },
      stamps,
    };
  }
  public turnPageRight = () => {
    this.turnPage(1);
  };

  public turnPageLeft = () => {
    this.turnPage(-1);
  };

  public onAppointmentDraggingStart(e: interact.InteractEvent) {
    (((((e.target as Element).parentNode as Element).parentNode as Element) // .appointmentCell // .gridCell // .grid
      .parentNode as Element).parentNode as Element).classList // .topRow // .day // .dayWrapper
      .add('dragOrigin');
  }

  public onAppointmentDraggingEnd(e: interact.InteractEvent) {
    (((((e.target as Element).parentNode as Element).parentNode as Element) // .appointmentCell // .gridCell // .grid
      .parentNode as Element).parentNode as Element).classList // .topRow // .day // .dayWrapper
      .remove('dragOrigin');
  }

  public freeCell(target: HTMLElement) {
    const { stamp, position } = CalendarCard.getCellInfo(target);
    const day = this.getDayByStamp(stamp);
    const column = this.getColumnByStamp(stamp, day);

    // console.log('---');
    // column.forEach(app => console.log(app.date.hour(), app.position));

    const isFree =
      !target.querySelector('.appointmentCell') ||
      column.every(app => app.position !== position);
    if (isFree) return true;

    return false;

    // const appointment = day.appointments.find(
    //   (app) => app.date.clone().startOf('minute').diff(stamp.clone().startOf('minute'), 'minute') === 0
    // ) as Appointment;
  }

  public getDayByStamp(stamp: IMoment) {
    const day = this.props.days.find(
      d =>
        d.date
          .clone()
          .startOf('day')
          .diff(stamp, 'day') === 0,
    ) as ICalendarDay;

    return day;
  }

  public getColumnByStamp(stamp: IMoment, calendarDay?: ICalendarDay) {
    const day = calendarDay || this.getDayByStamp(stamp);
    const targetStamp = stamp.clone().startOf('hour');
    const appointments = day.appointments.filter(
      app =>
        app.date
          .clone()
          .startOf('hour')
          .diff(targetStamp, 'hour') === 0,
    );

    return appointments;
  }

  public updateDropzones() {
    const minColumn = this.currentLeftColumnIndex;
    const maxColumn = this.currentLeftColumnIndex + this.state.columnsPerPage;
    const minDay = Math.floor(minColumn / this.state.columnsPerDay);
    const maxDay = Math.ceil(maxColumn / this.state.columnsPerDay) + 1;

    Array.from(
      (this.daysContainerRef.current as HTMLDivElement).querySelectorAll(
        '.dayWrapper',
      ),
    ).forEach((child, index) => {
      const selector = `#${child.id} .gridCell`;

      if (index >= minDay && index <= maxDay)
        interact(selector).dropzone(
          ((): interact.DropZoneOptions => {
            const lastPosition = { x: 0, y: 0 };
            return {
              accept: '.appointmentCell',
              ondragenter: e => {
                const {
                  target,
                  relatedTarget,
                }: {
                  target: HTMLElement;
                  relatedTarget: HTMLElement;
                } = e;
                target.classList.add('enter');

                const isFree = this.freeCell(target);
                if (isFree || target.querySelector(`#${relatedTarget.id}`))
                  target.classList.remove('locked');
                else target.classList.add('locked');

                // target.style.background = 'rgb(241, 236, 189)';
              },
              ondragleave: e => {
                const {
                  target,
                }: {
                  target: HTMLElement;
                } = e;
                target.classList.remove('enter', 'locked');
                target.style.background = '';
              },
              ondrop: e => {
                const {
                  target,
                  relatedTarget,
                }: {
                  target: HTMLElement;
                  relatedTarget: HTMLElement;
                } = e;
                if (target.classList.contains('locked')) {
                  console.log('locked');
                  return;
                }
                console.log('drop');

                const appointmentId = relatedTarget.id;
                const app = Appointment.fromIdentifier(appointmentId);
                const {
                  stamp: targetStamp,
                  position,
                } = CalendarCard.getCellInfo(target);
                const cellRect = target.getBoundingClientRect();
                const leftOffset = lastPosition.x - cellRect.left;
                const step = cellRect.width / this.props.subGridColumns;
                let subGridScale = Math.floor(leftOffset / step);

                if (subGridScale < 0) {
                  subGridScale += this.props.subGridColumns;
                  targetStamp.subtract(this.state.mainColumnStep);
                }

                const subGridDuration = Moment.duration(
                  (this.state.mainColumnStep.asSeconds() /
                    this.props.subGridColumns) *
                    subGridScale,
                  'second',
                );

                targetStamp.add(subGridDuration);

                this.props.updateAppointment({
                  appointment: undefined,
                  date: app.date,
                  personId: app.personId,
                  position: app.position,
                  targetDate: targetStamp,
                  targetPosition: position,
                });
              },
              ondropactivate: e => {
                const {
                  target,
                }: {
                  target: HTMLElement;
                } = e;
                // target.classList.add('dropzone', 'active');
                target.classList.remove('locked');
                // target.style.background = '';

                // console.warn('activate');
              },
              ondropdeactivate: e => {
                const {
                  target,
                }: {
                  target: HTMLElement;
                } = e;
                target.classList.remove(
                  'dropzone',
                  'active',
                  'enter',
                  'locked',
                );
                target.style.background = '';
              },
              ondropmove: e => {
                const {
                  target,
                  relatedTarget,
                }: {
                  target: HTMLElement;
                  relatedTarget: HTMLElement;
                } = e;

                const rect = relatedTarget.getBoundingClientRect();
                lastPosition.x = rect.left;
                lastPosition.y = rect.top;

                const app = target.querySelector(`#${relatedTarget.id}`);
                if (app) target.classList.remove('locked');
              },
              overlap: 'center',
            };
          })(),
        );
      else interact(selector).dropzone({});
    });
  }

  public componentDidMount() {
    window.addEventListener('keydown', e => {
      switch (e.code) {
        case 'ArrowRight':
          this.turnPage(1);
          break;
        case 'ArrowLeft':
          this.turnPage(-1);
          break;
      }
    });

    this.startResizeHandling();
    this.startScrollHandling();
    this.updateColumnsCount();

    setTimeout(() => {
      this.updateDaysWidth();

      this.selectedDay = Math.floor(this.props.days.length / 2);
      this.currentLeftColumnIndex =
        this.selectedDay * this.state.columnsPerPage + 1;

      this.updateScroll(true);

      this.setState({ loading: false });
    });
  }

  public componentDidUpdate(prevProps: IProps) {
    if (this.props.days.length !== this.currentDaysCount) {
      this.updateDropzones();
      this.currentDaysCount = this.props.days.length;
    }

    if (this.props.days.length)
      if (!this.currentFirstDay) this.currentFirstDay = this.props.days[0];
      else {
        const lastDayNowIndex = this.props.days.findIndex(
          d =>
            d.date
              .clone()
              .startOf('day')
              .diff(this.currentFirstDay.date.clone().startOf('day'), 'day') ===
            0,
        );
        this.currentFirstDay = this.props.days[0];

        if (lastDayNowIndex !== 0) {
          this.currentLeftColumnIndex += this.state.columnsPerDay;
          this.updateScroll(true);
        }
        // if (lastDayNowIndex !== 0) this.updateScroll(false);
      }

    // OPTIMIZE
    this.state.requiredDays.forEach(day => {
      if (!this.props.days.find(d => d.date.diff(day, 'days') === 0))
        this.props.requestCallback(day);
    });

    // if (prevProps.days.length !== this.props.days.length) this.updateScroll();

    if (this.shouldUpdateVisibility) {
      this.updateVisibility([
        this.currentLeftColumnIndex,
        this.currentLeftColumnIndex + this.state.columnsPerPage,
      ]);
      this.shouldUpdateVisibility = false;
    }
  }

  public turnPage(delta: -1 | 1) {
    if (this.isScrolling) return;

    const index =
      this.currentLeftColumnIndex + this.state.columnsPerPage * 2 * delta;
    if (index < 0) {
      this.shouldUpdateVisibility = true;
      this.props.requestCallback(
        this.props.days[0].date.clone().subtract(1, 'day'),
      );

      this.turnPage(delta);
      return;
    } else if (
      index + this.state.columnsPerPage * 2 >
      this.props.days.length * this.state.columnsPerDay - 1
    )
      this.props.requestCallback(
        this.props.days[
          this.props.days.length === 0 ? 0 : this.props.days.length - 1
        ].date
          .clone()
          .add(1, 'day'),
      );

    this.updateVisibility([
      this.currentLeftColumnIndex,
      Math.min(
        Math.max(index, 0),
        this.props.days.length * this.state.columnsPerDay - 1,
      ),
    ]);

    const newIndex = Math.min(
      Math.max(this.selectedDay + delta, 0),
      this.props.days.length - 1,
    );
    this.selectedDay = newIndex;
    this.currentLeftColumnIndex = Math.min(
      Math.max(
        this.currentLeftColumnIndex + delta * this.state.columnsPerPage,
        0,
      ),
      this.props.days.length * this.state.columnsPerDay - 1,
    );

    this.updateScroll();
  }

  public getSnapshotBeforeUpdate(prevProps: IProps) {
    this.shouldUpdateVisibility =
      this.props.days.length === prevProps.days.length;

    return true;
  }

  // DEPRECATED
  public updateScrollByDay(force = false) {
    const container = this.daysContainerRef.current as HTMLDivElement;
    const target = container.children[this.selectedDay] as HTMLElement;
    const left = Math.round(
      target.getBoundingClientRect().left -
        container.getBoundingClientRect().left +
        container.scrollLeft,
    );

    container.scrollTo({
      behavior: force ? 'auto' : 'smooth',
      left,
    });
    this.isScrolling = true;

    const callback = () => {
      clearTimeout(this.containerScrollTimeout);
      this.containerScrollTimeout = setTimeout(() => {
        this.updateVisibility([
          this.currentLeftColumnIndex,
          this.currentLeftColumnIndex + this.state.columnsPerPage,
        ]);
        container.removeEventListener('scroll', callback);

        this.isScrolling = false;
      }, 200);
    };

    container.addEventListener('scroll', callback);
  }

  public updateStickyElements(force = false) {
    enum StringBoolean {
      false = '',
      true = 'true',
    }

    interface IStickyProps {
      initialized?: StringBoolean;
      isSticky?: StringBoolean;
    }

    interface IStickyHTMLElement extends HTMLElement {
      dataset: DOMStringMap & IStickyProps;
    }

    function init(elem: IStickyHTMLElement) {
      elem.dataset.isSticky = StringBoolean.false;
      elem.dataset.initialized = StringBoolean.true;
    }

    function makeSticky(
      elem: IStickyHTMLElement,
      parentR: ClientRect,
      f: boolean,
    ) {
      if (elem.dataset.isSticky && !f) return;

      elem.style.position = 'fixed';
      elem.style.top = '0px';
      elem.style.zIndex = '1000';
      elem.style.width = `${parentR.width}px`;

      elem.dataset.isSticky = StringBoolean.true;
    }

    function makeUnSticky(elem: IStickyHTMLElement) {
      if (!elem.dataset.isSticky) return;

      elem.style.position = '';
      elem.style.top = '';

      elem.dataset.isSticky = StringBoolean.false;
    }

    const stickyElement = document.querySelector(
      '.viewPortContainer',
    ) as IStickyHTMLElement;
    const { dataset }: { dataset: IStickyProps } = stickyElement;
    const { initialized } = dataset;

    if (!initialized) init(stickyElement);

    const rect = stickyElement.getBoundingClientRect();
    const parentRect = (stickyElement.parentElement as HTMLElement).getBoundingClientRect();

    const overflowTop = parentRect.top <= 0 && rect.top >= parentRect.top;

    if (overflowTop || force) makeSticky(stickyElement, parentRect, force);
    else makeUnSticky(stickyElement);
  }

  public updateScroll(force = false) {
    const container = this.daysContainerRef.current as HTMLDivElement;
    const dayIndex = Math.floor(
      this.currentLeftColumnIndex / this.state.columnsPerDay,
    );
    const day = container.querySelectorAll('.dayWrapper')[
      dayIndex
    ] as HTMLElement;

    const gridsContainer = container.querySelector(
      '.gridsContainer',
    ) as HTMLElement;
    const topRowsContainer = container.querySelector(
      '.topRowsContainer .scrollingContainer',
    ) as HTMLElement;

    const grid = day.querySelector('.grid') as HTMLElement;
    const dayColumnIndex =
      this.currentLeftColumnIndex - dayIndex * this.state.columnsPerDay;
    const appointmentCell = grid.children[dayColumnIndex];

    const left = Math.round(
      appointmentCell.getBoundingClientRect().left -
        gridsContainer.getBoundingClientRect().left +
        gridsContainer.scrollLeft,
    );

    // container.scrollTo({
    //   behavior: force ? 'auto' : 'smooth',
    //   left,
    // });

    gridsContainer.scrollTo({
      behavior: force ? 'auto' : 'smooth',
      left,
    });

    topRowsContainer.scrollTo({
      behavior: force ? 'auto' : 'smooth',
      left,
    });

    if (force || Math.abs(left - gridsContainer.scrollLeft) < 5) return;

    this.pageTurnEmitter.emit('freeze');
    this.isScrolling = true;

    const callback = () => {
      clearTimeout(this.containerScrollTimeout);

      this.containerScrollTimeout = setTimeout(() => {
        this.updateVisibility([
          this.currentLeftColumnIndex,
          this.currentLeftColumnIndex + this.state.columnsPerPage,
        ]);
        gridsContainer.removeEventListener('scroll', callback);

        this.isScrolling = false;
        this.pageTurnEmitter.emit('resume');

        // window.dispatchEvent(new Event('scroll'));
        // setTimeout(() => window.dispatchEvent(new Event('scroll')));
      }, 50);

      // too perfomance-heavy
      // window.dispatchEvent(new Event('scroll'));
    };

    gridsContainer.addEventListener('scroll', callback);
  }

  public updateVisibility(indexes: number[]) {
    const minColumn = Math.min(...indexes);
    const maxColumn = Math.max(...indexes);
    const minDay = Math.floor(minColumn / this.state.columnsPerDay) - 1;
    const maxDay = Math.ceil(maxColumn / this.state.columnsPerDay) + 1;

    Array.from(
      (this.daysContainerRef.current as HTMLDivElement).querySelectorAll(
        '.dayWrapper',
      ),
    ).forEach((child, index) => {
      if (index >= minDay && index <= maxDay) child.classList.remove('hidden');
      else child.classList.add('hidden');
    });
  }

  public updateDaysWidth() {
    const dayWidth = this.calcDaysWidth();
    const state = { dayWidth };

    const justACell = (this.daysContainerRef
      .current as HTMLElement).querySelector('.appointmentCell') as HTMLElement;
    if (justACell)
      Object.assign(state, {
        cellWidth: justACell.getBoundingClientRect().width,
      });

    this.setState(state);
  }

  public updateColumnsCount() {
    const containerWidth = (this.daysContainerRef.current as HTMLDivElement)
      .offsetWidth;
    const count = CalendarCard.calcColumnsCount(
      containerWidth,
      calendarCellMinWidth,
    );
    this.setState({ columnsPerPage: count });
  }

  public calcDaysWidth() {
    const { columnsPerDay, columnsPerPage } = this.state;
    const containerWidth = (this.daysContainerRef.current as HTMLDivElement)
      .offsetWidth;
    const dayWidth = CalendarCard.calcDaySize(
      columnsPerPage,
      columnsPerDay,
      containerWidth,
    );

    return dayWidth <= 0 ? '100%' : `${dayWidth}px`;
  }

  public render() {
    const {
      columnsPerDay,
      stamps,
      dayWidth,
      shifts,
      mainColumnStep,
    } = this.state;
    const { subGridColumns, positionCount } = this.props;
    const rect = this.daysContainerRef.current
      ? (this.daysContainerRef.current as HTMLElement).getBoundingClientRect()
      : { top: 0, right: 0, left: 0, bottom: 0, width: 0, height: 0 };

    return (
      <Card
        cardClass="calendarCard"
        style={
          {
            '--rows-count': positionCount,
            '--sub-columns-count:': subGridColumns,
          } as React.CSSProperties
        }
      >
        <LeftColumn positionCount={positionCount} />
        <div
          className={`daysContainer ${this.state.loading ? 'loading' : ''}`}
          ref={this.daysContainerRef}
        >
          <div className="topRowsContainer">
            <div className="viewPortContainer">
              <div className="scrollingContainer">
                <div className="stickyContainer">
                  {this.props.days.map(day => (
                    <TopRow
                      stamps={stamps}
                      key={day.date.toString()}
                      style={{ width: dayWidth }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="gridsContainer">
            {this.props.days.map(day => (
              <Day
                key={day.date.toString()}
                rows={positionCount}
                cols={columnsPerDay || 0}
                dayData={day}
                stamps={stamps}
                dayWidth={dayWidth}
                shifts={shifts}
                updateAppointment={this.props.updateAppointment}
                subGridColumns={subGridColumns}
                mainColumnStep={mainColumnStep}
              />
            ))}
          </div>
          <ToggleArea
            id="leftToggleArea"
            style={{
              height: `${rect.height}px`,
              left: `${rect.left}px`,
              top: `${rect.top}px`,
              width: `${calendarCellMinWidth / 2}px`,
            }}
            action={this.turnPageLeft}
            delay={200}
            controller={this.pageTurnEmitter}
          />
          <ToggleArea
            id="rightToggleArea"
            style={{
              height: `${rect.height}px`,
              left: `calc(${rect.left + rect.width}px - ${calendarCellMinWidth /
                2}px)`,
              top: `${rect.top}px`,
              width: `${calendarCellMinWidth / 2}px`,
            }}
            action={this.turnPageRight}
            delay={200}
            controller={this.pageTurnEmitter}
          />
        </div>
      </Card>
    );
  }

  private startResizeHandling(
    { boundTime }: { boundTime: number } = { boundTime: 250 },
  ) {
    let resizeTimeout: NodeJS.Timeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.updateColumnsCount();
        this.updateDaysWidth();
        this.updateScroll(true);

        setTimeout(() => this.updateStickyElements(true));
      }, boundTime);
    });
  }

  private startScrollHandling(
    { boundTime }: { boundTime: number } = { boundTime: 250 },
  ) {
    // let scrollTimeout: NodeJS.Timeout;
    window.addEventListener('scroll', () => {
      this.updateStickyElements();
      // clearTimeout(scrollTimeout);
      // scrollTimeout = setTimeout(() => {

      // }, boundTime);
    });
  }
}
