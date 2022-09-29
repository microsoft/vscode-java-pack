// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import * as webviewUI from "@vscode/webview-ui-toolkit";
import * as React from "react";
import { JavaRuntimeEntry } from "../types";
import { onWillBrowseForJDK, onWillRunCommandFromWebview } from './vscode.api';

const REQUIRED_JDK_VERSION = 17;
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
    
    return (
      <div className="container">
        <h1>Configure Runtime for Language Server</h1>
        <div className="warning-box"><i className="codicon codicon-warning"></i>Java Language Server requires a JDK {REQUIRED_JDK_VERSION}+ to launch itself.</div>

        {javaHomeError && (<p className="java-home-error">{javaHomeError}</p>)}

        <div className="jdk-action">
          <Button appearance="secondary" onClick={this.onClickBrowseJDKButton}><a href="#">Locate an <b>Existing JDK</b></a></Button>
          {this?.state?.isDirty && <Button><a href="command:workbench.action.reloadWindow">Reload</a></Button> }
        </div>
        <div className="jdk-action">
          <Button appearance="secondary" onClick={this.onClickInstallButton}><a href="#">Install a <b>New JDK</b></a></Button>
        </div>
      </div>
    );
  }

  onClickBrowseJDKButton = () => {
    onWillBrowseForJDK();
    this.setState({ isDirty: true });
  }

  onClickInstallButton = () => {
    onWillRunCommandFromWebview("java.runtime", "download", "java.installJdk");
  }
}
