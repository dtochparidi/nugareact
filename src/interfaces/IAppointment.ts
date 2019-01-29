import * as moment from 'moment';
import { IPerson } from './IPerson';
import { IPersonLoading } from './IPersonLoading';

export default interface IAppointment {
  date: moment.Moment;
  position: number;
  personId: string;
  personInstance?: IPerson | IPersonLoading;
  identifier?: string;
}
