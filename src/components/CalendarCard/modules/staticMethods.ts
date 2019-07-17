import * as moment from 'moment';

export function updateStickyElements(force = false) {
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

    elem.classList.remove('sticky');
    elem.classList.add('unsticky');
  }

  function makeSticky(
    elem: IStickyHTMLElement,
    parentR: ClientRect,
    f: boolean,
  ) {
    if (elem.dataset.isSticky && !f) return;

    elem.style.position = 'fixed';
    elem.style.top = '0px';
    elem.style.zIndex = '1002';
    elem.style.width = `${parentR.width}px`;

    elem.dataset.isSticky = StringBoolean.true;

    elem.classList.add('sticky');
    elem.classList.remove('unsticky');
  }

  function makeUnSticky(elem: IStickyHTMLElement, f: boolean) {
    if (!elem.dataset.isSticky && !f) return;

    elem.style.position = '';
    elem.style.top = '';
    elem.style.width = '';

    elem.dataset.isSticky = StringBoolean.false;

    elem.classList.remove('sticky');
    elem.classList.add('unsticky');
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

  if (overflowTop) makeSticky(stickyElement, parentRect, force);
  else makeUnSticky(stickyElement, force);
}

export function calcDaySize(
  columnsPerPage: number,
  columnsPerDay: number,
  containerWidth: number,
  thinWidth: number,
  leftColumnWidth: number,
) {
  const dayWidth = (containerWidth / columnsPerPage) * columnsPerDay;

  return dayWidth;
}

export function calcColumnsCount(
  containerWidth: number,
  calendarCellWidthMin: number,
) {
  const columnsCount = Math.floor(containerWidth / calendarCellWidthMin);
  return columnsCount;
}

export function getCellInfo(target: HTMLElement) {
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

export function calcGridsCount(clientWidth: number, dayWidth: number) {
  return Math.ceil(clientWidth / dayWidth) * 4;
}
