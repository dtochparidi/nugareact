import IUpdateAppProps from 'interfaces/IUpdateAppProps';
import { action, observable, reaction, toJS } from 'mobx';
import { observer } from 'mobx-react';
import * as moment from 'moment';
import * as React from 'react';

import Appointment from '../../../../structures/Appointment';
import GridCell from './GridCell';

export interface IProps {
  cols: number;
  rows: number;
  appointments: { [uniqueId: string]: Appointment };
  stamps: moment.Moment[];
  mainColumnStep: moment.Duration;
  shiftsHash: string;
  movingId: string;
  shifts: {
    [x: number]: {
      [y: number]: {
        dx: number;
        dy: number;
      };
    };
  };
  subGridColumns: number;
  updateAppointment: (props: IUpdateAppProps) => void;
  instantRender: boolean;
}

@observer
export default class Grid extends React.Component<IProps> {
  @observable
  public appointments: Array<Array<{ [uniqueId: string]: Appointment }>>;
  @observable
  public shifts: Array<Array<{ dx: number; dy: number }>>;
  @observable
  public movingId: { id: string } = { id: '' };
  public globalMovingId: string = '';

  public gridCells: React.ReactNode[] = [];
  private iteratorTimeout: NodeJS.Timeout;

  constructor(props: IProps) {
    super(props);

    this.shifts = new Array(this.props.cols)
      .fill(null)
      .map(w =>
        new Array(this.props.rows).fill(null).map(u => ({ dx: 0, dy: 0 })),
      );
    this.updateApps();
    this.updateShifts();
    this.globalMovingId = this.props.movingId;
    setTimeout(() => {
      this.gridCells = this.generateGrid();
    }, 100);

    // movingId change reaction
    reaction(
      () => this.props.movingId,
      id => {
        this.globalMovingId = this.props.movingId;

        if (
          Object.values(this.props.appointments).some(
            app => app.identifier === this.props.movingId,
          )
        )
          this.updateMovingId();
      },
    );

    // appointments change reaction
    reaction(
      // OPTIMIZE
      () =>
        Object.values(this.props.appointments)
          .map(app => app.stateHash)
          .join(),
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

  @action
  public updateMovingId() {
    this.movingId.id = this.props.movingId;
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
            // movingIdObj={this.movingId}
            movingId={this.props.movingId}
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
  public iterationTick(
    positionedApps: Array<Array<{ [uniqueId: string]: Appointment }>>,
    x: number,
    y: number,
  ): boolean {
    const recordedApps = this.appointments[x][y];
    const inputApps = positionedApps[x][y];

    const recordEmpty = Object.keys(recordedApps).length === 0;
    const inputEmpty = Object.keys(inputApps).length === 0;

    if (recordEmpty && inputEmpty) return false;

    if (!recordEmpty && inputEmpty) {
      for (const i in this.appointments[x][y])
        delete this.appointments[x][y][i];

      // console.log('remove all', this.hash);
      return false;
    }

    if (recordEmpty && !inputEmpty) {
      Object.assign(this.appointments[x][y], inputApps);

      // console.log('assign all', this.hash);
      return true;
    }

    const updatedIds: string[] = [];
    Object.entries(inputApps).forEach(([inputId, inputApp]) => {
      const recordedApp = recordedApps[inputId];

      // remember that we've updated it
      updatedIds.push(inputId);

      // if inputApp is new
      if (!recordedApp) {
        recordedApps[inputId] = inputApp;

        // console.log('add new');
        return true;
      }

      // if changed
      if (recordedApp.stateHash !== inputApp.stateHash) {
        Object.assign(recordedApps[inputId], inputApp);
        console.log('update');
      }

      return true;
    });

    Object.entries(recordedApps).forEach(([recordedId, recordedApp]) => {
      if (updatedIds.includes(recordedId)) return;

      delete recordedApps[recordedId];

      // console.log('remove');
    });

    return false;
  }

  @action
  public updateApps() {
    const {
      appointments,
      stamps,
      mainColumnStep,
      cols,
      rows,
      instantRender,
    } = this.props;

    clearTimeout(this.iteratorTimeout);

    this.appointments =
      this.appointments ||
      new Array(cols)
        .fill(null)
        .map(w => new Array(rows).fill(null).map(u => ({})));

    const minutesStep = mainColumnStep.asMinutes();
    const positionedApps: Array<
      Array<{ [uniqueId: string]: Appointment }>
    > = Object.values(appointments)
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

    const dropped = Object.keys(appointments).some(
      uniqueId =>
        Appointment.fromIdentifier(this.globalMovingId).uniqueId === uniqueId,
    );

    const delay = 10;
    let xc = 0;
    let yc = 0;
    const iterator = () => {
      const changed = this.iterationTick(positionedApps, xc, yc);

      if (yc < rows - 1) yc++;
      else {
        yc = 0;
        if (xc < cols - 1) xc++;
        else return;
      }

      if (changed && !dropped && !instantRender)
        this.iteratorTimeout = setTimeout(iterator.bind(this), delay);
      else iterator();
    };

    iterator();
  }

  // public componentDidUpdate() {
  //   this.updateApps();
  //   console.log('update');
  // }

  public render() {
    return <div className="grid">{this.gridCells}</div>;
  }
}
