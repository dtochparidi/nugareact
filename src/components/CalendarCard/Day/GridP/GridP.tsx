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
    const container = new PIXI.Container();

    const cellWidth = width / cols;
    const height = cellHeight * rows;
    const yStep = cellHeight;

    const maxLineSegmentLength = 2000;
    const segmentsHorizontal = Math.ceil(width / maxLineSegmentLength);
    const segmentsVertical = Math.ceil(height / maxLineSegmentLength);
    const lineSegmentWidth = Math.min(width, width / segmentsHorizontal);
    const lineSegmentHeight = Math.min(height, height / segmentsVertical);

    const lineVerticalTexture = generateLineTexture(0, lineSegmentHeight);
    const lineHorizontalTexture = generateLineTexture(lineSegmentWidth, 0);

    // main grid
    const sprites: PIXI.Sprite[] = [];
    for (let x = 0; x < cols; x++)
      for (let s = 0; s < segmentsVertical; s++) {
        const sprite = new PIXI.Sprite(lineVerticalTexture);
        sprite.x = cellWidth * x;
        sprite.y = s * lineSegmentHeight;

        sprites.push(sprite);
      }

    for (let y = 0; y < rows; y++)
      for (let s = 0; s < segmentsHorizontal; s++) {
        const sprite = new PIXI.Sprite(lineHorizontalTexture);
        sprite.x = s * lineSegmentWidth;
        sprite.y = yStep * y;

        sprites.push(sprite);
      }

    // mark
    // const mark = new PIXI.Graphics();
    // mark.beginFill(0xf4e842);
    // mark.moveTo(0, 0);
    // mark.lineTo(200, 0);
    // mark.lineTo(200, 200);
    // mark.lineTo(0, 200);
    // mark.lineTo(0, 0);
    // mark.endFill();
    // container.addChild(mark);

    container.addChild(...sprites);

    return container;
  },
);

export default class GridP extends React.Component<IProps, IState> {
  private wrapperRef = React.createRef<HTMLDivElement>();
  private renderer: PIXI.WebGLRenderer | PIXI.CanvasRenderer;
  private initialized = false;
  private scaleX = 1;
  private scaleY = 1;

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

      this.updateSize();
      this.renderPIXI();

      this.initialized = true;
    };

    if (this.props.instantRender) func();
    else lazyTaskManager.addTask(new LazyTask(func, 5));

    ((window as any).pixiRenderers = (window as any).pixiRenderers || []).push(
      this.renderer,
    );

    ((window as any).grids = (window as any).grids || []).push(this);
  }

  public componentDidUpdate(prevProps: IProps) {
    if (
      (prevProps.width !== this.props.width ||
        prevProps.cellHeight !== this.props.cellHeight) &&
      this.initialized
    ) {
      this.updateSize();

      this.renderPIXI();
    }
  }

  public updateSize() {
    const { width } = this.props;
    const height = this.props.cellHeight * this.props.rows;

    const maxSideSize = 4096;
    const scale = Math.max(Math.max(width, height) / maxSideSize, 1);

    const scaledWidth = width * scale;
    const scaledHeight = height * scale;

    this.scaleX = width <= maxSideSize ? scale : 1;
    this.scaleY = height <= maxSideSize ? scale : 1;

    const resolution = 1 / scale;
    this.setResolution(resolution);

    this.renderer.resize(scaledWidth, scaledHeight);
  }

  public setResolution(resolution: number) {
    this.renderer.resolution = resolution;
    (this.renderer as any).rootRenderTarget.resolution = resolution;
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

    ((window as any).pixiContainers =
      (window as any).pixiContainers || []).push(container);

    container.scale.set(this.scaleX, this.scaleY);
    this.renderer.render(container);
  }

  public render() {
    return <div ref={this.wrapperRef} style={this.props.style} />;
  }
}
