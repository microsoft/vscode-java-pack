// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import * as ReactDOM from "react-dom";
import "./style.scss";
import { ProjectJDKPanel } from "./ProjectJDKPanel";
import "@vscode/webview-ui-toolkit/dist/toolkit"
import { onWillListRuntimes } from "./vscode.api";
import { ToolingJDKPanel } from "./ToolingJDKPanel";

const onInitialize = (event: any) => {
  const { data } = event;
  if (data.command === "showJavaRuntimeEntries") {
    showJavaRuntimeEntries(data.args);
  }
};

window.addEventListener("message", onInitialize);
onWillListRuntimes();

function showJavaRuntimeEntries(args: any) {
  if (args.javaHomeError) {
    // TODO: remove after tooling JDK is embedded
    const props = {
      jdkEntries: args.javaRuntimes,
      javaHomeError: args.javaHomeError,
      javaDotHome: args.javaDotHome
    };
    ReactDOM.render(React.createElement(ToolingJDKPanel, props), document.getElementById("content"));
  } else {
    const props = {
      jdkEntries: args.javaRuntimes,
      projectRuntimes: args.projectRuntimes,
    }
    ReactDOM.render(React.createElement(ProjectJDKPanel, props), document.getElementById("content"));
  }
}
