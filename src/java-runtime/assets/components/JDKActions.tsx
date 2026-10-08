// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

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
        <vscode-button secondary onClick={onClickBrowseJDKButton}><a href="#">Locate an <b>Existing JDK</b></a></vscode-button>
        {isDirty && <vscode-button><a href="command:workbench.action.reloadWindow">Reload</a></vscode-button>}
      </div>
      <div className="jdk-action">
        <vscode-button secondary onClick={onClickInstallButton}><a href="#">Install a <b>New JDK</b></a></vscode-button>
      </div>
    </>
  );
}
