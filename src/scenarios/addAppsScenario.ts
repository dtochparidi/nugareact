import { generateAppointments, serverDaysData } from 'fetchers/DayFetcher';
import rootStore from 'stores/RootStore';

export default async function addAppsScenario(countPerDays: number) {
  const { uiStore } = rootStore;
  await Promise.all(
    Object.entries(serverDaysData).map(async ([dayId, day]) => {
      const apps = await generateAppointments(
        day.date,
        uiStore.dayTimeRange.start.hour(),
        uiStore.dayTimeRange.end.hour(),
        uiStore.positionCount,
        undefined,
        countPerDays,
      );

      Object.entries(apps).forEach(([appId, app]) => {
        day.appointments[appId] = app;
      });
    }),
  );

  rootStore.domainStore.calendarDayStore.updateDays();
}
