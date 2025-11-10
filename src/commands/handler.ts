// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";

import { validateAndRecommendExtension } from "../recommendation";
import { sendInfo } from "vscode-extension-telemetry-wrapper";
import { getReleaseNotesEntries, findLatestReleaseNotes } from "../utils";
import { gt, eq } from "semver";
import { fetchInitProps } from "../welcome/index";

export async function createMavenProjectCmdHandler(_context: vscode.ExtensionContext) {
  if (!await validateAndRecommendExtension("vscjava.vscode-maven", "Maven extension is recommended to help create Java projects and work with custom goals.", true)) {
    return;
  }

  await vscode.commands.executeCommand("maven.archetype.generate");
}

// TODO: add entry to create standalone Java file

export async function createSpringBootProjectCmdHandler(_context: vscode.ExtensionContext) {
  if (!await validateAndRecommendExtension("vscjava.vscode-spring-initializr", "Spring Initializr extension is recommended to help create Spring Boot projects and manage dependencies.", true)) {
    return;
  }

  await vscode.commands.executeCommand("spring.initializr.createProject");
}

export async function createQuarkusProjectCmdHandler(_context: vscode.ExtensionContext) {
  if (!await validateAndRecommendExtension("redhat.vscode-quarkus", "Quarkus Tools for Visual Studio Code is recommended to help create Quarkus projects and for an all-in-one Quarkus application development experience.", true)) {
    return;
  }

  await vscode.commands.executeCommand("quarkusTools.createProject");
}

export async function createMicroProfileStarterProjectCmdHandler(_context: vscode.ExtensionContext) {
  if (!await validateAndRecommendExtension("microProfile-community.mp-starter-vscode-ext", "MicroProfile Starter for Visual Studio Code is recommended to generate starter projects for Eclipse MicroProfile.", true)) {
    return;
  }

  await vscode.commands.executeCommand("extension.microProfileStarter");
}


export async function showExtensionCmdHandler(_context: vscode.ExtensionContext, operationId: string, extensionName: string) {
  sendInfo(operationId, { extName: extensionName });
  vscode.commands.executeCommand("extension.open", extensionName);
}

export async function installExtensionCmdHandler(_context: vscode.ExtensionContext, operationId: string, extensionName: string, displayName: string) {
  sendInfo(operationId, { extName: extensionName });
  return vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: `Installing ${displayName||extensionName}...`}, _progress => {
    return vscode.commands.executeCommand("workbench.extensions.installExtension", extensionName);
  }).then(() => {
    vscode.window.showInformationMessage(`Successfully installed ${displayName||extensionName}.`);
  });
}

export async function openUrlCmdHandler(_context: vscode.ExtensionContext, operationId: string, url: string) {
  sendInfo(operationId, { url: url });
  vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(url));
}

export async function showReleaseNotes(context: vscode.ExtensionContext, _operationId: string, version: string) {
  let path = context.asAbsolutePath(`release-notes/v${version}.md`);
  vscode.commands.executeCommand("markdown.showPreview", vscode.Uri.file(path), null, {
    sideBySide: false,
    locked: true
  });
}

export async function showReleaseNotesHandler(context: vscode.ExtensionContext, operationId: string, version: string | undefined) {
  const entries = await getReleaseNotesEntries(context);
  const latest = findLatestReleaseNotes(entries);

  if (version === "latest") {
    version = latest.version;
  }

  if (version === undefined) {
    const versions = entries.map((entry) => entry.version).sort((a, b) => {
      if (gt(a, b)) {
        return -1;
      } else if (eq(a, b)) {
        return 0;
      }

      return 1;
    });

    version = await vscode.window.showQuickPick(versions, {
      ignoreFocusOut: true
    });

    if (!version) {
      return;
    }
  }

  sendInfo(operationId, {
    version: version
  });

  return await showReleaseNotes(context, operationId, version);
}

export async function toggleAwtDevelopmentHandler(context: vscode.ExtensionContext, _operationId: string, enable: boolean) {
  const workspaceConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("java.completion");
  const disabledList: string[] = workspaceConfig.get<string[]>("filteredTypes") || [];
  const filteredTypes: string[] = disabledList.filter((type) => {
    return !type.startsWith("java.awt.");
  });

  if (!enable) {
    filteredTypes.push("java.awt.*");
  }

  try {
    await workspaceConfig.update("filteredTypes", filteredTypes, vscode.ConfigurationTarget.Workspace);
  } catch (e) {
    vscode.window.showErrorMessage((e as Error).message);
    return;
  }

  fetchInitProps(context);
  vscode.window.showInformationMessage(`Java AWT development is ${enable ? "enabled" : "disabled"}.`);
}
