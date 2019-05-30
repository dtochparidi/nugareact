import rootStore from 'stores/RootStore';
import { serverDaysData } from 'fetchers/DayFetcher';
import Person from 'structures/Person';

function shuffle(a: any[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function changePersonsScenario(percentagePerDays: number) {
  const prefix = `changePersons ${percentagePerDays}%`;
  performance.mark(`${prefix}-start`);

  Object.entries(serverDaysData).forEach(([dayId, day]) => {
    const keys = Object.keys(day.appointments);
    const shuffledKeys = shuffle(keys);
    const keysToRemove = shuffledKeys.slice(
      0,
      Math.floor(shuffledKeys.length * percentagePerDays),
    );

    keysToRemove.forEach(key =>
      Object.assign(day.appointments[key], {
        personId: Person.generateRandomId(),
      }),
    );
  });

  rootStore.domainStore.calendarDayStore.updateDays(true);

  performance.mark(`${prefix}-end`);
  performance.measure(prefix, `${prefix}-start`, `${prefix}-end`);
}
