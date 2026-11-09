// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as l10n from "@vscode/l10n";
import { richText } from "../../../l10n/richText";

const isMac: boolean = navigator.platform.toLowerCase().indexOf("darwin") === 0;

export default function QuickStartPanel() {
  const codeSample = (
    <code>
      <span>{"class QuickStart {"}</span><br />
      <span>&nbsp;&nbsp;&nbsp;&nbsp;{"public static void main (String[] args) {"}</span><br />
      <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{"System.out.println(\"Hello, World.\");"}</span><br />
      <span>&nbsp;&nbsp;&nbsp;&nbsp;{"}"}</span><br />
      <span>{"}"}</span><br />
    </code>
  );
  const openFolderLink = isMac ?
    <a href="command:workbench.action.files.openFileFolder" data-os="mac">{l10n.t("Open...")}</a>
    :
    <a href="command:workbench.action.files.openFolder" data-os="win">{l10n.t("Open Folder...")}</a>
  ;
  return (
    <div className="tab-pane fade" id="quick-start-panel" role="tabpanel" aria-labelledby="quick-start-tab">
      <p>{l10n.t("In this 1-minute tutorial, we'll show you how to create a quick-start Java program in VS Code.")}</p>
      <h2 className="font-weight-light">{l10n.t("Setup the Workspace")}</h2>
      <p>{richText(l10n.t("VS Code Java works directly with {0} that have source code. To setup the workspace, simply open a folder using File > {1}"), [<strong>{l10n.t("folders")}</strong>, openFolderLink])}</p>
      <h2 className="font-weight-light">{l10n.t("Create a Class")}</h2>
      <p>{richText(l10n.t("A program needs an entry and a Java program needs a class to host its entry. To create a class for our quick-start program, {0} and set its name to {1}.{2}Now you can put the code in the new file:"), [<a href="command:explorer.newFile">{l10n.t("Create a File")}</a>, <code>QuickStart.java</code>, <br />])}</p>
      <blockquote className="card-body">
        {codeSample}
      </blockquote>
      <h2 className="font-weight-light">{l10n.t("Run the program")}</h2>
      <p>{richText(l10n.t("To run the program, press {0}. By default, the program is launched in the {1}. You should already see the output there."), [<a href="command:workbench.action.debug.start"><kbd>{l10n.t("F5")}</kbd></a>, <a href="command:workbench.action.terminal.toggleTerminal">{l10n.t("Integrated Terminal")}</a>])}</p>
      <blockquote className="card-body">
        <h5 className="font-weight-light">{l10n.t("How to Debug?")}</h5>
        <p className="mb-0">{richText(l10n.t("When you press {0}, you are already debugging. Try setting some breakpoint by clicking on the line numbers before each code line and run the program again. You'll see the execution paused at the breakpoint.{1}While debugging, switch to the {2} to see the variables and call stacks."), [<a href="command:workbench.action.debug.start"><kbd>{l10n.t("F5")}</kbd></a>, <br />, <a href="command:workbench.view.debug">{l10n.t("Debug View")}</a>])}</p>
      </blockquote>
      <h2 className="font-weight-light">{l10n.t("Congratulations!")}</h2>
      <p>{richText(l10n.t("Now the quick-start program is running and you are free to build more.{0}What you saw is just a tiny part of VS Code Java. You can do much more with it."), [<br />])}</p>
    </div>
  );
}