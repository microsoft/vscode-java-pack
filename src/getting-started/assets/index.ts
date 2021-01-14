// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "../../assets/vscode.scss";
import "bootstrap/js/src/tab";
const $ = require("jquery");

$("#navigationPanel a").click((e: any) => {
  ($($(e.target).attr("href")||"") as any).tab("show");
});

let os = "win";
if (navigator.platform.toLowerCase().indexOf("mac") === 0) {
  os = "mac";
}

const osToHide = os === "win" ? "mac" : "win";
$(`[data-os=${osToHide}]`).hide();

declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

$("a[data-toggle='tab']").on("shown.bs.tab", (e: any) => {
  vscode.postMessage({
    command: "tabActivated",
    tabId: e.target.id
  });
});

// Handle the message inside the webview
window.addEventListener("message", event => {
  const message = event.data;
  switch (message.command) {
      case "tabActivated":
        ($(message.tabId) as any).tab("show");
        break;
  }
});
