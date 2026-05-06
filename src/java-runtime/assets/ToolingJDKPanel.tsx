// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "@vscode-elements/elements/dist/vscode-button/index.js";

import { useState } from "react";
import { JavaRuntimeEntry } from "../types";
import { onWillBrowseForJDK, onWillRunCommandFromWebview } from './vscode.api';

const REQUIRED_JDK_VERSION = 17;

interface Props {
  jdkEntries?: JavaRuntimeEntry[];
  javaDotHome?: string;
  javaHomeError?: any;
}

export function ToolingJDKPanel({ javaHomeError }: Props) {
  const [isDirty, setIsDirty] = useState(false);

  const onClickBrowseJDKButton = () => {
    onWillBrowseForJDK();
    setIsDirty(true);
  };

  const onClickInstallButton = () => {
    onWillRunCommandFromWebview("java.runtime", "download", "java.installJdk");
  };

  return (
    <div className="container">
      <h1>Configure Runtime for Language Server</h1>
      <div className="warning-box"><i className="codicon codicon-warning"></i>Java Language Server requires a JDK {REQUIRED_JDK_VERSION}+ to launch itself.</div>

      {javaHomeError && (<p className="java-home-error">{javaHomeError}</p>)}

      <div className="jdk-action">
        <vscode-button secondary onClick={onClickBrowseJDKButton}><a href="#">Locate an <b>Existing JDK</b></a></vscode-button>
        {isDirty && <vscode-button><a href="command:workbench.action.reloadWindow">Reload</a></vscode-button>}
      </div>
      <div className="jdk-action">
        <vscode-button secondary onClick={onClickInstallButton}><a href="#">Install a <b>New JDK</b></a></vscode-button>
      </div>
    </div>
  );
}
