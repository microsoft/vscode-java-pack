// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "./style.scss";
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import * as webviewUI from "@vscode/webview-ui-toolkit";
import React from 'react';
import CodeEditingPanel from "./tabs/CodeEditingPanel";
import DebuggingPanel from "./tabs/DebuggingPanel";
import FaqPanel from "./tabs/FaqPanel";
import QuickStartPanel from "./tabs/QuickStartPanel";

const { wrap } = provideReactWrapper(React);

const PanelTab = wrap(webviewUI.VSCodePanelTab);
const Panels = wrap(webviewUI.VSCodePanels);
const PanelView = wrap(webviewUI.VSCodePanelView);

export default function BeginnerTips() {

  return (
    <div className="container mt-5 mb-5">
      <div className="header">
          <h1 className="font-weight-light">Tips for Beginners</h1>
      </div>
      <div className="row">
        <Panels activeid="tab-1">
          <PanelTab id="tab-1">Quick Start</PanelTab>
          <PanelTab id="tab-2">Code Editing</PanelTab>
          <PanelTab id="tab-3">Debugging</PanelTab>
          <PanelTab id="tab-4">FAQ</PanelTab>
          <PanelView id="view-1">
            <QuickStartPanel />
          </PanelView>
          <PanelView id="view-2">
            <CodeEditingPanel />
          </PanelView>
          <PanelView id="view-3">
            <DebuggingPanel />
          </PanelView>
          <PanelView id="view-4">
            <FaqPanel />
          </PanelView>
        </Panels>
      </div>
    </div>
  );

}
