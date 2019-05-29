import { generateAppointments } from 'fetchers/DayFetcher';
import rootStore from 'stores/RootStore';

export default function addAppsScenario(countPerDays: number) {
  const { uiStore } = rootStore;
  const { days } = rootStore.domainStore.calendarDayStore;
  days.forEach(async day => {
    const apps = await generateAppointments(
      day.date,
      uiStore.dayTimeRange.start.hour(),
      uiStore.dayTimeRange.end.hour(),
      uiStore.positionCount,
      undefined,
      countPerDays,
    );

    day.addAppointments(Object.values(apps));
  });
}
