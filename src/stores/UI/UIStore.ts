import { action, computed, observable } from 'mobx';
import * as Moment from 'moment';
import { DateRange, extendMoment } from 'moment-range';

const moment = extendMoment(Moment);

export default class UIStore {
  public firstLoadHandlers: Array<() => void> = [];
  public firstLoadDone = false;

  @observable
  public subGridColumns: number = 5;
  @observable
  public positionCount: number = 25;
  @observable
  public fastMode: boolean = false;
  @observable
  public isScrolling: boolean = false;
  public isScrollingUnbinded: boolean = false;

  @observable
  public dayTimeRange: DateRange = moment.range(
    moment()
      .startOf('day')
      .hour(8),
    moment()
      .startOf('day')
      // .hour(9),
      .hour(17),
  );
  @observable
  public mainColumnStep: Moment.Duration = Moment.duration(45, 'minutes');

  @action
  public setScrolling(scrolling: boolean) {
    if (this.isScrollingUnbinded === scrolling) return;

    console.log(`set scrolling ${this.isScrollingUnbinded} -> ${scrolling}`);
    this.isScrolling = scrolling;
    this.isScrollingUnbinded = scrolling;
  }

  @action
  public setFastMode(enabled: boolean) {
    this.fastMode = enabled;
  }

  @action
  public updatePositionCount(count: number) {
    this.positionCount = count;
  }

  @action
  public updateSubGridColumnCount(count: number) {
    this.subGridColumns = count;
  }

  public firstLoadCompeleted() {
    this.firstLoadHandlers.forEach(func => func());
    this.firstLoadDone = true;
  }

  @computed
  public get dayTimeRangeActual(): DateRange {
    const actualDuration =
      Math.ceil(
        this.dayTimeRange.duration('minute') / this.mainColumnStep.asMinutes() +
          1,
      ) * this.mainColumnStep.asMinutes();

    return moment.range(
      this.dayTimeRange.start,
      this.dayTimeRange.start.clone().add(actualDuration, 'minute'),
    );
  }
}
