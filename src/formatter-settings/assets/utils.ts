// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ExampleKind } from "../types";

declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

export function onWillInitialize() {
  vscode.postMessage({
    command: "onWillInitialize"
  });
}

export function onWillChangeExampleKind(exampleKind: ExampleKind) {
  vscode.postMessage({
    command: "onWillChangeExampleKind",
    exampleKind: exampleKind,
  });
}

export function onWillChangeSetting(id: string, value: any) {
  vscode.postMessage({
    command: "onWillChangeSetting",
    id: id,
    value: value,
  });
}

export function onWillDownloadAndUse() {
  vscode.postMessage({
    command: "onWillDownloadAndUse"
  });
}
