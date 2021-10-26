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
export interface ToolingJDKPanelProps {
  jdkEntries?: JavaRuntimeEntry[];
  javaDotHome?: string;
  javaHomeError?: any;
}

export class ToolingJDKPanel extends React.Component<ToolingJDKPanelProps, {isDirty?: boolean}> {
  render = () => {
    const { javaHomeError } = this.props;
    const downloadJDKCommand = encodeCommandUriWithTelemetry("java.runtime", "Install a new JDK", "java.helper.openUrl", ["https://adoptium.net"]);

    return (
      <div className="container">
        <h1>Configure Java Runtime</h1>
        <div className="warning-box"><i className="codicon codicon-warning"></i>Langauge server requires a JDK 11+ to launch itself which is not found.</div>

        {javaHomeError && (<p className="java-home-error">{javaHomeError}</p>)}

        <div className="jdk-action">
          <Button onClick={this.onClickBrowseJDKButton}>Locate an Existing JDK</Button>
          {this?.state?.isDirty && <Button><a href="command:workbench.action.reloadWindow">Reload Window</a></Button> }
        </div>
        <div className="jdk-action">
          <Button><a href={downloadJDKCommand}>Install a New JDK</a></Button>
        </div>
      </div>
    );
  }

  onClickBrowseJDKButton = () => {
    onWillBrowseForJDK();
    this.setState({ isDirty: true });
  }
}
