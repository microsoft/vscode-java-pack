// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React, { Dispatch, useEffect, useState } from "react";
import { onWillAddNewJdk, onWillExecuteCommand } from "../../../utils";
import { VSCodeDivider, VSCodeDropdown, VSCodeOption, } from "@vscode/webview-ui-toolkit/react";
import { useDispatch, useSelector } from "react-redux";
import { VmInstall } from "../../../../types";
import { setJdks } from "../classpathConfigurationViewSlice";

const JdkRuntime = (): JSX.Element => {

  const vmInstalls: VmInstall[] = useSelector((state: any) => state.classpathConfig.vmInstalls);
  const activeVmInstallPath: string = useSelector((state: any) => state.classpathConfig.activeVmInstallPath[state.classpathConfig.activeProjectIndex]);

  const [optionDescription, setOptionDescription] = useState<string | null>(null);

  const dispatch: Dispatch<any> = useDispatch();

  const handleSelectJdk = (path: string) => {
    if (path === "add-new-jdk") {
      onWillAddNewJdk();
    } else if (path === "download-jdk") {
      onWillExecuteCommand("java.installJdk")
    } else {
      dispatch(setJdks({activeVmInstallPath: path}));
    }
  }

  const onDidChangeJdk = (event: OnDidChangeJdkEvent) => {
    const {data} = event;
    if (data.command === "onDidChangeJdk") {
      dispatch(setJdks(data));
    }
  }

  const jdkSelections = vmInstalls.map((vmInstall) => {
    return (
      <VSCodeOption
        className="setting-section-option"
        key={vmInstall.path}
        value={vmInstall.path}
        selected={vmInstall.path === activeVmInstallPath}
        onMouseEnter={() => setOptionDescription(vmInstall.path)}
        onMouseLeave={() => setOptionDescription(activeVmInstallPath)}
        onClick={() => handleSelectJdk(vmInstall.path)}
      >
        <span>{vmInstall.name}</span>
      </VSCodeOption>
    );
  });

  const addNewJdk = (
    <VSCodeOption
      className="setting-section-option"
      key="add-new-jdk"
      value="add-new-jdk"
      id="add-new-jdk"
      onMouseEnter={() => setOptionDescription("Select a JDK from the local file system.")}
      onMouseLeave={() => setOptionDescription(activeVmInstallPath)}
      onClick={() => handleSelectJdk("add-new-jdk")}
    >
      <div className="setting-section-option-action">
        <span className="codicon codicon-folder-opened"/>Find a local JDK...
      </div>
    </VSCodeOption>
  );

  const downloadJdk = (
      <VSCodeOption
        className="setting-section-option"
        key="download-jdk"
        value="download-jdk"
        id="download-jdk"
        onMouseEnter={() => setOptionDescription("Download a new JDK.")}
        onMouseLeave={() => setOptionDescription(activeVmInstallPath)}
        onClick={() => handleSelectJdk("download-jdk")}
      >
        <div className="setting-section-option-action">
          <span className="codicon codicon-desktop-download"/>Download a new JDK...
        </div>
      </VSCodeOption>
    );

  useEffect(() => {
    window.addEventListener("message", onDidChangeJdk);
    // the dropdown list has a fixed height by default, which makes the list jitter
    // when the jdk path changes. We set the max-height to initial to fix this issue.
    // Note that the list box is rendered inside a shadow dom so this is the only way
    // to change its style.
    document.querySelector("#jdk-dropdown")?.shadowRoot
        ?.querySelector(".listbox")?.setAttribute("style", "max-height: initial;");
    return () => window.removeEventListener("message", onDidChangeJdk);
  }, []);

  return (
    <div className="setting-section">
      <div className="flex-center mt-2">
        <span className="setting-section-description mr-1">JDK:</span>
        <VSCodeDropdown id="jdk-dropdown" value={activeVmInstallPath} className="setting-section-dropdown" position="below">
          <div className="dropdown-description dropdown-above-description">
            <p>{optionDescription ?? activeVmInstallPath}</p>
            <VSCodeDivider></VSCodeDivider>
          </div>
          {jdkSelections}
          <VSCodeDivider></VSCodeDivider>
          {addNewJdk}
          {downloadJdk}
          <div className="dropdown-description dropdown-below-description">
            <VSCodeDivider></VSCodeDivider>
            <p>{optionDescription ?? activeVmInstallPath}</p>
          </div>
        </VSCodeDropdown>
      </div>
    </div>
  );
};

interface OnDidChangeJdkEvent {
  data: {
    command: string;
    vmInstalls: VmInstall[];
    activeVmInstallPath: string;
  };
}

export default JdkRuntime;
