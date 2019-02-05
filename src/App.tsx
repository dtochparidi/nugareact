import { observer } from 'mobx-react';
import DevTools, { configureDevtool } from 'mobx-react-devtools';
import * as React from 'react';

import CalendarCard from './components/CalendarCard';
import { clientSide } from './dev/clientSide';
import rootStore from './stores/RootStore';

import './App.css';

const { personStore, calendarDayStore } = rootStore.domainStore;
const { uiStore } = rootStore;

if (clientSide)
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
