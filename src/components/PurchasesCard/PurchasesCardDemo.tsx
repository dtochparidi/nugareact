import * as moment from "moment";
import * as React from "react";
import IPurchase from "src/interfaces/IPurchase";

import PurchasesCard from ".";

function takeRandom(array: any[]) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomBetween(from: number, to: number) {
  return Math.floor(Math.random() * (to - from)) + from;
}

const generatePurchase = (): IPurchase => ({
  amount: randomBetween(1, 10),
  bill: randomBetween(4, 145),
  contract: randomBetween(3, 7),
  date: moment({
    day: randomBetween(1, 28),
    month: randomBetween(0, 1),
    year: 2019
  }),
  deliveryDate: moment({
    day: randomBetween(1, 28),
    month: randomBetween(0, 1),
    year: 2019
  }),
  name: takeRandom(
    "Омбудсмен Ъ Перочинный нож Ъ Упаковка чая Ъ Глазурь Ъ Кухонный аппарат Ъ Посуда".split(
      "Ъ"
    )
  ),
  price: randomBetween(29, 370),
  type: takeRandom("Акционный Ъ Обычный".split("Ъ"))
});

const testPurchases: IPurchase[] = new Array(5)
  .fill(null)
  .map(generatePurchase);

export interface IProps extends React.Props<any> {}

export interface IState {
  purchases: IPurchase[];
}

export default class PurchasesCardDemo extends React.Component<IProps, IState> {
  public addPurchase: () => void;

  constructor(props: IProps) {
    super(props);

    this.state = {
      purchases: testPurchases
    };

    this.addPurchase = () => this.onPurchaseAdded(generatePurchase());
  }

  public componentDidMount() {
    // nothing
  }

  public onPurchaseAdded = (purchase: IPurchase) =>
    this.updatePurchases(this.state.purchases.concat(purchase));

  public render() {
    return (
      <div>
        <input
          type="button"
          value="Add a purchase"
          style={{
            background: "lightgrey",
            position: "fixed",
            right: "10px",
            top: "10px"
          }}
          onClick={this.addPurchase}
        />
        <PurchasesCard purchases={this.state.purchases} />
      </div>
    );
  }

  private updatePurchases(purchases: IPurchase[]) {
    this.setState({ purchases });
  }
}
