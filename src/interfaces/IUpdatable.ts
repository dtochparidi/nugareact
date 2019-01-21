export interface IUpdatable<T> {
  target: T;
  update: (arr: Array<[string, any]>) => void;
}
