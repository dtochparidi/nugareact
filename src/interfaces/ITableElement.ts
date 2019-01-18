export default interface ITableElement<T> {
  name: string;
  value: T;
  toString: (val: T) => string;
}
