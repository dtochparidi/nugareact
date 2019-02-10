import * as moment from 'moment';

import { IPerson } from './IPerson';
import { IPersonLoading } from './IPersonLoading';

export default interface IAppointment {
  date: moment.Moment;
  duration: moment.Duration;
  position: number;
  personId: string;
  personInstance?: IPerson | IPersonLoading;
}
