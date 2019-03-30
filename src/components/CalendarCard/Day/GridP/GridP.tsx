import { LazyTask } from '@levabala/lazytask/build/dist';
import lazyTaskManager from '@levabala/lazytask/build/dist/LazyTaskManager';
import moize from 'moize';
import * as PIXI from 'pixi.js';
import * as React from 'react';

export interface IProps {
  children?: React.ReactNode;
  width: number;
  cellHeight: number;
  cols: number;
  rows: number;
  subGridColumns: number;
  instantRender: boolean;
}

export interface IState {
  a: any;
}

// collectStats();
// setInterval(() => console.log(moize.getStats('generateGraphics')), 1500);

export default class GridP extends React.Component<IProps, IState> {
  private static generateGraphics = moize(
    (width, cellHeight, cols, rows, subGridColumns) => {
      const container = new PIXI.Container();

      const xStep = width / cols;
      const xSecondStep = xStep / subGridColumns;
      const yStep = cellHeight;

      // main grid
      const mainGrid = new PIXI.Graphics();
      mainGrid.lineStyle(2, 0xd3d3d3, 1);
      for (let x = 0; x <= cols; x++) {
        const xCoord = x * xStep;
        mainGrid.moveTo(xCoord, 0);
        mainGrid.lineTo(xCoord, cellHeight * rows);
      }

      for (let y = 0; y <= rows; y++) {
        const yCoord = y * yStep;
        mainGrid.moveTo(0, yCoord);
        mainGrid.lineTo(width, yCoord);
      }
      // second grid
      const secondaryGrid = new PIXI.Graphics();
      secondaryGrid.lineStyle(1, 0xd3d3d3, 1);
      for (let x = 0; x <= cols * subGridColumns; x++) {
        const xCoord = x * xSecondStep;
        secondaryGrid.moveTo(xCoord, 0);
        secondaryGrid.lineTo(xCoord, cellHeight * rows);
      }

      container.addChild(mainGrid);
      container.addChild(secondaryGrid);

      return container;
    },
    { profileName: 'generateGraphics' },
  );

  private wrapperRef = React.createRef<HTMLDivElement>();
  private renderer: PIXI.WebGLRenderer | PIXI.CanvasRenderer;
  private initialized = false;

  constructor(props: IProps) {
    super(props);

    this.state = {
      a: null,
    };
  }

  public componentDidMount() {
    const wrapper = this.wrapperRef.current as HTMLDivElement;

    const func = () => {
      this.renderer = new PIXI.WebGLRenderer(
        this.props.width,
        this.props.cellHeight * this.props.rows,
      );
      this.renderer.backgroundColor = 0xffffff;

      wrapper.appendChild(this.renderer.view);

      this.renderPIXI();

      this.initialized = true;
    };

    if (this.props.instantRender) func();
    else lazyTaskManager.addTask(new LazyTask(func, 5));
  }

  public componentDidUpdate(prevProps: IProps) {
    if (
      (prevProps.width !== this.props.width ||
        prevProps.cellHeight !== this.props.cellHeight) &&
      this.initialized
    ) {
      this.renderer.resize(
        this.props.width,
        this.props.cellHeight * this.props.rows,
      );

      this.renderPIXI();
    }
  }

  public renderPIXI() {
    const { width, cellHeight, cols, rows, subGridColumns } = this.props;
    const container = GridP.generateGraphics(
      width,
      cellHeight,
      cols,
      rows,
      subGridColumns,
    );
    this.renderer.render(container);
  }

  public render() {
    return <div ref={this.wrapperRef} />;
  }
}
