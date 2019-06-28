import { action, computed, observable } from 'mobx';
import * as Moment from 'moment';
import { DateRange, extendMoment } from 'moment-range';
import { Moment as IMoment } from 'moment';

const moment = extendMoment(Moment);

export default class UIStore {
  public firstLoadHandlers: Array<() => void> = [];
  public firstLoadDone = false;

  @observable
  public subGridColumns: number = 0;
  @observable
  public positionCount: number = 25;
  @observable
  public positionGaps: number[] = [4, 6, 8, 11, 14, 17, 22];
  @observable
  public fastMode: boolean = false;
  @observable
  public screenWidth: number = 0;
  @observable
  public currentDay: IMoment = moment();
  @observable
  public leftBorderDay: IMoment = moment();
  @observable
  public rightBorderDay: IMoment = moment();
  @observable
  public isScrolling: boolean = false;
  public isScrollingUnbinded: boolean = false;

  @observable
  public hardwareCSSAcceleration = false;

  @observable
  public dayTimeRange: DateRange = moment.range(
    moment()
      .startOf('day')
      .hour(8),
    moment()
      .startOf('day')
      // .hour(9),
      .hour(17),
    // .hour(23),
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
  public setCurrentDay(day: IMoment) {
    this.currentDay = day;
  }

  @action
  public setBorderDays(leftDay: IMoment, rightDay: IMoment) {
    this.leftBorderDay = leftDay;
    this.rightBorderDay = rightDay;
  }

  @action
  public setScreenWidth(width: number) {
    this.screenWidth = width;
  }

  @action
  public setHardwareCSSAcceleration(enabled: boolean) {
    this.hardwareCSSAcceleration = enabled;
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
