import * as moment from 'moment';
import IAppointment from './IAppointment';

export default interface ICalendarDay {
  date: moment.Moment;
  appointments: { [uniqueId: string]: IAppointment };
  loaded?: boolean;
}
