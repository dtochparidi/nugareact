import { Interactable, InteractEvent } from 'levabala_interactjs';
import { Duration as IDuration, Moment as IMoment } from 'moment';
import * as Moment from 'moment';
import { DateRange, extendMoment } from 'moment-range';
// import { DateRange } from 'moment-range';
import Appointment from 'structures/Appointment';
import CalendarDay from 'structures/CalendarDay';

import CalendarCard from '..';
import { freePlaceToDrop } from './freePlaceToDrop';
import rootStore from 'stores/RootStore';
// import rootStore from 'stores/RootStore';

const moment = extendMoment(Moment);

function getStampByRelativePosition(
  x: number,
  width: number,
  rangeX: DateRange,
) {
  const coeff = x / width;
  const addition = rangeX.duration('ms') * coeff;
  return rangeX.start.clone().add(addition, 'ms');
}

function getPositionByRelativePosition(
  y: number,
  height: number,
  min: number,
  positionsCount: number,
) {
  const coeff = y / height;
  const maxPositions = positionsCount + rootStore.uiStore.positionGaps.length;
  const position = Math.floor(min + (maxPositions - min) * coeff);

  const gapsPast = Math.max(
    rootStore.uiStore.positionGaps
      .concat([{ position: rootStore.uiStore.positionCount, title: '' }])
      .findIndex((g, i) => g.position + i + 1 > position),
    0,
  );

  const realPosition = position - gapsPast;

  // console.log(y, '->', realPosition, gapsPast);

  return realPosition;
}

function getInfo(
  appElement: HTMLElement,
  dayElement: HTMLElement,
  dateRange: DateRange,
  positions: number,
): { position: number; stamp: IMoment; endStamp: IMoment } {
  const appRect = appElement.getBoundingClientRect();
  const gridRect = dayElement.getBoundingClientRect();
  const x = appRect.left - gridRect.left;
  const y = appRect.top - gridRect.top + appRect.height / 2;
  const { width, height } = gridRect;

  const stamp = getStampByRelativePosition(x, width, dateRange);
  const endStamp = getStampByRelativePosition(
    x + appRect.width,
    width,
    dateRange,
  );
  const position = getPositionByRelativePosition(y, height, 0, positions);

  return { position, stamp, endStamp };
}

interface IDragEvent extends InteractEvent {
  dragEvent: InteractEvent;
  draggable: Interactable;
  dropzone: Interactable;
  relatedTarget: HTMLElement;
  target: HTMLElement;
  timeStamp: number;
  type: string;
}

export function generateDropzoneConfig(this: CalendarCard) {
  return ((): interact.DropZoneOptions => {
    let placeIsFree: boolean = true;
    let lastPosition: number;
    let lastStamp: IMoment;
    let appInfo: {
      date: IMoment;
      uniqueId: string;
      position: number;
      dateRange: DateRange;
      duration: IDuration;
    } | null;

    return {
      accept: '.appointmentCell',
      ondragenter: (e: IDragEvent) => {
        const { relatedTarget: appCell }: { relatedTarget: HTMLElement } = e;

        appInfo = Appointment.fromIdentifier(appCell.id);
      },
      ondragleave: (e: IDragEvent) => {
        this.clearShifts();
      },
      ondrop: (e: IDragEvent) => {
        if (placeIsFree && appInfo) {
          this.lockShifts();

          this.props.updateAppointment(
            {
              date: appInfo.date,
              targetDate: lastStamp,
              targetPosition: lastPosition,
              uniqueId: appInfo.uniqueId,
            },
            false,
          );

          this.checkForOverlaps(lastStamp);
          appInfo = null;
        }

        // this.updateMovingId('');
        // setTimeout(() => this.updateMovingId(''), 500);
      },
      ondropactivate: (e: IDragEvent) => {
        //
      },
      ondropdeactivate: (e: IDragEvent) => {
        this.shiftsCache = {};

        appInfo = null;
      },
      ondropmove: (e: IDragEvent) => {
        if (!appInfo) return;

        // console.log('dropmove');

        const {
          target: dayElement,
          relatedTarget,
        }: { target: HTMLElement; relatedTarget: HTMLElement } = e;

        const appCell = relatedTarget;

        const dayWrapper = dayElement.parentNode as HTMLElement;
        const { date: dayDate } = CalendarDay.fromId(dayWrapper.id);

        const { dayTimeRangeActual, positionCount } = this.props;

        const {
          position: absPosition,
          stamp: abstractStamp,
          // endStamp: abstractEndStamp,
        } = getInfo(appCell, dayElement, dayTimeRangeActual, positionCount);

        const position = Math.max(Math.min(absPosition, positionCount - 1), 0);
        const dayStart = dayDate
          .hour(dayTimeRangeActual.start.hour())
          .minute(dayTimeRangeActual.start.minute());
        const stamp = dayStart
          .clone()
          .hour(abstractStamp.hour())
          .minute(abstractStamp.minute());

        const { mainColumnStep } = this.props;
        const largeStep = mainColumnStep.asMilliseconds();

        // main thing - if you use little steps -> uncomment next line
        const littleStep = largeStep; // / this.props.subGridColumns;
        const offset = stamp.valueOf() - dayStart.valueOf();
        const roundedOffset = Math.round(offset / littleStep) * littleStep;
        const roundedStamp = dayStart.clone().add(roundedOffset);

        const dayEnd = dayStart.clone().add(dayTimeRangeActual.duration());
        if (dayEnd.diff(roundedStamp) <= 0)
          roundedStamp
            .hour(dayTimeRangeActual.start.hour())
            .minute(dayTimeRangeActual.start.minute())
            .add(1, 'day');
        else if (dayStart.diff(roundedStamp) > 0)
          roundedStamp
            .hour(dayTimeRangeActual.end.hour())
            .minute(dayTimeRangeActual.end.minute())
            .subtract(1, 'day');

        if (
          Math.abs(roundedStamp.diff(lastStamp, 'ms')) < littleStep &&
          position === lastPosition
        )
          return;

        const isFree = freePlaceToDrop(
          {
            dateRange: moment.range(
              roundedStamp,
              roundedStamp.clone().add(appInfo.duration),
            ),
            position,
            uniqueId: appInfo.uniqueId,
          },
          this,
        );

        placeIsFree = isFree;
        lastPosition = position;
        lastStamp = roundedStamp;
      },
      overlap: 'leftCenter',
    };
  })();
}
