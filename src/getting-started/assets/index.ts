// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "../../assets/vscode.scss";
import "bootstrap/js/src/tab";
import * as $ from "jquery";

$("#navigationPanel a").click(e => {
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

$("a[data-toggle='tab']").on("shown.bs.tab", e => {
  vscode.postMessage({
    command: "tabActivated",
    tabId: e.target.id
  });
});
