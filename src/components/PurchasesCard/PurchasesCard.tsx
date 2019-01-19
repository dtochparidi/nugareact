import * as moment from "moment";
import * as React from "react";
import IPurchase from "src/interfaces/IPurchase";
import ITableElement from "src/interfaces/ITableElement";
import Card from "../Card";
import Table from "../Table";
import "./PurchasesCard.scss";

export interface IProps {
  purchases: IPurchase[];
}

export default class Purchases extends React.Component<IProps, object> {
  public render() {
    const transormationMap: {
      [s: string]: (val: any) => string;
    } = {
      amount: val => val.toString(),
      bill: val => val.toString(),
      contract: val => val.toString(),
      date: val => val.format("DD.MM.gg"),
      deliveryDate: val =>
        moment().diff(val) < 0 ? val.format("DD.MM.gg") : "Доставлено",
      name: val => val,
      price: val => val.toString(),
      type: val => val
    };
    const orderedColumns = [
      "date",
      "name",
      "amount",
      "price",
      "deliveryDate",
      "bill",
      "contract",
      "type"
    ];

    const transformedData: Array<
      Array<ITableElement<any>>
    > = this.props.purchases
      .map(p =>
        Object.entries(p).map(entrie => ({
          name: entrie[0],
          toString: (val: any) => transormationMap[entrie[0]](val),
          value: entrie[1]
        }))
      )
      .sort(
        (row1, row2) =>
          (row1.find(elem => elem.name === "date") as ITableElement<
            moment.Moment
          >).value.valueOf() -
          (row2.find(elem => elem.name === "date") as ITableElement<
            moment.Moment
          >).value.valueOf()
      );

    return (
      <Card cardClass="purchasesCard">
        <div className="head">{"Покупки и чеки"}</div>
        <Table columns={orderedColumns} data={transformedData} />
      </Card>
    );
  }
}
