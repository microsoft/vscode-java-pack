// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { richText } from "../../../l10n/richText";
import * as l10n from "@vscode/l10n";
import "@vscode-elements/elements/dist/vscode-table/index.js";
import "@vscode-elements/elements/dist/vscode-table-row/index.js";
import "@vscode-elements/elements/dist/vscode-table-cell/index.js";
import "@vscode-elements/elements/dist/vscode-table-body/index.js";
import { encodeCommandUriWithTelemetry } from "../../../utils/webview";

export default function FaqPanel({ requiredJdkVersion }: { requiredJdkVersion: number }) {
  const toolingSettingsCommand = encodeCommandUriWithTelemetry("java.gettingStarted", "toolingSettings", "workbench.action.openSettings", ["java.jdt.ls.java.home"]);
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
        <h5 className="font-weight-light">{l10n.t("Feedback Channels")}</h5>
        <p>{l10n.t("VS Code Java is new, and we are here to help.")}</p>
        <vscode-table>
          <vscode-table-body slot="body">
          <vscode-table-row key={1}>
            <vscode-table-cell className="font-weight-bold" ><a href="https://gitter.im/redhat-developer/vscode-java">{l10n.t("Ask Questions")}</a></vscode-table-cell>
            <vscode-table-cell >{richText(l10n.t("{0} Gitter channel is recommended to ask for help"), [<a href="https://gitter.im/redhat-developer/vscode-java">{l10n.t("vscode-java")}</a>])}</vscode-table-cell>
          </vscode-table-row>
          <vscode-table-row key={2}>
            <vscode-table-cell className="font-weight-bold" ><a href="https://github.com/microsoft/vscode-java-pack/issues">{l10n.t("Open Issues")}</a></vscode-table-cell>
            <vscode-table-cell >{richText(l10n.t("{0} GitHub repo is recommended for opening bugs"), [<a href="https://github.com/microsoft/vscode-java-pack/issues">{l10n.t("vscode-java-pack")}</a>])}</vscode-table-cell>
          </vscode-table-row>
          <vscode-table-row key={3}>
            <vscode-table-cell className="font-weight-bold" ><a href="https://twitter.com/search?q=vscodejava">{l10n.t("Other Feedback")}</a></vscode-table-cell>
            <vscode-table-cell >{richText(l10n.t("{0} is the handle to mention on twitter"), [<a href="https://twitter.com/VSCodeJava">{l10n.t("@VSCodeJava")}</a>])}</vscode-table-cell>
          </vscode-table-row>
          </vscode-table-body>
        </vscode-table>
      </blockquote>

      <h2 className="font-weight-light">{l10n.t("Why do I see the JDK errors?")}</h2>
      <p>{richText(l10n.t("{0} to run the installed Java language support (redhat.java) extension. A compatible bundled runtime can satisfy this requirement; otherwise, a compatible local JDK is needed. To set the language-server launch JDK explicitly, configure {1}. Runtime selection and startup diagnostics are provided by redhat.java; {2} for details."), [<strong>{richText(l10n.t("{0} is required"), [<code>JDK {requiredJdkVersion}+</code>])}</strong>, <a href={toolingSettingsCommand}><code>java.jdt.ls.java.home</code></a>, <a href="command:java.open.logs">{l10n.t("open the Java logs")}</a>])}</p>
      <p>{richText(l10n.t("The {0} page configures project JDKs, not the language-server launch JDK. Your projects can use older JDKs independently of the tooling requirement."), [<a href="command:java.runtime">{l10n.t("Configure Java Runtime")}</a>])}</p>

      <h2 className="font-weight-light">{l10n.t("Can I run my Java 8 project with JDK 1.8?")}</h2>
      <p>{richText(l10n.t("Yes. The JDK {0} requirement is just for running the Java language support (redhat.java) extension itself. You can still configure a different runtime {1} via the user setting {2}. The extension will pick a matching JDK to compile/run your project according to the compiler version specified by the project build file."), [requiredJdkVersion, <a href="command:java.helper.openUrl?%22https%3A%2F%2Fcode.visualstudio.com%2Fdocs%2Fjava%2Fjava-project%23_jdk-for-projects%22">{l10n.t("JDK for your project")}</a>, <a href="command:workbench.action.openSettings?%22java.configuration.runtimes%22">"java.configuration.runtimes"</a>])}</p>
      <blockquote className="card-body">
        {runtimeSampleCode}
      </blockquote>

      <h2 className="font-weight-light">{l10n.t("Why do I see tons of problems and red squiggles?")}</h2>
      <p>{richText(l10n.t("The problems are from VS Code Java when it tries to compile and build your codebase. If you experience this on your first use, it's possibly because of {0}. To fix it, you probably want to start from fixing the project configuration files, e.g. {1} and {2}. After you make changes to those files, try {3} and {4}."), [<strong>{l10n.t("missing dependencies")}</strong>, <code>pom.xml</code>, <code>build.gradle</code>, <a href="command:java.projectConfiguration.update">{l10n.t("Update Project Configuration")}</a>, <a href="command:java.workspace.compile">{l10n.t("Force Compilation")}</a>])}</p>
      <p>{richText(l10n.t("It can also happen after you work with one project for a while. Try {0} to get rid of any intermediate output from the language server."), [<a href="command:java.clean.workspace">{l10n.t("Clean Workspace")}</a>])}</p>
      <p>{richText(l10n.t("If the problem persists, follow the {0}. For advanced users, the {1} and {2} will definitely help you understand what is going on."), [<a href="https://github.com/redhat-developer/vscode-java/wiki/Troubleshooting">{l10n.t("Troubleshooting Guide")}</a>, <a href="command:java.open.clientLog">{l10n.t("Client Logs")}</a>, <a href="command:java.open.serverLog">{l10n.t("Server Logs")}</a>])}</p>

      <h2 className="font-weight-light">{l10n.t("Why can't I see any IntelliSense suggestions?")}</h2>
      <p>{l10n.t("VS Code Java needs to compile your code before it can provide suggestions. When it's working, you should see a spinning 🔄 on the right end of the status bar. And it will show 👍 when it's done. And you should be able to use all the features.")}</p>
      <p>{l10n.t("It could take longer for the language server to load a project which references lots of dependencies. Those dependencies need to be resolved and downloaded from the internet. So the network connection plays a critical role in the process.")}</p>
      <h2 className="font-weight-light">{l10n.t("Can I use Lombok?")}</h2>
      <p>{richText(l10n.t("Yes. You'll need to install the {0} extension, which enables VS Code to process Lombok annotations. To learn more about alternatives and details, visit {1}."), [<a href="https://marketplace.visualstudio.com/items?itemName=GabrielBB.vscode-lombok">{l10n.t("Lombok")}</a>, <a href="https://github.com/redhat-developer/vscode-java/wiki/Lombok-support">{l10n.t("this page")}</a>])}</p>
      <h2 className="font-weight-light">{l10n.t("Can I develop Android apps using VS Code Java?")}</h2>
      <p>{l10n.t("Sorry, it's not supported now.")}</p>
      <h2 className="font-weight-light">{l10n.t("How to troubleshoot the problems?")}</h2>
      <p className="mb-0">{richText(l10n.t("You could click {0} -> {1} to get the logs. Also learn more at {2}."), [<b>{l10n.t("F1")}</b>, <b>{l10n.t("Java: Open all log files")}</b>, <a href="https://github.com/redhat-developer/vscode-java/wiki/Troubleshooting">{l10n.t("Troubleshooting Guide")}</a>])}</p>
    </div>
  );

}