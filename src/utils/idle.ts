// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";

// in milliseconds
let timeElapsed: number = 0;
const INTERVAL = 1000;
// reference - https://medium.com/@slhenty/ui-response-times-acec744f3157
// 5s is when users start to lose focus
const IDLE_THRESHOLD = 5000;

export function initialize(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(vscodeEventHandler)); // switching editor
  context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(vscodeEventHandler)); // change cursor position
  context.subscriptions.push(vscode.window.onDidChangeTextEditorVisibleRanges(vscodeEventHandler)); // scrolling

  setInterval(timerEventHandler, INTERVAL);
}

function vscodeEventHandler() {
  timeElapsed = 0;
}

function timerEventHandler() {
  timeElapsed += INTERVAL;
  if (timeElapsed >= IDLE_THRESHOLD) {
    timeElapsed = 0;
    _onIdle.fire();
  }
}

const _onIdle: vscode.EventEmitter<void> = new vscode.EventEmitter;
export const onIdle: vscode.Event<void> = _onIdle.event;
