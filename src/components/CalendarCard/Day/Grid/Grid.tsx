import { action, observable, reaction, toJS } from 'mobx';
import { observer } from 'mobx-react';
import * as moment from 'moment';
import { Duration as IDuration, Moment as IMoment } from 'moment';
import * as React from 'react';
import Appointment from '../../../../structures/Appointment';
import GridCell from './GridCell';

export interface IProps {
  cols: number;
  rows: number;
  appointments: Appointment[];
  stamps: moment.Moment[];
  mainColumnStep: moment.Duration;
  shiftsHash: string;
  shifts: {
    [x: number]: {
      [y: number]: {
        dx: number;
        dy: number;
      };
    };
  };
  subGridColumns: number;
  updateAppointment: ({
    date,
    position,
    personId,
    targetDate,
    targetPosition,
    appointment,
  }: {
    date?: IMoment;
    position?: number;
    personId?: string;
    targetDate?: IMoment;
    appointment?: Appointment;
    targetPosition: number;
    targetDuration?: IDuration;
  }) => void;
}

@observer
export default class Grid extends React.Component<IProps> {
  @observable
  public appointments: Array<Array<{ [uniqueId: string]: Appointment }>>;
  @observable
  public shifts: Array<Array<{ dx: number; dy: number }>>;

  public gridCells: React.ReactNode[] = [];

  constructor(props: IProps) {
    super(props);

    this.updateApps();
    this.updateShifts();
    this.gridCells = this.generateGrid();

    // appointments change reaction
    reaction(
      // OPTIMIZE
      () => this.props.appointments.map(app => app.stateHash).join(),
      apps => {
        this.updateApps();
      },
    );

    // shifts change reaction
    reaction(
      () => this.props.shiftsHash,
      hash => {
        this.updateShifts();
      },
    );
  }

  public generateGrid() {
    const {
      rows,
      cols,
      stamps,
      subGridColumns,
      updateAppointment,
    } = this.props;

    const gridColumnDuration = moment.duration(
      stamps[1].diff(stamps[0]).valueOf(),
      'millisecond',
    );

    const gridCells: React.ReactNode[] = [];
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const apps = this.appointments[x][y];
        if (Object.keys(apps).length > 0) console.log(toJS(apps));

        gridCells.push(
          <GridCell
            key={`${x}:${y}`}
            x={x}
            y={y}
            cols={cols}
            stamp={stamps[x]}
            subGridStep={subGridColumns}
            gridColumnDuration={gridColumnDuration}
            shift={this.shifts[x][y]}
            apps={apps}
            updateAppointment={updateAppointment}
          />,
        );
      }

