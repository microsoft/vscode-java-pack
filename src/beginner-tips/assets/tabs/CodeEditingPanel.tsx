// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { richText } from "../../../l10n/richText";
import * as l10n from "@vscode/l10n";
import "@vscode-elements/elements/dist/vscode-table/index.js";
import "@vscode-elements/elements/dist/vscode-table-row/index.js";
import "@vscode-elements/elements/dist/vscode-table-cell/index.js";
import "@vscode-elements/elements/dist/vscode-table-body/index.js";
const isMac: boolean = navigator.platform.toLowerCase().indexOf("darwin") === 0;

export default function CodeEditingPanel() {
  const controlKey = !isMac ? <kbd data-os="win">{l10n.t("Ctrl")}</kbd> : <kbd data-os="mac">⌘</kbd>;
  const f12Key = !isMac ? <kbd data-os="win">{l10n.t("Ctrl + F12")}</kbd>: <kbd data-os="mac">{l10n.t("⌘ F12")}</kbd>;
  const shiftAltF12 = !isMac ? <kbd data-os="win">{l10n.t("Shift + Alt + F12")}</kbd> : <kbd data-os="mac">{l10n.t("⌥ ⇧ F12")}</kbd>;
  const altF12Key = !isMac ? <kbd data-os="win">{l10n.t("Alt + F12")}</kbd> : <kbd data-os="mac">{l10n.t("⌥ F12")}</kbd>;
  const shiftF12 = !isMac ? <kbd data-os="win">{l10n.t("Shift + F12")}</kbd>: <kbd data-os="mac">{l10n.t("⇧ F12")}</kbd>;
  const ctrlShiftSlash = !isMac ? <kbd data-os="win">{l10n.t("Ctrl + Shift + \\")}</kbd>:<kbd data-os="mac">⇧ ⌘ \</kbd>;
  const ctrlSpace = !isMac ? <kbd data-os="win">{l10n.t("Ctrl + Space")}</kbd>:<kbd data-os="mac">{l10n.t("⌃ Space")}</kbd>;
  const ctrlShiftR = !isMac ? <kbd data-os="win">{l10n.t("Ctrl + Shift + R")}</kbd>:<kbd data-os="mac">{l10n.t("⌃ ⇧ R")}</kbd> ;
  const ctrlDot = !isMac ? <kbd data-os="win">{l10n.t("Ctrl + .")}</kbd>:<kbd data-os="mac">⌘ .</kbd>;

  return (
    <div className="tab-pane fade" id="code-editing-panel" role="tabpanel" aria-labelledby="code-editing-tab">
      <p>{l10n.t("VS Code Java is backed by a full Java language server and it understands Java code. Because of that, you get features like Code Navigation, IntelliSense, Refactoring, etc. This is important when your projects get bigger and more complex. Now let's further look at the code editing experience.")}</p>
      <blockquote className="card-body">
        <h5 className="font-weight-light">{l10n.t("Basic Editing User Guide")}</h5>
        <p className="mb-0">{richText(l10n.t("To make the most of VS Code, we strongly recommend reading the {0} user guide. You'll get to know cool tricks about multi-select, formatting, indentation, folding, and much more."), [<a href="https://code.visualstudio.com/docs/editor/codebasics">{l10n.t("Basic Editing")}</a>])}</p>
      </blockquote>
      <h2 className="font-weight-light">{l10n.t("Code Navigation")}</h2>
      <div>
        <p>{l10n.t("Code Navigation makes it easy to understand existing codebase. Here to mention a few features that can help you navigate your code repositories.")}</p>
        <vscode-table>
          <vscode-table-body slot="body">
          <vscode-table-row key={1}>
            <vscode-table-cell className="font-weight-bold" >{l10n.t("Go to Definition")}</vscode-table-cell>
            <vscode-table-cell >{richText(l10n.t("{0}{1}You can also hover on the symbol to preview its declaration and javadoc. To jump to the definition, hold the {2} key, and click on the symbol."), [<kbd>{l10n.t("F12")}</kbd>, <br />, controlKey])}</vscode-table-cell>
          </vscode-table-row>
          <vscode-table-row key={2}>
            <vscode-table-cell className="font-weight-bold" >{l10n.t("Go to Implementation")}</vscode-table-cell>
            <vscode-table-cell >{richText(l10n.t("{0}{1}For an interface, this shows all the implementors of that interface and for abstract methods, this shows all concrete implementations of that method."), [f12Key, <br />])}</vscode-table-cell>
          </vscode-table-row>
          <vscode-table-row key={3}>
            <vscode-table-cell className="font-weight-bold" >{l10n.t("Go to Type Definition")}</vscode-table-cell>
            <vscode-table-cell >{richText(l10n.t("This one allows you to go to the definition of the type of the symbol. For example, you have a class member {0}, \"Go to Definition\" will take you to the definition of {1} while \"Go to {2} Definition\" will take you to the definition of {3}."), [<code>someString</code>, <code>someString</code>, <strong>{l10n.t("Type")}</strong>, <code>String</code>])}</vscode-table-cell>
          </vscode-table-row>
          <vscode-table-row key={4}>
            <vscode-table-cell className="font-weight-bold" >{l10n.t("Find All References")}</vscode-table-cell>
            <vscode-table-cell >{richText(l10n.t("{0}{1}This allows you to quickly analyze the impact of your edit or the popularity of your specific method or property throughout your repository."), [shiftAltF12, <br />])}</vscode-table-cell>
          </vscode-table-row>
          </vscode-table-body>
        </vscode-table>
      </div>
      <div>
        <p>{l10n.t("The commands above will possibly take you to another file. But you can choose to stay using the peeking features below:")}</p>
        <vscode-table>
          <vscode-table-body slot="body">
          <vscode-table-row key={1}>
            <vscode-table-cell className="font-weight-bold" >{l10n.t("Peek Definition")}</vscode-table-cell>
            <vscode-table-cell >{altF12Key}</vscode-table-cell>
          </vscode-table-row>
          <vscode-table-row key={2}>
            <vscode-table-cell className="font-weight-bold" >{l10n.t("Peek References")}</vscode-table-cell>
            <vscode-table-cell >{shiftF12}</vscode-table-cell>
          </vscode-table-row>
          </vscode-table-body>
        </vscode-table>
      </div>
      <div>
        <p>{l10n.t(" Last but not least, you can jump between the matching brackets back and forth: ")}</p>
        <vscode-table>
          <vscode-table-body slot="body">
          <vscode-table-row key={1}>
            <vscode-table-cell className="font-weight-bold" >{l10n.t("Go to Bracket")}</vscode-table-cell>
            <vscode-table-cell >{ctrlShiftSlash}</vscode-table-cell>
          </vscode-table-row>
          </vscode-table-body>
        </vscode-table>
      </div>
      <h2 className="font-weight-light">{l10n.t("IntelliSense")}</h2>
      <p>{l10n.t("IntelliSense is a general term for a variety of code editing features including: code completion, parameter info, quick info, and member lists. IntelliSense features are sometimes called by other names such as \"code completion\", \"content assist\", and \"code hinting.\"")}</p>
      <p>{richText(l10n.t("IntelliSense works as you type. For example, when you try to invoke some member of an object, a list of all the members is popped up for you to choose from. If you continue typing characters, the list of members (variables, methods, etc.) is filtered to only include members containing your typed characters. Pressing {0} or {1} will insert the selected member."), [<kbd>{l10n.t("Tab")}</kbd>, <kbd>{l10n.t("Enter")}</kbd>])}</p>
      <blockquote className="card-body">
        <h5 className="font-weight-light">{l10n.t("Trigger IntelliSense Manually")}</h5>
        <p className="mb-0">{richText(l10n.t("In most cases, IntelliSense is triggered automatically. You can also press {0} to do it manually. For example, when you're trying to invoke a member function and want to see the parameter info, this will do the magic."), [ctrlSpace])}</p>
      </blockquote>
      <h2 className="font-weight-light">{l10n.t("Refactoring")}</h2>
      <p>{richText(l10n.t("VS Code Java provides essential refactoring features and makes it productive to modify larger codebase. The most frequently used one is {0}. It's so popular that a dedicated hot key {1} is assigned to it. When you rename a symbol, all its references are also renamed."), [<strong>{l10n.t("Rename")}</strong>, <kbd>{l10n.t("F2")}</kbd>])}</p>
      <p>{richText(l10n.t("There are more refactoring features like {0}, {1}, etc. The availability changes corresponding to the current cursor position. All available features are packed in to the {2} context menu. And you can also pop the list by pressing {3}"), [<strong>{l10n.t("Extract")}</strong>, <strong>{l10n.t("Inline")}</strong>, <strong>{l10n.t("Refactor")}</strong>, ctrlShiftR])}</p>
      <p>{richText(l10n.t("You may also notice the lightbulb near the cursor. It indicates that some {0} are available. In VS Code, Code Actions can provide both refactorings and Quick Fixes for detected issues. To show the full list of available actions, click the lightbulb or press {1}"), [<strong>{l10n.t("Code Actions")}</strong>, ctrlDot])}</p>
      <blockquote className="card-body">
        <h5 className="font-weight-light">{l10n.t("More Code Actions")}</h5>
        <p>{richText(l10n.t("There are other code actions that are not limited to the cursor position. They are grouped into the {0} context menu. Here's a list of them."), [<strong>{l10n.t("Source Action")}</strong>])}</p>
        <ul className="mb-0">
          <li>{l10n.t("Organize Imports")}</li>
          <li>{l10n.t("Override/Implement Methods")}</li>
          <li>{l10n.t("Generate Getter and Setter")}</li>
          <li>{l10n.t("Generate hashCode() and equals()")}</li>
          <li>{l10n.t("Generate toString()")}</li>
          <li>{l10n.t("Generate Constructors")}</li>
          <li>{l10n.t("Generate Delegate Methods")}</li>
        </ul>
      </blockquote>
    </div>

  );

}