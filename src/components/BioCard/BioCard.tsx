import { observer } from 'mobx-react';
import MobxReactForm, { Form } from 'mobx-react-form';
import moment from 'moment';
import * as React from 'react';
import * as validatorjs from 'validatorjs';

import { IPerson } from '../../interfaces/IPerson';
import { IUpdatable } from '../../interfaces/IUpdatable';
import Card from '../Card';
import InformationForm from './InformationForm';

import './BioCard.scss';

validatorjs.useLang('ru');

const plugins = { dvr: validatorjs };

export interface IBioCardProps {
  personData: IUpdatable<IPerson>;
}

export interface IState {
  personData: IPerson;
}

@observer
export default class BioCard extends React.Component<IBioCardProps, any> {
  public onUpdateHandler: any;
  public fields: {
    [s: string]: any;
  };
  public hooks: {};

  constructor(props: IBioCardProps) {
    super(props);

    this.onUpdateHandler = this.props.personData.update.bind(this);

    const personData = this.props.personData.target;
    this.hooks = {
      onSuccess: (form: Form) => {
        const values: { [s: string]: any } = form.values();
        this.onUpdateHandler(Object.entries(values));
      },
      onError(form: Form) {
        alert('Form has errors!');
        // get all form errors
        console.log('All form errors', form.errors());
      },
    };

    this.fields = {
      address: {
        label: 'Адрес',
        placeholder: 'Введите адрес',
        rules: 'required|string',
        value: personData.address,
      },
      averageBill: {
        label: 'Средний чек',
        placeholder: 'Введите адрес',
        value: personData.averageBill,
      },
      birthday: {
        input: (value: moment.Moment) => {
          if (value.format) return value.format('DD.MM.gggg');
          else return value;
        },
        label: 'Возраст',
        output: (value: string) => {
          const transformed = value.replace(/\./g, '-');
          const date = moment(transformed, 'DD-MM-YYYY');
          return date;
        },
        placeholder: 'Введите дату рождения',
        value: personData.birthdate,
      },
      friends: {
        label: 'Друзья',
        value: personData.friends,
      },
      invitedBy: {
        label: 'Пригласил/а',
        value: personData.invitedBy,
      },
      name: {
        placeholder: 'Введите имя',
        rules: "required|string|regex:/^[a-zA-Zа-яА-Я '.-]*$/",
        value: personData.name,
      },
      phone: {
        label: 'Телефон',
        placeholder: 'Введите номер телефона',
        rules:
          'required|string|regex:/^[+]*[(]{0,1}[0-9]{1,3}[)]{0,1}[-s./0-9]*$/g',
        value: personData.phone,
      },
      rate: {
        label: 'Рейтинг',
        value: personData.rate,
      },
      surname: {
        placeholder: 'Введите фамилию',
        rules: "required|string|regex:/^[a-zA-Zа-яА-Я '.-]*$/",
        value: personData.surname,
      },
    };
  }

  public render() {
    const form = new MobxReactForm(
      { fields: this.fields },
      { plugins, hooks: this.hooks },
    );

    return (
      <Card cardClass="bioCard">
        <div className="container">
          <div className="leftBlock">
            <InformationForm form={form} />
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
