import * as React from 'react';
import * as ReactDOM from 'react-dom';

import Button from '../Button';

export interface IProps {
  width: number;
  height: number;
  left: number;
  top: number;
}

export default class WindowPortal extends React.Component<IProps> {
  private containerEl: HTMLDivElement;
  private externalWindow: Window;
  private onOpenWindowHandler: () => void;

  constructor(props: any) {
    super(props);

    this.containerEl = document.createElement("div");
    this.onOpenWindowHandler = this.onOpenWindow.bind(this);
  }

  public render() {
    return [
      ReactDOM.createPortal(this.props.children, this.containerEl),
      <Button
        value="Control Window"
        onClick={this.onOpenWindowHandler}
        key="openWindowButton"
        style={
          {
            bottom: "1em",
            position: "absolute",
            right: "1em"
          } as React.CSSProperties
        }
      />
    ];
  }

  public onOpenWindow() {
    const { width, height, left, top } = this.props;
    const win = window.open(
      "",
      "ControlWindow",
      `width=${width},height=${height},left=${left},top=${top}`
    );
    if (!win) {
      console.error("cannot open control window! (popup is blocked)");
      return;
    }

    this.externalWindow = win;
    this.externalWindow.document.body.appendChild(this.containerEl);
  }

  public componentWillUnmount() {
    if (this.externalWindow) this.externalWindow.close();
  }
}
