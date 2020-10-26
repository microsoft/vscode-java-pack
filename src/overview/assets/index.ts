// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import $ = require("jquery");
import "../../assets/vscode.scss";
import "bootstrap/js/src/tab";

window.addEventListener("message", event => {
  if (event.data.command === "syncExtensionVisibility") {
    syncExtensionVisibility(event.data.installedExtensions);
    syncSectionVisibility();
  } else if (event.data.command === "setOverviewVisibility") {
    $("#showWhenUsingJava").prop("checked", event.data.visibility);
  }
});

function syncExtensionVisibility(extensions: any) {
  $("div[ext]").each((index, elem) => {
    const anchor = $(elem);
    const ext = (anchor.attr("ext") || "").toLowerCase();
    if (extensions.indexOf(ext) !== -1) {
      anchor.hide();
    } else {
      anchor.show();
    }
  });
}

function syncSectionVisibility() {
  $("div h3").parent().each((i, div) => {
    if (!$(div).children("h3 ~ div").is(":visible")) {
      $(div).hide();
    } else {
      $(div).show();
    }
  });
}

declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

$("#showWhenUsingJava").change(function () {
  vscode.postMessage({
    command: "setOverviewVisibility",
    visibility: $(this).is(":checked")
  });
});

function installExtension(extName: string, displayName: string) {
  vscode.postMessage({
    command: "installExtension",
    extName: extName,
    displayName: displayName
  });
}

$("div[ext]").click(function () {
  installExtension($(this).attr("ext") || "", $(this).attr("displayName") || "");
});

$("#gettingStartedBtn").click(function () {
  vscode.postMessage({
    command: "java.gettingStarted"
  });
});
