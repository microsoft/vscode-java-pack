// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { richText } from "../../../l10n/richText";
import * as l10n from "@vscode/l10n";
import "@vscode-elements/elements/dist/vscode-button/index.js";

import { useState } from "react";
import { onWillBrowseForJDK, onWillRunCommandFromWebview } from "../vscode.api";

export function JDKActions() {
  const [isDirty, setIsDirty] = useState(false);

  const onClickBrowseJDKButton = () => {
    onWillBrowseForJDK();
    setIsDirty(true);
  };

  const onClickInstallButton = () => {
    onWillRunCommandFromWebview("java.runtime", "download", "java.installJdk");
  };

  return (
    <>
      <div className="jdk-action">
        <vscode-button secondary onClick={onClickBrowseJDKButton}><a href="#">{richText(l10n.t("Locate an {0}"), [<b>{l10n.t("Existing JDK")}</b>])}</a></vscode-button>
        {isDirty && <vscode-button><a href="command:workbench.action.reloadWindow">{l10n.t("Reload")}</a></vscode-button>}
      </div>
      <div className="jdk-action">
        <vscode-button secondary onClick={onClickInstallButton}><a href="#">{richText(l10n.t("Install a {0}"), [<b>{l10n.t("New JDK")}</b>])}</a></vscode-button>
      </div>
    </>
  );
}