    return gridCells;
  }

  @action
  public updateShifts() {
    const { cols, rows, shifts } = this.props;

    this.shifts =
      this.shifts ||
      new Array(cols)
        .fill(null)
        .map(w => new Array(rows).fill(null).map(u => ({ dx: 0, dy: 0 })));

    for (let x = 0; x < cols; x++)
      for (let y = 0; y < rows; y++) {
        const recordedShift = this.shifts[x][y];
        const inputShift = (x in shifts
          ? y in shifts[x]
            ? shifts[x][y]
            : null
          : null) || { dx: 0, dy: 0 };

        if (
          recordedShift.dx !== inputShift.dx ||
          recordedShift.dy !== inputShift.dy
        )
          Object.assign(recordedShift, inputShift);
      }
  }

  @action
  public updateApps() {
    const { appointments, stamps, mainColumnStep, cols, rows } = this.props;

    this.appointments =
      this.appointments ||
      new Array(cols)
        .fill(null)
        .map(w => new Array(rows).fill(null).map(u => ({})));

    const minutesStep = mainColumnStep.asMinutes();
    const positionedApps: Array<
      Array<{ [uniqueId: string]: Appointment }>
    > = appointments
      .map(app => ({
        appointment: app,
        x: Math.floor(
          (app.date.hour() * 60 +
            app.date.minute() -
            (stamps[0].hour() * 60 + stamps[0].minute())) /
            minutesStep,
        ),
        y: app.position,
      }))
      .reduce((acc, val) => {
        acc[val.x][val.y][val.appointment.uniqueId] = val.appointment;
        return acc;
      }, new Array(cols).fill(null).map(w => new Array(rows).fill(null).map(u => ({}))));

    for (let x = 0; x < cols; x++)
      for (let y = 0; y < rows; y++) {
        const recordedApps = this.appointments[x][y];
        const inputApps = positionedApps[x][y];

        const recordEmpty = Object.keys(recordedApps).length === 0;
        const inputEmpty = Object.keys(inputApps).length === 0;

        if (recordEmpty && inputEmpty) continue;

        if (!recordEmpty && inputEmpty) {
          for (const i in this.appointments[x][y])
            delete this.appointments[x][y][i];

          // console.log('remove all');

          continue;
        }

        if (recordEmpty && !inputEmpty) {
          Object.assign(this.appointments[x][y], inputApps);

          // console.log('fill empty');

          continue;
        }

        const updatedIds: string[] = [];
        Object.entries(inputApps).forEach(([inputId, inputApp]) => {
          const recordedApp = recordedApps[inputId];

          // remember that we've updated it
          updatedIds.push(inputId);

          // if inputApp is new
          if (!recordedApp) {
            recordedApps[inputId] = inputApp;

            // console.log('new');
            return;
          }

          // if changed
          if (recordedApp.stateHash !== inputApp.stateHash) {
            Object.assign(recordedApps[inputId], inputApp);
            console.log('update');
          }
        });

        Object.entries(recordedApps).forEach(([recordedId, recordedApp]) => {
          if (updatedIds.includes(recordedId)) return;

          delete recordedApps[recordedId];

          // console.log('remove');
        });
      }
  }

  // public componentDidUpdate() {
  //   this.updateApps();
  //   console.log('update');
  // }

  public render() {
    return <div className="grid">{this.gridCells}</div>;
  }
}

/*
for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const app = personCells[y * cols + x];
        const stamp = stamps[x];
        let coeffX = 0;
        let coeffY = 0;

        if (app) {
          // OPTIMIZE
          // pass shifts to an AppointmentCell to prevent from re-rendering whole Grid

          const shiftExists = x in shifts && y in shifts[x];
          const shift = !shiftExists ? { dx: 0, dy: 0 } : shifts[x][y];
          const { dx, dy } = shift;

          const d = app.appointment.date;
          const s = d
            .clone()
            .hour(stamp.hour())
            .minute(stamp.minute());

          coeffX =
            (d.diff(s, 'second') / this.props.mainColumnStep.asSeconds() + dx) *
            100;

          coeffY = dy * 100;
        }

        gridCells.push(
          <div
            key={`${x}:${y}`}
            className={`gridCell item ${
              x === 0 ? 'first' : x === cols - 1 ? 'last' : ''
            }`}
            data-x={x}
            data-y={y}
            data-hour={stamp.hour()}
            data-minute={stamp.minute()}
          >
            <div className="subGrid">
              {new Array(subGridStep).fill(null).map((v, i) => (
                <div className="subGridElem" key={i} />
              ))}
            </div>
            {app ? (
              coeffX !== 0 || coeffY !== 0 ? (
                <AppointmentCell
                  appointment={app.appointment}
                  translateX={coeffX}
                  translateY={coeffY}
                  updateAppointment={this.props.updateAppointment}
                  subGridColumns={subGridStep}
                  gridColumnDuration={gridColumnDuration}
                />
              ) : (
                <AppointmentCell
                  appointment={app.appointment}
                  updateAppointment={this.props.updateAppointment}
                  subGridColumns={subGridStep}
                  gridColumnDuration={gridColumnDuration}
                />
              )
            ) : null}
          </div>,
        );
      }
      */
