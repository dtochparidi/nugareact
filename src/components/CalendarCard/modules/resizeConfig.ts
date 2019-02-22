import * as Moment from 'moment';
import { DateRange, extendMoment } from 'moment-range';
import Appointment from 'structures/Appointment';
import CalendarCard from '..';

const moment = extendMoment(Moment);

export function generateResizeConfig(
  this: CalendarCard,
): interact.ResizableOptions {
  let lastRange: DateRange | null = null;
  // const virtualWidth = 0;

  return {
    edges: {
      right: true,
    },
    onend: (e: interact.InteractEvent) => {
      let { target }: { target: HTMLElement } = e;
      target = target.parentNode as HTMLElement;

      const appCell = target.parentNode as HTMLElement;

      const appointmentId = appCell.id;
      const app = Appointment.fromIdentifier(appointmentId);

      const widthNode = target.querySelector(
        '.containerTempWidth',
      ) as HTMLElement;
      widthNode.style.width = '';

      if (!lastRange) return;

      this.props.updateAppointment({
        date: app.date,
        targetDuration: Moment.duration(lastRange.duration('minute'), 'minute'),
        uniqueId: app.uniqueId,
      });
    },
    onmove: (e: interact.InteractEvent & { rect: ClientRect }) => {
      let { target }: { target: HTMLElement } = e;
      target = target.parentNode as HTMLElement;

      const minWidth =
        (target.parentNode as HTMLElement).getBoundingClientRect().width /
        this.props.subGridColumns;
      if (e.rect.width < minWidth) return;

      const widthNode = target.querySelector(
        '.containerTempWidth',
      ) as HTMLElement;

      const appCell = target.parentNode as HTMLElement;
      const gridCell = appCell.parentNode as HTMLElement;
      const cellRect = gridCell.getBoundingClientRect();

      // const rect = widthNode.getBoundingClientRect();
      const step = cellRect.width / this.props.subGridColumns;
      const subGridScale = Math.max(Math.ceil(e.rect.width / step), 1);

      const appointmentId = appCell.id;
      const app = Appointment.fromIdentifier(appointmentId);

      const minutes =
        (this.props.mainColumnStep.asMinutes() / this.props.subGridColumns) *
        subGridScale;
      const duration = Moment.duration(
        Math.max(
          minutes,
          this.props.mainColumnStep.asMinutes() / this.props.subGridColumns,
        ),
        'minute',
      );

      const range = moment.range(app.date, app.date.clone().add(duration));
      const day = this.getDayByStamp(app.date);

      const overlapping = Object.values(day.appointments).some(
        otherApp =>
          otherApp.position === app.position &&
          otherApp.uniqueId !== app.uniqueId &&
          otherApp.dateRange.overlaps(range),
      );

      console.log(e);
      if (overlapping) return;

      lastRange = range;

      widthNode.style.width = `${e.rect.width}px`;
      widthNode.dispatchEvent(new Event('resize'));
    },
  };
}
