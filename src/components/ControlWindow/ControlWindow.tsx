import { observer } from 'mobx-react';
import * as React from 'react';
import { AppStore } from 'src/store/AppStore';

import WindowPortal from '../WindowPortal';

export interface IProps {
  appStore: AppStore;
}

@observer
export default class ControlWindow extends React.Component<IProps> {
  public render() {
    const update = (e: React.ChangeEvent<HTMLInputElement>) => {
      this.props.appStore.updatePositionCount(parseInt(e.target.value, 10));
    };

    return (
      <WindowPortal width={300} height={400} top={0} left={0}>
        <div className="controlWindow">
          <label>Positions Count: </label>
          <input value={this.props.appStore.positionCount} onChange={update} />
        </div>
      </WindowPortal>
    );
  }
}
