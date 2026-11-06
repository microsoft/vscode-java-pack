// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as l10n from "@vscode/l10n";
import "./style.scss";
import "@vscode-elements/elements/dist/vscode-tabs/index.js";
import "@vscode-elements/elements/dist/vscode-tab-header/index.js";
import "@vscode-elements/elements/dist/vscode-tab-panel/index.js";
import CodeEditingPanel from "./tabs/CodeEditingPanel";
import DebuggingPanel from "./tabs/DebuggingPanel";
import FaqPanel from "./tabs/FaqPanel";
import QuickStartPanel from "./tabs/QuickStartPanel";

export default function BeginnerTips({ requiredJdkVersion }: { requiredJdkVersion: number }) {

  return (
    <div className="container mt-5 mb-5">
      <div className="header">
          <h1 className="font-weight-light">{l10n.t("Tips for Beginners")}</h1>
      </div>
      <div className="row">
        <vscode-tabs selected-index={0}>
          <vscode-tab-header slot="header">{l10n.t("Quick Start")}</vscode-tab-header>
          <vscode-tab-header slot="header">{l10n.t("Code Editing")}</vscode-tab-header>
          <vscode-tab-header slot="header">{l10n.t("Debugging")}</vscode-tab-header>
          <vscode-tab-header slot="header">{l10n.t("FAQ")}</vscode-tab-header>
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
            <FaqPanel requiredJdkVersion={requiredJdkVersion} />
          </vscode-tab-panel>
        </vscode-tabs>
      </div>
    </div>
  );

}
