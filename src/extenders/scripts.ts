import { DateRow } from 'components/CalendarCard/Day';

const w = window as any;

w.intervalIds = [];
w.simulateUserDragSlow = () =>
  w.intervalIds.push(
    setInterval(() => (w.dateRow as DateRow).onUserDrag({ dx: -0.5 } as any)),
  );
w.simulateUserDragNormal = () =>
  w.intervalIds.push(
    setInterval(() => (w.dateRow as DateRow).onUserDrag({ dx: -5.5 } as any)),
  );
w.simulateUserDragFast = () =>
  w.intervalIds.push(
    setInterval(() => (w.dateRow as DateRow).onUserDrag({ dx: -10.5 } as any)),
  );
w.simulateUserDragSuperFast = () =>
  w.intervalIds.push(
    setInterval(() => (w.dateRow as DateRow).onUserDrag({ dx: -40.5 } as any)),
  );
w.clearIntervals = () => w.intervalIds.forEach((i: number) => clearInterval(i));
