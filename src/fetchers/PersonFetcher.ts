import * as moment from 'moment';

import IFetcher from '../interfaces/IFetcher';
import { IPerson } from '../interfaces/IPerson';

const avatar1 = require('../assets/mockPhotos/avatar1.png');
const avatar6 = require('../assets/mockPhotos/avatar6.jpg');
const avatar7 = require('../assets/mockPhotos/avatar7.jpg');
const avatar2 = require('../assets/mockPhotos/avatar2.jpeg');
const avatar3 = require('../assets/mockPhotos/avatar3.jpeg');
const avatar4 = require('../assets/mockPhotos/avatar4.jpeg');
const avatar5 = require('../assets/mockPhotos/avatar5.jpeg');
const avatar8 = require('../assets/mockPhotos/avatar8.jpeg');
const avatar9 = require('../assets/mockPhotos/avatar9.jpeg');
const avatar10 = require('../assets/mockPhotos/avatar10.jpeg');

const mockAvatars = [
  avatar1,
  avatar2,
  avatar3,
  avatar4,
  avatar5,
  avatar6,
  avatar7,
  avatar8,
  avatar9,
  avatar10,
];

function takeRandom(array: any[]) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomPhoto() {
  return takeRandom(mockAvatars);
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
    photo: getRandomPhoto(),
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
  // await new Promise(resolve => setTimeout(resolve, random(1200, 200)));

  return backendPersons[id];
};

export default fetchPerson;
