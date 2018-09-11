import * as vscode from 'vscode';

import { readFile as fsReadFile } from 'fs';
import * as util from 'util';
import * as path from 'path';
const openurl: any = require('openurl');

const readFile = util.promisify(fsReadFile);
let overviewView: vscode.WebviewPanel | undefined;
const KEY_SHOW_WHEN_USING_JAVA = 'showWhenUsingJava';

export async function overviewCmdHandler(context: vscode.ExtensionContext) {
  if (overviewView) {
    overviewView.reveal();
    return;
  }

  overviewView = vscode.window.createWebviewPanel(
    'java.overview',
    'Java Overview',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      enableCommandUris: true,
      retainContextWhenHidden: true
    }
  );

  overviewView.iconPath = vscode.Uri.file(path.join(context.extensionPath, 'logo.lowres.png'));
  let buffer = await readFile(require.resolve('./assets/index.html'));
  overviewView.webview.html = buffer.toString();

  overviewView.onDidDispose(() => {
    overviewView = undefined;
  });

  const installedExtensions = vscode.extensions.all.map(ext => ext.id.toLowerCase());
  overviewView.webview.postMessage({
    command: 'hideInstalledExtensions',
    installedExtensions: installedExtensions
  });

  overviewView.webview.postMessage({
    command: 'setOverviewVisibility',
    visibility: context.globalState.get(KEY_SHOW_WHEN_USING_JAVA)
  });

  overviewView.webview.onDidReceiveMessage((e) => {
    if (e.command === 'setOverviewVisibility') {
      context.globalState.update(KEY_SHOW_WHEN_USING_JAVA, e.visibility);
    }
  });
}

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
}

export async function openUrlCmdHandler(context: vscode.ExtensionContext, operationId: string, url: string) {
  openurl.open(url);
}

export async function showOverviewPageOnActivation(context: vscode.ExtensionContext) {
  let showWhenUsingJava = context.globalState.get(KEY_SHOW_WHEN_USING_JAVA);
  if (showWhenUsingJava === undefined) {
    showWhenUsingJava = true;
  }

  if (showWhenUsingJava) {
    vscode.commands.executeCommand('java.overview');
  }
}

async function validateAndRecommendExtension(extName: string, message: string): Promise<boolean> {
  const ext = vscode.extensions.getExtension(extName);
  if (ext) {
    return true;
  }

  const action = "Details";
  const answer = await vscode.window.showInformationMessage(message, action);
  if (answer === action) {
    await vscode.commands.executeCommand('java.helper.showExtension', extName);
  }

  return false;
}
