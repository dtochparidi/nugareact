import * as moment from 'moment';
import Appointment from 'structures/Appointment';

export default interface ICalendarDay {
  date: moment.Moment;
  appointments: { [uniqueId: string]: Appointment };
  loaded?: boolean;
}
