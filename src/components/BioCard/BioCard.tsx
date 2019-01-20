import "./BioCard.scss";

import { observer } from "mobx-react";
import MobxReactForm from "mobx-react-form";
import * as React from "react";
import { IPerson } from "src/interfaces/IPerson";
import { IUpdatable } from "src/interfaces/IUpdatable";

import validatorjs from "validatorjs";

const plugins = { dvr: validatorjs };

import Card from "../Card";

export interface IBioCardProps {
  personData: IUpdatable<IPerson>;
}

export interface IState {
  personData: IPerson;
}

@observer
export default class BioCard extends React.Component<IBioCardProps, any> {
  public onUpdateHandler: any;
  public fieldsMap: {
    [s: string]: { label: string; placeholder: string; rules: string };
  } = {
    address: {
      label: "Адрес",
      placeholder: "Введите адрес",
      rules: "required|string"
    },
    averageBill: {
      label: "Средний чек",
      placeholder: "Введите адрес",
      rules: "required|string"
    },
    birthday: {
      label: "Возраст",
      placeholder: "Введите адрес",
      rules: "required|string"
    },
    friends: {
      label: "Друзья",
      placeholder: "Введите адрес",
      rules: "required|string"
    },
    invitedBy: {
      label: "Пригласил/а",
      placeholder: "Введите адрес",
      rules: "required|string"
    },
    rate: {
      label: "Рейтинг",
      placeholder: "Введите адрес",
      rules: "required|string"
    }
  };

  constructor(props: IBioCardProps) {
    super(props);

    this.onUpdateHandler = this.props.personData.update.bind(this);
  }

  public render() {
    return (
      <Card cardClass="bioCard">
        <div className="container">
          <div className="leftBlock">
            <div className="head">
              {this.props.personData.target.name}{" "}
              {this.props.personData.target.surname}
            </div>
            <div className="information">{new MobxReactForm()}</div>
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
