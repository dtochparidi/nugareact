import './ControlWindow.scss';

import * as interact from 'interactjs';
import { observer } from 'mobx-react';
import * as React from 'react';

// import { AppStore } from 'store/AppStore';

function moveHandler(e: interact.InteractEvent) {
  const { target }: { target: HTMLElement } = e;
  const lx = parseFloat(target.dataset.x as string);
  const ly = parseFloat(target.dataset.y as string);
  const x = lx + e.dx;
  const y = ly + e.dy;

  target.style.right = '';
  target.style.bottom = '';
  target.style.top = `${y}px`;
  target.style.left = `${x}px`;

  target.dataset.x = x.toString();
  target.dataset.y = y.toString();
}

function startHandler(e: interact.InteractEvent) {
  const { target }: { target: HTMLElement } = e;
  const rect = target.getBoundingClientRect();
  target.dataset.x = rect.left.toString();
  target.dataset.y = rect.top.toString();
}

const dragConfig = {
  onmove: moveHandler,
  onstart: startHandler,
};
if (
  typeof window !== 'undefined' &&
  window.document &&
  window.document.createElement
)
  interact('.controlWindow').draggable(dragConfig);

export interface IProps {
  // appStore: AppStore;
  children?: React.ReactNode;
}

@observer
export default class ControlWindow extends React.Component<IProps> {
  public render() {
    // const update = (e: React.ChangeEvent<HTMLInputElement>) => {
    //   this.props.appStore.updatePositionCount(parseInt(e.target.value, 10));
    // };
    // const value = this.props.appStore.positionCount;

    // return (
    //   <div className="controlWindow">
    //     <div>{this.props.children}</div>
    //     <label>Positions Count: </label>
    //     <input value={value || ''} onChange={update} />
    //   </div>
    // );
    return <div />;
  }
}
