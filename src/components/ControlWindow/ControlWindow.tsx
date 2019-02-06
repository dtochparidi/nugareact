import './ControlWindow.scss';

import * as interact from 'interactjs';
import { observer } from 'mobx-react';
import * as React from 'react';
import { RootStore } from 'stores/RootStore';

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
  rootStore: RootStore;
  children?: React.ReactNode;
}

@observer
export default class ControlWindow extends React.Component<IProps> {
  public render() {
    const { uiStore } = this.props.rootStore;

    const updatePositionCount = (e: React.ChangeEvent<HTMLInputElement>) => {
      uiStore.updatePositionCount(parseInt(e.target.value, 10));
    };

    const updateSubGridColumnCount = (
      e: React.ChangeEvent<HTMLInputElement>,
    ) => {
      uiStore.updateSubGridColumnCount(parseInt(e.target.value, 10));
    };

    const stopPropogation = (e: React.KeyboardEvent<HTMLDivElement>) => {
      e.stopPropagation();
    };

    return (
      <div className="controlWindow" onKeyDown={stopPropogation}>
        <div>{this.props.children}</div>
        <label>Positions Count: </label>
        <input
          value={uiStore.positionCount || 0}
          onChange={updatePositionCount}
        />
        <label>Sub Grid Columns Count: </label>
        <input
          value={uiStore.subGridColumns || 0}
          onChange={updateSubGridColumnCount}
        />
      </div>
    );
    return <div />;
  }
}
