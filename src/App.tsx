// import ControlWindow from 'components/ControlWindow';
import { LazyTaskManager } from '@levabala/lazytask/build/dist';
import VersionChangelog from 'components/VersionChangelog';
import * as Cookies from 'js-cookie';
import LazyWidget from 'lazytask-widget/lib';
import { observer } from 'mobx-react';
import DevTools, { configureDevtool } from 'mobx-react-devtools';
import * as React from 'react';

import CalendarCard from './components/CalendarCard';
import { clientSide } from './dev/clientSide';
import rootStore from './stores/RootStore';
import versions from './versions';

import './App.css';

// getting stores
const { personStore, calendarDayStore } = rootStore.domainStore;
const { uiStore } = rootStore;

let versionName: string | undefined;
let lastVersion: [string, string];
let needToShowChangelog: boolean = false;

// do not do it while testing in jest
if (clientSide) {
  (window as any).lockVisibility = false;
  (window as any).rootStore = rootStore;

  // checking for updates
  versionName = Cookies.get('version');
  lastVersion = versions[versions.length - 1];
  if (versionName && lastVersion[0] !== versionName) needToShowChangelog = true;
  Cookies.set('version', lastVersion[0]);

  // configuring mobX dev console
  configureDevtool({
    logEnabled: false,
    logFilter: change =>
      change.type !== 'add' &&
      change.type !== 'update' &&
      change.type !== 'scheduled-reaction',
    updatesEnabled: false,
  });
}

// launching singlton-class for controlling lazyTasks
LazyTaskManager.launch(30);

// main entry class
@observer
class App extends React.Component {
  constructor(props: React.Props<any>) {
    super(props);

    personStore.setCurrentUser('000');
  }

  public render() {
    return (
      <div>
        {clientSide
          ? [
              process.env.NODE_ENV === 'development' ? (
                <DevTools key="devTools" />
              ) : null,
              // <ControlWindow key="controlWindow" rootStore={rootStore} />,
              needToShowChangelog ? (
                <VersionChangelog
                  key="versionChangelog"
                  show={needToShowChangelog}
                  versions={versions}
                />
              ) : null,
            ]
          : null}
        <CalendarCard
          fastMode={uiStore.fastMode}
          subGridColumns={uiStore.subGridColumns || 0}
          days={calendarDayStore.days}
          requestCallback={calendarDayStore.loadDay}
          removeDays={calendarDayStore.removeDays}
          positionCount={uiStore.positionCount || 0}
          dayTimeRange={uiStore.dayTimeRange}
          dayTimeRangeActual={uiStore.dayTimeRangeActual}
          updateAppointment={calendarDayStore.updateAppointment}
          mainColumnStep={uiStore.mainColumnStep}
        />
        <div
          style={{
            border: 'solid black 1px',
            bottom: 0,
            position: 'fixed',
            right: 0,
            zIndex: 100000,
          }}
        >
          <LazyWidget updateInterval={100} />
        </div>
      </div>
    );
  }
}

export default App;
