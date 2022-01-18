// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { showInstallJdkWebview, showInstallJdkWebviewBeside } from "../install-jdk";
import * as vscode from "vscode";
import { instrumentOperation, instrumentOperationAsVsCodeCommand } from "vscode-extension-telemetry-wrapper";
import { showClasspathConfigurationPage } from "../classpath/classpathConfigurationView";
import { javaExtGuideCmdHandler } from "../ext-guide";
import { javaFormatterSettingsEditorProvider } from "../formatter-settings";
import { javaGettingStartedCmdHandler } from "../beginner-tips";
import { javaRuntimeCmdHandler } from "../java-runtime";
import { overviewCmdHandler } from "../overview";
import { webviewCmdLinkHandler } from "../utils";
import { showWelcomeWebview, showWelcomeWebviewBeside } from "../welcome";
import { createMavenProjectCmdHandler, createMicroProfileStarterProjectCmdHandler, createQuarkusProjectCmdHandler, createSpringBootProjectCmdHandler, installExtensionCmdHandler, openUrlCmdHandler, showExtensionCmdHandler, showReleaseNotesHandler, toggleAwtDevelopmentHandler } from "./handler";

export function initialize(context: vscode.ExtensionContext) {
  registerCommandHandler(context, "java.overview", overviewCmdHandler);
  registerCommandHandler(context, "java.helper.createMavenProject", createMavenProjectCmdHandler);
  registerCommandHandler(context, "java.helper.createSpringBootProject", createSpringBootProjectCmdHandler);
  registerCommandHandler(context, "java.helper.createQuarkusProject", createQuarkusProjectCmdHandler);
  registerCommandHandler(context, "java.helper.createMicroProfileStarterProject", createMicroProfileStarterProjectCmdHandler);
  registerCommandHandler(context, "java.helper.showExtension", showExtensionCmdHandler);
  registerCommandHandler(context, "java.helper.openUrl", openUrlCmdHandler);
  registerCommandHandler(context, "java.showReleaseNotes", showReleaseNotesHandler);
  registerCommandHandler(context, "java.runtime", javaRuntimeCmdHandler);
  registerCommandHandler(context, "java.helper.installExtension", installExtensionCmdHandler);
  registerCommandHandler(context, "java.gettingStarted", javaGettingStartedCmdHandler);
  registerCommandHandler(context, "java.extGuide", javaExtGuideCmdHandler);
  context.subscriptions.push(instrumentOperationAsVsCodeCommand("java.webview.runCommand", webviewCmdLinkHandler));
  registerCommandHandler(context, "java.welcome", showWelcomeWebviewBeside);
  registerCommandHandler(context, "java.welcome.fromWalkthrough", showWelcomeWebview);
  context.subscriptions.push(instrumentOperationAsVsCodeCommand("java.formatterSettings", javaFormatterSettingsEditorProvider.showFormatterSettingsEditor, javaFormatterSettingsEditorProvider));
  context.subscriptions.push(instrumentOperationAsVsCodeCommand("java.formatterSettings.showTextEditor", javaFormatterSettingsEditorProvider.reopenWithTextEditor));
  registerCommandHandler(context, "java.classpathConfiguration", showClasspathConfigurationPage);
  registerCommandHandler(context, "java.installJdk", showInstallJdkWebviewBeside);
  registerCommandHandler(context, "java.installJdk.fromWalkthrough", showInstallJdkWebview);
  registerCommandHandler(context, "java.toggleAwtDevelopment", toggleAwtDevelopmentHandler);
}

type CommandHandler = (context: vscode.ExtensionContext, operationId: string, ...args: any[]) => any;

/**
 * Register command handlers as vscode commands. 
 * @param context 
 * @param operationName 
 * @param callback MUST be a CommandHandler 
 */
function registerCommandHandler(context: vscode.ExtensionContext, operationName: string, callback: CommandHandler): void{
  const stub = async (operationId: string, ...args: any[]) => {
    return await callback(context, operationId, ...args);
  };

  context.subscriptions.push(vscode.commands.registerCommand(operationName, instrumentOperation(operationName, stub)));
}