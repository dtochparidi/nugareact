import * as moment from "moment";
import IFetcher from "../interfaces/IFetcher";
import { IPerson } from "../interfaces/IPerson";

function takeRandom(array: any[]) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateRandomPerson(id: string): IPerson {
  return {
    address: "Москва",
    averageBill: "500 eur",
    birthdate: moment({ year: 1971, month: 10, day: 21 }),
    friends: ["Ален Евсеев", "Дарья Акодимишена", "Виктор Дёмин"],
    id,
    invitedBy: "Ален Евсеев",
    name: takeRandom("Алексей Дмитрий Андрей Юлий Галий Валерий".split(" ")),
    patronymic: "",
    phone: "+371 28481181",
    rate: 20,
    surname: takeRandom("Долматов Бубликов Смирнов Баженов Святов".split(" "))
  };
}

const fetchPerson: IFetcher<string, IPerson> = async function PersonFetcher(
  id
) {
  await new Promise(resolve => setTimeout(resolve, 1000));

  return generateRandomPerson(id);
};

export default fetchPerson;
