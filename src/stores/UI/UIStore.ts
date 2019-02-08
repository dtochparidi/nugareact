import { action, computed, observable } from 'mobx';
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
  public mainColumnStep: Moment.Duration = Moment.duration(45, 'minutes');

  @action
  public updatePositionCount(count: number) {
    this.positionCount = count;
  }

  @action
  public updateSubGridColumnCount(count: number) {
    this.subGridColumns = count;
  }

  @computed
  public get dayTimeRangeActual(): DateRange {
    const actualDuration =
      Math.ceil(
        this.dayTimeRange.duration('minute') / this.mainColumnStep.asMinutes(),
      ) * this.mainColumnStep.asMinutes();

    return moment.range(
      this.dayTimeRange.start,
      this.dayTimeRange.start.clone().add(actualDuration, 'minute'),
    );
  }
}
