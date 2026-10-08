// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "@vscode-elements/elements/dist/vscode-button/index.js";

import { useState } from "react";
import { ToolingRuntimeInfo } from "../types";
import { onWillBrowseForJDK, onWillListRuntimes, onWillRunCommandFromWebview } from './vscode.api';

export function ToolingJDKPanel({ javaHomeError, javaHomeWarning, javaDotHome, toolingJreVersion, requiredJdkVersion }: ToolingRuntimeInfo) {
  const [isDirty, setIsDirty] = useState(false);

  const onClickBrowseJDKButton = () => {
    onWillBrowseForJDK();
    setIsDirty(true);
  };

  const onClickInstallButton = () => {
    onWillRunCommandFromWebview("java.runtime", "download", "java.installJdk");
  };

  return (
    <div className="container">
      <h1>Configure Runtime for Language Server</h1>
      <div className="warning-box"><i className="codicon codicon-warning"></i>Java Language Server requires a JDK {requiredJdkVersion}+ to launch itself. Your projects can use older JDKs.</div>

      {javaDotHome ? (
        <p>Language server runtime reported by redhat.java: <code>{javaDotHome}</code> (Java {toolingJreVersion}).</p>
      ) : (
        <p>Language server runtime information has not been reported by redhat.java.</p>
      )}
      {javaHomeError && (<p className="java-home-error">{javaHomeError}</p>)}
      {javaHomeWarning && (<p className="warning-box">{javaHomeWarning}</p>)}

      <p><a href="command:java.open.logs">Open Java Logs</a> for details. Runtime selection and startup diagnostics are provided by redhat.java.</p>

      <div className="jdk-action">
        <vscode-button secondary onClick={onClickBrowseJDKButton}><a href="#">Locate an <b>Existing JDK</b></a></vscode-button>
        {isDirty && <vscode-button><a href="command:workbench.action.reloadWindow">Reload</a></vscode-button>}
      </div>
      <div className="jdk-action">
        <vscode-button secondary onClick={onClickInstallButton}><a href="#">Install a <b>New JDK</b></a></vscode-button>
      </div>
      <vscode-button onClick={onWillListRuntimes}>Refresh<span slot="start" className="codicon codicon-refresh"></span></vscode-button>
    </div>
  );
}
