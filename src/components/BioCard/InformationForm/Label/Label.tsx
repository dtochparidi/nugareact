import { Form } from "mobx-react-form";
import * as React from "react";

export interface IProps {
  form: Form;
  propertyName: string;
}

export default class Label extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);

    this.state = {};
  }

  public render() {
    const { form, propertyName } = this.props;

    return (
      <label className="prop" htmlFor={form.$(propertyName).id}>
        {form.$(propertyName).label}
      </label>
    );
  }
}
