import Appointment from 'structures/Appointment';

import CalendarCard from '..';

import { freePlaceToDrop } from './freePlaceToDrop';

import * as Moment from 'moment';
import { Moment as IMoment } from 'moment';
import { DateRange, extendMoment } from 'moment-range';
import { getCellInfo } from './staticMethods';

const moment = extendMoment(Moment);

function getDropStamp(
  targetStamp: IMoment,
  target: HTMLElement,
  pos: { x: number; y: number },
  subGridColumns: number,
  mainColumnStep: Moment.Duration,
) {
  const cellRect = target.getBoundingClientRect();
  const leftOffset = pos.x - cellRect.left;
  const step = cellRect.width / subGridColumns;
  let subGridScale = Math.floor(leftOffset / step);

  if (subGridScale < 0) {
    subGridScale += subGridColumns;
    targetStamp.subtract(mainColumnStep);
  }

  const subGridDuration = Moment.duration(
    (mainColumnStep.asSeconds() / subGridColumns) * subGridScale,
    'second',
  );

  targetStamp.add(subGridDuration);
  return targetStamp;
}

export function generateDropzoneConfig(this: CalendarCard) {
  let lastRange: DateRange | null = null;
  let lastPosition: number | null = null;

  return ((): interact.DropZoneOptions => {
    const lastCoords = { x: 0, y: 0 };

    return {
      accept: '.appointmentCell .container .containerTempWidth',
      ondragenter: e => {
        const {
          target,
        }: {
          target: HTMLElement;
        } = e;
        let {
          relatedTarget,
        }: {
          relatedTarget: HTMLElement;
        } = e;
        relatedTarget = (relatedTarget.parentNode as HTMLElement)
          .parentNode as HTMLElement; // go up from .containerTempWidth to .appointmentCell

        target.classList.add('enter');
      },
      ondragleave: e => {
        const {
          target,
        }: {
          target: HTMLElement;
        } = e;
        let {
          relatedTarget,
        }: {
          relatedTarget: HTMLElement;
        } = e;
        relatedTarget = (relatedTarget.parentNode as HTMLElement)
          .parentNode as HTMLElement; // go up from .containerTempWidth to .appointmentCell

        target.classList.remove('enter', 'locked');
        target.style.background = '';
      },
      ondrop: e => {
        const {
          target,
        }: {
          target: HTMLElement;
        } = e;
        let {
          relatedTarget,
        }: {
          relatedTarget: HTMLElement;
        } = e;
        relatedTarget = (relatedTarget.parentNode as HTMLElement)
          .parentNode as HTMLElement; // go up from .containerTempWidth to .appointmentCell

        const appointmentId = relatedTarget.id;
        const app = Appointment.fromIdentifier(appointmentId);
        const { stamp, position } = getCellInfo(target);

        const dropStamp = getDropStamp(
          stamp,
          target,
          lastCoords,
          this.props.subGridColumns,
          this.props.mainColumnStep,
        );
        const isFree = freePlaceToDrop(
          {
            dateRange: moment.range(
              dropStamp,
              dropStamp.clone().add(app.duration),
            ),
            position,
            uniqueId: app.uniqueId,
          },
          this,
        );

        this.shiftsCache = {};
        console.log('clear cache');

        if (!isFree) {
          console.log('locked');
          return;
        }
        console.log('drop');

        this.lockShifts();

        this.props.updateAppointment({
          date: app.date,
          targetDate: dropStamp,
          targetPosition: position,
          uniqueId: app.uniqueId,
        });

        this.checkForOverlaps(stamp);

        this.updateMovingId('');
      },
      ondropactivate: e => {
        const {
          target,
        }: {
          target: HTMLElement;
        } = e;
        let {
          relatedTarget,
        }: {
          relatedTarget: HTMLElement;
        } = e;
        relatedTarget = (relatedTarget.parentNode as HTMLElement)
          .parentNode as HTMLElement; // go up from .containerTempWidth to .appointmentCell

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
        let {
          relatedTarget,
        }: {
          relatedTarget: HTMLElement;
        } = e;
        relatedTarget = (relatedTarget.parentNode as HTMLElement)
          .parentNode as HTMLElement; // go up from .containerTempWidth to .appointmentCell

        target.classList.remove('dropzone', 'active', 'enter', 'locked');
        target.style.background = '';
      },
      ondropmove: e => {
        const {
          target,
        }: {
          target: HTMLElement;
        } = e;
        let {
          relatedTarget,
        }: {
          relatedTarget: HTMLElement;
        } = e;
        relatedTarget = (relatedTarget.parentNode as HTMLElement)
          .parentNode as HTMLElement; // go up from .containerTempWidth to .appointmentCell

        const rect = relatedTarget.getBoundingClientRect();
        lastCoords.x = rect.left;
        lastCoords.y = rect.top;

        const appointmentId = relatedTarget.id;
        const app = Appointment.fromIdentifier(appointmentId);
        const { stamp, position } = getCellInfo(target);

        const dropStamp = getDropStamp(
          stamp,
          target,
          lastCoords,
          this.props.subGridColumns,
          this.props.mainColumnStep,
        );

        const range = moment.range(
          dropStamp,
          dropStamp.clone().add(app.duration),
        );

        if (
          lastRange &&
          lastRange.isSame(range) &&
          lastPosition &&
          lastPosition === position
        )
          return;

        lastRange = range;
        lastPosition = position;

        freePlaceToDrop(
          {
            dateRange: range,
            position,
            uniqueId: app.uniqueId,
          },
          this,
        );
      },
      overlap: 'leftCenter',
    };
  })();
}
