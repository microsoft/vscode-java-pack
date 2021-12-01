// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React from 'react';

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
    <a href="command:workbench.action.files.openFileFolder" data-os="mac">Open...</a>
    :
    <a href="command:workbench.action.files.openFolder" data-os="win">Open Folder...</a>
  ;
  return (
    <div className="tab-pane fade" id="quick-start-panel" role="tabpanel" aria-labelledby="quick-start-tab">
      <p>
        In this 1-minute tutorial, we'll show you how to create a quick-start Java program in VS Code.
      </p>
      <h2 className="font-weight-light">Setup the Workspace</h2>
      <p>
        VS Code Java works directly with <strong>folders</strong> that have source code. To setup the workspace, simply open a folder using File {">"}&nbsp;
        {openFolderLink}
      </p>
      <h2 className="font-weight-light">Create a Class</h2>
      <p>
        A program needs an entry and a Java program needs a class to host its entry. To create a class for our quick-start program, <a href="command:explorer.newFile">Create a File</a> and set its name to <code>QuickStart.java</code>.<br />
        Now you can put the code in the new file:
      </p>
      <blockquote className="card-body">
        {codeSample}
      </blockquote>
      <h2 className="font-weight-light">Run the program</h2>
      <p>
        To run the program, press <a href="command:workbench.action.debug.start"><kbd>F5</kbd></a>. By default, the program is launched in the <a href="command:workbench.action.terminal.toggleTerminal">Integrated Terminal</a>. You should already see the output there.
      </p>
      <blockquote className="card-body">
        <h5 className="font-weight-light">How to Debug?</h5>
        <p className="mb-0">
          When you press <a href="command:workbench.action.debug.start"><kbd>F5</kbd></a>, you are already debugging. Try setting some breakpoint by clicking on the line numbers before each code line and run the program again. You'll see the execution paused at the breakpoint.<br />
          While debugging, switch to the <a href="command:workbench.view.debug">Debug View</a> to see the variables and call stacks.
        </p>
      </blockquote>
      <h2 className="font-weight-light">Congratulations!</h2>
      <p>
        Now the quick-start program is running and you are free to build more.<br />
        What you saw is just a tiny part of VS Code Java. You can do much more with it.
      </p>
    </div>
  );
}