// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import * as path from "path";
import { getExtensionContext, getNonce } from "../utils";
import { sendInfo, instrumentOperation } from "vscode-extension-telemetry-wrapper";

let javaExtGuideView: vscode.WebviewPanel | undefined;

export async function javaExtGuideCmdHandler(context: vscode.ExtensionContext, operationId: string) {
  if (javaExtGuideView) {
    javaExtGuideView.reveal();
    return;
  }

  javaExtGuideView = vscode.window.createWebviewPanel("java.extGuide", "Java Extensions Guide", {
    viewColumn: vscode.ViewColumn.One,
  }, {
    enableScripts: true,
    enableCommandUris: true,
    retainContextWhenHidden: true
  });

  await initializeJavaExtGuideView(context, javaExtGuideView, onDidDisposeWebviewPanel, operationId);
}

function onDidDisposeWebviewPanel() {
  javaExtGuideView = undefined;
}

async function initializeJavaExtGuideView(context: vscode.ExtensionContext, webviewPanel: vscode.WebviewPanel, onDisposeCallback: () => void, operationId: string) {
  webviewPanel.iconPath = {
    light: vscode.Uri.file(path.join(context.extensionPath, "caption.light.svg")),
    dark: vscode.Uri.file(path.join(context.extensionPath, "caption.dark.svg"))
  };

  webviewPanel.webview.html = getHtmlForWebview(webviewPanel, context.asAbsolutePath("./out/assets/ext-guide/index.js"));

  context.subscriptions.push(webviewPanel.onDidDispose(onDisposeCallback));
  context.subscriptions.push(webviewPanel.webview.onDidReceiveMessage(async (e) => {
    if (e.command === "tabActivated") {
      let tabId = e.tabId;
      sendInfo(operationId, {
        infoType: "tabActivated",
        tabId: tabId
      });
    } else if (e.command === "installExtensions") {
      const extNames = <string[]>e.extNames;
      await Promise.all(extNames.map(async extName => {
        return vscode.commands.executeCommand("java.helper.installExtension", extName, extName);
      }));
    }
  }));

  vscode.extensions.onDidChange(_e => {
    syncExtensionStatus();
  });

  function syncExtensionStatus() {
    const installedExtensions = vscode.extensions.all.map(ext => ext.id.toLowerCase());
    webviewPanel.webview.postMessage({
      command: "syncExtensionStatus",
      installedExtensions: installedExtensions
    });
  }

  syncExtensionStatus();
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
    <title>Java Extensions Guide</title>
  </head>
  <body>
    <script nonce="${nonce}" src="${scriptUri}" type="module"></script>
    <div class="container mt-5 mb-5">
      <div class="row mb-3">
        <div class="col">
          <h1 class="font-weight-light">Java Extensions Guide</h1>
          <h6 class="font-weight-light">Recommended extensions for Java development.</h5>
        </div>
      </div>
      <div class="row">
        <div class="col">
          <div class="card">
            <div class="card-body">
              <div class="row">
                <div class="col-3 d-block">
                  <ul class="nav nav-pills flex-column mb-3" role="tablist">
                    <li class="nav-item">
                      <a class="nav-link active" id="tab-basics" data-toggle="tab" href="#panel-basics" role="tab" aria-controls="panel-basics" aria-selected="true" title="">Basics</a>
                    </li>
                    <li class="nav-item">
                      <a class="nav-link" id="tab-frameworks" data-toggle="tab" href="#panel-frameworks" role="tab" aria-controls="panel-frameworks" aria-selected="false" title="">Frameworks</a>
                    </li>
                    <li class="nav-item">
                      <a class="nav-link" id="tab-app-servers" data-toggle="tab" href="#panel-app-servers" role="tab" aria-controls="panel-app-servers" aria-selected="false" title="">Application Servers</a>
                    </li>
                    <li class="nav-item">
                      <a class="nav-link" id="tab-keymaps" data-toggle="tab" href="#panel-keymaps" role="tab" aria-controls="panel-keymaps" aria-selected="false" title="">Keymaps</a>
                    </li>
                  </ul>
                </div>
                <div class="col-5">
                  <div class="tab-content">

                    <!-- Basics -->
                    <div class="tab-pane fade show active" id="panel-basics" role="tabpanel" aria-labelledby="tab-basics">
                      <table class="table table-borderless table-hover table-sm">
                        <tbody>
                          <tr>
                            <td>
                              <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="redhat.java" id="chk.redhat.java">
                                <label class="form-check-label" for="chk.redhat.java">
                                  Language Support for Java by Red Hat
                                </label>

                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="vscjava.vscode-java-debug" id="chk.vscjava.vscode-java-debug">
                                <label class="form-check-label" for="chk.vscjava.vscode-java-debug">
                                  Debugger for Java
                                </label>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="vscjava.vscode-java-dependency" id="chk.vscjava.vscode-java-dependency">
                                <label class="form-check-label" for="chk.vscjava.vscode-java-dependency">
                                  Project Manager for Java
                                </label>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="vscjava.vscode-java-test" id="chk.vscjava.vscode-java-test">
                                <label class="form-check-label" for="chk.vscjava.vscode-java-test">
                                  Test Runner for Java
                                </label>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="vscjava.vscode-maven" id="chk.vscjava.vscode-maven">
                                <label class="form-check-label" for="chk.vscjava.vscode-maven">
                                  Maven for Java
                                </label>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="sonarsource.sonarlint-vscode" id="chk.sonarsource.sonarlint-vscode">
                                <label class="form-check-label" for="chk.sonarsource.sonarlint-vscode">
                                  SonarLint
                                </label>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <!-- Frameworks -->
                    <div class="tab-pane fade" id="panel-frameworks" role="tabpanel" aria-labelledby="tab-frameworks">
                      <table class="table table-borderless table-hover table-sm">
                        <tbody>
                          <tr>
                            <td>
                              <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="vmware.vscode-boot-dev-pack" id="chk.vmware.vscode-boot-dev-pack">
                                <label class="form-check-label" for="chk.vmware.vscode-boot-dev-pack">
                                  Spring Boot Extension Pack
                                </label>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="microprofile-community.vscode-microprofile-pack" id="chk.microprofile-community.vscode-microprofile-pack">
                                <label class="form-check-label" for="chk.microprofile-community.vscode-microprofile-pack">
                                  Extension Pack for MicroProfile
                                </label>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="redhat.vscode-quarkus" id="chk.redhat.vscode-quarkus">
                                <label class="form-check-label" for="chk.redhat.vscode-quarkus">
                                  Quarkus
                                </label>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <!-- Application Servers -->
                    <div class="tab-pane fade" id="panel-app-servers" role="tabpanel" aria-labelledby="tab-app-servers">
                      <table class="table table-borderless table-hover table-sm">
                        <tbody>
                          <tr>
                            <td>
                              <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="redhat.vscode-community-server-connector" id="chk.redhat.vscode-community-server-connector">
                                <label class="form-check-label" for="chk.redhat.vscode-community-server-connector">
                                  Community Server Connectors
                                </label>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <!-- Keymaps -->
                    <div class="tab-pane fade" id="panel-keymaps" role="tabpanel" aria-labelledby="tab-keymaps">
                      <table class="table table-borderless table-hover table-sm">
                        <tbody>
                          <tr>
                            <td>
                              <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="alphabotsec.vscode-eclipse-keybindings" id="chk.alphabotsec.vscode-eclipse-keybindings">
                                <label class="form-check-label" for="chk.alphabotsec.vscode-eclipse-keybindings">
                                  Eclipse Keymap
                                </label>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="k--kato.intellij-idea-keybindings" id="chk.k--kato.intellij-idea-keybindings">
                                <label class="form-check-label" for="chk.k--kato.intellij-idea-keybindings">
                                  IntelliJ IDEA Keybindings
                                </label>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                  </div>
                </div>
                <div class="col-4">
                  <p class="d-none" ext="redhat.java">
                    Java Linting, Intellisense, formatting, refactoring, Maven/Gradle support and more.
                  </p>
                  <p class="d-none" ext="vscjava.vscode-java-debug">
                    Debug Java applications.
                  </p>
                  <p class="d-none" ext="vscjava.vscode-java-dependency">
                    Manage Java projects, dependencies, and generate packages.
                  </p>
                  <p class="d-none" ext="vscjava.vscode-java-test">
                    Run and debug JUnit & TestNG test cases.
                  </p>
                  <p class="d-none" ext="vscjava.vscode-maven">
                    Manage Maven projects, work with goals & dependencies, generate projects from archetypes.
                  </p>
                  <p class="d-none" ext="sonarsource.sonarlint-vscode">
                    Detect and fix quality issues as you write code.
                  </p>
                  <p class="d-none" ext="pivotal.vscode-boot-dev-pack">
                    Spring Boot-specific support for \".java\" files. As well as validation and content assist for Spring Boot \"application.properties\", \"application.yml\" properties files.
                  </p>
                  <p class="d-none" ext="microprofile-community.vscode-microprofile-pack">
                    A collection of extensions to develop Java microservices with Eclipse MicroProfile
                  </p>
                  <p class="d-none" ext="redhat.vscode-quarkus">
                    Quarkus Tools for Visual Studio Code.
                  </p>
                  <p class="d-none" ext="redhat.vscode-community-server-connector">
                    Manage and publish to servers and runtimes like Tomcat, Apache Felix, and Karaf.
                  </p>
                  <p class="d-none" ext="alphabotsec.vscode-eclipse-keybindings">
                    Port of Eclipse keyboard shortcuts.
                  </p>
                  <p class="d-none" ext="k--kato.intellij-idea-keybindings">
                    Port of IntelliJ IDEA Keybindings, including for WebStorm, PyCharm, PHP Storm, etc.
                  </p>
                  <p class="text-right">
                    <a role="button" class="btn btn-primary btn-sm d-none" id="btn-learn-more" href="#">Learn More</a>
                  </p>
                </div>
              </div>
              <div class="row">
                <div class="col-3"></div>
                <div class="col-5 text-right">
                  <button type="button" class="btn btn-primary btn-sm d-none" id="btn-install-selected">Install Selected</button>
                  <button type="button" class="btn btn-primary btn-sm" id="btn-install-all">Install All</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>

  </html>
  `;
}

export class JavaExtGuideViewSerializer implements vscode.WebviewPanelSerializer {
  async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, _state: any) {
    if (javaExtGuideView) {
      javaExtGuideView.reveal();
      webviewPanel.dispose();
      return;
    }

    javaExtGuideView = webviewPanel;
    instrumentOperation("restoreExtGuideView", operationId => {
      initializeJavaExtGuideView(getExtensionContext(), webviewPanel, onDidDisposeWebviewPanel, operationId);
    })();
  }
}
