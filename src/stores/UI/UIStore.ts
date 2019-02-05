import { action, observable } from 'mobx';
import * as Moment from 'moment';
import { DateRange, extendMoment } from 'moment-range';

const moment = extendMoment(Moment);

export default class UIStore {
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

  @action
  public updatePositionCount(count: number) {
    this.positionCount = count;
  }
}
