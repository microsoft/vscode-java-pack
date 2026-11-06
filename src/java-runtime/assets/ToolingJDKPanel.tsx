// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { richText } from "../../l10n/richText";
import * as l10n from "@vscode/l10n";
import "@vscode-elements/elements/dist/vscode-button/index.js";

import { JavaRuntimeData, ToolingRuntimeInfo } from "../types";
import { JDKActions } from "./components/JDKActions";
import { onWillListRuntimes } from './vscode.api';

type Props = ToolingRuntimeInfo & Pick<JavaRuntimeData, "projectJdkError">;

export function ToolingJDKPanel({ javaHomeError, javaHomeWarning, javaDotHome, toolingJreVersion, requiredJdkVersion, projectJdkError }: Props) {
  return (
    <div className="container">
      <h1>{l10n.t("Configure Runtime for Language Server")}</h1>
      <div className="warning-box">{richText(l10n.t("{0}Java Language Server requires a JDK {1}+ to launch itself. Your projects can use older JDKs."), [<i className="codicon codicon-warning"></i>, requiredJdkVersion])}</div>

      {javaDotHome ? (
        <p>{richText(l10n.t("Language server runtime reported by redhat.java: {0} (Java {1})."), [<code>{javaDotHome}</code>, toolingJreVersion])}</p>
      ) : (
        <p>{l10n.t("Language server runtime information has not been reported by redhat.java.")}</p>
      )}
      {javaHomeError && (<p className="java-home-error">{javaHomeError}</p>)}
      {javaHomeWarning && (<p className="warning-box">{javaHomeWarning}</p>)}
      {projectJdkError && (<p className="java-home-error">{projectJdkError}</p>)}

      <p>{richText(l10n.t("{0} for details. Runtime selection and startup diagnostics are provided by redhat.java."), [<a href="command:java.open.logs">{l10n.t("Open Java Logs")}</a>])}</p>

      <JDKActions />
      <vscode-button onClick={onWillListRuntimes}>{richText(l10n.t("Refresh{0}"), [<span slot="start" className="codicon codicon-refresh"></span>])}</vscode-button>
    </div>
  );
}
