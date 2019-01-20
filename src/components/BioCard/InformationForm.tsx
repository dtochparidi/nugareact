import { observer } from "mobx-react";
import * as moment from "moment";
import * as React from "react";

const labelsMap: { [s: string]: string } = {
  address: "Адрес",
  averageBill: "Средний чек",
  birthday: "Возраст",
  friends: "Друзья",
  invitedBy: "Пригласил/а",
  rate: "Рейтинг"
};

const fieldsTransoformMap: {
  [s: string]: (val: any) => string | React.ReactNode;
} = {
  address: val => val,
  averageBill: val => val.toString(),
  birthday: (val: moment.Moment) => [
    <span className="age" key="age">
      {moment().diff(val, "year")} лет
    </span>,
    " ",
    <span className="date" key="date">
      {val.format("DD.MM.gg")}
    </span>
  ],
  friends: (val: string[]) =>
    val.map((friend, index, array) => [
      <a href="" key={friend}>
        {friend}
      </a>,
      index === array.length - 1 ? null : ", "
    ]),
  invitedBy: val => <a href="">{val}</a>,
  rate: val => val.toString()
};
