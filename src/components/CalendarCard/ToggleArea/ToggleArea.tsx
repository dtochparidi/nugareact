import * as interact from 'interactjs';
import * as React from 'react';
import { clientSide } from '../../../dev/clientSide';

import './ToggleArea.scss';

export interface IProps {
  id: string;
  style: React.CSSProperties;
  firstDelay: number;
  repeatDelay: number;
  action: () => void;
}

export default class ToggleArea extends React.Component<IProps> {
  public firstTimeout: NodeJS.Timeout;
  public repeatTimeout: NodeJS.Timeout;

  constructor(props: IProps) {
    super(props);

    if (clientSide)
      interact(`#${this.props.id}`).dropzone({
        ondragenter: e => {
          clearTimeout(this.firstTimeout);
          clearTimeout(this.repeatTimeout);

          this.firstTimeout = setTimeout(() => {
            this.props.action();

            this.repeatTimeout = setInterval(
              this.props.action,
              this.props.repeatDelay,
            );
          }, this.props.firstDelay);

          (e.target as HTMLElement).classList.add('enter');
        },
        ondragleave: e => {
          clearTimeout(this.firstTimeout);
          clearTimeout(this.repeatTimeout);

          (e.target as HTMLElement).classList.remove('enter');
        },
        ondrop: e => {
          clearTimeout(this.firstTimeout);
          clearTimeout(this.repeatTimeout);
          (e.target as HTMLElement).classList.remove('enter');
        },
        ondropdeactivate: e => {
          clearTimeout(this.firstTimeout);
          clearTimeout(this.repeatTimeout);

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
