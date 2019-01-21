import { observer } from "mobx-react";
import { Form } from "mobx-react-form";
import * as React from "react";

export interface IProps {
  form: Form;
  propertyName: string;
  readonly?: boolean;
}

@observer
export default class TextField extends React.Component<IProps> {
  public onUpdateInputWidthHandler: () => void;
  private inputRef: React.RefObject<HTMLInputElement>;

  constructor(props: IProps) {
    super(props);

    this.inputRef = React.createRef<HTMLInputElement>();
    this.onUpdateInputWidthHandler = this.onUpdateInputWidth.bind(this);
  }

  public componentDidMount() {
    this.onUpdateInputWidth();

    // dublicate it next tick
    setTimeout(() => this.onUpdateInputWidth());
  }

  public render() {
    const { form, propertyName, readonly } = this.props;

    return (
      <span className={`info ${propertyName}`}>
        <input
          {...form.$(propertyName).bind()}
          readOnly={readonly ? true : false}
          className={form.$(propertyName).isValid ? "" : "inputError"}
          ref={this.inputRef}
          onInput={this.onUpdateInputWidthHandler}
        />
        <p className="error">{form.$(propertyName).error}</p>
      </span>
    );
  }

  private onUpdateInputWidth() {
    function getWidthOfInput(inputEl: HTMLInputElement) {
      const tmp = document.createElement("span");
      const computed = window.getComputedStyle(inputEl);
      tmp.style.font = computed.font;

      tmp.innerHTML = inputEl.value;
      document.body.appendChild(tmp);

      const theWidth = tmp.getBoundingClientRect().width;
      document.body.removeChild(tmp);
      return theWidth;
    }

    if (this.inputRef.current)
      if (this.inputRef.current.value.length === 0)
        this.inputRef.current.style.width = "";
      else
        this.inputRef.current.style.width = `${getWidthOfInput(
          this.inputRef.current
        ) + 1}px`;
  }
}
