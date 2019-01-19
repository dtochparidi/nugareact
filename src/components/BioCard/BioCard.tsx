import * as moment from "moment";
import * as React from "react";
import { IPerson } from "src/interfaces/IPerson";
import Card from "../Card";
import "./BioCard.scss";

export interface IBioCardProps {
  personData: IPerson;
  children?: React.ReactNode;
}

export default class BioCard extends React.Component<IBioCardProps, any> {
  constructor(props: IBioCardProps) {
    super(props);
  }

  public render() {
    const visibleInfoFilter: Array<[string, string, (value: any) => string]> = [
      ["address", "Адрес", val => val],
      ["phone", "Телефон", val => <a href="">{val}</a>],
      [
        "birthdate",
        "Возраст",
        (val: moment.Moment) => [
          <span className="age" key="age">
            {moment().diff(val, "year")} лет
          </span>,
          " ",
          <span className="date" key="date">
            {val.format("DD.MM.gg")}
          </span>
        ]
      ],
      ["rate", "Рейтинг", val => val.toString()],
      [
        "friends",
        "Друзья",
        (val: string[]) =>
          val.map((friend, index, array) => [
            <a href="" key={friend}>
              {friend}
            </a>,
            index === array.length - 1 ? null : ", "
          ])
      ],
      ["averageBill", "Средний чек", val => val],
      ["invitedBy", "Пригласил/а", val => <a href="">{val}</a>]
    ];

    return (
      <Card cardClass="bioCard">
        <div className="container">
          <div className="leftBlock">
            <div className="head">
              {this.props.personData.name} {this.props.personData.surname}
            </div>
            <div className="information">
              {visibleInfoFilter.map(entrie => [
                <span className="prop" key={`${entrie[0]}_prop`}>
                  {entrie[1]}
                </span>,
                <span className={`info ${entrie[0]}`} key={`${entrie[0]}_info`}>
                  {entrie[2](this.props.personData[entrie[0]])}
                </span>
              ])}
            </div>
          </div>

          <div className="rightBlock">
            <div className="avatar" />
            <div className="menuButton" />
          </div>
        </div>
      </Card>
    );
  }
}
