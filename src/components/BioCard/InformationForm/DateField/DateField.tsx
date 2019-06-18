import { observer } from 'mobx-react';
import { Form } from 'mobx-react-form';
import moment from 'moment';
import * as React from 'react';

import TextField from '../TextField';

export interface IProps {
  form: Form;
  propertyName: string;
}

@observer
export default class DateField extends React.Component<IProps> {
  public onDateChangeHandler: (date: Date) => void;

  constructor(props: IProps) {
    super(props);

    this.onDateChangeHandler = this.onDateChange.bind(this);
  }

  public onDateChange(date: Date) {
    console.log(date);
  }

  public render() {
    const { form, propertyName } = this.props;
    const bornDate = form.$(propertyName).get('value');
    const nowDate = moment();
    const diff = Math.max(nowDate.diff(bornDate, 'year'), 0);

    return (
      <span className={`info ${propertyName}`}>
        <span className="age" key="age">
          {diff} лет
        </span>{' '}
        <TextField form={form} propertyName={propertyName} />
      </span>
    );
  }
}
