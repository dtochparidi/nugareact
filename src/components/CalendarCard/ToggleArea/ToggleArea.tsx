import * as Emitter from 'events';
import * as interact from 'levabala_interactjs';
import * as React from 'react';

import { clientSide } from '../../../dev/clientSide';

import './ToggleArea.scss';

export interface IProps {
  id: string;
  style: React.CSSProperties;
  delay: number;
  action: () => void;
  controller: Emitter;
}

export default class ToggleArea extends React.Component<IProps> {
  public firstTimeout: NodeJS.Timeout;
  public repeatTimeout: NodeJS.Timeout;
  private freezed: boolean;
  private entered: boolean;

  constructor(props: IProps) {
    super(props);

    this.props.controller.on('freeze', () => {
      clearTimeout(this.firstTimeout);
      clearTimeout(this.repeatTimeout);

      this.freezed = true;
    });

    this.props.controller.on('resume', () => {
      if (this.entered)
        this.repeatTimeout = setInterval(this.props.action, this.props.delay);

      this.freezed = false;
    });

    if (clientSide)
      interact(`#${this.props.id}`).dropzone({
        ondragenter: e => {
          if (this.freezed) return;

          clearTimeout(this.firstTimeout);
          clearTimeout(this.repeatTimeout);

          this.repeatTimeout = setInterval(this.props.action, this.props.delay);
          this.entered = true;

          (e.target as HTMLElement).classList.add('enter');
        },
        ondragleave: e => {
          clearTimeout(this.firstTimeout);
          clearTimeout(this.repeatTimeout);
          this.entered = false;

          (e.target as HTMLElement).classList.remove('enter');
        },
        ondrop: e => {
          clearTimeout(this.firstTimeout);
          clearTimeout(this.repeatTimeout);
          this.entered = false;

          (e.target as HTMLElement).classList.remove('enter');
        },
        ondropdeactivate: e => {
          clearTimeout(this.firstTimeout);
          clearTimeout(this.repeatTimeout);
          this.entered = false;

          (e.target as HTMLElement).classList.remove('enter');
        },
        overlap: 'pointer',
      });
  }

  public render() {
    const { id, style } = this.props;
    return <div id={id} style={style} className="toggleArea" />;
  }
}
