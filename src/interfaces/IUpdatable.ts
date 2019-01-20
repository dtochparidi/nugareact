export interface IUpdatable<T> {
  target: T;
  update: (key: string, value: any) => void;
}
