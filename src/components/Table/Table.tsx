import * as React from "react";
import ITableElement from "../../interfaces/ITableElement";
import "./Table.scss";

export interface IProps {
  children?: React.ReactNode;
  data: Array<Array<ITableElement<any>>>;
  columns: string[];
}

export default class Table extends React.Component<IProps, object> {
  public render() {
    const capitalizeFirst = (str: string) =>
      str.charAt(0).toUpperCase() + str.slice(1);

    return (
      <div
        className="table"
        style={
          {
            "--columns-count": this.props.columns.length
          } as React.CSSProperties
        }
      >
        {this.props.columns.map(capitalizeFirst).map((column, index) => (
          <div
            key={column}
            className={`columnName ${
              index === this.props.columns.length - 1 ? "last" : ""
            }`}
          >
            {column}
          </div>
        ))}
        {this.props.data.map(row =>
          row
            .sort(
              (a, b) =>
                this.props.columns.indexOf(a.name) -
                this.props.columns.indexOf(b.name)
            )
            .map(val => (
              <div key={val.name} className="value">
                {val.toString(val.value)}
              </div>
            ))
        )}
      </div>
    );
  }
}
