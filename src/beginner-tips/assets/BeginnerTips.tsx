// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "./style.scss";
import { VSCodePanelTab, VSCodePanels, VSCodePanelView } from "@vscode/webview-ui-toolkit/react";
import React from 'react';
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
        <VSCodePanels activeid="tab-1">
          <VSCodePanelTab id="tab-1">Quick Start</VSCodePanelTab>
          <VSCodePanelTab id="tab-2">Code Editing</VSCodePanelTab>
          <VSCodePanelTab id="tab-3">Debugging</VSCodePanelTab>
          <VSCodePanelTab id="tab-4">FAQ</VSCodePanelTab>
          <VSCodePanelView id="view-1">
            <QuickStartPanel />
          </VSCodePanelView>
          <VSCodePanelView id="view-2">
            <CodeEditingPanel />
          </VSCodePanelView>
          <VSCodePanelView id="view-3">
            <DebuggingPanel />
          </VSCodePanelView>
          <VSCodePanelView id="view-4">
            <FaqPanel />
          </VSCodePanelView>
        </VSCodePanels>
      </div>
    </div>
  );

}
