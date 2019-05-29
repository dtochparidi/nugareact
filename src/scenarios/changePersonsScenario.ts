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
  Object.entries(serverDaysData).forEach(([dayId, day]) => {
    const keys = Object.keys(day.appointments);
    const shuffledKeys = shuffle(keys);
    const keysToRemove = shuffledKeys.slice(
      0,
      Math.floor(shuffledKeys.length * percentagePerDays),
    );

    keysToRemove.forEach(key =>
      day.appointments[key].update({ personId: Person.generateRandomId() }),
    );
  });

  rootStore.domainStore.calendarDayStore.updateDays();
}
