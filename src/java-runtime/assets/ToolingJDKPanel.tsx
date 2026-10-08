// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "@vscode-elements/elements/dist/vscode-button/index.js";
import "@vscode-elements/elements/dist/vscode-table/index.js";
import "@vscode-elements/elements/dist/vscode-table-header/index.js";
import "@vscode-elements/elements/dist/vscode-table-header-cell/index.js";
import "@vscode-elements/elements/dist/vscode-table-body/index.js";
import "@vscode-elements/elements/dist/vscode-table-row/index.js";
import "@vscode-elements/elements/dist/vscode-table-cell/index.js";

import { useState } from "react";
import { ToolingRuntimeInfo } from "../types";
import { onWillBrowseForJDK, onWillListRuntimes, onWillRunCommandFromWebview } from './vscode.api';

export function ToolingJDKPanel({ javaHomeError, javaHomeWarning, javaDotHome, toolingJreVersion, toolingRuntimes, requiredJdkVersion }: ToolingRuntimeInfo) {
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
        <p>The language server runtime is not yet determined. redhat.java has not reported its selection. The runtimes below are candidates only; Java Pack does not select a runtime.</p>
      )}
      {javaHomeError && (<p className="java-home-error">{javaHomeError}</p>)}
      {javaHomeWarning && (<p className="warning-box">{javaHomeWarning}</p>)}

      {!javaDotHome && toolingRuntimes.length > 0 && (
        <vscode-table>
          <vscode-table-header slot="header">
            <vscode-table-header-cell>Candidate Runtime</vscode-table-header-cell>
            <vscode-table-header-cell>Java Version</vscode-table-header-cell>
            <vscode-table-header-cell>Source</vscode-table-header-cell>
          </vscode-table-header>
          <vscode-table-body slot="body">
            {toolingRuntimes.map(runtime => (
              <vscode-table-row key={runtime.fspath}>
                <vscode-table-cell>{runtime.fspath}</vscode-table-cell>
                <vscode-table-cell>{runtime.majorVersion}</vscode-table-cell>
                <vscode-table-cell>{runtime.type}</vscode-table-cell>
              </vscode-table-row>
            ))}
          </vscode-table-body>
        </vscode-table>
      )}

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
