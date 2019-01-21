import * as enzyme from "enzyme";
import * as React from "react";
import ITableElement from "../../interfaces/ITableElement";

import Table from "./Table";

const columns = ["column_1", "column_2", "column_3", "column_4"];
const count = 4;
const data: Array<Array<ITableElement<number>>> = new Array(count).map(
  (rowIndex): Array<ITableElement<number>> =>
    columns.map(
      (name): ITableElement<number> => ({
        name,
        toString: val => val.toFixed(2),
        value: Math.random() * 100
      })
    )
);

it("renders without crashing", () => {
  const component = enzyme.render(<Table data={data} columns={columns} />);
  expect(component);
});
