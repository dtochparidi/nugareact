import * as moment from 'moment';

export interface IPerson {
  id: string;
  name: string;
  surname: string;
  patronymic: string;
  address: string;
  phone: string;
  birthdate: moment.Moment;
  rate: number;
  friends: string[];
  averageBill: string;
  invitedBy: string;
  loaded?: boolean;
}
