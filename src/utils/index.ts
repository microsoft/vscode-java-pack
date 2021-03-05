// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { readFile as fsReadFile } from "fs";
import * as util from "util";
import { initialize as initializeIdle } from "./idle";
import { initialize as initializeScheduler } from "./scheduler";
import { sendInfo } from "vscode-extension-telemetry-wrapper";

const readFile = util.promisify(fsReadFile);

let extensionContext: vscode.ExtensionContext;

export function initialize(context: vscode.ExtensionContext) {
  extensionContext = context;
  initializeIdle(context);
  initializeScheduler(context);
}

export function getExtensionContext() {
  return extensionContext;
}

export function isExtensionInstalled(extName: string) {
  return !!vscode.extensions.getExtension(extName);
}

export async function recommendExtension(extName: string, message: string): Promise<void> {
  const action = "Install";
  const answer = await vscode.window.showInformationMessage(message, action);
  if (answer === action) {
    await vscode.commands.executeCommand("java.helper.installExtension", extName, extName);
  }
}

export function timeToString(time: Date) {
  return time.toString();
}

export function stringToTime(str: string) {
  return Date.parse(str);
}

export async function loadTextFromFile(resourceUri: string) {
  let buffer = await readFile(resourceUri);
  return buffer.toString();
}

export * from "./command";
export * from "./release-notes";
export * from "./extension";

export async function webviewCmdLinkHandler(obj: { webview: string, identifier: string, command: string, args?: string[] }) {
  const { webview, identifier, command, args } = obj;
  sendInfo("", {
    name: "openWebviewUrl",
    webview,
    identifier
  });

  if (args !== undefined) {
    await vscode.commands.executeCommand(command, ...args);
  } else {
    await vscode.commands.executeCommand(command);
  }
}
