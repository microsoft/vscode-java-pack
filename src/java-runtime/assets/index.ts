// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { createRoot } from "react-dom/client";
import "./style.scss";
import { ProjectJDKPanel } from "./ProjectJDKPanel";
import { onWillListRuntimes } from "./vscode.api";
import { ToolingJDKPanel } from "./ToolingJDKPanel";

const root = createRoot(document.getElementById("content")!);

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
    root.render(React.createElement(ToolingJDKPanel, props));
  } else {
    const props = {
      jdkEntries: args.javaRuntimes,
      projectRuntimes: args.projectRuntimes,
    }
    root.render(React.createElement(ProjectJDKPanel, props));
  }
}
