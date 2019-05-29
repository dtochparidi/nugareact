import rootStore from 'stores/RootStore';
import { serverDaysData } from 'fetchers/DayFetcher';

function shuffle(a: any[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function removeAppsScenario(percentagePerDays: number) {
  const prefix = `removeApps ${percentagePerDays}%`;
  performance.mark(`${prefix}-start`);

  Object.entries(serverDaysData).forEach(([dayId, day]) => {
    const keys = Object.keys(day.appointments);
    const shuffledKeys = shuffle(keys);
    const keysToRemove = shuffledKeys.slice(
      0,
      Math.floor(shuffledKeys.length * percentagePerDays),
    );

    keysToRemove.forEach(key => delete day.appointments[key]);
  });

  rootStore.domainStore.calendarDayStore.updateDays(true);

  performance.mark(`${prefix}-end`);
  performance.measure(prefix, `${prefix}-start`, `${prefix}-end`);
}
