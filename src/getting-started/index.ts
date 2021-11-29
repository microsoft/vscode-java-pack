// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import * as path from "path";
import { getExtensionContext, getNonce } from "../utils";
import { sendInfo, instrumentOperation } from "vscode-extension-telemetry-wrapper";

let javaGettingStartedView: vscode.WebviewPanel | undefined;

export async function javaGettingStartedCmdHandler(context: vscode.ExtensionContext, operationId: string, tabId?: string) {
  if (javaGettingStartedView) {
    setActiveTab(javaGettingStartedView, operationId, tabId);
    javaGettingStartedView.reveal();
    return;
  }

  javaGettingStartedView = vscode.window.createWebviewPanel("java.gettingStarted", "Java Beginner Tips", {
    viewColumn: vscode.ViewColumn.One,
  }, {
    enableScripts: true,
    enableCommandUris: true,
    retainContextWhenHidden: true
  });

  setActiveTab(javaGettingStartedView, operationId, tabId);
  await initializeJavaGettingStartedView(context, javaGettingStartedView, onDidDisposeWebviewPanel, operationId);
}

function setActiveTab(webviewPanel: vscode.WebviewPanel, operationId: string, tabId?: string) {
  if (tabId) {
    sendInfo(operationId, {
      infoType: "tabActivated",
      tabId: tabId
    });
    webviewPanel.webview.postMessage({
      command: "tabActivated",
      tabId,
    });
  }
}

function onDidDisposeWebviewPanel() {
  javaGettingStartedView = undefined;
}

async function initializeJavaGettingStartedView(context: vscode.ExtensionContext, webviewPanel: vscode.WebviewPanel, onDisposeCallback: () => void, operationId: string) {
  webviewPanel.iconPath = {
    light: vscode.Uri.file(path.join(context.extensionPath, "caption.light.svg")),
    dark: vscode.Uri.file(path.join(context.extensionPath, "caption.dark.svg"))
  };
  webviewPanel.webview.html = getHtmlForWebview(context.asAbsolutePath("./out/assets/getting-started/index.js"));
  context.subscriptions.push(webviewPanel.onDidDispose(onDisposeCallback));
  context.subscriptions.push(webviewPanel.webview.onDidReceiveMessage(async (e) => {
    if (e.command === "tabActivated") {
      let tabId = e.tabId;
      sendInfo(operationId, {
        infoType: "tabActivated",
        tabId: tabId
      });
    }
  }));
}

