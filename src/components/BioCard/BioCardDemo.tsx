import * as moment from "moment";
import * as React from "react";
import { IPerson } from "src/interfaces/IPerson";
import BioCard from ".";

const personData: IPerson = {
  address: "Москва",
  averageBill: "500 eur",
  birthdate: moment({ year: 1971, month: 10, day: 21 }),
  friends: ["Ален Евсеев", "Дарья Акодимишена", "Виктор Дёмин"],
  id: "#001",
  invitedBy: "Ален Евсеев",
  name: "Алексей",
  patronymic: "",
  phone: "+371 28481181",
  rate: 20,
  surname: "Долматов"
};

export default function BioCardDemo() {
  return <BioCard personData={personData} />;
}
