// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";

import { instrumentCommand } from '../utils';
import { createMavenProjectCmdHanlder, createSpringBootProjectCmdHandler, showExtensionCmdHandler, openUrlCmdHandler, showLatestReleaseNotesHandler } from "./handler";
import { overviewCmdHandler } from "../overview";

export function initialize(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.commands.registerCommand('java.overview', instrumentCommand(context, 'java.overview', instrumentCommand(context, 'java.helper.overview', overviewCmdHandler))));
  context.subscriptions.push(vscode.commands.registerCommand('java.helper.createMavenProject', instrumentCommand(context, 'java.helper.createMavenProject', createMavenProjectCmdHanlder)));
  context.subscriptions.push(vscode.commands.registerCommand('java.helper.createSpringBootProject', instrumentCommand(context, 'java.helper.createSpringBootProject', createSpringBootProjectCmdHandler)));
  context.subscriptions.push(vscode.commands.registerCommand('java.helper.showExtension', instrumentCommand(context, 'java.helper.showExtension', showExtensionCmdHandler)));
  context.subscriptions.push(vscode.commands.registerCommand('java.helper.openUrl', instrumentCommand(context, 'java.helper.openUrl', openUrlCmdHandler)));
  context.subscriptions.push(vscode.commands.registerCommand('java.showLatestReleaseNotes', instrumentCommand(context, 'java.showLatestReleaseNotes', showLatestReleaseNotesHandler)));
}
