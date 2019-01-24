import * as moment from 'moment';
import IAppointment from './IAppointment';

export default interface ICalendarDay {
  date: moment.Moment;
  appointments: IAppointment[];
}
