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
    const props = {
      jdkEntries: args.javaRuntimes,
      javaHomeError: args.javaHomeError,
      javaDotHome: args.javaDotHome,
      requiredJdkVersion: args.requiredJdkVersion
    };
    root.render(createElement(ToolingJDKPanel, props));
  } else {
    const props = {
      jdkEntries: args.javaRuntimes,
      projectRuntimes: args.projectRuntimes,
      javaDotHome: args.javaDotHome,
      toolingJreVersion: args.toolingJreVersion,
      requiredJdkVersion: args.requiredJdkVersion,
    }
    root.render(createElement(ProjectJDKPanel, props));
  }
}
