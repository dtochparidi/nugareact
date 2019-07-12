/* tslint:disable:interface-name array-type only-arrow-functions*/

interface Array<T> {
  append(el: T): T;
  joinObj(separator: (gapIndex: number) => any): T;
  last(): T;
}

Array.prototype.last = function() {
  return this[this.length - 1];
};

Array.prototype.append = function(el) {
  this.push(el);

  return el;
};

Array.prototype.joinObj = function<T>(separator: (gapIndex: number) => any) {
  let counter = 0;
  const elements: T[] = this.map((v: T, i) =>
    i === this.length - 1 ? v : [v, separator(counter++)],
  ).flat();

  return ([] as T[]).concat(...elements);
};