function getHtmlForWebview(scriptPath: string) {
  const scriptPathOnDisk = vscode.Uri.file(scriptPath);
  const scriptUri = (scriptPathOnDisk).with({ scheme: "vscode-resource" });
  // Use a nonce to whitelist which scripts can be run
  const nonce = getNonce();
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
    <meta name="theme-color" content="#000000">
    <title>Coding and Debugging Tips for Beginners</title>
  </head>
  <body>
    <script nonce="${nonce}" src="${scriptUri}" type="module"></script>
    <div class="container mt-5 mb-5">
      <div class="row mb-3">
        <div class="col">
          <h1 class="font-weight-light">Coding and Debugging Tips for Beginners</h1>
        </div>
      </div>
      <div class="row">
        <div class="col">
          <div class="card">
            <div class="card-body">
              <div class="row">
                <div class="col d-block">
                  <ul class="nav nav-tabs mb-3" role="tablist">
                    <li class="nav-item">
                      <a class="nav-link active" id="quick-start-tab" data-toggle="tab" href="#quick-start-panel" role="tab" aria-controls="quick-start-panel" aria-selected="true" title="">Quick Start</a>
                    </li>
                    <li class="nav-item d-none">
                      <a class="nav-link" id="files-folders-tab" data-toggle="tab" href="#files-folders-panel" role="tab" aria-controls="files-folders-panel" aria-selected="false" title="">Files & Folders</a>
                    </li>
                    <li class="nav-item">
                      <a class="nav-link" id="code-editing-tab" data-toggle="tab" href="#code-editing-panel" role="tab" aria-controls="code-editing-panel" aria-selected="false" title="">Code Editing</a>
                    </li>
                    <li class="nav-item">
                      <a class="nav-link d-none" id="compile-build-tab" data-toggle="tab" href="#compile-build-panel" role="tab" aria-controls="compile-build-panel" aria-selected="false" title="">Compile & Build</a>
                    </li>
                    <li class="nav-item">
                      <a class="nav-link" id="debugging-tab" data-toggle="tab" href="#debugging-panel" role="tab" aria-controls="debugging-panel" aria-selected="false" title="">Debugging</a>
                    </li>
                    <li class="nav-item d-none">
                      <a class="nav-link" id="projects-dependencies-tab" data-toggle="tab" href="#projects-dependencies-panel" role="tab" aria-controls="projects-dependencies-panel" aria-selected="false" title="">Projects</a>
                    </li>
                    <li class="nav-item d-none">
                      <a class="nav-link" id="customize-tab" data-toggle="tab" href="#customize-panel" role="tab" aria-controls="customize-panel" aria-selected="false" title="">Customize</a>
                    </li>
                    <li class="nav-item">
                      <a class="nav-link" id="faq-tab" data-toggle="tab" href="#faq-panel" role="tab" aria-controls="faq-panel" aria-selected="false" title="">FAQ</a>
                    </li>
                  </ul>
                </div>
              </div>
              <div class="row">
                <div class="col">
                  <div class="tab-content">
  
                    <!-- Quick Start -->
                    <div class="tab-pane fade show active" id="quick-start-panel" role="tabpanel" aria-labelledby="quick-start-tab">
                      <p>Welcome to Visual Studio Code!<br/>
                        In this 1-minute tutorial, we'll show you how to create a quick-start Java program in VS Code.
                      </p>
                      <h3 class="font-weight-light">Setup the Workspace</h3>
                      <p>
                        VS Code Java works directly with <strong>folders</strong> that have source code. To setup the workspace, simply open a folder using File > <a href="command:workbench.action.files.openFolder" data-os="win">Open Folder...</a><a href="command:workbench.action.files.openFileFolder" data-os="mac">Open...</a>
                      </p>
                      <h3 class="font-weight-light">Create a Class</h3>
                      <p>
                        A program needs an entry and a Java program needs a class to host its entry. To create a class for our quick-start program, <a href="command:explorer.newFile">Create a File</a> and set its name to <code>QuickStart.java</code>.<br/>
                        Now you can put the code in the new file:
                      </p>
                      <blockquote class="card-body">
  <pre class="mb-0"><code>class QuickStart {
      public static void main(String[] args) {
          System.out.println("Hello, World.");
      }
  }</code></pre>
                      </blockquote>
                      <h3 class="font-weight-light">Run the program</h3>
                      <p>
                        To run the program, press <a href="command:workbench.action.debug.start"><kbd>F5</kbd></a>. By default, the program is launched in the <a href="command:workbench.action.terminal.toggleTerminal">Integrated Terminal</a>. You should already see the output there.
                      </p>
                      <blockquote class="card-body">
                        <h5 class="font-weight-light">How to Debug?</h5>
                        <p class="mb-0">
                          When you press <a href="command:workbench.action.debug.start"><kbd>F5</kbd></a>, you are already debugging. Try setting some breakpoint by clicking on the line numbers before each code line and run the program again. You'll see the execution paused at the breakpoint.<br/>
                          While debugging, switch to the <a href="command:workbench.view.debug">Debug View</a> to see the variables and call stacks.
                        </p>
                      </blockquote>
                      <h3 class="font-weight-light">Congratulations!</h3>
                      <p>
                        Now the quick-start program is running and you are free to build more.<br/>
                        What you saw is just a tiny part of VS Code Java. You can do much more with it. Feel free to explore:
                      </p>
                      <dl class="row mb-0" id="navigationPanel">
                        <dt class="col-sm-3"><a href="#code-editing-tab">Code Editing</a></dt>
                        <dd class="col-sm-9">Learn more about Code Navigation, Refactoring, and Code Completion</dd>
                        <dt class="col-sm-3"><a href="#debugging-tab">Debugging</a></dt>
                        <dd class="col-sm-9">Learn more about Breakpoints, Variables, Threads, and Call Stacks</dd>
                        <dt class="col-sm-3"><a href="#faq-tab">FAQ</a></dt>
                        <dd class="col-sm-9">Frequently asked questions</dd>
                      </dl>
                    </div>
  
                    <!-- Files & Folders -->
                    <div class="tab-pane fade" id="files-folders-panel" role="tabpanel" aria-labelledby="files-folders-tab">
                      <p>How to deal with files and folders</p>
                    </div>
  
                    <!-- Code Editing -->
                    <div class="tab-pane fade" id="code-editing-panel" role="tabpanel" aria-labelledby="code-editing-tab">
                      <p>
                        VS Code Java is backed by a full Java language server and it understands Java code. Because of that, you get features like Code Navigation, IntelliSense, Refactoring, etc. This is important when your projects get bigger and more complex. Now let's further look at the code editing experience.
                      </p>
                      <blockquote class="card-body">
                        <h5 class="font-weight-light">Basic Editing User Guide</h5>
                        <p class="mb-0">
                          To make the most of VS Code, we strongly recommend reading the <a href="https://code.visualstudio.com/docs/editor/codebasics">Basic Editing</a> user guide. You'll get to know cool tricks about multi-select, formatting, indentation, folding, and much more.
                        </p>
                      </blockquote>
                      <h3 class="font-weight-light">Code Navigation</h3>
                      <p>
                        Code Navigation makes it easy to understand existing codebase. Here to mention a few features that can help you navigate your code repositories.
                        <dl class="row">
                          <dt class="col-sm-3">Go to Definition</dt>
                          <dd class="col-sm-9"><kbd>F12</kbd><br/>You can also hover on the symbol to preview its declaration and javadoc. To jump to the definition, hold the <kbd data-os="win">Ctrl</kbd><kbd data-os="mac">⌘</kbd> key, and click on the symbol.</dd>
                          <dt class="col-sm-3">Go to Implementation</dt>
                          <dd class="col-sm-9"><kbd data-os="win">Ctrl + F12</kbd><kbd data-os="mac">⌘ F12</kbd><br/>
                            For an interface, this shows all the implementors of that interface and for abstract methods, this shows all concrete implementations of that method.</dd>
                          <dt class="col-sm-3">Go to Type Definition</dt>
                          <dd class="col-sm-9">This one allows you to go to the definition of the type of the symbol. For example, you have a class member <code>someString</code>, "Go to Definition" will take you to the definition of <code>someString</code> while "Go to <strong>Type</strong> Definition" will take you to the definition of <code>String</code>.</dd>
                          <dt class="col-sm-3">Find All References</dt>
                          <dd class="col-sm-9"><kbd data-os="win">Shift + Alt + F12</kbd><kbd data-os="mac">⌥ ⇧ F12</kbd><br/>
                            This allows you to quickly analyze the impact of your edit or the popularity of your specific method or property throughout your repository.
                          </dd>
                        </dl>
                      </p>
                      <p>
                        The commands above will possibly take you to another file. But you can choose to stay using the peeking features below:
                        <dl class="row">
                          <dt class="col-sm-3">Peek Definition</dt>
                          <dd class="col-sm-9"><kbd data-os="win">Alt + F12</kbd><kbd data-os="mac">⌥ F12</kbd></dd>
                          <dt class="col-sm-3">Peek References</dt>
                          <dd class="col-sm-9"><kbd data-os="win">Shift + F12</kbd><kbd data-os="mac">⇧ F12</kbd></dd>
                        </dl>
                      </p>
                      <p>
                        Last but not least, you can jump between the matching brackets back and forth:
                        <dl class="row">
                          <dt class="col-sm-3">Go to Bracket</dt>
                          <dd class="col-sm-9"><kbd data-os="win">Ctrl + Shift + \</kbd><kbd data-os="mac">⇧ ⌘ \</kbd></dd>
                        </dl>
                      </p>
                      <h3 class="font-weight-light">IntelliSense</h3>
                      <p>
                        IntelliSense is a general term for a variety of code editing features including: code completion, parameter info, quick info, and member lists. IntelliSense features are sometimes called by other names such as "code completion", "content assist", and "code hinting."
                      </p>
                      <p>
                        IntelliSense works as you type. For example, when you try to invoke some member of an object, a list of all the members is popped up for you to choose from. If you continue typing characters, the list of members (variables, methods, etc.) is filtered to only include members containing your typed characters. Pressing <kbd>Tab</kbd> or <kbd>Enter</kbd> will insert the selected member.
                      </p>
                      <blockquote class="card-body">
                        <h5 class="font-weight-light">Trigger IntelliSense Manually</h5>
                        <p class="mb-0">
                          In most cases, IntelliSense is triggered automatically. You can also press <kbd data-os="win">Ctrl + Space</kbd><kbd data-os="mac">⌃ Space</kbd> to do it manually. For example, when you're trying to invoke a member function and want to see the parameter info, this will do the magic.
                        </p>
                      </blockquote>
                      <h3 class="font-weight-light">Refactoring</h3>
                      <p>
                        VS Code Java provides essential refactoring features and makes it productive to modify larger codebase. The most frequently used one is <strong>Rename</strong>. It's so popular that a dedicated hot key <kbd>F2</kbd> is assigned to it. When you rename a symbol, all its references are also renamed.
                      </p>
                      <p>
                        There are more refactoring features like <strong>Extract</strong>, <strong>Inline</strong>, etc. The availability changes corresponding to the current cursor position. All available features are packed in to the <strong>Refactor</strong> context menu. And you can also pop the list by pressing <kbd data-os="win">Ctrl + Shift + R</kbd><kbd data-os="mac">⌃ ⇧ R</kbd>
                      </p>
                      <p>
                        You may also notice the lightbulb near the cursor. It indicates that some <strong>Code Actions</strong> are available. In VS Code, Code Actions can provide both refactorings and Quick Fixes for detected issues. To show the full list of available actions, click the lightbulb or press <kbd data-os="win">Ctrl + .</kbd><kbd data-os="mac">⌘ .</kbd>.
                      </p>
                      <blockquote class="card-body">
                        <h5 class="font-weight-light">More Code Actions</h5>
                        <p>
                          There are other code actions that are not limited to the cursor position. They are grouped into the <strong>Source Action</strong> context menu. Here's a list of them.
                        </p>
                        <ul class="mb-0">
                          <li>Organize Imports</li>
                          <li>Override/Implement Methods</li>
                          <li>Generate Getter and Setter</li>
                          <li>Generate hashCode() and equals()</li>
                          <li>Generate toString()</li>
                          <li>Generate Constructors</li>
                          <li>Generate Delegate Methods</li>
                        </ul>
                      </blockquote>
                      <h3 class="font-weight-light">Next Steps</h3>
                      <dl class="row mb-0" id="navigationPanel">
                        <dt class="col-sm-3"><a href="#debugging-tab">Debugging</a></dt>
                        <dd class="col-sm-9">Learn more about Breakpoints, Variables, Threads, and Call Stacks</dd>
                        <dt class="col-sm-3"><a href="#faq-tab">FAQ</a></dt>
                        <dd class="col-sm-9">Frequently asked questions</dd>
                      </dl>
                    </div>
  
                    <!-- Compile & Build -->
                    <div class="tab-pane fade" id="compile-build-panel" role="tabpanel" aria-labelledby="compile-build-tab">
                      <p>Understand the compile and build mechanism of the language server</p>
                    </div>
  
                    <!-- Debugging -->
                    <div class="tab-pane fade" id="debugging-panel" role="tabpanel" aria-labelledby="debugging-tab">
                      <p>
                        One of the key features of Visual Studio Code is its great debugging support. VS Code's built-in debugger helps accelerate your edit, compile and debug loop.
                      </p>
                      <h3 class="font-weight-light">Start Debugging</h3>
                      <p>
                        There are multiple ways to start debugging a Java program. By pressing <a href="command:workbench.action.debug.start"><kbd>F5</kbd></a>, the current program will be launched. You can also start by clicking the <strong>"Debug"</strong> codelens on top of the <code>main</code> function. This is super handy when you have multiple main entries. You can also launch a program <strong>without</strong> debugging by pressing <a href="command:workbench.action.debug.run"><kbd data-os="win">Ctrl + F5</kbd><kbd data-os="mac">⌃ F5</kbd></a>.
                      </p>
                      <p>
                        By default, VS Code Java launches the program using <a href="command:workbench.action.terminal.toggleTerminal">Integrated Terminal</a>. As you enter the debug mode, you should also see the <a href="command:workbench.view.debug">Debug View</a>. This view shows all the runtime info of your program.
                      </p>
                      <blockquote class="card-body">
                        <h5 class="font-weight-light">Debug Configurations</h5>
                        <p class="mb-0">
                          VS Code Java automatically generates debug configurations. In VS Code, those configurations are called <a href="https://code.visualstudio.com/docs/editor/debugging#_launch-configurations">Launch Configurations</a> and they are persisted in <code data-os="win">.vscode\launch.json</code><code data-os="mac">.vscode/launch.json</code>. To work with more sophisticated debug scenarios, please explore the <a href="https://code.visualstudio.com/docs/editor/debugging#_launchjson-attributes">Launch Options</a> that are supported by VS Code.
                        </p>
                      </blockquote>
                      <h3 class="font-weight-light">Breakpoints</h3>
                      <p>
                        Breakpoints can be toggled by clicking on the editor margin or using <kbd>F9</kbd> on the current line. Finer breakpoint control (enable/disable/reapply) can be done in the Debug View's BREAKPOINTS section.
                      </p>
                      <p>
                        You can also set <strong>Conditional Breakpoints</strong> based on expressions, hit counts, or a combination of both.
                      </p>
                      <dl class="row">
                        <dt class="col-sm-3">Expression condition</dt>
                        <dd class="col-sm-9">The breakpoint will be hit whenever the expression evaluates to <code>true</code></dd>
                        <dt class="col-sm-3">Hit count</dt>
                        <dd class="col-sm-9">The 'hit count' controls how many times a breakpoint needs to be hit before it will 'break' execution</dd>
                      </dl>
                      <p>
                        You can add a condition and/or hit count when creating the breakpoint (with the <a href="command:editor.debug.action.conditionalBreakpoint">Add Conditional Breakpoint</a> action) or when modifying an existing one (with the Edit Breakpoint action). In both cases, an inline text box with a drop-down menu opens where you can enter expressions.
                      </p>
                      <blockquote class="card-body">
                        <h5 class="font-weight-light">Logpoints</h5>
                        <p>
                          A Logpoint is a variant of a breakpoint that does not "break" into the debugger but instead logs a message to the console. Logpoints are especially useful for injecting logging while debugging production servers that cannot be paused or stopped.
                        </p>
                        <p class="mb-0">
                          A Logpoint is represented by a ♦️ shaped icon. Log messages are plain text but can include expressions to be evaluated within curly braces ('{}').
                        </p>
                      </blockquote>
                      <h3 class="font-weight-light">Debug Actions</h3>
                      <p>
                        Once a debug session starts, the Debug toolbar will appear on the top of the editor. You can control the execution flow using the actions below.
                      </p>
                      <dl class="row">
                        <dt class="col-sm-3">Continue/Pause</dt>
                        <dd class="col-sm-9"><kbd>F5</kbd></dd>
                        <dt class="col-sm-3">Step Over</dt>
                        <dd class="col-sm-9"><kbd>F10</kbd></dd>
                        <dt class="col-sm-3">Step Into</dt>
                        <dd class="col-sm-9"><kbd>F11</kbd></dd>
                        <dt class="col-sm-3">Step Out</dt>
                        <dd class="col-sm-9"><kbd data-os="win">Shift + F11</kbd><kbd data-os="mac">⇧ F11</kbd></dd>
                        <dt class="col-sm-3">Restart</dt>
                        <dd class="col-sm-9"><kbd data-os="win">Ctrl + Shift + F5</kbd><kbd data-os="mac">⇧ ⌘ F5</kbd></dd>
                        <dt class="col-sm-3">Stop</dt>
                        <dd class="col-sm-9"><kbd data-os="win">Shift + F5</kbd><kbd data-os="mac">⇧ F5</kbd></dd>
                      </dl>
                      <h3 class="font-weight-light">Inspect Variables</h3>
                      <p>
                        Variables can be inspected in the <strong>VARIABLES</strong> section of the Debug view or by hovering over their source in the editor. Variable values and expression evaluation are relative to the selected stack frame in the <strong>CALL STACK</strong> section.
                      </p>
                      <p>
                        Variable values can be modified with the <strong>Set Value</strong> action from the variable's context menu. Or you can <strong>double-click</strong> the value and enter a new one. Variables and expressions can also be evaluated and watched in the Debug view's <strong>WATCH</strong> section.
                      </p>
                      <h3 class="font-weight-light">Hot Code Replace ⚡</h3>
                      <p>
                        Yes, you can apply code changes without restarting the running program. Click on the <a href="command:java.debug.hotCodeReplace">⚡</a> icon in the <strong>debug toolbar</strong> to apply code changes. When you see failures, don't worry. It is safe to continue running the program, but you may notice discrepancies between the source code and the program.
                      </p>
                      <blockquote class="card-body">
                        <h5 class="font-weight-light">Limitations</h5>
                        <p>
                          Hot Code Replace (HCR) sounds magical but it does have limitations. In short, you can only change the code inside an existing function. Here are some scenarios that HCR will <span class="text-danger">NOT</span> work:
                        </p>
                        <ul class="mb-0">
                          <li>Adding a new member function</li>
                          <li>Changing the signature of an existing function</li>
                          <li>Changing the value of static members (but you can do so using the VARIABLES panel when the program is paused)</li>
                          <li>Referencing new classes/packages</li>
                        </ul>
                      </blockquote>
                      <h3 class="font-weight-light">Next Step</h3>
                      <dl class="row mb-0" id="navigationPanel">
                        <dt class="col-sm-3"><a href="#faq-tab">FAQ</a></dt>
                        <dd class="col-sm-9">Frequently asked questions</dd>
                      </dl>
                    </div>
  
                    <!-- Projects & Dependencies -->
                    <div class="tab-pane fade" id="projects-dependencies-panel" role="tabpanel" aria-labelledby="projects-dependencies-tab">
                      <p>How to deal with projects and dependencies</p>
                    </div>
  
                    <!-- Customize -->
                    <div class="tab-pane fade" id="customize-panel" role="tabpanel" aria-labelledby="customize-tab">
                      <p>How to customize vs code</p>
                    </div>
  
                    <!-- FAQ -->
                    <div class="tab-pane fade" id="faq-panel" role="tabpanel" aria-labelledby="faq-tab">
                      <blockquote class="card-body">
                        <h5 class="font-weight-light">Feedback Channels</h5>
                        <p>
                          VS Code Java is new, and we are here to help.
                        </p>
                        <dl class="row mb-0">
                          <dt class="col-sm-3"><a href="https://gitter.im/redhat-developer/vscode-java">Ask Questions</a></dt>
                          <dd class="col-sm-9"><a href="https://gitter.im/redhat-developer/vscode-java">vscode-java</a> Gitter channel is recommended to ask for help</dd>
                          <dt class="col-sm-3"><a href="https://github.com/microsoft/vscode-java-pack/issues">Open Issues</a></dt>
                          <dd class="col-sm-9"><a href="https://github.com/microsoft/vscode-java-pack/issues">vscode-java-pack</a> GitHub repo is recommended for opening bugs</dd>
                          <dt class="col-sm-3"><a href="https://twitter.com/search?q=vscodejava">Other Feedback</a></dt>
                          <dd class="col-sm-9"><a href="https://twitter.com/VSCodeJava">@VSCodeJava</a> is the handle to mention on twitter</dd>
                        </dl>
                      </blockquote>
                      <h3 class="font-weight-light">Why do I see the JDK errors?</h3>
                      <p>
                        <strong><code>JDK 11+</code> is required</strong> to run the Java language support (redhat.java) extension! You see this error because we failed to find one on your machine. The <a href="command:java.runtime">Configure Java Runtime</a> guide can help you understand how JDK path is searched and provides download links if you need to install one.
                      </p>
                      <h3 class="font-weight-light">Can I run my Java 8 project with JDK 1.8?</h3>
                      <p>
                        Yes. The JDK 11 requirement is just for running the Java language support (redhat.java) extension itself. You can still configure a different runtime <a href="command:java.helper.openUrl?%22https%3A%2F%2Fcode.visualstudio.com%2Fdocs%2Fjava%2Fjava-project%23_jdk-for-projects%22">JDK for your project</a> via the user setting <a href="command:workbench.action.openSettings?%22java.configuration.runtimes%22">"java.configuration.runtimes"</a>. The extension will pick a matching JDK to compile/run your project according to the compiler version specified by the project build file.
                        <pre>
  "java.configuration.runtimes": [
    {
      "name": "JavaSE-1.8",
      "path": "/usr/local/jdk1.8.0_201"
    },
    {
      "name": "JavaSE-11",
      "path": "/usr/local/jdk-11.0.3",
      "sources" : "/usr/local/jdk-11.0.3/lib/src.zip",
      "javadoc" : "https://docs.oracle.com/en/java/javase/11/docs/api",
      "default":  true
    }
  ]
                        </pre>
                      </p>
                      <h3 class="font-weight-light">Why do I see tons of problems and red squiggles?</h3>
                      <p>
                        The problems are from VS Code Java when it tries to compile and build your codebase. If you experience this on your first use, it's possibly because of <strong>missing dependencies</strong>. To fix it, you probably want to start from fixing the project configuration files, e.g. <code>pom.xml</code> and <code>build.gradle</code>. After you make changes to those files, try <a href="command:java.projectConfiguration.update">Update Project Configuration</a> and <a href="command:java.workspace.compile">Force Compilation</a>.
                      </p>
                      <p>
                        It can also happen after you work with one project for a while. Try <a href="command:java.clean.workspace">Clean Workspace</a> to get rid of any intermediate output from the language server.
                      </p>
                      <p>
                        If the problem persists, follow the <a href="https://github.com/redhat-developer/vscode-java/wiki/Troubleshooting">Troubleshooting Guide</a>. For advanced users, the <a href="command:java.open.clientLog">Client Logs</a> and <a href="command:java.open.serverLog">Server Logs</a> will definitely help you understand what is going on.
                      </p>
                      <h3 class="font-weight-light">Why can't I see any IntelliSense suggestions?</h3>
                      <p>
                        VS Code Java needs to compile your code before it can provide suggestions. When it's working, you should see a spinning 🔄 on the right end of the status bar. And it will show 👍 when it's done. And you should be able to use all the features.
                      </p>
                      <p>
                        It could take longer for the language server to load a project which references lots of dependencies. Those dependencies need to be resolved and downloaded from the internet. So the network connection plays a critical role in the process.
                      </p>
                      <h3 class="font-weight-light">Why do I see a little ⭐ in some of the IntelliSense suggestions?</h3>
                      <p>
                        This is because <a href="https://marketplace.visualstudio.com/items?itemName=VisualStudioExptTeam.vscodeintellicode">Visual Studio IntelliCode</a> is working. IntelliCode ranks the suggestions using the model trained from the source code of popular open source projects. The items with the stars are the ones that fit the current context the most.
                      </p>
                      <h3 class="font-weight-light">Can I use Lombok?</h3>
                      <p>
                        Yes. You'll need to install the <a href="https://marketplace.visualstudio.com/items?itemName=GabrielBB.vscode-lombok">Lombok</a> extension, which enables VS Code to process Lombok annotations. To learn more about alternatives and details, visit <a href="https://github.com/redhat-developer/vscode-java/wiki/Lombok-support">this page</a>.
                      </p>
                      <h3 class="font-weight-light">Can I develop Android apps using VS Code Java?</h3>
                      <p>
                        Sorry, it's not supported now.
                      </p>
                      <h3 class="font-weight-light">How to troubleshoot the problems?</h3>
                      <p class="mb-0">
                        You could click <b>F1</b> -> <b>Java: Open all log files</b> to get the logs. Also learn more at <a href="https://github.com/redhat-developer/vscode-java/wiki/Troubleshooting">Troubleshooting Guide</a>.
                      </p>
                    </div>
                  </div>
                </div>
                <div class="col-3 d-none">
                  <div class="list-group list-group-flush" role="tablist">
                    <a class="list-group-item list-group-action active" id="quick-start-tab" data-toggle="list" href="#quick-start-panel" role="tab" aria-controls="quick-start-panel" aria-selected="true" title="">Quick Start</a>
                    <a class="list-group-item list-group-action d-none" id="files-folders-tab" data-toggle="list" href="#files-folders-panel" role="tab" aria-controls="files-folders-panel" aria-selected="false" title="">Files & Folders</a>
                    <a class="list-group-item list-group-action" id="code-editing-tab" data-toggle="list" href="#code-editing-panel" role="tab" aria-controls="code-editing-panel" aria-selected="false" title="">Code Editing</a>
                    <a class="list-group-item list-group-action d-none" id="compile-build-tab" data-toggle="list" href="#compile-build-panel" role="tab" aria-controls="compile-build-panel" aria-selected="false" title="">Compile & Build</a>
                    <a class="list-group-item list-group-action" id="debugging-tab" data-toggle="list" href="#debugging-panel" role="tab" aria-controls="debugging-panel" aria-selected="false" title="">Debugging</a>
                    <a class="list-group-item list-group-action d-none" id="projects-dependencies-tab" data-toggle="list" href="#projects-dependencies-panel" role="tab" aria-controls="projects-dependencies-panel" aria-selected="false" title="">Projects</a>
                    <a class="list-group-item list-group-action d-none" id="customize-tab" data-toggle="list" href="#customize-panel" role="tab" aria-controls="customize-panel" aria-selected="false" title="">Customize</a>
                    <a class="list-group-item list-group-action" id="faq-tab" data-toggle="list" href="#faq-panel" role="tab" aria-controls="faq-panel" aria-selected="false" title="">FAQ</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
  
  </html>`;
}

export class JavaGettingStartedViewSerializer implements vscode.WebviewPanelSerializer {
  async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, _state: any) {
    if (javaGettingStartedView) {
      javaGettingStartedView.reveal();
      webviewPanel.dispose();
      return;
    }

    javaGettingStartedView = webviewPanel;
    instrumentOperation("restoreGettingStartedView", operationId => {
      initializeJavaGettingStartedView(getExtensionContext(), webviewPanel, onDidDisposeWebviewPanel, operationId);
    })();
  }
}
