// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const $ = require("jquery");
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
  $("div[ext]").each((_index: any, elem: any) => {
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
  $("div h3").parent().each((_i: any, div: any) => {
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
    command: "java.helper.installExtension",
    args: [ extName, displayName ],
  });
}

$("div[ext] > a").click(function () {
  if (this.parentElement) {
    installExtension($(this.parentElement).attr("ext") || "", $(this.parentElement).attr("displayName") || "");
  }
});

$("a[command]").click(function (event: any) {
  event.stopPropagation();

  const command = $(this).attr("command") || "";
  const args = $(this).attr("args") || undefined;
  execCommand(command, args);
});

$("button[command]").click(function () {
  const command = $(this).attr("command") || "";
  const args = $(this).attr("args") || undefined;
  execCommand(command, args);
});

function execCommand(command: string, jsonArgs: string | undefined) {
  if (command) {
    let args = [];
    if (jsonArgs) {
      const data = JSON.parse(jsonArgs);
      if (Array.isArray(data)) {
        args = data;
      } else {
        args.push(data);
      }
    }
    vscode.postMessage({
      command,
      args
    });
  }
}
