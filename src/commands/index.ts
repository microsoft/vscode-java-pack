// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { instrumentCommand, webviewCmdLinkHandler } from "../utils";
import { createMavenProjectCmdHandler, createSpringBootProjectCmdHandler, createQuarkusProjectCmdHandler, createMicroProfileStarterProjectCmdHandler, showExtensionCmdHandler, openUrlCmdHandler, showReleaseNotesHandler, installExtensionCmdHandler } from "./handler";
import { overviewCmdHandler } from "../overview";
import { javaRuntimeCmdHandler } from "../java-runtime";
import { javaGettingStartedCmdHandler } from "../getting-started";
import { javaExtGuideCmdHandler } from "../ext-guide";
import { instrumentOperationAsVsCodeCommand } from "vscode-extension-telemetry-wrapper";
import { showWelcomeWebview } from "../welcome";
import { showClasspathConfigurationPage } from "../classpath/classpathConfigurationView";
import { JavaFormatterSettingsEditorProvider } from "../formatter-settings";

export function initialize(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.commands.registerCommand("java.overview", instrumentCommand(context, "java.overview", instrumentCommand(context, "java.helper.overview", overviewCmdHandler))));
  context.subscriptions.push(vscode.commands.registerCommand("java.helper.createMavenProject", instrumentCommand(context, "java.helper.createMavenProject", createMavenProjectCmdHandler)));
  context.subscriptions.push(vscode.commands.registerCommand("java.helper.createSpringBootProject", instrumentCommand(context, "java.helper.createSpringBootProject", createSpringBootProjectCmdHandler)));
  context.subscriptions.push(vscode.commands.registerCommand("java.helper.createQuarkusProject", instrumentCommand(context, "java.helper.createQuarkusProject", createQuarkusProjectCmdHandler)));
  context.subscriptions.push(vscode.commands.registerCommand("java.helper.createMicroProfileStarterProject", instrumentCommand(context, "java.helper.createMicroProfileStarterProject", createMicroProfileStarterProjectCmdHandler)));
  context.subscriptions.push(vscode.commands.registerCommand("java.helper.showExtension", instrumentCommand(context, "java.helper.showExtension", showExtensionCmdHandler)));
  context.subscriptions.push(vscode.commands.registerCommand("java.helper.openUrl", instrumentCommand(context, "java.helper.openUrl", openUrlCmdHandler)));
  context.subscriptions.push(vscode.commands.registerCommand("java.showReleaseNotes", instrumentCommand(context, "java.showReleaseNotes", showReleaseNotesHandler)));
  context.subscriptions.push(vscode.commands.registerCommand("java.runtime", instrumentCommand(context, "java.runtime", javaRuntimeCmdHandler)));
  context.subscriptions.push(vscode.commands.registerCommand("java.helper.installExtension", instrumentCommand(context, "java.helper.installExtension", installExtensionCmdHandler)));
  context.subscriptions.push(vscode.commands.registerCommand("java.gettingStarted", instrumentCommand(context, "java.gettingStarted", javaGettingStartedCmdHandler)));
  context.subscriptions.push(vscode.commands.registerCommand("java.extGuide", instrumentCommand(context, "java.extGuide", javaExtGuideCmdHandler)));
  context.subscriptions.push(instrumentOperationAsVsCodeCommand("java.webview.runCommand", webviewCmdLinkHandler));
  context.subscriptions.push(vscode.commands.registerCommand("java.welcome", (options) => showWelcomeWebview(context, options)));
  context.subscriptions.push(vscode.commands.registerCommand("java.classpathConfiguration", () => showClasspathConfigurationPage(context)));
  const javaFormatterSettingsEditorProvider: JavaFormatterSettingsEditorProvider = new JavaFormatterSettingsEditorProvider(context);
  context.subscriptions.push(vscode.window.registerCustomEditorProvider(JavaFormatterSettingsEditorProvider.viewType, javaFormatterSettingsEditorProvider));
  context.subscriptions.push(vscode.commands.registerCommand("java.formatterSettings", () => javaFormatterSettingsEditorProvider.showFormatterSettingsEditor()));
}
