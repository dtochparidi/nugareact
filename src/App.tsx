import * as Cookies from 'js-cookie';
import { observer } from 'mobx-react';
import DevTools, { configureDevtool } from 'mobx-react-devtools';
import * as React from 'react';
import versions from './versions';

import CalendarCard from './components/CalendarCard';
import { clientSide } from './dev/clientSide';
import rootStore from './stores/RootStore';

import './App.css';

// getting stores
const { personStore, calendarDayStore } = rootStore.domainStore;
const { uiStore } = rootStore;

// do not do it while testing in jest
if (clientSide) {
  // checking for updates
  const versionName = Cookies.get('version');
  const lastVersion = versions[versions.length - 1];
  if (lastVersion[0] !== versionName) {
    alert(`${lastVersion[0]}\n\n${lastVersion[1]}`);
    Cookies.set('version', lastVersion[0]);
  }

  // configuring mobX dev console
  configureDevtool({
    logEnabled: false,
    logFilter: change =>
      change.type !== 'add' &&
      change.type !== 'update' &&
      change.type !== 'scheduled-reaction',
    // logFilter: change => {
    //   console.log(change.type);
    //   return false;
    // },
    updatesEnabled: true,
  });
}

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
              // <ControlWindow key="controlWindow" appStore={appStore} />,
            ]
          : null}
        <CalendarCard
          days={calendarDayStore.days}
          requestCallback={calendarDayStore.loadDay}
          positionCount={uiStore.positionCount}
          dayTimeRange={uiStore.dayTimeRange}
          updateAppointment={calendarDayStore.updateAppointment}
        />
      </div>
    );
  }
}

export default App;
