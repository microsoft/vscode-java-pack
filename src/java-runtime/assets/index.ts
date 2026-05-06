// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import "./style.scss";
import { ProjectJDKPanel } from "./ProjectJDKPanel";
import { onWillListRuntimes } from "./vscode.api";
import { ToolingJDKPanel } from "./ToolingJDKPanel";

const container = document.getElementById("content")!;
const root = createRoot(container);

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
    root.render(createElement(ToolingJDKPanel, props));
  } else {
    const props = {
      jdkEntries: args.javaRuntimes,
      projectRuntimes: args.projectRuntimes,
    }
    root.render(createElement(ProjectJDKPanel, props));
  }
}
