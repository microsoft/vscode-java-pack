import * as vscode from "vscode";
const openurl: any = require("openurl");

import { validateAndRecommendExtension } from "../recommendation";

export async function createMavenProjectCmdHanlder(context: vscode.ExtensionContext) {
  if (!await validateAndRecommendExtension('vscjava.vscode-maven', 'Maven extension is recommended to help create Java projects and work with custom goals.')) {
    return;
  }

  await vscode.commands.executeCommand('maven.archetype.generate');
}

// TODO: add entry to create standalone Java file

export async function createSpringBootProjectCmdHandler(context: vscode.ExtensionContext) {
  if (!await validateAndRecommendExtension('vscjava.vscode-spring-initializr', 'Spring Initializr extension is recommended to help create Spring Boot projects and manage dependencies.')) {
    return;
  }

  await vscode.commands.executeCommand('spring.initializr.maven-project');
}

export async function showExtensionCmdHandler(context: vscode.ExtensionContext, operationId: string, extensionName: string) {
  openurl.open(vscode.Uri.parse(`vscode:extension/${extensionName}`).toString());
  // TODO: uncommment the below line after vscode address https://github.com/Microsoft/vscode/issues/62629
  //vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(`vscode:extension/${extensionName}`));
}

export async function openUrlCmdHandler(context: vscode.ExtensionContext, operationId: string, url: string) {
  vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url));
}
