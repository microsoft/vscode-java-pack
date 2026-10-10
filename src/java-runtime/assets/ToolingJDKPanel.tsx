// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "@vscode-elements/elements/dist/vscode-button/index.js";

import { JavaRuntimeData, ToolingRuntimeInfo } from "../types";
import { JDKActions } from "./components/JDKActions";
import { onWillListRuntimes } from './vscode.api';

type Props = ToolingRuntimeInfo & Pick<JavaRuntimeData, "projectJdkError">;

export function ToolingJDKPanel({ javaHomeError, javaHomeWarning, javaDotHome, toolingJreVersion, requiredJdkVersion, projectJdkError }: Props) {
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
      {projectJdkError && (<p className="java-home-error">{projectJdkError}</p>)}

      <p><a href="command:java.open.logs">Open Java Logs</a> for details. Runtime selection and startup diagnostics are provided by redhat.java.</p>

      <JDKActions />
      <vscode-button onClick={onWillListRuntimes}>Refresh<span slot="start" className="codicon codicon-refresh"></span></vscode-button>
    </div>
  );
}
