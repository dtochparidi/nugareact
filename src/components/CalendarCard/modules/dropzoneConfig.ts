import { Interactable, InteractEvent } from 'levabala_interactjs';
import { Duration, Moment as IMoment } from 'moment';
import * as Moment from 'moment';
import { DateRange, extendMoment } from 'moment-range';
import Appointment from 'structures/Appointment';
import CalendarDay from 'structures/CalendarDay';

import CalendarCard from '..';
import { freePlaceToDrop } from './freePlaceToDrop';

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
  max: number,
) {
  const coeff = y / height;
  return Math.floor(min + (max - min) * coeff);
}

function getInfo(
  appElement: HTMLElement,
  gridElement: HTMLElement,
  dateRange: DateRange,
  positions: number,
): { position: number; stamp: IMoment } {
  const appRect = appElement.getBoundingClientRect();
  const gridRect = gridElement.getBoundingClientRect();
  const x = appRect.left - gridRect.left;
  const y = appRect.top - gridRect.top + appRect.height / 2;

  const { offsetWidth: width, offsetHeight: height } = gridElement;

  const stamp = getStampByRelativePosition(x, width, dateRange);
  const position = getPositionByRelativePosition(y, height, 0, positions);

  return { position, stamp };
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
    let lastLittleGridChunk: HTMLElement | null = null;
    let placeIsFree: boolean = true;
    let lastPosition: number;
    let lastStamp: IMoment;
    let appInfo: {
      date: IMoment;
      uniqueId: string;
      position: number;
      dateRange: DateRange;
      duration: Duration;
    } | null;

    return {
      accept: '.appointmentCell .container .containerTempWidth',
      ondragenter: (e: IDragEvent) => {
        const { relatedTarget }: { relatedTarget: HTMLElement } = e;

        const appCell = (relatedTarget.parentNode as HTMLElement)
          .parentNode as HTMLElement;

        appInfo = Appointment.fromIdentifier(appCell.id);
      },
      ondragleave: (e: IDragEvent) => {
        if (lastLittleGridChunk) lastLittleGridChunk.classList.remove('enter');
      },
      ondrop: (e: IDragEvent) => {
        if (!placeIsFree || !appInfo) return;

        this.lockShifts();

        this.props.updateAppointment({
          date: appInfo.date,
          targetDate: lastStamp,
          targetPosition: lastPosition,
          uniqueId: appInfo.uniqueId,
        });

        this.checkForOverlaps(lastStamp);

        this.updateMovingId('');

        if (lastLittleGridChunk) lastLittleGridChunk.classList.remove('enter');
        appInfo = null;
      },
      ondropactivate: (e: IDragEvent) => {
        //
      },
      ondropdeactivate: (e: IDragEvent) => {
        this.shiftsCache = {};

        if (lastLittleGridChunk) lastLittleGridChunk.classList.remove('enter');
        appInfo = null;
      },
      ondropmove: (e: IDragEvent) => {
        if (!appInfo) return;

        const {
          target: gridElement,
          relatedTarget,
        }: { target: HTMLElement; relatedTarget: HTMLElement } = e;

        const appCell = (relatedTarget.parentNode as HTMLElement)
          .parentNode as HTMLElement;

        const dayWrapper = (gridElement.parentNode as HTMLElement)
          .parentNode as HTMLElement;
        const { date: dayDate } = CalendarDay.fromId(dayWrapper.id);

        const { dayTimeRangeActual, positionCount } = this.props;

        const { position, stamp: abstractStamp } = getInfo(
          appCell,
          gridElement,
          dayTimeRangeActual,
          positionCount,
        );

        const dayStart = dayDate
          .hour(dayTimeRangeActual.start.hour())
          .minute(dayTimeRangeActual.start.minute());
        const stamp = dayStart
          .clone()
          .hour(abstractStamp.hour())
          .minute(abstractStamp.minute());

        const largeStep = this.props.mainColumnStep.asMilliseconds();
        const littleStep = largeStep / this.props.subGridColumns;
        const offset = stamp.valueOf() - dayStart.valueOf();
        const roundedOffset = Math.round(offset / littleStep) * littleStep;
        const roundedStamp = dayStart.clone().add(roundedOffset);

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

        const x = roundedOffset / largeStep;
        const gridX = Math.floor(x);
        const gridY = position;
        const gridCell = gridElement.querySelector(
          `[data-x="${gridX}"][data-y="${gridY}"]`,
        ) as HTMLElement;

        const littleChunkIndex = Math.round(
          (x - gridX) / (1 / this.props.subGridColumns),
        );
        const littleGridChunk = (gridCell.querySelector(
          '.subGrid',
        ) as HTMLElement).children[littleChunkIndex] as HTMLElement;

        littleGridChunk.classList.add('enter');
        if (lastLittleGridChunk) lastLittleGridChunk.classList.remove('enter');

        placeIsFree = isFree;
        lastPosition = position;
        lastStamp = roundedStamp;
        lastLittleGridChunk = littleGridChunk;
      },
      overlap: 'leftCenter',
    };
  })();
}
