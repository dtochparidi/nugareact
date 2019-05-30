// import ControlWindow from 'components/ControlWindow';
import { LazyTaskManager } from '@levabala/lazytask/build/dist';
import VersionChangelog from 'components/VersionChangelog';
import VersionLabel from 'components/VersionLabel';
import * as Cookies from 'js-cookie';
import LazyWidget from 'lazytask-widget/lib';
import { observer } from 'mobx-react';
import DevTools, { configureDevtool } from 'mobx-react-devtools';
import * as React from 'react';

import CalendarCard from './components/CalendarCard';
import currentVersion from './CurrentVersion.json';
import { clientSide } from './dev/clientSide';
import rootStore from './stores/RootStore';
import versions from './versions';

import './App.css';
import 'scenarios/scenariosPackage';
// import modifyPersonsScenario from 'scenarios/modifyPersonsScenario';
// import lazyTaskManager from '@levabala/lazytask/build/dist/LazyTaskManager';

// function random(to: number, from: number = 0) {
//   return Math.floor(Math.random() * (to - from)) + from;
// }

function noop() {
  //
}

// disable console&performance using
if (process.env.NODE_ENV !== 'development') {
  performance.mark = noop;
  performance.measure = noop;

  console.log = noop;
  console.warn = noop;
  // console.error = noop;
}

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
LazyTaskManager.launch(20);

// main entry class
@observer
class App extends React.Component {
  constructor(props: React.Props<any>) {
    super(props);

    personStore.setCurrentUser('000');
  }

  public componentDidMount() {
    // function a() {
    //   modifyPersonsScenario(0.1);
    // }
    // (function b() {
    //   setTimeout(async () => {
    //     await lazyTaskManager.addFunc(a);
    //     b();
    //   }, random(100, 500));
    // })();
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
          // days={calendarDayStore.days}
          requestCallback={calendarDayStore.loadDays}
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
          <LazyWidget updateInterval={400} />
        </div>
        <VersionLabel
          major={currentVersion.major}
          minor={currentVersion.minor}
          patch={currentVersion.patch}
        />
      </div>
    );
  }
}

export default App;
