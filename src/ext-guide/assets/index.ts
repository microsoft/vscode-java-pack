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
const vscode = acquireVsCodeApi && acquireVsCodeApi();

$("a[data-toggle='tab']").on("shown.bs.tab", (e: any) => {
  vscode.postMessage({
    command: "tabActivated",
    tabId: e.target.id
  });

  bsHide($("p[ext]:visible"));
  bsHide($("#btn-learn-more"));
  updateSelection();
});

$("tr").hover((e: any) => {
  const $chkBox = $(e.target).closest("tr").find("input[type='checkbox']");
  if ($chkBox.length === 0) {
    return;
  }

  const ext = $chkBox.val();
  const $visibleDesc = $("p[ext]:visible");
  if ($visibleDesc.length > 0 && $visibleDesc.val() !== ext) {
    bsHide($visibleDesc);
  }

  const $nextDesc = $(`p[ext='${ext}'].d-none`);
  bsShow($nextDesc);

  const $learnMore = $("#btn-learn-more");
  $learnMore.attr("href", `command:java.helper.showExtension?%22${ext}%22`);
  bsShow($learnMore);
});

function updateSelection() {
  const $checked = $("input:checked:visible:enabled");
  const $btnSelected = $("#btn-install-selected");
  if ($checked.length === 0) {
    bsHide($btnSelected);
    return;
  }

  $btnSelected.text(`Install Selected (${$checked.length})`);
  bsShow($btnSelected);
}

$("input[type='checkbox']").change(updateSelection);

function bsHide($elem: any) {
  $elem.addClass("d-none");
}

function bsShow($elem: any) {
  $elem.removeClass("d-none");
}

window.addEventListener("message", event => {
  if (event.data.command === "syncExtensionStatus") {
    syncExtensionStatus(event.data.installedExtensions);
  }
});

function syncExtensionStatus(extensions: string[]) {
  $("input[type='checkbox']").each((_i: any, elem: any) => {
    const isInstalled = extensions.includes(<string>$(elem).val());
    $(elem).prop("disabled", isInstalled);
    $(elem).prop("checked", isInstalled);
  });
}

function getSelectedExtension(isAll: boolean = false) {
  const $selected = isAll ? $("input:visible:enabled") : $("input:checked:visible:enabled");
  const selectedExtensions: string[] = [];
  $selected.each((_i: any, elem: any) => { selectedExtensions.push(<string>$(elem).val()); });
  return selectedExtensions;
}

$("#btn-install-selected").click(() => installExtensions(getSelectedExtension()));
$("#btn-install-all").click(() => installExtensions(getSelectedExtension(true)));

function installExtensions(extNames: string[]) {
  if (extNames.length <= 0) {
    return;
  }

  vscode.postMessage({
    command: "installExtensions",
    extNames: extNames
  });
}
