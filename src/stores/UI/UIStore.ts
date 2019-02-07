import { action, observable } from 'mobx';
import * as Moment from 'moment';
import { DateRange, extendMoment } from 'moment-range';

const moment = extendMoment(Moment);

export default class UIStore {
  @observable
  public subGridColumns: number = 5;
  @observable
  public positionCount: number = 15;
  @observable
  public dayTimeRange: DateRange = moment.range(
    moment()
      .startOf('day')
      .hour(8),
    moment()
      .startOf('day')
      .hour(12),
  );
  @observable
  public calendarShifts: {
    [x: number]: {
      [x: number]: {
        dx: number;
        dy: number;
      };
    };
  } = {};

  // TODO: realize calendar shifts through binding grid on calendarShifts variable

  @action
  public updatePositionCount(count: number) {
    this.positionCount = count;
  }

  @action
  public updateSubGridColumnCount(count: number) {
    this.subGridColumns = count;
  }
}
