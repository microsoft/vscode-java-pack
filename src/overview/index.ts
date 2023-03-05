// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import * as path from "path";
import { instrumentOperation, sendInfo } from "vscode-extension-telemetry-wrapper";
import { getExtensionContext, getNonce } from "../utils";
import { KEY_OVERVIEW_LAST_SHOW_TIME, KEY_SHOW_WHEN_USING_JAVA } from "../utils/globalState";

let overviewView: vscode.WebviewPanel | undefined;

const toggleOverviewVisibilityOperation = instrumentOperation("toggleOverviewVisibility", (operationId: string, context: vscode.ExtensionContext, visibility: boolean) => {
  sendInfo(operationId, {
    visibility: visibility.toString()
  }, {});

  context.globalState.update(KEY_SHOW_WHEN_USING_JAVA, visibility);
});

export async function overviewCmdHandler(context: vscode.ExtensionContext, _operationId: string, showInBackground: boolean = false) {
  if (overviewView) {
    overviewView.reveal();
    return;
  }

  overviewView = vscode.window.createWebviewPanel(
    "java.overview",
    "Java Overview",
    {
      viewColumn: vscode.ViewColumn.One,
      preserveFocus: showInBackground
    },
    {
      enableScripts: true,
      enableCommandUris: true,
      retainContextWhenHidden: true
    }
  );

  context.globalState.update(KEY_OVERVIEW_LAST_SHOW_TIME, Date.now().toString());

  await initializeOverviewView(context, overviewView, onDidDisposeWebviewPanel);
}

function onDidDisposeWebviewPanel() {
  overviewView = undefined;
}

async function initializeOverviewView(context: vscode.ExtensionContext, webviewPanel: vscode.WebviewPanel, onDisposeCallback: () => void) {
  webviewPanel.iconPath = {
    light: vscode.Uri.file(path.join(context.extensionPath, "caption.light.svg")),
    dark: vscode.Uri.file(path.join(context.extensionPath, "caption.dark.svg"))
  };
  webviewPanel.webview.html = getHtmlForWebview(webviewPanel, context.asAbsolutePath("./out/assets/overview/index.js"));

  context.subscriptions.push(webviewPanel.onDidDispose(onDisposeCallback));

  function syncExtensionVisibility() {
    const installedExtensions = vscode.extensions.all.map(ext => ext.id.toLowerCase());
    webviewPanel.webview.postMessage({
      command: "syncExtensionVisibility",
      installedExtensions: installedExtensions
    });
  }

  syncExtensionVisibility();

  vscode.extensions.onDidChange(_e => {
    syncExtensionVisibility();
  });

  webviewPanel.webview.postMessage({
    command: "setOverviewVisibility",
    visibility: context.globalState.get(KEY_SHOW_WHEN_USING_JAVA)
  });

  context.subscriptions.push(webviewPanel.webview.onDidReceiveMessage(async (e) => {
    if (e.command === "setOverviewVisibility") {
      toggleOverviewVisibilityOperation(context, e.visibility);
    } else if (e.command) {
      sendInfo("", {
        referrer: "overview",
        command: e.command,
        arg: e.args && e.args.length ? e.args[0] : ""
      });

      await vscode.commands.executeCommand(e.command, ...e.args);
    }
  }));
}

export async function showOverviewPageOnActivation(context: vscode.ExtensionContext) {
    let overviewLastShowTime = context.globalState.get(KEY_OVERVIEW_LAST_SHOW_TIME);
    let showInBackground = overviewLastShowTime !== undefined;
    vscode.commands.executeCommand("java.overview", showInBackground);
}

export class OverviewViewSerializer implements vscode.WebviewPanelSerializer {
  async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, _state: any) {
    if (overviewView) {
      overviewView.reveal();
      webviewPanel.dispose();
      return;
    }

    overviewView = webviewPanel;
    initializeOverviewView(getExtensionContext(), webviewPanel, onDidDisposeWebviewPanel);
  }
}

