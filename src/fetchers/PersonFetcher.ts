import * as moment from 'moment';

import IFetcher from '../interfaces/IFetcher';
import { IPerson } from '../interfaces/IPerson';

function takeRandom(array: any[]) {
  return array[Math.floor(Math.random() * array.length)];
}

function random(to: number, from: number = 0) {
  return Math.floor(Math.random() * (to - from)) + from;
}

function generateRandomPerson(id: string): IPerson {
  return {
    address: 'Москва',
    averageBill: '500 eur',
    birthdate: moment({
      day: 21,
      month: 10,
      year: 1971,
    }),
    friends: ['Ален Евсеев', 'Дарья Акодимишена', 'Виктор Дёмин'],
    id,
    invitedBy: 'Ален Евсеев',
    loaded: true,
    name: takeRandom(
      'Алексей Дмитрий Андрей Юлий Галий Валерий Глеб Лёха Коля'.split(' '),
    ),
    patronymic: '',
    phone: '+371 28481181',
    rate: 20,
    surname: takeRandom(
      'Долматов Бубликов Смирнов Баженов Святов Вячеславов Куприков Блинов Карамзинов'.split(
        ' ',
      ),
    ),
  };
}

const backendPersons: { [s: string]: IPerson } = {};

const fetchPerson: IFetcher<string, IPerson> = async function PersonFetcher(
  id,
) {
  if (!(id in backendPersons)) backendPersons[id] = generateRandomPerson(id);

  // just delay (simulating network delays)
  await new Promise(resolve => setTimeout(resolve, random(3200, 200)));

  return backendPersons[id];
};

export default fetchPerson;
