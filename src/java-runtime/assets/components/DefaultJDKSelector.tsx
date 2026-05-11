// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "@vscode-elements/elements/dist/vscode-button/index.js";

import { useState } from "react";
import { JavaRuntimeEntry, ProjectRuntimeEntry } from "../../types";
import { setDefaultRuntime } from "../vscode.api";

interface Props {
  jdkEntries: JavaRuntimeEntry[];
  projectRuntime: ProjectRuntimeEntry;
}

export function DefaultJDKSelector({ jdkEntries, projectRuntime: p }: Props) {
  const [isEditing, setIsEditing] = useState(false);

  const onSelectionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setIsEditing(false);
    const { value } = event.target;
    const targetJdk = jdkEntries.find(jdk => jdk.fspath === value);
    if (targetJdk) {
      setDefaultRuntime(targetJdk.fspath, targetJdk.majorVersion);
    }
  };

  return (
    <div className="inline-flex">
      {isEditing ?
        <select className="jdkDropdown" id="jdkDropdown" defaultValue={p.runtimePath} onChange={onSelectionChange}>
          {jdkEntries.map(jdk => (
            <option key={jdk.name} value={jdk.fspath}>{jdk.majorVersion} - {jdk.name}</option>
          ))}
        </select>
        :
        <span>{p.sourceLevel}</span>
      }
      <vscode-button icon-only onClick={() => setIsEditing(true)} title="Edit"><span className="codicon codicon-edit"></span></vscode-button>
    </div>
  );
}
