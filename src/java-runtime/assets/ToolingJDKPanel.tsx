// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import * as webviewUI from "@vscode/webview-ui-toolkit";
import * as React from "react";
import { encodeCommandUriWithTelemetry } from '../../utils/webview';
import { JavaRuntimeEntry } from "../types";
import { onWillBrowseForJDK } from './vscode.api';

const { wrap } = provideReactWrapper(React);
const Button = wrap(webviewUI.VSCodeButton);

interface Props {
  jdkEntries?: JavaRuntimeEntry[];
  javaDotHome?: string;
  javaHomeError?: any;
}

interface State {
  isDirty?: boolean;
}

export class ToolingJDKPanel extends React.Component<Props, State> {
  render = () => {
    const { javaHomeError } = this.props;
    const downloadJDKCommand = encodeCommandUriWithTelemetry("java.runtime", "Install a new JDK", "java.helper.openUrl", ["https://adoptium.net"]);

    return (
      <div className="container">
        <h1>Configure Runtime for Language Server</h1>
        <div className="warning-box"><i className="codicon codicon-warning"></i>Java Langauge Server requires a JDK 11+ to launch itself.</div>

        {javaHomeError && (<p className="java-home-error">{javaHomeError}</p>)}

        <div className="jdk-action">
          <Button appearance="secondary" onClick={this.onClickBrowseJDKButton}><a href="#">Locate an <b>Existing JDK</b></a></Button>
          {this?.state?.isDirty && <Button><a href="command:workbench.action.reloadWindow">Reload</a></Button> }
        </div>
        <div className="jdk-action">
          <Button appearance="secondary"><a href={downloadJDKCommand}>Install a <b>New JDK</b></a></Button>
        </div>
      </div>
    );
  }

  onClickBrowseJDKButton = () => {
    onWillBrowseForJDK();
    this.setState({ isDirty: true });
  }
}
