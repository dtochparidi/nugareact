import IUpdateAppProps from './IUpdateAppProps';

type IUpdateAppFunction = (
  props: IUpdateAppProps,
  weightful?: boolean,
  final?: boolean,
  serverSide?: boolean,
) => void;

export default IUpdateAppFunction;
