import { LazyTask } from '@levabala/lazytask/build/dist';
import lazyTaskManager from '@levabala/lazytask/build/dist/LazyTaskManager';
import * as PIXI from 'pixi.js';
import * as React from 'react';

// import * as StyleVariables from '../../../../common/variables.scss';
import moize from 'moize';

// import moize from 'moize';
// const thinWidth = parseFloat(StyleVariables.thinWidth);

export interface IProps {
  children?: React.ReactNode;
  width: number;
  cellHeight: number;
  cols: number;
  rows: number;
  subGridColumns: number;
  instantRender: boolean;
  style?: React.CSSProperties;
}

export interface IState {
  a: any;
}

// collectStats();
// setInterval(() => console.log(moize.getStats('textureGrid')), 1500);

function dottedLine(
  graphics: PIXI.Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dotStep: number,
  dotRadius: number,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lineLength = Math.sqrt(dx * dx + dy * dy);
  const steps = lineLength / dotStep;
  const stepX = dx / steps;
  const stepY = dy / steps;

  for (let i = 0; i < steps; i++) {
    const x = x1 + i * stepX;
    const y = y1 + i * stepY;

    graphics.drawCircle(x, y, dotRadius);
  }
}

const generateLineTexture = moize((width: number, height: number) => {
  const dotStep = 5;
  const dotRadius = 0.5;

  const graphics = new PIXI.Graphics();
  graphics.lineStyle(1, 0xd3d3d3, 1);
  dottedLine(graphics, 0, 0, width, height, dotStep, dotRadius);

  return graphics.generateCanvasTexture();
});

// const generateCellTexture = moize(
//   (
//     width: number,
//     height: number,
//     {
//       top,
//       right,
//       bottom,
//       left,
//     }: {
//       top?: boolean;
//       right?: boolean;
//       bottom?: boolean;
//       left?: boolean;
//     } = {},
//   ) => {
//     const dotStep = 3;
//     const dotRadius = 1;

//     const graphics = new PIXI.Graphics();
//     graphics.lineStyle(1, 0xd3d3d3, 1);
//     if (!top) dottedLine(graphics, 0, 0, width, 0, dotStep, dotRadius);
//     if (!right)
//       dottedLine(graphics, width, 0, width, height, dotStep, dotRadius);
//     if (!bottom)
//       dottedLine(graphics, width, height, 0, height, dotStep, dotRadius);
//     if (!left) dottedLine(graphics, 0, height, 0, 0, dotStep, dotRadius);

//     return graphics.generateCanvasTexture();
//   },
// );

const generateGraphicsTextured = moize(
  (
    width: number,
    cellHeight: number,
    cols: number,
    rows: number,
    subGridColumns: number,
  ) => {
    console.log(width, cellHeight, cols, rows, subGridColumns);

    const container = new PIXI.Container();

    const cellWidth = width / cols;

    const lineVerticalTexture = generateLineTexture(0, cellHeight * rows);
    const lineHorizontalTexture = generateLineTexture(width, 0);

    // main grid
    const mainGrid = new PIXI.Graphics();
    const sprites: PIXI.Sprite[] = [];

    for (let x = 0; x < cols; x++) {
      const sprite = new PIXI.Sprite(lineVerticalTexture);
      sprite.x = cellWidth * x;
      sprite.y = 0;

      sprites.push(sprite);
    }

    for (let y = 0; y < rows; y++) {
      const sprite = new PIXI.Sprite(lineHorizontalTexture);
      sprite.x = 0;
      sprite.y = cellHeight * y;

      sprites.push(sprite);
    }

    mainGrid.addChild(...sprites);

    container.addChild(mainGrid);
    // container.addChild(sprite1, sprite2, sprite3);

    return container;
  },
  // { profileName: 'textureGrid' },
);

// const generateGraphicsDotted = moize(
//   (
//     width: number,
//     cellHeight: number,
//     cols: number,
//     rows: number,
//     subGridColumns: number,
//   ) => {
//     console.log(width, cellHeight, cols, rows, subGridColumns);

//     const dotStep = 10;
//     const dotRadius = 1;

//     const container = new PIXI.Container();

//     const xStep = width / cols;
//     const xSecondStep = xStep / subGridColumns;
//     const yStep = cellHeight;

