import * as moment from 'moment';

export default interface IPurchase {
  date: moment.Moment;
  name: string;
  amount: number;
  price: number;
  deliveryDate: moment.Moment;
  bill: number;
  contract: number;
  type: string;
}
