import * as moment from "moment";

export default interface ICalendarDay {
  date: moment.Moment;
  personIds: string[];
}
