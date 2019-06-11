import { observer } from "mobx-react";
import * as React from "react";
import Button from "../../../components/Button";
import DateField from "./DateField";
import Label from "./Label";
import StaticField from "./StaticField";
import TextField from "./TextField";

const fieldsTransoformMap: {
  [s: string]: (val: any) => React.ReactNode;
} = {
  friends: (val: string[]) => [
    val.map((friend, index, array) => [
      <span className="linked" key={friend}>
        {friend}
      </span>,
      index === array.length - 1 ? null : ", "
    ])
  ],
  invitedBy: val => <span className="linked">{val}</span>
};

export interface IProps {
  form: any;
}

@observer
export default class InformationForm extends React.Component<IProps> {
  public render() {
    const { form } = this.props;

    return (
      <div>
        <div className="head">
          <TextField form={form} propertyName="name" />
          &nbsp;
          <TextField form={form} propertyName="surname" />
        </div>
        <form className="information">
          <Label form={form} propertyName="address" />
          <TextField form={form} propertyName="address" />

          <Label form={form} propertyName="phone" />
          <TextField form={form} propertyName="phone" />

          <Label form={form} propertyName="birthday" />
          <DateField form={form} propertyName="birthday" />

          <Label form={form} propertyName="rate" />
          <TextField form={form} propertyName="rate" readonly={true} />

          <Label form={form} propertyName="friends" />
          <StaticField
            form={form}
            propertyName="friends"
            transformer={fieldsTransoformMap.friends}
          />

          <Label form={form} propertyName="averageBill" />
          <TextField form={form} propertyName="averageBill" readonly={true} />

          <Label form={form} propertyName="invitedBy" />
          <StaticField
            form={form}
            propertyName="invitedBy"
            transformer={fieldsTransoformMap.invitedBy}
          />

          <Button
            onClick={form.onSubmit}
            value="Сохранить"
            style={{ margin: "1em", marginLeft: 0 }}
          />
        </form>
      </div>
    );
  }
}
