// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { GenerateHeaderOptions } from "@microsoft/fast-foundation";
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import * as webviewUI from "@vscode/webview-ui-toolkit";
import React from 'react';
const isMac: boolean = navigator.platform.toLowerCase().indexOf("darwin") === 0;
const { wrap } = provideReactWrapper(React);
const DataGrid = wrap(webviewUI.VSCodeDataGrid);
const DataRow = wrap(webviewUI.VSCodeDataGridRow);
const DataCell = wrap(webviewUI.VSCodeDataGridCell);

export default function DebuggingPanel() {
    const cF5 = !isMac ? <kbd data-os="win">Ctrl + F5</kbd> : <kbd data-os="mac">⌃ F5</kbd>;
    const launchConfigPath = !isMac ? <code data-os="win">.vscode\launch.json</code> : <code data-os="mac">.vscode/launch.json</code>;
    const sF11 = !isMac ? <kbd data-os="win">Shift + F11</kbd> : <kbd data-os="mac">⇧ F11</kbd>;
    const csF5 = !isMac ? <kbd data-os="win">Ctrl + Shift + F5</kbd> : <kbd data-os="mac">⇧ ⌘ F5</kbd>;
    const sF5 = !isMac ? <kbd data-os="win">Shift + F5</kbd> : <kbd data-os="mac">⇧ F5</kbd>;

    return (
        <div className="tab-pane fade" id="debugging-panel" role="tabpanel" aria-labelledby="debugging-tab">
            <p>
                One of the key features of Visual Studio Code is its great debugging support. VS Code's built-in debugger helps accelerate your edit, compile and debug loop.
            </p>
            <h2 className="font-weight-light">Start Debugging</h2>
            <p>
                There are multiple ways to start debugging a Java program. By pressing <a href="command:workbench.action.debug.start"><kbd>F5</kbd></a>, the current program will be launched. You can also start by clicking the <strong>"Debug"</strong> codelens on top of the <code>main</code> function. This is super handy when you have multiple main entries. You can also launch a program <strong>without</strong> debugging by pressing <a href="command:workbench.action.debug.run">{cF5}</a>.
            </p>
            <p>
                By default, VS Code Java launches the program using <a href="command:workbench.action.terminal.toggleTerminal">Integrated Terminal</a>. As you enter the debug mode, you should also see the <a href="command:workbench.view.debug">Debug View</a>. This view shows all the runtime info of your program.
            </p>
            <blockquote className="card-body">
                <h5 className="font-weight-light">Debug Configurations</h5>
                <p className="mb-0">
                    VS Code Java automatically generates debug configurations. In VS Code, those configurations are called <a href="https://code.visualstudio.com/docs/editor/debugging#_launch-configurations">Launch Configurations</a> and they are persisted in {launchConfigPath}. To work with more sophisticated debug scenarios, please explore the <a href="https://code.visualstudio.com/docs/editor/debugging#_launchjson-attributes">Launch Options</a> that are supported by VS Code.
                </p>
            </blockquote>
            <h2 className="font-weight-light">Breakpoints</h2>
            <p>
                Breakpoints can be toggled by clicking on the editor margin or using <kbd>F9</kbd> on the current line. Finer breakpoint control (enable/disable/reapply) can be done in the Debug View's BREAKPOINTS section.
            </p>
            <p>
                You can also set <strong>Conditional Breakpoints</strong> based on expressions, hit counts, or a combination of both.
            </p>
            <DataGrid generateHeader={GenerateHeaderOptions.none} gridTemplateColumns="1fr 3fr">
                <DataRow key={1}>
                    <DataCell className="font-weight-bold" gridColumn="1">Expression condition</DataCell>
                    <DataCell gridColumn="2">The breakpoint will be hit whenever the expression evaluates to <code>true</code></DataCell>
                </DataRow>
                <DataRow key={2}>
                    <DataCell className="font-weight-bold" gridColumn="1">Hit count</DataCell>
                    <DataCell gridColumn="2">The 'hit count' controls how many times a breakpoint needs to be hit before it will 'break' execution</DataCell>
                </DataRow>
            </DataGrid>
            <p>
                You can add a condition and/or hit count when creating the breakpoint (with the <a href="command:editor.debug.action.conditionalBreakpoint">Add Conditional Breakpoint</a> action) or when modifying an existing one (with the Edit Breakpoint action). In both cases, an inline text box with a drop-down menu opens where you can enter expressions.
            </p>
            <blockquote className="card-body">
                <h5 className="font-weight-light">Logpoints</h5>
                <p>
                    A Logpoint is a variant of a breakpoint that does not "break" into the debugger but instead logs a message to the console. Logpoints are especially useful for injecting logging while debugging production servers that cannot be paused or stopped.
                </p>
                <p className="mb-0">
                    A Logpoint is represented by a ♦️ shaped icon. Log messages are plain text but can include expressions to be evaluated within curly braces ('{"{ }"}').
                </p>
            </blockquote>
            <h2 className="font-weight-light">Debug Actions</h2>
            <p>
                Once a debug session starts, the Debug toolbar will appear on the top of the editor. You can control the execution flow using the actions below.
            </p>
            <DataGrid generateHeader={GenerateHeaderOptions.none} gridTemplateColumns="1fr 3fr">
                <DataRow key={1}>
                    <DataCell className="font-weight-bold" gridColumn="1">Continue/Pause</DataCell>
                    <DataCell gridColumn="2"><kbd>F5</kbd></DataCell>
                </DataRow>
                <DataRow key={2}>
                    <DataCell className="font-weight-bold" gridColumn="1">Step Over</DataCell>
                    <DataCell gridColumn="2"><kbd>F10</kbd></DataCell>
                </DataRow>
                <DataRow key={3}>
                    <DataCell className="font-weight-bold" gridColumn="1">Step Into</DataCell>
                    <DataCell gridColumn="2"><kbd>F11</kbd></DataCell>
                </DataRow>
                <DataRow key={4}>
                    <DataCell className="font-weight-bold" gridColumn="1">Step Out</DataCell>
                    <DataCell gridColumn="2">{sF11}</DataCell>
                </DataRow>
                <DataRow key={5}>
                    <DataCell className="font-weight-bold" gridColumn="1">Restart</DataCell>
                    <DataCell gridColumn="2">{csF5}</DataCell>
                </DataRow>
                <DataRow key={6}>
                    <DataCell className="font-weight-bold" gridColumn="1">Stop</DataCell>
                    <DataCell gridColumn="2">{sF5}</DataCell>
                </DataRow>
            </DataGrid>
            <h2 className="font-weight-light">Inspect Variables</h2>
            <p>
                Variables can be inspected in the <strong>VARIABLES</strong> section of the Debug view or by hovering over their source in the editor. Variable values and expression evaluation are relative to the selected stack frame in the <strong>CALL STACK</strong> section.
            </p>
            <p>
                Variable values can be modified with the <strong>Set Value</strong> action from the variable's context menu. Or you can <strong>double-click</strong> the value and enter a new one. Variables and expressions can also be evaluated and watched in the Debug view's <strong>WATCH</strong> section.
            </p>
            <h2 className="font-weight-light">Hot Code Replace ⚡</h2>
            <p>
                Yes, you can apply code changes without restarting the running program. Click on the <a href="command:java.debug.hotCodeReplace">⚡</a> icon in the <strong>debug toolbar</strong> to apply code changes. When you see failures, don't worry. It is safe to continue running the program, but you may notice discrepancies between the source code and the program.
            </p>
            <blockquote className="card-body">
                <h5 className="font-weight-light">Limitations</h5>
                <p>
                    Hot Code Replace (HCR) sounds magical but it does have limitations. In short, you can only change the code inside an existing function. Here are some scenarios that HCR will <span className="text-danger">NOT</span> work:
                </p>
                <ul className="mb-0">
                    <li>Adding a new member function</li>
                    <li>Changing the signature of an existing function</li>
                    <li>Changing the value of static members (but you can do so using the VARIABLES panel when the program is paused)</li>
                    <li>Referencing new classes/packages</li>
                </ul>
            </blockquote>
        </div>

    );


}