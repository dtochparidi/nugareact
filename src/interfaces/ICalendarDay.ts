import * as moment from 'moment';
import Appointment from 'src/structures/Appointment';

export default interface ICalendarDay {
  date: moment.Moment;
  appointments: Appointment[];
  loaded?: boolean;
}
