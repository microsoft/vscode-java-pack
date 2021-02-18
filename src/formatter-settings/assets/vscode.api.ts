// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Catagory } from "../FormatterConstants";

declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

export function changeCatagory(catagory: Catagory) {
  vscode.postMessage({
    command: "WebviewToVSCode.changeActiveCatagory",
    catagory: catagory,
  });
}

export function changeSetting(id: string, value: any) {
  vscode.postMessage({
    command: "WebviewToVSCode.changeSetting",
    id: id,
    value: value,
  });
}

export function applyChanges() {
  vscode.postMessage({
    command: "WebviewToVSCode.applyChanges",
  });
}
