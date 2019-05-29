import rootStore from 'stores/RootStore';

function shuffle(a: any[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function removeAppsScenario(percentagePerDays: number) {
  rootStore.domainStore.calendarDayStore.days.forEach(day => {
    const keys = Object.keys(day.appointments);
    const shuffledKeys = shuffle(keys);
    const keysToRemove = shuffledKeys.slice(
      0,
      Math.floor(shuffledKeys.length * percentagePerDays),
    );

    keysToRemove.forEach(key => day.removeAppointment(key));
  });
}
