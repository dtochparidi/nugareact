import * as React from 'react';
import * as ReactMarkdown from 'react-markdown';
import Modal from 'react-responsive-modal';

import 'github-markdown-css';

interface IProps {
  show: boolean;
  versions: Array<[string, string]>;
}

interface IState {
  show: boolean;
}

export default class VersionChangelog extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      show: props.show,
    };
  }

  public onClose = () => {
    this.setState({ show: false });
  };

  public render() {
    const source = this.props.versions
      ? this.props.versions[this.props.versions.length - 1][1]
      : '# No changelogs available :(';
    return (
      <Modal open={this.state.show} onClose={this.onClose} center={true}>
        <div style={{ padding: '1.2em' }} className="markdown-body">
          <ReactMarkdown source={source} />
        </div>
      </Modal>
    );
  }
}
