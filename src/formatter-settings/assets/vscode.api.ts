// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ExampleKind } from "../types";

declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

export function changeExampleKind(exampleKind: ExampleKind) {
  vscode.postMessage({
    command: "WebviewToVSCode.changeExampleKind",
    exampleKind: exampleKind,
  });
}

export function changeSetting(id: string, value: any) {
  vscode.postMessage({
    command: "WebviewToVSCode.changeSetting",
    id: id,
    value: value,
  });
}
