import { Form } from "mobx-react-form";
import * as React from "react";

export interface IProps<T> {
  form: Form;
  propertyName: string;
  transformer: (val: T) => React.ReactNode;
}

export default class StaticField<T> extends React.Component<IProps<T>> {
  constructor(props: IProps<T>) {
    super(props);
  }

  public render() {
    const { form, propertyName, transformer } = this.props;
    return (
      <span className={`info ${propertyName}`}>
        {transformer(form.$(propertyName).value)}
      </span>
    );
  }
}
