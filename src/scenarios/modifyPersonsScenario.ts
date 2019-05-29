import rootStore from 'stores/RootStore';
import { serverDaysData } from 'fetchers/DayFetcher';

function shuffle(a: any[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function random(to: number, from: number = 0) {
  return Math.floor(Math.random() * (to - from)) + from;
}

export default function modifyPersonsScenario(percentagePerDays: number) {
  const prefix = `changePersons ${percentagePerDays}%`;
  performance.mark(`${prefix}-start`);

  Object.entries(serverDaysData).forEach(([dayId, day]) => {
    const keys = Object.keys(day.appointments);
    const shuffledKeys = shuffle(keys);
    const keysToRemove = shuffledKeys.slice(
      0,
      Math.floor(shuffledKeys.length * percentagePerDays),
    );

    keysToRemove.forEach(key => {
      const app = day.appointments[key];
      const visits = app.visits + random(2, 0);
      const points = app.points + random(2, 0);
      day.appointments[key].update({ visits, points });
    });
  });

  rootStore.domainStore.calendarDayStore.updateDays(true);

  performance.mark(`${prefix}-end`);
  performance.measure(prefix, `${prefix}-start`, `${prefix}-end`);
}
