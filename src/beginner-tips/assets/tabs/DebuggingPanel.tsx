// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { richText } from "../../../l10n/richText";
import * as l10n from "@vscode/l10n";
import "@vscode-elements/elements/dist/vscode-table/index.js";
import "@vscode-elements/elements/dist/vscode-table-row/index.js";
import "@vscode-elements/elements/dist/vscode-table-cell/index.js";
import "@vscode-elements/elements/dist/vscode-table-body/index.js";
const isMac: boolean = navigator.platform.toLowerCase().indexOf("darwin") === 0;

export default function DebuggingPanel() {
    const cF5 = !isMac ? <kbd data-os="win">{l10n.t("Ctrl + F5")}</kbd> : <kbd data-os="mac">{l10n.t("⌃ F5")}</kbd>;
    const launchConfigPath = !isMac ? <code data-os="win">.vscode\launch.json</code> : <code data-os="mac">.vscode/launch.json</code>;
    const sF11 = !isMac ? <kbd data-os="win">{l10n.t("Shift + F11")}</kbd> : <kbd data-os="mac">{l10n.t("⇧ F11")}</kbd>;
    const csF5 = !isMac ? <kbd data-os="win">{l10n.t("Ctrl + Shift + F5")}</kbd> : <kbd data-os="mac">{l10n.t("⇧ ⌘ F5")}</kbd>;
    const sF5 = !isMac ? <kbd data-os="win">{l10n.t("Shift + F5")}</kbd> : <kbd data-os="mac">{l10n.t("⇧ F5")}</kbd>;

    return (
        <div className="tab-pane fade" id="debugging-panel" role="tabpanel" aria-labelledby="debugging-tab">
            <p>{l10n.t("One of the key features of Visual Studio Code is its great debugging support. VS Code's built-in debugger helps accelerate your edit, compile and debug loop.")}</p>
            <h2 className="font-weight-light">{l10n.t("Start Debugging")}</h2>
            <p>{richText(l10n.t("There are multiple ways to start debugging a Java program. By pressing {0}, the current program will be launched. You can also start by clicking the {1} codelens on top of the {2} function. This is super handy when you have multiple main entries. You can also launch a program {3} debugging by pressing {4}."), [<a href="command:workbench.action.debug.start"><kbd>{l10n.t("F5")}</kbd></a>, <strong>{l10n.t("\"Debug\"")}</strong>, <code>main</code>, <strong>{l10n.t("without")}</strong>, <a href="command:workbench.action.debug.run">{cF5}</a>])}</p>
            <p>{richText(l10n.t("By default, VS Code Java launches the program using {0}. As you enter the debug mode, you should also see the {1}. This view shows all the runtime info of your program."), [<a href="command:workbench.action.terminal.toggleTerminal">{l10n.t("Integrated Terminal")}</a>, <a href="command:workbench.view.debug">{l10n.t("Debug View")}</a>])}</p>
            <blockquote className="card-body">
                <h5 className="font-weight-light">{l10n.t("Debug Configurations")}</h5>
                <p className="mb-0">{richText(l10n.t("VS Code Java automatically generates debug configurations. In VS Code, those configurations are called {0} and they are persisted in {1}. To work with more sophisticated debug scenarios, please explore the {2} that are supported by VS Code."), [<a href="https://code.visualstudio.com/docs/editor/debugging#_launch-configurations">{l10n.t("Launch Configurations")}</a>, launchConfigPath, <a href="https://code.visualstudio.com/docs/editor/debugging#_launchjson-attributes">{l10n.t("Launch Options")}</a>])}</p>
            </blockquote>
            <h2 className="font-weight-light">{l10n.t("Breakpoints")}</h2>
            <p>{richText(l10n.t("Breakpoints can be toggled by clicking on the editor margin or using {0} on the current line. Finer breakpoint control (enable/disable/reapply) can be done in the Debug View's BREAKPOINTS section."), [<kbd>{l10n.t("F9")}</kbd>])}</p>
            <p>{richText(l10n.t("You can also set {0} based on expressions, hit counts, or a combination of both."), [<strong>{l10n.t("Conditional Breakpoints")}</strong>])}</p>
            <vscode-table>
                <vscode-table-body slot="body">
                <vscode-table-row key={1}>
                    <vscode-table-cell className="font-weight-bold" >{l10n.t("Expression condition")}</vscode-table-cell>
                    <vscode-table-cell >{richText(l10n.t("The breakpoint will be hit whenever the expression evaluates to {0}"), [<code>true</code>])}</vscode-table-cell>
                </vscode-table-row>
                <vscode-table-row key={2}>
                    <vscode-table-cell className="font-weight-bold" >{l10n.t("Hit count")}</vscode-table-cell>
                    <vscode-table-cell >{l10n.t("The 'hit count' controls how many times a breakpoint needs to be hit before it will 'break' execution")}</vscode-table-cell>
                </vscode-table-row>
                </vscode-table-body>
            </vscode-table>
            <p>{richText(l10n.t("You can add a condition and/or hit count when creating the breakpoint (with the {0} action) or when modifying an existing one (with the Edit Breakpoint action). In both cases, an inline text box with a drop-down menu opens where you can enter expressions."), [<a href="command:editor.debug.action.conditionalBreakpoint">{l10n.t("Add Conditional Breakpoint")}</a>])}</p>
            <blockquote className="card-body">
                <h5 className="font-weight-light">{l10n.t("Logpoints")}</h5>
                <p>{l10n.t("A Logpoint is a variant of a breakpoint that does not \"break\" into the debugger but instead logs a message to the console. Logpoints are especially useful for injecting logging while debugging production servers that cannot be paused or stopped.")}</p>
                <p className="mb-0">{l10n.t("A Logpoint is represented by a ♦️ shaped icon. Log messages are plain text but can include expressions to be evaluated within curly braces ('{ }').")}</p>
            </blockquote>
            <h2 className="font-weight-light">{l10n.t("Debug Actions")}</h2>
            <p>{l10n.t("Once a debug session starts, the Debug toolbar will appear on the top of the editor. You can control the execution flow using the actions below.")}</p>
            <vscode-table>
                <vscode-table-body slot="body">
                <vscode-table-row key={1}>
                    <vscode-table-cell className="font-weight-bold" >{l10n.t("Continue/Pause")}</vscode-table-cell>
                    <vscode-table-cell ><kbd>{l10n.t("F5")}</kbd></vscode-table-cell>
                </vscode-table-row>
                <vscode-table-row key={2}>
                    <vscode-table-cell className="font-weight-bold" >{l10n.t("Step Over")}</vscode-table-cell>
                    <vscode-table-cell ><kbd>{l10n.t("F10")}</kbd></vscode-table-cell>
                </vscode-table-row>
                <vscode-table-row key={3}>
                    <vscode-table-cell className="font-weight-bold" >{l10n.t("Step Into")}</vscode-table-cell>
                    <vscode-table-cell ><kbd>{l10n.t("F11")}</kbd></vscode-table-cell>
                </vscode-table-row>
                <vscode-table-row key={4}>
                    <vscode-table-cell className="font-weight-bold" >{l10n.t("Step Out")}</vscode-table-cell>
                    <vscode-table-cell >{sF11}</vscode-table-cell>
                </vscode-table-row>
                <vscode-table-row key={5}>
                    <vscode-table-cell className="font-weight-bold" >{l10n.t("Restart")}</vscode-table-cell>
                    <vscode-table-cell >{csF5}</vscode-table-cell>
                </vscode-table-row>
                <vscode-table-row key={6}>
                    <vscode-table-cell className="font-weight-bold" >{l10n.t("Stop")}</vscode-table-cell>
                    <vscode-table-cell >{sF5}</vscode-table-cell>
                </vscode-table-row>
                </vscode-table-body>
            </vscode-table>
            <h2 className="font-weight-light">{l10n.t("Inspect Variables")}</h2>
            <p>{richText(l10n.t("Variables can be inspected in the {0} section of the Debug view or by hovering over their source in the editor. Variable values and expression evaluation are relative to the selected stack frame in the {1} section."), [<strong>{l10n.t("VARIABLES")}</strong>, <strong>{l10n.t("CALL STACK")}</strong>])}</p>
            <p>{richText(l10n.t("Variable values can be modified with the {0} action from the variable's context menu. Or you can {1} the value and enter a new one. Variables and expressions can also be evaluated and watched in the Debug view's {2} section."), [<strong>{l10n.t("Set Value")}</strong>, <strong>{l10n.t("double-click")}</strong>, <strong>{l10n.t("WATCH")}</strong>])}</p>
            <h2 className="font-weight-light">{l10n.t("Hot Code Replace ⚡")}</h2>
            <p>{richText(l10n.t("Yes, you can apply code changes without restarting the running program. Click on the {0} icon in the {1} to apply code changes. When you see failures, don't worry. It is safe to continue running the program, but you may notice discrepancies between the source code and the program."), [<a href="command:java.debug.hotCodeReplace">⚡</a>, <strong>{l10n.t("debug toolbar")}</strong>])}</p>
            <blockquote className="card-body">
                <h5 className="font-weight-light">{l10n.t("Limitations")}</h5>
                <p>{richText(l10n.t("Hot Code Replace (HCR) sounds magical but it does have limitations. In short, you can only change the code inside an existing function. Here are some scenarios that HCR will {0} work:"), [<span className="text-danger">{l10n.t("NOT")}</span>])}</p>
                <ul className="mb-0">
                    <li>{l10n.t("Adding a new member function")}</li>
                    <li>{l10n.t("Changing the signature of an existing function")}</li>
                    <li>{l10n.t("Changing the value of static members (but you can do so using the VARIABLES panel when the program is paused)")}</li>
                    <li>{l10n.t("Referencing new classes/packages")}</li>
                </ul>
            </blockquote>
        </div>

    );


}