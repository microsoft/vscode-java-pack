// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { GenerateHeaderOptions } from "@microsoft/fast-foundation";
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import * as webviewUI from "@vscode/webview-ui-toolkit";
import React from 'react';
const REQUIRED_JDK_VERSION = 17;
const { wrap } = provideReactWrapper(React);
const DataGrid = wrap(webviewUI.VSCodeDataGrid);
const DataRow = wrap(webviewUI.VSCodeDataGridRow);
const DataCell = wrap(webviewUI.VSCodeDataGridCell);

export default function FaqPanel() {
  const runtimeSampleCode = (
    <code>
      <span>{"\"java.configuration.runtimes\": [{"}</span><br />
      <span>&nbsp;&nbsp;&nbsp;&nbsp;{"\"name\": \"JavaSE-1.8\","}</span><br />
      <span>&nbsp;&nbsp;&nbsp;&nbsp;{"\"path\": \"/usr/local/jdk1.8.0_201\""}</span><br />
      <span>{"}, {"}</span><br />
      <span>&nbsp;&nbsp;&nbsp;&nbsp;{"\"name\": \"JavaSE-11\","}</span><br />
      <span>&nbsp;&nbsp;&nbsp;&nbsp;{"\"path\": \"/usr/local/jdk-11.0.3\","}</span><br />
      <span>&nbsp;&nbsp;&nbsp;&nbsp;{"\"sources\" : \"/usr/local/jdk-11.0.3/lib/src.zip\","}</span><br />
      <span>&nbsp;&nbsp;&nbsp;&nbsp;{"\"javadoc\" : \"https://docs.oracle.com/en/java/javase/11/docs/api\","}</span><br />
      <span>&nbsp;&nbsp;&nbsp;&nbsp;{"\"default\":  true"}</span><br />
      <span>{"}]"}</span><br />
    </code>
  );

  return (
    <div className="tab-pane fade" id="faq-panel" role="tabpanel" aria-labelledby="faq-tab">
      <blockquote className="card-body">
        <h5 className="font-weight-light">Feedback Channels</h5>
        <p>
          VS Code Java is new, and we are here to help.
        </p>
        <DataGrid generateHeader={GenerateHeaderOptions.none} gridTemplateColumns="1fr 3fr">
          <DataRow key={1}>
            <DataCell className="font-weight-bold" gridColumn="1"><a href="https://gitter.im/redhat-developer/vscode-java">Ask Questions</a></DataCell>
            <DataCell gridColumn="2"><a href="https://gitter.im/redhat-developer/vscode-java">vscode-java</a> Gitter channel is recommended to ask for help</DataCell>
          </DataRow>
          <DataRow key={2}>
            <DataCell className="font-weight-bold" gridColumn="1"><a href="https://github.com/microsoft/vscode-java-pack/issues">Open Issues</a></DataCell>
            <DataCell gridColumn="2"><a href="https://github.com/microsoft/vscode-java-pack/issues">vscode-java-pack</a> GitHub repo is recommended for opening bugs</DataCell>
          </DataRow>
          <DataRow key={3}>
            <DataCell className="font-weight-bold" gridColumn="1"><a href="https://twitter.com/search?q=vscodejava">Other Feedback</a></DataCell>
            <DataCell gridColumn="2"><a href="https://twitter.com/VSCodeJava">@VSCodeJava</a> is the handle to mention on twitter</DataCell>
          </DataRow>
        </DataGrid>
      </blockquote>

      <h2 className="font-weight-light">Why do I see the JDK errors?</h2>
      <p>
        <strong><code>JDK {REQUIRED_JDK_VERSION}+</code> is required</strong> to run the Java language support (redhat.java) extension! You see this error because we failed to find one on your machine. The <a href="command:java.runtime">Configure Java Runtime</a> guide can help you understand how JDK path is searched and provides download links if you need to install one.
      </p>

      <h2 className="font-weight-light">Can I run my Java 8 project with JDK 1.8?</h2>
      <p>
        Yes. The JDK {REQUIRED_JDK_VERSION} requirement is just for running the Java language support (redhat.java) extension itself. You can still configure a different runtime <a href="command:java.helper.openUrl?%22https%3A%2F%2Fcode.visualstudio.com%2Fdocs%2Fjava%2Fjava-project%23_jdk-for-projects%22">JDK for your project</a> via the user setting <a href="command:workbench.action.openSettings?%22java.configuration.runtimes%22">"java.configuration.runtimes"</a>. The extension will pick a matching JDK to compile/run your project according to the compiler version specified by the project build file.
      </p>
      <blockquote className="card-body">
        {runtimeSampleCode}
      </blockquote>

      <h2 className="font-weight-light">Why do I see tons of problems and red squiggles?</h2>
      <p>
        The problems are from VS Code Java when it tries to compile and build your codebase. If you experience this on your first use, it's possibly because of <strong>missing dependencies</strong>. To fix it, you probably want to start from fixing the project configuration files, e.g. <code>pom.xml</code> and <code>build.gradle</code>. After you make changes to those files, try <a href="command:java.projectConfiguration.update">Update Project Configuration</a> and <a href="command:java.workspace.compile">Force Compilation</a>.
      </p>
      <p>
        It can also happen after you work with one project for a while. Try <a href="command:java.clean.workspace">Clean Workspace</a> to get rid of any intermediate output from the language server.
      </p>
      <p>
        If the problem persists, follow the <a href="https://github.com/redhat-developer/vscode-java/wiki/Troubleshooting">Troubleshooting Guide</a>. For advanced users, the <a href="command:java.open.clientLog">Client Logs</a> and <a href="command:java.open.serverLog">Server Logs</a> will definitely help you understand what is going on.
      </p>

      <h2 className="font-weight-light">Why can't I see any IntelliSense suggestions?</h2>
      <p>
        VS Code Java needs to compile your code before it can provide suggestions. When it's working, you should see a spinning 🔄 on the right end of the status bar. And it will show 👍 when it's done. And you should be able to use all the features.
      </p>
      <p>
        It could take longer for the language server to load a project which references lots of dependencies. Those dependencies need to be resolved and downloaded from the internet. So the network connection plays a critical role in the process.
      </p>
      <h2 className="font-weight-light">Why do I see a little ⭐ in some of the IntelliSense suggestions?</h2>
      <p>
        This is because <a href="https://marketplace.visualstudio.com/items?itemName=VisualStudioExptTeam.vscodeintellicode">Visual Studio IntelliCode</a> is working. IntelliCode ranks the suggestions using the model trained from the source code of popular open source projects. The items with the stars are the ones that fit the current context the most.
      </p>
      <h2 className="font-weight-light">Can I use Lombok?</h2>
      <p>
        Yes. You'll need to install the <a href="https://marketplace.visualstudio.com/items?itemName=GabrielBB.vscode-lombok">Lombok</a> extension, which enables VS Code to process Lombok annotations. To learn more about alternatives and details, visit <a href="https://github.com/redhat-developer/vscode-java/wiki/Lombok-support">this page</a>.
      </p>
      <h2 className="font-weight-light">Can I develop Android apps using VS Code Java?</h2>
      <p>
        Sorry, it's not supported now.
      </p>
      <h2 className="font-weight-light">How to troubleshoot the problems?</h2>
      <p className="mb-0">
        You could click <b>F1</b> {"->"} <b>Java: Open all log files</b> to get the logs. Also learn more at <a href="https://github.com/redhat-developer/vscode-java/wiki/Troubleshooting">Troubleshooting Guide</a>.
      </p>
    </div>
  );

}