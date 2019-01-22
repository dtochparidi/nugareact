import * as moment from "moment";
import { IPerson } from "./IPerson";

export default interface ICalendarDay {
  date: moment.Moment;
  personIds: string[];
}
