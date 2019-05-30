// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { readFile as fsReadFile } from "fs";
import * as util from "util";

const readFile = util.promisify(fsReadFile);

let extensionContext: vscode.ExtensionContext;

export function initialize(context: vscode.ExtensionContext) {
  extensionContext = context;
}

export function getExtensionContext() {
  return extensionContext;
}

export function isExtensionInstalled( extName: string) {
  return !!vscode.extensions.getExtension(extName);
}

export async function recommendExtension(extName: string, message: string): Promise<void> {
  const action = "Details";
  const answer = await vscode.window.showInformationMessage(message, action);
  if (answer === action) {
    await vscode.commands.executeCommand("java.helper.showExtension", extName);
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
