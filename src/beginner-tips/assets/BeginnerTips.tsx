// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "./style.scss";
import "@vscode-elements/elements/dist/vscode-tabs/index.js";
import "@vscode-elements/elements/dist/vscode-tab-header/index.js";
import "@vscode-elements/elements/dist/vscode-tab-panel/index.js";
import CodeEditingPanel from "./tabs/CodeEditingPanel";
import DebuggingPanel from "./tabs/DebuggingPanel";
import FaqPanel from "./tabs/FaqPanel";
import QuickStartPanel from "./tabs/QuickStartPanel";

export default function BeginnerTips() {

  return (
    <div className="container mt-5 mb-5">
      <div className="header">
          <h1 className="font-weight-light">Tips for Beginners</h1>
      </div>
      <div className="row">
        <vscode-tabs selected-index={0}>
          <vscode-tab-header slot="header">Quick Start</vscode-tab-header>
          <vscode-tab-header slot="header">Code Editing</vscode-tab-header>
          <vscode-tab-header slot="header">Debugging</vscode-tab-header>
          <vscode-tab-header slot="header">FAQ</vscode-tab-header>
          <vscode-tab-panel>
            <QuickStartPanel />
          </vscode-tab-panel>
          <vscode-tab-panel>
            <CodeEditingPanel />
          </vscode-tab-panel>
          <vscode-tab-panel>
            <DebuggingPanel />
          </vscode-tab-panel>
          <vscode-tab-panel>
            <FaqPanel />
          </vscode-tab-panel>
        </vscode-tabs>
      </div>
    </div>
  );

}
