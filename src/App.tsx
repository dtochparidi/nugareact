import { observer } from 'mobx-react';
import DevTools, { configureDevtool } from 'mobx-react-devtools';
import * as moment from 'moment';
import * as React from 'react';

import CalendarCard from './components/CalendarCard';
import ControlWindow from './components/ControlWindow';
import { IPerson } from './interfaces/IPerson';
import appStore from './store/AppStore';

import './App.css';

const clientSide =
  typeof window !== 'undefined' &&
  window.document &&
  window.document.createElement;

if (clientSide)
  configureDevtool({
    logEnabled: true,
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

const mockUser: IPerson = {
  address: 'Москва',
  averageBill: '500 eur',
  birthdate: moment({ year: 1971, month: 10, day: 21 }),
  friends: ['Ален Евсеев', 'Дарья Акодимишена', 'Виктор Дёмин'],
  id: '#001',
  invitedBy: 'Ален Евсеев',
  name: 'Алексей',
  patronymic: '',
  phone: '+37128481181',
  rate: 20,
  surname: 'Долматов',
};

@observer
class App extends React.Component {
  constructor(props: React.Props<any>) {
    super(props);

    appStore.updateCurrentUser(appStore.currentUser || mockUser);

    if (appStore.calendarDays.length === 0) appStore.loadDay(moment());
  }

  public render() {
    return (
      <div>
        {clientSide
          ? [
              process.env.NODE_ENV === 'development' ? (
                <DevTools key="devTools" />
              ) : null,
              <ControlWindow key="controlWindow" appStore={appStore} />,
            ]
          : null}
        <CalendarCard
          days={appStore.calendarDays}
          daysPending={appStore.calendarDaysPending}
          requestCallback={appStore.loadDay}
          positionCount={appStore.positionCount}
          dayTimeRange={appStore.dayTimeRange}
        />
      </div>
    );
  }
}

export default App;
