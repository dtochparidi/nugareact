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
  style?: React.CSSProperties;
}

export interface IState {
  a: any;
}

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
  const dotStep = 3;
  const dotRadius = 0.5;

  const graphics = new PIXI.Graphics();
  graphics.lineStyle(1, 0xd3d3d3, 1);
  dottedLine(graphics, 0, 0, width, height, dotStep, dotRadius);

  return graphics.generateCanvasTexture();
});

const generateGraphicsTextured = moize(
  (
    width: number,
    cellHeight: number,
    cols: number,
    rows: number,
    subGridColumns: number,
  ) => {
    // console.log(width, cellHeight, cols, rows, subGridColumns);

    const container = new PIXI.Container();

    const cellWidth = width / cols;
    const height = cellHeight * rows;

    console.log('grid:', cellWidth, width);

    const maxLineSegmentLength = 2000;
    const segmentsHorizontal = Math.ceil(width / maxLineSegmentLength);
    const segmentsVertical = Math.ceil(height / maxLineSegmentLength);
    const lineSegmentWidth = Math.min(width, width / segmentsHorizontal);
    const lineSegmentHeight = Math.min(height, height / segmentsVertical);

    const lineVerticalTexture = generateLineTexture(0, lineSegmentHeight);
    const lineHorizontalTexture = generateLineTexture(lineSegmentWidth, 0);

    // main grid
    const mainGrid = new PIXI.Graphics();
    const sprites: PIXI.Sprite[] = [];

    console.log('grid cols:', cols);
    for (let x = 0; x < cols; x++)
      for (let s = 0; s < segmentsVertical; s++) {
        const sprite = new PIXI.Sprite(lineVerticalTexture);
        sprite.x = cellWidth * x;
        sprite.y = s * lineSegmentHeight;

        console.log(sprite.x, sprite.width);

        sprites.push(sprite);
      }

    for (let y = 0; y < rows; y++)
      for (let s = 0; s < segmentsHorizontal; s++) {
        const sprite = new PIXI.Sprite(lineHorizontalTexture);
        sprite.x = s * lineSegmentWidth;
        sprite.y = cellHeight * y;

        sprites.push(sprite);
      }

    mainGrid.addChild(...sprites);
    container.addChild(mainGrid);

    return container;
  },
);

export default class GridP extends React.Component<IProps, IState> {
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
