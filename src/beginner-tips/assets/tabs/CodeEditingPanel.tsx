// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { GenerateHeaderOptions } from "@microsoft/fast-foundation";
import { VSCodeDataGrid, VSCodeDataGridRow, VSCodeDataGridCell } from "@vscode/webview-ui-toolkit/react";
import React from 'react';
const isMac: boolean = navigator.platform.toLowerCase().indexOf("darwin") === 0;

export default function CodeEditingPanel() {
  const controlKey = !isMac ? <kbd data-os="win">Ctrl</kbd> : <kbd data-os="mac">⌘</kbd>;
  const f12Key = !isMac ? <kbd data-os="win">Ctrl + F12</kbd>: <kbd data-os="mac">⌘ F12</kbd>;
  const shiftAltF12 = !isMac ? <kbd data-os="win">Shift + Alt + F12</kbd> : <kbd data-os="mac">⌥ ⇧ F12</kbd>;
  const altF12Key = !isMac ? <kbd data-os="win">Alt + F12</kbd> : <kbd data-os="mac">⌥ F12</kbd>;
  const shiftF12 = !isMac ? <kbd data-os="win">Shift + F12</kbd>: <kbd data-os="mac">⇧ F12</kbd>;
  const ctrlShiftSlash = !isMac ? <kbd data-os="win">Ctrl + Shift + \</kbd>:<kbd data-os="mac">⇧ ⌘ \</kbd>;
  const ctrlSpace = !isMac ? <kbd data-os="win">Ctrl + Space</kbd>:<kbd data-os="mac">⌃ Space</kbd>;
  const ctrlShiftR = !isMac ? <kbd data-os="win">Ctrl + Shift + R</kbd>:<kbd data-os="mac">⌃ ⇧ R</kbd> ;
  const ctrlDot = !isMac ? <kbd data-os="win">Ctrl + .</kbd>:<kbd data-os="mac">⌘ .</kbd>;

  return (
    <div className="tab-pane fade" id="code-editing-panel" role="tabpanel" aria-labelledby="code-editing-tab">
      <p>
        VS Code Java is backed by a full Java language server and it understands Java code. Because of that, you get features like Code Navigation, IntelliSense, Refactoring, etc. This is important when your projects get bigger and more complex. Now let's further look at the code editing experience.
      </p>
      <blockquote className="card-body">
        <h5 className="font-weight-light">Basic Editing User Guide</h5>
        <p className="mb-0">
          To make the most of VS Code, we strongly recommend reading the <a href="https://code.visualstudio.com/docs/editor/codebasics">Basic Editing</a> user guide. You'll get to know cool tricks about multi-select, formatting, indentation, folding, and much more.
        </p>
      </blockquote>
      <h2 className="font-weight-light">Code Navigation</h2>
      <div>
        <p>
          Code Navigation makes it easy to understand existing codebase. Here to mention a few features that can help you navigate your code repositories.
        </p>
        <VSCodeDataGrid generateHeader={GenerateHeaderOptions.none} gridTemplateColumns="1fr 3fr">
          <VSCodeDataGridRow key={1}>
            <VSCodeDataGridCell className="font-weight-bold" gridColumn="1">Go to Definition</VSCodeDataGridCell>
            <VSCodeDataGridCell gridColumn="2"><kbd>F12</kbd><br />You can also hover on the symbol to preview its declaration and javadoc. To jump to the definition, hold the {controlKey} key, and click on the symbol.</VSCodeDataGridCell>
          </VSCodeDataGridRow>
          <VSCodeDataGridRow key={2}>
            <VSCodeDataGridCell className="font-weight-bold" gridColumn="1">Go to Implementation</VSCodeDataGridCell>
            <VSCodeDataGridCell gridColumn="2">{f12Key}<br />For an interface, this shows all the implementors of that interface and for abstract methods, this shows all concrete implementations of that method.</VSCodeDataGridCell>
          </VSCodeDataGridRow>
          <VSCodeDataGridRow key={3}>
            <VSCodeDataGridCell className="font-weight-bold" gridColumn="1">Go to Type Definition</VSCodeDataGridCell>
            <VSCodeDataGridCell gridColumn="2">This one allows you to go to the definition of the type of the symbol. For example, you have a class member <code>someString</code>, "Go to Definition" will take you to the definition of <code>someString</code> while "Go to <strong>Type</strong> Definition" will take you to the definition of <code>String</code>.</VSCodeDataGridCell>
          </VSCodeDataGridRow>
          <VSCodeDataGridRow key={4}>
            <VSCodeDataGridCell className="font-weight-bold" gridColumn="1">Find All References</VSCodeDataGridCell>
            <VSCodeDataGridCell gridColumn="2">{shiftAltF12}<br />This allows you to quickly analyze the impact of your edit or the popularity of your specific method or property throughout your repository.</VSCodeDataGridCell>
          </VSCodeDataGridRow>
        </VSCodeDataGrid>
      </div>
      <div>
        <p>
          The commands above will possibly take you to another file. But you can choose to stay using the peeking features below:
        </p>
        <VSCodeDataGrid generateHeader={GenerateHeaderOptions.none} gridTemplateColumns="1fr 3fr">
          <VSCodeDataGridRow key={1}>
            <VSCodeDataGridCell className="font-weight-bold" gridColumn="1">Peek Definition</VSCodeDataGridCell>
            <VSCodeDataGridCell gridColumn="2">{altF12Key}</VSCodeDataGridCell>
          </VSCodeDataGridRow>
          <VSCodeDataGridRow key={2}>
            <VSCodeDataGridCell className="font-weight-bold" gridColumn="1">Peek References</VSCodeDataGridCell>
            <VSCodeDataGridCell gridColumn="2">{shiftF12}</VSCodeDataGridCell>
          </VSCodeDataGridRow>
        </VSCodeDataGrid>
      </div>
      <div>
        <p> Last but not least, you can jump between the matching brackets back and forth: </p>
        <VSCodeDataGrid generateHeader={GenerateHeaderOptions.none} gridTemplateColumns="1fr 3fr">
          <VSCodeDataGridRow key={1}>
            <VSCodeDataGridCell className="font-weight-bold" gridColumn="1">Go to Bracket</VSCodeDataGridCell>
            <VSCodeDataGridCell gridColumn="2">{ctrlShiftSlash}</VSCodeDataGridCell>
          </VSCodeDataGridRow>
        </VSCodeDataGrid>
      </div>
      <h2 className="font-weight-light">IntelliSense</h2>
      <p>
        IntelliSense is a general term for a variety of code editing features including: code completion, parameter info, quick info, and member lists. IntelliSense features are sometimes called by other names such as "code completion", "content assist", and "code hinting."
      </p>
      <p>
        IntelliSense works as you type. For example, when you try to invoke some member of an object, a list of all the members is popped up for you to choose from. If you continue typing characters, the list of members (variables, methods, etc.) is filtered to only include members containing your typed characters. Pressing <kbd>Tab</kbd> or <kbd>Enter</kbd> will insert the selected member.
      </p>
      <blockquote className="card-body">
        <h5 className="font-weight-light">Trigger IntelliSense Manually</h5>
        <p className="mb-0">
          In most cases, IntelliSense is triggered automatically. You can also press {ctrlSpace} to do it manually. For example, when you're trying to invoke a member function and want to see the parameter info, this will do the magic.
        </p>
      </blockquote>
      <h2 className="font-weight-light">Refactoring</h2>
      <p>
        VS Code Java provides essential refactoring features and makes it productive to modify larger codebase. The most frequently used one is <strong>Rename</strong>. It's so popular that a dedicated hot key <kbd>F2</kbd> is assigned to it. When you rename a symbol, all its references are also renamed.
      </p>
      <p>
        There are more refactoring features like <strong>Extract</strong>, <strong>Inline</strong>, etc. The availability changes corresponding to the current cursor position. All available features are packed in to the <strong>Refactor</strong> context menu. And you can also pop the list by pressing {ctrlShiftR}
      </p>
      <p>
        You may also notice the lightbulb near the cursor. It indicates that some <strong>Code Actions</strong> are available. In VS Code, Code Actions can provide both refactorings and Quick Fixes for detected issues. To show the full list of available actions, click the lightbulb or press {ctrlDot}
      </p>
      <blockquote className="card-body">
        <h5 className="font-weight-light">More Code Actions</h5>
        <p>
          There are other code actions that are not limited to the cursor position. They are grouped into the <strong>Source Action</strong> context menu. Here's a list of them.
        </p>
        <ul className="mb-0">
          <li>Organize Imports</li>
          <li>Override/Implement Methods</li>
          <li>Generate Getter and Setter</li>
          <li>Generate hashCode() and equals()</li>
          <li>Generate toString()</li>
          <li>Generate Constructors</li>
          <li>Generate Delegate Methods</li>
        </ul>
      </blockquote>
    </div>

  );

}