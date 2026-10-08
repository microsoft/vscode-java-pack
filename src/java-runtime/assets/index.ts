// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import "./style.scss";
import { ProjectJDKPanel } from "./ProjectJDKPanel";
import { onWillListRuntimes } from "./vscode.api";
import { ToolingJDKPanel } from "./ToolingJDKPanel";
import { JavaRuntimeData } from "../types";

const container = document.getElementById("content")!;
const root = createRoot(container);

const onInitialize = (event: MessageEvent<{command: string; args: JavaRuntimeData}>) => {
  const { data } = event;
  if (data.command === "showJavaRuntimeEntries") {
    showJavaRuntimeEntries(data.args);
  }
};

window.addEventListener("message", onInitialize);
onWillListRuntimes();

function showJavaRuntimeEntries(args: JavaRuntimeData) {
  if (args.javaHomeError || !args.javaDotHome) {
    root.render(createElement(ToolingJDKPanel, args));
  } else {
    root.render(createElement(ProjectJDKPanel, {
      jdkEntries: args.javaRuntimes,
      projectRuntimes: args.projectRuntimes,
      javaDotHome: args.javaDotHome,
      toolingJreVersion: args.toolingJreVersion,
      requiredJdkVersion: args.requiredJdkVersion
    }));
  }
}
