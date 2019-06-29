import { action, computed, observable } from 'mobx';
import * as Moment from 'moment';
import { DateRange, extendMoment } from 'moment-range';
import { Moment as IMoment } from 'moment';

const moment = extendMoment(Moment);

export default class UIStore {
  public firstLoadHandlers: Array<() => void> = [];
  public firstLoadDone = false;

  @observable
  public appsByBlockLocking: boolean = true;
  @observable
  public subGridColumns: number = 0;
  @observable
  public positionCount: number = 25;
  @observable
  public positionGaps: Array<{ position: number; title: string }> = [
    {
      position: 4,
      title: 'Title 1',
    },
    {
      position: 6,
      title: 'Title 2',
    },
    {
      position: 12,
      title: 'Title 3',
    },
    {
      position: 21,
      title: 'Title 4',
    },
  ];
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
  public setAppsBlockLocking(value: boolean) {
    this.appsByBlockLocking = value;
  }

  @action
  public addGap(position: number, title: string) {
    this.positionGaps.push({ position, title });
    this.positionGaps = this.positionGaps
      .slice()
      .sort((a, b) => (a.position > b.position ? 1 : -1));
  }

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

  public getBlockInfo(
    blockPosition: number,
  ): {
    blockStart: number;
    blockEnd: number;
    blockIndex: number;
    blockTitle: string;
  } {
    const block = this.positionGaps
      .concat([{ position: this.positionCount, title: 'final' }])
      .find(g => g.position >= blockPosition);

    if (!block) throw new Error('Invalid Gap Position');

    const blockIndex = this.positionGaps
      .concat([{ position: this.positionCount, title: 'final' }])
      .findIndex(g => g.position === block.position);
    const index = blockIndex - 1;
    const blockStart = index === -1 ? 0 : this.positionGaps[index].position;
    const blockEnd = block.position;
    const blockTitle = block.title;

    return { blockStart, blockEnd, blockTitle, blockIndex };
  }
}
