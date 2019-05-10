import { DateRange } from 'moment-range';
import Appointment from 'structures/Appointment';
// import CalendarDay from 'structures/CalendarDay';

import CalendarCard, { Direction } from '../CalendarCard';

export function freePlaceToDrop(
  movingApp: {
    uniqueId: string;
    position: number;
    dateRange: DateRange;
  },
  context: CalendarCard,
): boolean {
  interface IOffsetMap {
    [uniqueId: string]: { dx: number; dy: number };
  }

  // const applyShifts = (currentDay: CalendarDay, offsets: IOffsetMap) => {
  //   const shifts = Object.entries(offsets).map(([id, deltas]) => {
  //     const app = currentDay.appointments[id];
  //     return {
  //       dx: 0,
  //       dy: deltas.dy,
  //       x: context.getColumnIndex(app.date),
  //       y: app.position,
  //     };
  //   });

  //   context.mergeShifts(currentDay.id, shifts);
  // };

  const day = context.getDayByStamp(movingApp.dateRange.start);

  const shiftsCache = context.shiftsCache;

  const restoreShiftsFromCache = (id: string): IOffsetMap | false =>
    day.id in shiftsCache && shiftsCache[day.id][id];

  const cacheShifts = (id: string, offsets: IOffsetMap) => {
    if (!(day.id in shiftsCache)) shiftsCache[day.id] = {};
    shiftsCache[day.id][id] = offsets;
  };

  const calcShiftCascadeIdentifier = (
    fixedApp: {
      uniqueId: string;
      position: number;
      dateRange: DateRange;
    },
    fixedIds: string[],
    collisingApp: Appointment[],
    priorityDirection: Direction,
  ) =>
    movingApp.dateRange.start.format('mm:HH') +
    movingApp.position +
    fixedApp.uniqueId +
    fixedApp.position +
    priorityDirection.toString() +
    collisingApp.map(app => app.uniqueId).join('') +
    fixedIds.join('');

  const calcOffsetMap = (
    fixedApp: {
      uniqueId: string;
      position: number;
      dateRange: DateRange;
    },
    positionsOffset: IOffsetMap,
    priorityDirection: Direction = Direction.Top,
    fixedIds: string[] = [],
  ): IOffsetMap | false => {
    const filledColumn = new Array(context.props.positionCount).fill(null).map(
      () =>
        [] as Array<{
          uniqueId: string;
          position: number;
          dateRange: DateRange;
        }>,
    );
    const nearCollisingApps = Object.values(day.appointments).filter(
      app =>
        app.uniqueId !== fixedApp.uniqueId &&
        app.uniqueId !== movingApp.uniqueId &&
        app.dateRange.overlaps(fixedApp.dateRange),
    );

    // try to restore cache
    const shiftCascadeIdentifier = calcShiftCascadeIdentifier(
      fixedApp,
      fixedIds,
      nearCollisingApps,
      priorityDirection,
    );
    const restoredShifts = restoreShiftsFromCache(shiftCascadeIdentifier);

    if (restoredShifts) return restoredShifts;

    nearCollisingApps.forEach(app =>
      filledColumn[
        app.position + (positionsOffset[app.uniqueId] || { dy: 0 }).dy
      ].push(app),
    );

    const fixedAppPosition =
      fixedApp.position + (positionsOffset[fixedApp.uniqueId] || { dy: 0 }).dy;

    // add moving app
    if (movingApp.uniqueId !== fixedApp.uniqueId)
      filledColumn[movingApp.position].push(movingApp);

    if (!filledColumn[fixedAppPosition].length) return positionsOffset;

    const getOvelaps = (
      position: number,
      app: {
        uniqueId: string;
        position: number;
        dateRange: DateRange;
      },
      d: number,
    ):
      | [
          Array<
            | Appointment
            | {
                uniqueId: string;
                position: number;
                dateRange: DateRange;
              }
          >,
          number
        ]
      | false => {
      const nextPosition = position + d;
      const inBound = nextPosition >= 0 && nextPosition < filledColumn.length;

      if (!inBound) return false;

      const apps = filledColumn[position].filter(nextApp =>
        nextApp.dateRange.overlaps(app.dateRange),
      );

      if (
        apps.some(
          a =>
            a.uniqueId === movingApp.uniqueId ||
            fixedIds.some(fixedId => a.uniqueId === fixedId),
        )
      )
        return false;

      return [apps, d];
    };

    const startDelta = priorityDirection === Direction.Top ? -1 : 1;
    const possibleDeltas = [startDelta, startDelta * -1];

    const finalOffsets = possibleDeltas.reduce((acc: IOffsetMap, delta) => {
      if (acc) return acc;

      const overlaps = getOvelaps(fixedAppPosition, fixedApp, delta);

      if (!overlaps) return false;

      const [overlappingApps, shiftDelta] = overlaps;

      const newFixedIds = fixedIds.map(id => id);
      if (fixedApp.uniqueId !== movingApp.uniqueId)
        newFixedIds.push(fixedApp.uniqueId);

      if (!overlappingApps) return false;

      // copy of positionsOffset object
      const newOffsets = Object.entries(positionsOffset).reduce(
        (newObj, [id, deltas]) => {
          newObj[id] = { dx: deltas.dx, dy: deltas.dy };
          return newObj;
        },
        {},
      );

      // add offsets
      overlappingApps.forEach(app => {
        if (!(app.uniqueId in newOffsets))
          newOffsets[app.uniqueId] = { dx: 0, dy: shiftDelta };
        else newOffsets[app.uniqueId].dy += shiftDelta;
      });

      const currentOffsetMap = overlappingApps.reduce(
        (offsets: IOffsetMap | false, app) => {
          if (!offsets) return false;

          const newOffsetMap = calcOffsetMap(
            app,
            offsets,
            priorityDirection,
            newFixedIds,
          );

          return newOffsetMap;
        },
        newOffsets,
      );

      return currentOffsetMap;
    }, false);

    if (finalOffsets) cacheShifts(shiftCascadeIdentifier, finalOffsets);

    return finalOffsets;
  };

  // const offsetMap = calcOffsetMap(movingApp, {});

  // if (!offsetMap) {
  //   context.clearShifts();
  //   return false;
  // }

  // applyShifts(day, offsetMap);

  return true;
}
