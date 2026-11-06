// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { escapeHtml, webviewLanguage, localizationBootstrap, formatHtml } from "../l10n/host";
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
    vscode.l10n.t("Java Overview"),
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
  webviewPanel.title = vscode.l10n.t("Java Overview");
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
  const cspSource = webviewPanel.webview.cspSource;

  return `<!DOCTYPE html>
  <html lang="${webviewLanguage()}">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} https: data:; script-src 'nonce-${nonce}'; style-src ${cspSource} 'unsafe-inline'; font-src ${cspSource} https: data:;">
    <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
    <meta name="theme-color" content="#000000">
    <title>${escapeHtml(vscode.l10n.t("Java Overview"))}</title>
  </head>
  <body>
    ${localizationBootstrap(nonce)}
    <script nonce="${nonce}" src="${scriptUri}" type="module"></script>
    <div class="container mb-5">
      <div class="row mb-3">
        <div class="col">
          <h1>${escapeHtml(vscode.l10n.t("Java Overview"))}</h1>
        </div>
      </div>
      <div class="row">
        <div class="col">
          <div class="row mb-3">
            <div class="col">
              <h3 class="font-weight-light">${escapeHtml(vscode.l10n.t("Start"))}</h3>
              <div>
                <a href="command:java.helper.createMavenProject" title="${escapeHtml(vscode.l10n.t("Create a Maven project using archetypes"))}">${escapeHtml(vscode.l10n.t("Create a Maven project..."))}</a>
              </div>
              <div>
                <a href="command:java.helper.createSpringBootProject" title="${escapeHtml(vscode.l10n.t("Create a project with Spring Initializr"))}">${escapeHtml(vscode.l10n.t("Create a Spring Boot project..."))}</a>
              </div>
              <div>
                <a href="command:java.helper.createQuarkusProject" title="${escapeHtml(vscode.l10n.t("Create a project with Quarkus Tools for Visual Studio Code"))}">${escapeHtml(vscode.l10n.t("Create a Quarkus project..."))}</a>
              </div>
              <div>
                <a href="command:java.helper.createMicroProfileStarterProject" title="${escapeHtml(vscode.l10n.t("Create a project with MicroProfile Starter for Visual Studio Code"))}">${escapeHtml(vscode.l10n.t("Create a MicroProfile project..."))}</a>
              </div>
              <!-- <a href="command:java.helper.createJavaFile">Create a standalone Java file...</a><br> -->
            </div>
          </div>
          <div class="row mb-3">
            <div class="col">
              <h3 class="font-weight-light">${escapeHtml(vscode.l10n.t("Key Bindings"))}</h3>
              <div ext="k--kato.intellij-idea-keybindings" displayName="IntelliJ IDEA Key Bindings">
                <a href="#" title="${escapeHtml(vscode.l10n.t("Use IntelliJ IDEA hot keys in VS Code..."))}">${escapeHtml(vscode.l10n.t("Use IntelliJ IDEA Key Bindings"))}</a>
              </div>
              <div ext="alphabotsec.vscode-eclipse-keybindings" displayName="Eclipse Key Bindings">
                <a href="#" title="${escapeHtml(vscode.l10n.t("Use Eclipse hot keys in VS Code..."))}">${escapeHtml(vscode.l10n.t("Use Eclipse Key Bindings"))}</a>
              </div>
            </div>
          </div>
          <div class="row mb-3">
            <div class="col">
              <h3 class="font-weight-light">${escapeHtml(vscode.l10n.t("Extensions"))}</h3>
              <div ext="redhat.java" displayName="Language Support for Java by Red Hat">
                <a href="#" title="${escapeHtml(vscode.l10n.t("Install the Java language support extension..."))}">${escapeHtml(vscode.l10n.t("Install Language Support for Java by Red Hat"))}</a>
              </div>
              <div ext="vscjava.vscode-java-debug" displayName="Debugger for Java">
                <a href="#" title="${escapeHtml(vscode.l10n.t("Install the Debugger for Java extension..."))}">${escapeHtml(vscode.l10n.t("Install Debugger for Java"))}</a>
              </div>
              <div ext="vscjava.vscode-java-test" displayName="Java Test Runner">
                <a href="#" title="${escapeHtml(vscode.l10n.t("Install the Java Test Runner extension..."))}">${escapeHtml(vscode.l10n.t("Install Java Test Runner"))}</a>
              </div>
              <div ext="vscjava.vscode-maven" displayName="Maven for Java">
                <a href="#" title="${escapeHtml(vscode.l10n.t("Install the Maven for Java extension..."))}">${escapeHtml(vscode.l10n.t("Install Maven for Java"))}</a>
              </div>
              <div ext="SonarSource.sonarlint-vscode" displayName="SonarLint">
                <a href="#" title="${escapeHtml(vscode.l10n.t("Install SonarLint..."))}">${escapeHtml(vscode.l10n.t("Install SonarLint"))}</a>
              </div>
              <div ext="adashen.vscode-tomcat" displayName="Tomcat for Java">
                <a href="#" title="${escapeHtml(vscode.l10n.t("Install the Tomcat for Java extension..."))}">${escapeHtml(vscode.l10n.t("Install Tomcat for Java"))}</a>
              </div>
              <div ext="shengchen.vscode-checkstyle" displayName="Checkstyle for Java">
                <a href="#" title="${escapeHtml(vscode.l10n.t("Install the Checkstyle for Java extension..."))}">${escapeHtml(vscode.l10n.t("Install Checkstyle for Java"))}</a>
              </div>
              <div ext="redhat.vscode-xml" displayName="XML">
                <a href="#" title="${escapeHtml(vscode.l10n.t("Schema validation when editing pom.xml..."))}">${escapeHtml(vscode.l10n.t("Install XML extension"))}</a>
              </div>
              <div ext="vscjava.vscode-java-dependency" displayName="Project Manager for Java">
                <a href="#" title="${escapeHtml(vscode.l10n.t("Install the Project Manager for Java extension..."))}">${escapeHtml(vscode.l10n.t("Install Project Manager for Java"))}</a>
              </div>
            </div>
          </div>
        </div>
        <div class="col">
          <div class="row mb-3">
            <div class="col">
              <h3 class="font-weight-light">${escapeHtml(vscode.l10n.t("Spring"))}</h3>
              <div>
                <a href="command:java.helper.openUrl?%22https%3A%2F%2Fcode.visualstudio.com%2Fdocs%2Fjava%2Fjava-spring-boot%22" title="${escapeHtml(vscode.l10n.t("Learn how to work with Spring Boot projects in VS Code"))}">${escapeHtml(vscode.l10n.t("Spring Boot with VS Code"))}</a>
              </div>
              <div>
                <a href="command:java.helper.openUrl?%22https%3A%2F%2Fgithub.com%2Fspring-projects%2Fspring-petclinic%22" title="${escapeHtml(vscode.l10n.t("Run PetClinic sample app in VS Code"))}">${escapeHtml(vscode.l10n.t("Spring PetClinic Sample Application"))}</a>
              </div>
              <div ext="vmware.vscode-boot-dev-pack" displayName="Spring Boot Extension Pack">
                <a href="#" title="${escapeHtml(vscode.l10n.t("Install Spring Boot Extension Pack..."))}">${escapeHtml(vscode.l10n.t("Install Spring Boot Extension Pack"))}</a>
              </div>
            </div>
          </div>
          <div class="row mb-3">
            <div class="col">
              <h3 class="font-weight-light">${escapeHtml(vscode.l10n.t("Microservices"))}</h3>
              <div>
                <a href="command:java.helper.openUrl?%22https%3A%2F%2Fcode.visualstudio.com%2Fdocs%2Fazure%2Fkubernetes%22" title="${escapeHtml(vscode.l10n.t("Learn how to work with Kubernetes in VS Code"))}">${escapeHtml(vscode.l10n.t("Kubernetes in VS Code"))}</a>
              </div>
              <div>
                <a href="command:java.helper.openUrl?%22https%3A%2F%2Fcode.visualstudio.com%2Fdocs%2Fazure%2Fdocker%22" title="${escapeHtml(vscode.l10n.t("Learn how to work with Docker in VS Code"))}">${escapeHtml(vscode.l10n.t("Docker in VS Code"))}</a>
              </div>
              <div>
                <a href="command:java.helper.openUrl?%22https%3A%2F%2Fmarketplace.visualstudio.com%2Fitems%3FitemName%3DMicroProfile-Community.vscode-microprofile-pack%26ssr%3Dfalse%23overview%22" title="${escapeHtml(vscode.l10n.t("Marketplace link for Extension Pack for MicroProfile"))}">${escapeHtml(vscode.l10n.t("Extension Pack for MicroProfile in VS Code"))}</a>
              </div>
              <div>
                <a href="command:java.helper.openUrl?%22https%3A%2F%2Fmarketplace.visualstudio.com%2Fitems%3FitemName%3Dredhat.vscode-quarkus%26ssr%3Dfalse%23overview%22" title="${escapeHtml(vscode.l10n.t("Marketplace link for Quarkus Tools for VS Code"))}">${escapeHtml(vscode.l10n.t("Quarkus Tools for VS Code"))}</a>
              </div>
              <div ext="ms-kubernetes-tools.vscode-kubernetes-tools" displayName="Kubernetes">
                <a href="#" title="${escapeHtml(vscode.l10n.t("Install Kubernetes extension..."))}">${escapeHtml(vscode.l10n.t("Install Kubernetes Extension"))}</a>
              </div>
              <div ext="ms-azuretools.vscode-docker" displayName="Docker">
                <a href="#" title="${escapeHtml(vscode.l10n.t("Install Docker extension..."))}">${escapeHtml(vscode.l10n.t("Install Docker Extension"))}</a>
              </div>
              <div ext="MicroProfile-Community.vscode-microprofile-pack" displayName="Extension Pack for MicroProfile">
                <a href="#" title="${escapeHtml(vscode.l10n.t("Install Extension Pack for MicroProfile..."))}">${escapeHtml(vscode.l10n.t("Install Extension Pack for MicroProfile"))}</a>
              </div>
              <div ext="redhat.vscode-quarkus" displayName="Quarkus">
                <a href="#" title="${escapeHtml(vscode.l10n.t("Install Quarkus extension..."))}">${escapeHtml(vscode.l10n.t("Install Quarkus Extension"))}</a>
              </div>
            </div>
          </div>
          <div class="row mb-3">
            <div class="col">
              <h3 class="font-weight-light">${escapeHtml(vscode.l10n.t("Help"))}</h3>
              <div>
                <a href="command:java.helper.openUrl?%22https%3A%2F%2Fgithub.com%2FMicrosoft%2Fvscode-java-pack%2Fissues%22" title="${escapeHtml(vscode.l10n.t("Report issues or request features"))}">${escapeHtml(vscode.l10n.t("Questions & Issues"))}</a>
              </div>
              <div>
                <a href="command:java.helper.openUrl?%22https%3A%2F%2Ftwitter.com%2Fintent%2Ftweet%3Fvia%3Dcode%26hashtags%3DJava%252CHappyCoding%22" title="${escapeHtml(vscode.l10n.t("Tweet us your feedback"))}">${escapeHtml(vscode.l10n.t("Twitter"))}</a>
              </div>
            </div>
          </div>
        </div>
        <div class="col">
          <div class="row mb-3">
            <div class="col">
              <h3 class="font-weight-light">${escapeHtml(vscode.l10n.t("Learn"))}</h3>
              <div class="list-group">
                <button command="java.gettingStarted" class="list-group-item list-group-item-action flex-column align-items-start btn btn-link mb-2 p-2" title="${escapeHtml(vscode.l10n.t("Open Java Beginner Tips View"))}">
                    <p class="mb-1">${escapeHtml(vscode.l10n.t("Java Beginner Tips"))}</p>
                    <small>${formatHtml(vscode.l10n.t("Learn 1 min {0} tutorial, common shortcuts for {1} and {2}, and {3}."), [`<a href="javascript:void(0)" title="${escapeHtml(vscode.l10n.t("Quick Start"))}" command="java.gettingStarted" args='"#quick-start-tab"'>${escapeHtml(vscode.l10n.t("Quick Start"))}</a>`, `<a href="javascript:void(0)" title="${escapeHtml(vscode.l10n.t("Code Editing"))}" command="java.gettingStarted" args='"#code-editing-tab"'>${escapeHtml(vscode.l10n.t("Code Editing"))}</a>`, `<a href="javascript:void(0)" title="${escapeHtml(vscode.l10n.t("Debugging"))}" command="java.gettingStarted" args='"#debugging-tab"'>${escapeHtml(vscode.l10n.t("Debugging"))}</a>`, `<a href="javascript:void(0)" title="${escapeHtml(vscode.l10n.t("FAQ"))}" command="java.gettingStarted" args='"#faq-tab"'>${escapeHtml(vscode.l10n.t("FAQ"))}</a>`])}</small>
                </button>
                <button command="java.helper.openUrl" args='"https://code.visualstudio.com/docs/java/java-tutorial"' class="list-group-item list-group-item-action flex-column align-items-start btn btn-link mb-2 p-2" title="${escapeHtml(vscode.l10n.t("Open Java Tutorials"))}">
                  <p class="mb-1">${escapeHtml(vscode.l10n.t("Java Tutorials"))}</p>
                  <small>${formatHtml(vscode.l10n.t("Learn how to {0} and {1} in VS Code."), [`<a href="javascript:void(0)" title="${escapeHtml(vscode.l10n.t("Open Java Debugging Tutorial"))}" command="java.helper.openUrl" args='"https://code.visualstudio.com/docs/java/java-debugging"'>${escapeHtml(vscode.l10n.t("debug Java apps"))}</a>`, `<a href="javascript:void(0)" title="${escapeHtml(vscode.l10n.t("Open Java Testing Tutorial"))}" command="java.helper.openUrl" args='"https://code.visualstudio.com/docs/java/java-testing"'>${escapeHtml(vscode.l10n.t("run JUnit tests"))}</a>`])}</small>
                </button>
              </div>
            </div>
          </div>
          <div class="row mb-3">
            <div class="col">
              <h3 class="font-weight-light">${escapeHtml(vscode.l10n.t("Configuration"))}</h3>
              <div class="list-group">
                <a href="javascript:void(0)" command="java.runtime" class="list-group-item list-group-item-action flex-column align-items-start btn btn-link mb-2 p-2" title="${escapeHtml(vscode.l10n.t("Open Java Runtime Guide"))}">
                  <p class="mb-1">${escapeHtml(vscode.l10n.t("Configure Java Runtime"))}</p>
                  <small>${escapeHtml(vscode.l10n.t("Setup JDKs for projects and VS Code Java."))}</small>
                </a>
                <a href="javascript:void(0)" command="java.extGuide" class="list-group-item list-group-item-action flex-column align-items-start btn btn-link mb-2 p-2" title="${escapeHtml(vscode.l10n.t("Open Extensions Guide"))}">
                  <p class="mb-1">${escapeHtml(vscode.l10n.t("Extensions Guide"))}</p>
                  <small>${escapeHtml(vscode.l10n.t("Recommended extensions for Java development."))}</small>
                </a>
                <a href="javascript:void(0)" command="workbench.action.openSettings" args='"java."' class="list-group-item list-group-item-action flex-column align-items-start btn btn-link mb-2 p-2" title="${escapeHtml(vscode.l10n.t("Open Java Settings"))}">
                  <p class="mb-1">${escapeHtml(vscode.l10n.t("Java Settings"))}</p>
                  <small>${escapeHtml(vscode.l10n.t("Show the Java settings."))}</small>
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
            <label class="form-check-label" for="showWhenUsingJava">${escapeHtml(vscode.l10n.t("Show overview page when using Java"))}</label>
          </div>
        </div>
      </div>
    </div>
  </body>

  </html>`;
}
