import * as React from "react";
import "./Button.scss";

export interface IProps extends React.HTMLProps<any> {
  value: string;
  onClick: () => void;
}

export default class Button extends React.Component<IProps, any> {
  public render() {
    return (
      <input
        className="button"
        type="button"
        value={this.props.value}
        onClick={this.props.onClick}
        style={this.props.style}
      />
    );
  }
}
