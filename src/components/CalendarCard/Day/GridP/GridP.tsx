import { LazyTask } from '@levabala/lazytask/build/dist';
import lazyTaskManager from '@levabala/lazytask/build/dist/LazyTaskManager';
import moize from 'moize';
import * as PIXI from 'pixi.js';
import * as React from 'react';
import rootStore from 'stores/RootStore';
import * as CardVariables from '../../CalendarCard.scss';

// collectStats();

// setInterval(
//   () => console.log((moize as any).getStats('graphicsGenerator')),
//   1500,
// );

const positionsColumnGapHeight = parseFloat(
  CardVariables.positionsColumnGapHeight,
);

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

const dotStep = 3;
const dotRadius = 0.5;

function dottedLine(
  graphics: PIXI.Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
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
  const graphics = new PIXI.Graphics();
  graphics.lineStyle(1, 0xd3d3d3, 1);
  dottedLine(graphics, 0, 0, width, height);

  return graphics.generateCanvasTexture();
});

interface IGenerateGraphicsTexturedArgs {
  width: number;
  cellHeight: number;
  cols: number;
  rows: number;
  subGridColumns: number;
  positionGaps: Array<{ position: number; title: string }>;
}

const generateGraphicsTextured = moize(
  ({
    width,
    cellHeight,
    cols,
    rows,
    positionGaps,
  }: IGenerateGraphicsTexturedArgs) => {
    const container = new PIXI.Container();

    const cellWidth = width / cols;
    const height =
      cellHeight * rows + positionGaps.length * positionsColumnGapHeight;
    const yStep = cellHeight;

    const maxLineSegmentLength = 2000;
    const segmentsHorizontalCount = Math.ceil(width / maxLineSegmentLength);
    const segmentsVerticalCount = Math.ceil(height / maxLineSegmentLength);
    const lineSegmentWidth = Math.min(width, width / segmentsHorizontalCount);
    const lineSegmentHeight = Math.min(height, height / segmentsVerticalCount);

    // const lineVerticalTexture = generateLineTexture(0, lineSegmentHeight);
    const lineHorizontalTexture = generateLineTexture(lineSegmentWidth, 0);

    const segmentsVerticalTextures = positionGaps
      .concat([{ position: rows, title: '' }])
      .map((v, i, arr) => {
        const last = i === 0 ? -1 : arr[i - 1].position;
        const step = v.position - last;

        const stepHeight = step * cellHeight;
        const stepCounts = Math.ceil(stepHeight / lineSegmentHeight);
        return new Array(stepCounts).fill(null).map((_, stepIndex, steps) => {
          const textureHeight =
            stepIndex === steps.length - 1
              ? stepHeight % lineSegmentHeight
              : maxLineSegmentLength;
          const texture = generateLineTexture(0, textureHeight);
          const y = (i - 1 >= 0 ? arr[i - 1].position + i + 1 : 0) * cellHeight;
          return [texture, y];
        });
      })
      .flat();

    // main grid
    const sprites: PIXI.Sprite[] = [];
    for (let x = 0; x < cols; x++)
      segmentsVerticalTextures.forEach(
        ([texture, y]: [PIXI.Texture, number]) => {
          const sprite = new PIXI.Sprite(texture);
          sprite.x = cellWidth * x;
          sprite.y = y;

          sprites.push(sprite);
        },
      );
    // for (let s = 0; s < segmentsVerticalCount; s++) {
    //   const sprite = new PIXI.Sprite(lineVerticalTexture);
    //   sprite.x = cellWidth * x;
    //   sprite.y = s * lineSegmentHeight;

    //   sprites.push(sprite);
    // }

    let lastGapIndex = 0;
    for (let y = 0; y <= rows; y++) {
      const gapExists = positionGaps.find(g => g.position === y - 1);
      lastGapIndex += gapExists ? 1 : 0;

      for (let s = 0; s < segmentsHorizontalCount; s++) {
        const sprite = new PIXI.Sprite(lineHorizontalTexture);

        sprite.x = s * lineSegmentWidth;
        sprite.y = yStep * y + lastGapIndex * positionsColumnGapHeight;

        sprites.push(sprite);

        if (gapExists) {
          const gapSprite = new PIXI.Sprite(lineHorizontalTexture);

          gapSprite.x = s * lineSegmentWidth;
          gapSprite.y =
            yStep * y + (lastGapIndex - 1) * positionsColumnGapHeight;

          sprites.push(gapSprite);
        }
      }
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
  {
    equals: (
      prevArgs: IGenerateGraphicsTexturedArgs,
      nowArgs: IGenerateGraphicsTexturedArgs,
    ) => {
      return (
        prevArgs.width === nowArgs.width &&
        prevArgs.cellHeight === nowArgs.cellHeight &&
        prevArgs.cols === nowArgs.cols &&
        prevArgs.rows === nowArgs.rows &&
        prevArgs.subGridColumns === nowArgs.subGridColumns &&
        prevArgs.positionGaps
          .map(({ position }) => position.toString())
          .join() ===
          nowArgs.positionGaps.map(({ position }) => position.toString()).join()
      );
    },

    profileName: 'graphicsGenerator',
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
    else
      lazyTaskManager.addTask(
        new LazyTask({ func, priority: 5, taskName: 'initWebGLRenderer' }),
      );

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
    const height =
      this.props.cellHeight * this.props.rows +
      rootStore.uiStore.positionGaps.length * positionsColumnGapHeight +
      dotRadius * 4;

    const maxSideSize = 4096;
    const scale = Math.max(Math.max(width, height) / maxSideSize, 1);

    const scaledWidth = width * scale;
    const scaledHeight = height * scale;

    if (rootStore.uiStore.isFirefox) {
      this.scaleX = width >= maxSideSize ? scale : 1;
      this.scaleY = width >= maxSideSize ? scale : 1;
    } else {
      this.scaleX = width <= maxSideSize ? scale : 1;
      this.scaleY = height <= maxSideSize ? scale : 1;
    }

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
    const container = generateGraphicsTextured({
      cellHeight,
      cols,
      positionGaps: rootStore.uiStore.positionGaps,
      rows,
      subGridColumns,
      width,
    });

    ((window as any).pixiContainers =
      (window as any).pixiContainers || []).push(container);

    container.scale.set(this.scaleX, this.scaleY);
    this.renderer.render(container);
  }

  public render() {
    return <div ref={this.wrapperRef} style={this.props.style} />;
  }
}
