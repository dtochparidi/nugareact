type IFetcher<Id, T> = (id: Id) => Promise<T>;
export default IFetcher;