//     // main grid
//     const mainGrid = new PIXI.Graphics();
//     mainGrid.lineStyle(1, 0xd3d3d3, 1);
//     for (let x = 0; x <= cols; x++) {
//       const xCoord = x * xStep + thinWidth;
//       dottedLine(
//         mainGrid,
//         xCoord,
//         0,
//         xCoord,
//         cellHeight * rows,
//         dotStep,
//         dotRadius,
//       );
//     }

//     for (let y = 1; y <= rows; y++) {
//       const yCoord = y * yStep;
//       dottedLine(mainGrid, 0, yCoord, width, yCoord, dotStep, dotRadius);
//     }

//     // second grid
//     const secondaryGrid = new PIXI.Graphics();
//     secondaryGrid.lineStyle(1, 0xd3d3d3, 1);
//     for (let x = 0; x <= cols * subGridColumns; x++) {
//       const xCoord = x * xSecondStep + thinWidth;
//       secondaryGrid.moveTo(xCoord, 0);
//       secondaryGrid.lineTo(xCoord, cellHeight * rows);
//       dottedLine(
//         mainGrid,
//         xCoord,
//         0,
//         xCoord,
//         cellHeight * rows,
//         dotStep,
//         dotRadius,
//       );
//     }

//     // mark
//     // const mark = new PIXI.Graphics();
//     // mark.beginFill(0xf4e842);
//     // mark.moveTo(0, 0);
//     // mark.lineTo(100, 0);
//     // mark.lineTo(100, 100);
//     // mark.lineTo(0, 100);
//     // mark.lineTo(0, 0);
//     // mark.endFill();
//     // container.addChild(mark);

//     container.addChild(mainGrid);
//     container.addChild(secondaryGrid);

//     return container;
//   },
//   { profileName: 'dottedGrid' },
// );

export default class GridP extends React.Component<IProps, IState> {
  // private static generateGraphics =
  //   (
  //     width: number,
  //     cellHeight: number,
  //     cols: number,
  //     rows: number,
  //     subGridColumns: number,
  //   ) => {
  //     const container = new PIXI.Container();

  //     const xStep = width / cols;
  //     const xSecondStep = xStep / subGridColumns;
  //     const yStep = cellHeight;

  //     // main grid
  //     const mainGrid = new PIXI.Graphics();
  //     mainGrid.lineStyle(1, 0xd3d3d3, 1);
  //     for (let x = 0; x <= cols; x++) {
  //       const xCoord = x * xStep + thinWidth;
  //       mainGrid.moveTo(xCoord, 0);
  //       mainGrid.lineTo(xCoord, cellHeight * rows);
  //     }

  //     for (let y = 1; y <= rows; y++) {
  //       const yCoord = y * yStep;
  //       mainGrid.moveTo(0, yCoord);
  //       mainGrid.lineTo(width, yCoord);
  //     }

  //     // second grid
  //     const secondaryGrid = new PIXI.Graphics();
  //     secondaryGrid.lineStyle(1, 0xd3d3d3, 1);
  //     for (let x = 0; x <= cols * subGridColumns; x++) {
  //       const xCoord = x * xSecondStep + thinWidth;
  //       secondaryGrid.moveTo(xCoord, 0);
  //       secondaryGrid.lineTo(xCoord, cellHeight * rows);
  //     }

  //     // mark
  //     // const mark = new PIXI.Graphics();
  //     // mark.beginFill(0xf4e842);
  //     // mark.moveTo(0, 0);
  //     // mark.lineTo(100, 0);
  //     // mark.lineTo(100, 100);
  //     // mark.lineTo(0, 100);
  //     // mark.lineTo(0, 0);
  //     // mark.endFill();
  //     // container.addChild(mark);

  //     container.addChild(mainGrid);
  //     container.addChild(secondaryGrid);

  //     return container;
  //   };

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

  public componentWillUnmount() {
    this.renderer.destroy(true);
  }

  public renderPIXI() {
    const { width, cellHeight, cols, rows, subGridColumns } = this.props;
    const container = generateGraphicsTextured(
      width,
      cellHeight,
      cols,
      rows,
      subGridColumns,
    );
    this.renderer.render(container);
  }

  public render() {
    return <div ref={this.wrapperRef} style={this.props.style} />;
  }
}
