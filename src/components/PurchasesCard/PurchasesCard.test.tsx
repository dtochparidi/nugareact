import * as enzyme from 'enzyme';
import moment from 'moment';
import * as React from 'react';

import IPurchase from '../../interfaces/IPurchase';
import PurchasesCard from './PurchasesCard';

const testPurchases: IPurchase[] = [
  {
    amount: 12,
    bill: 22,
    contract: 33,
    date: moment({ day: 3, year: 2019, month: 1 }),
    deliveryDate: moment({ day: 13, year: 2019, month: 1 }),
    name: 'Кошелёк',
    price: 140,
    type: 'Обычный',
  },
  {
    amount: 12,
    bill: 22,
    contract: 33,
    date: moment({ day: 3, year: 2019, month: 1 }),
    deliveryDate: moment({ day: 13, year: 2019, month: 1 }),
    name: 'Кошелёк',
    price: 140,
    type: 'Обычный',
  },
];

it('renders without crashing', () => {
  const component = enzyme.render(<PurchasesCard purchases={testPurchases} />);
  expect(component);
});