function getHtmlForWebview(webviewPanel: vscode.WebviewPanel, scriptPath: string) {
  const scriptPathOnDisk = vscode.Uri.file(scriptPath);
  const scriptUri = webviewPanel.webview.asWebviewUri(scriptPathOnDisk);

  // Use a nonce to whitelist which scripts can be run
  const nonce = getNonce();

  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
    <meta name="theme-color" content="#000000">
    <title>Java Overview</title>
  </head>
  <body>
    <script nonce="${nonce}" src="${scriptUri}" type="module"></script>
    <div class="container mb-5">
      <div class="row mb-3">
        <div class="col">
          <h1>Java Overview</h1>
        </div>
      </div>
      <div class="row">
        <div class="col">
          <div class="row mb-3">
            <div class="col">
              <h3 class="font-weight-light">Start</h3>
              <div>
                <a href="command:java.helper.createMavenProject" title="Create a Maven project using archetypes">Create a Maven project...</a>
              </div>
              <div>
                <a href="command:java.helper.createSpringBootProject" title="Create a project with Spring Initializr">Create a Spring Boot project...</a>
              </div>
              <div>
                <a href="command:java.helper.createQuarkusProject" title="Create a project with Quarkus Tools for Visual Studio Code">Create a Quarkus project...</a>
              </div>
              <div>
                <a href="command:java.helper.createMicroProfileStarterProject" title="Create a project with MicroProfile Starter for Visual Studio Code">Create a MicroProfile project...</a>
              </div>
              <!-- <a href="command:java.helper.createJavaFile">Create a standalone Java file...</a><br> -->
            </div>
          </div>
          <div class="row mb-3">
            <div class="col">
              <h3 class="font-weight-light">Key Bindings</h3>
              <div ext="k--kato.intellij-idea-keybindings" displayName="IntelliJ IDEA Key Bindings">
                <a href="#" title="Use IntelliJ IDEA hot keys in VS Code...">Use IntelliJ IDEA Key Bindings</a>
              </div>
              <div ext="alphabotsec.vscode-eclipse-keybindings" displayName="Eclipse Key Bindings">
                <a href="#" title="Use Eclipse hot keys in VS Code...">Use Eclipse Key Bindings</a>
              </div>
            </div>
          </div>
          <div class="row mb-3">
            <div class="col">
              <h3 class="font-weight-light">Extensions</h3>
              <div ext="redhat.java" displayName="Language Support for Java by Red Hat">
                <a href="#" title="Install the Java language support extension...">Install Language Support for Java by Red Hat</a>
              </div>
              <div ext="vscjava.vscode-java-debug" displayName="Debugger for Java">
                <a href="#" title="Install the Debugger for Java extension...">Install Debugger for Java</a>
              </div>
              <div ext="vscjava.vscode-java-test" displayName="Java Test Runner">
                <a href="#" title="Install the Java Test Runner extension...">Install Java Test Runner</a>
              </div>
              <div ext="vscjava.vscode-maven" displayName="Maven for Java">
                <a href="#" title="Install the Maven for Java extension...">Install Maven for Java</a>
              </div>
              <div ext="SonarSource.sonarlint-vscode" displayName="SonarLint">
                <a href="#" title="Install SonarLint...">Install SonarLint</a>
              </div>
              <div ext="adashen.vscode-tomcat" displayName="Tomcat for Java">
                <a href="#" title="Install the Tomcat for Java extension...">Install Tomcat for Java</a>
              </div>
              <div ext="shengchen.vscode-checkstyle" displayName="Checkstyle for Java">
                <a href="#" title="Install the Checkstyle for Java extension...">Install Checkstyle for Java</a>
              </div>
              <div ext="redhat.vscode-xml" displayName="XML">
                <a href="#" title="Schema validation when editing pom.xml...">Install XML extension</a>
              </div>
              <div ext="vscjava.vscode-java-dependency" displayName="Project Manager for Java">
                <a href="#" title="Install the Project Manager for Java extension...">Install Project Manager for Java</a>
              </div>
            </div>
          </div>
        </div>
        <div class="col">
          <div class="row mb-3">
            <div class="col">
              <h3 class="font-weight-light">Spring</h3>
              <div>
                <a href="command:java.helper.openUrl?%22https%3A%2F%2Fcode.visualstudio.com%2Fdocs%2Fjava%2Fjava-spring-boot%22" title="Learn how to work with Spring Boot projects in VS Code">Spring Boot with VS Code</a>
              </div>
              <div>
                <a href="command:java.helper.openUrl?%22https%3A%2F%2Fgithub.com%2Fspring-projects%2Fspring-petclinic%22" title="Run PetClinic sample app in VS Code">Spring PetClinic Sample Application</a>
              </div>
              <div ext="vmware.vscode-boot-dev-pack" displayName="Spring Boot Extension Pack">
                <a href="#" title="Install Spring Boot Extension Pack...">Install Spring Boot Extension Pack</a>
              </div>
            </div>
          </div>
          <div class="row mb-3">
            <div class="col">
              <h3 class="font-weight-light">Microservices</h3>
              <div>
                <a href="command:java.helper.openUrl?%22https%3A%2F%2Fcode.visualstudio.com%2Fdocs%2Fazure%2Fkubernetes%22" title="Learn how to work with Kubernetes in VS Code">Kubernetes in VS Code</a>
              </div>
              <div>
                <a href="command:java.helper.openUrl?%22https%3A%2F%2Fcode.visualstudio.com%2Fdocs%2Fazure%2Fdocker%22" title="Learn how to work with Docker in VS Code">Docker in VS Code</a>
              </div>
              <div>
                <a href="command:java.helper.openUrl?%22https%3A%2F%2Fmarketplace.visualstudio.com%2Fitems%3FitemName%3DMicroProfile-Community.vscode-microprofile-pack%26ssr%3Dfalse%23overview%22" title="Marketplace link for Extension Pack for MicroProfile">Extension Pack for MicroProfile in VS Code</a>
              </div>
              <div>
                <a href="command:java.helper.openUrl?%22https%3A%2F%2Fmarketplace.visualstudio.com%2Fitems%3FitemName%3Dredhat.vscode-quarkus%26ssr%3Dfalse%23overview%22" title="Marketplace link for Quarkus Tools for VS Code">Quarkus Tools for VS Code</a>
              </div>
              <div ext="ms-kubernetes-tools.vscode-kubernetes-tools" displayName="Kubernetes">
                <a href="#" title="Install Kubernetes extension...">Install Kubernetes Extension</a>
              </div>
              <div ext="ms-azuretools.vscode-docker" displayName="Docker">
                <a href="#" title="Install Docker extension...">Install Docker Extension</a>
              </div>
              <div ext="MicroProfile-Community.vscode-microprofile-pack" displayName="Extension Pack for MicroProfile">
                <a href="#" title="Install Extension Pack for MicroProfile...">Install Extension Pack for MicroProfile</a>
              </div>
              <div ext="redhat.vscode-quarkus" displayName="Quarkus">
                <a href="#" title="Install Quarkus extension...">Install Quarkus Extension</a>
              </div>
            </div>
          </div>
          <div class="row mb-3">
            <div class="col">
              <h3 class="font-weight-light">Help</h3>
              <div>
                <a href="command:java.helper.openUrl?%22https%3A%2F%2Fgithub.com%2FMicrosoft%2Fvscode-java-pack%2Fissues%22" title="Report issues or request features">Questions & Issues</a>
              </div>
              <div>
                <a href="command:java.helper.openUrl?%22https%3A%2F%2Ftwitter.com%2Fintent%2Ftweet%3Fvia%3Dcode%26hashtags%3DJava%252CHappyCoding%22" title="Tweet us your feedback">Twitter</a>
              </div>
            </div>
          </div>
        </div>
        <div class="col">
          <div class="row mb-3">
            <div class="col">
              <h3 class="font-weight-light">Learn</h3>
              <div class="list-group">
                <button command="java.gettingStarted" class="list-group-item list-group-item-action flex-column align-items-start btn btn-link mb-2 p-2" title="Open Java Beginner Tips View">
                    <p class="mb-1">Java Beginner Tips</p>
                    <small>Learn 1 min <a href="javascript:void(0)" title="Quick Start" command="java.gettingStarted" args='"#quick-start-tab"'>Quick Start</a> tutorial, common shortcuts for <a href="javascript:void(0)" title="Code Editing" command="java.gettingStarted" args='"#code-editing-tab"'>Code Editing</a> and <a href="javascript:void(0)" title="Debugging" command="java.gettingStarted" args='"#debugging-tab"'>Debugging</a>, and <a href="javascript:void(0)" title="FAQ" command="java.gettingStarted" args='"#faq-tab"'>FAQ</a>.</small>
                </button>
                <button command="java.helper.openUrl" args='"https://code.visualstudio.com/docs/java/java-tutorial"' class="list-group-item list-group-item-action flex-column align-items-start btn btn-link mb-2 p-2" title="Open Java Tutorials">
                  <p class="mb-1">Java Tutorials</p>
                  <small>Learn how to <a href="javascript:void(0)" title="Open Java Debugging Tutorial" command="java.helper.openUrl" args='"https://code.visualstudio.com/docs/java/java-debugging"'>debug Java apps</a> and <a href="javascript:void(0)" title="Open Java Testing Tutorial" command="java.helper.openUrl" args='"https://code.visualstudio.com/docs/java/java-testing"'>run JUnit tests</a> in VS Code.</small>
                </button>
              </div>
            </div>
          </div>
          <div class="row mb-3">
            <div class="col">
              <h3 class="font-weight-light">Configuration</h3>
              <div class="list-group">
                <a href="javascript:void(0)" command="java.runtime" class="list-group-item list-group-item-action flex-column align-items-start btn btn-link mb-2 p-2" title="Open Java Runtime Guide">
                  <p class="mb-1">Configure Java Runtime</p>
                  <small>Setup JDKs for projects and VS Code Java.</small>
                </a>
                <a href="javascript:void(0)" command="java.extGuide" class="list-group-item list-group-item-action flex-column align-items-start btn btn-link mb-2 p-2" title="Open Extensions Guide">
                  <p class="mb-1">Extensions Guide</p>
                  <small>Recommended extensions for Java development.</small>
                </a>
                <a href="javascript:void(0)" command="workbench.action.openSettings" args='"java."' class="list-group-item list-group-item-action flex-column align-items-start btn btn-link mb-2 p-2" title="Open Java Settings">
                  <p class="mb-1">Java Settings</p>
                  <small>Show the Java settings.</small>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col">
          <div class="form-check">
            <input type="checkbox" class="form-check-input" id="showWhenUsingJava">
            <label class="form-check-label" for="showWhenUsingJava">Show overview page when using Java</label>
          </div>
        </div>
      </div>
    </div>
  </body>

  </html>`;
}
