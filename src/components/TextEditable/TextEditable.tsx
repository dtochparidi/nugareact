import * as React from "react";
import "./TextEditable.scss";

export interface IProps {
  value: string;
  paramKey: string;
  onChange: (key: string, newValue: string) => void;
}

export default class TextEditable extends React.Component<IProps, object> {
  public onValueChangedHandler: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;

  constructor(props: IProps) {
    super(props);

    this.onValueChangedHandler = this.onValueChanged.bind(this);
  }

  public onValueChanged(event: React.ChangeEvent<HTMLInputElement>) {
    this.props.onChange(this.props.paramKey, event.target.value);
  }

  public render() {
    const { value } = this.props;

    return (
      <input
        value={value}
        className="inputField"
        onChange={this.onValueChangedHandler}
      />
    );
  }
}
