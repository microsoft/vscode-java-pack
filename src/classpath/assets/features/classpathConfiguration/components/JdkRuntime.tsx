// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React, { Dispatch, useEffect, useState } from "react";
import { encodeCommandUriWithTelemetry } from "../../../../../utils/webview";
import { WEBVIEW_ID, onWillChangeJdk } from "../../../utils";
import { VSCodeDivider, VSCodeDropdown, VSCodeLink, VSCodeOption, } from "@vscode/webview-ui-toolkit/react";
import { useDispatch, useSelector } from "react-redux";
import { VmInstall } from "../../../../types";
import { setJdks } from "../classpathConfigurationViewSlice";
import SectionHeader from "./common/SectionHeader";

const JdkRuntime = (): JSX.Element => {

  const vmInstalls: VmInstall[] = useSelector((state: any) => state.classpathConfig.vmInstalls);
  const activeVmInstallPath: string = useSelector((state: any) => state.classpathConfig.activeVmInstallPath);

  const [optionDescription, setOptionDescription] = useState<string | null>(null);

  const dispatch: Dispatch<any> = useDispatch();

  const handleSelectJdk = (path: string) => {
    onWillChangeJdk(path);
    if (path !== "add-new-jdk") {
      // if the user selects a existing JDK, we directly update the activeVmInstallPath.
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
      onMouseEnter={() => setOptionDescription("Select a JDK from the file system.")}
      onMouseLeave={() => setOptionDescription(activeVmInstallPath + 'asds')}
      onClick={() => handleSelectJdk("add-new-jdk")}
    >
      <div className="setting-section-option-action">
        <span className="codicon codicon-folder-opened"/>Add a new JDK...
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
      <SectionHeader title="JDK Runtime" subTitle={undefined}/>
      <span className="setting-section-description">Specify the JDK runtime of the project. Or <VSCodeLink href={encodeCommandUriWithTelemetry(WEBVIEW_ID, "classpath.jdk", "java.installJdk")}>install a new JDK</VSCodeLink>.</span>
      <div className="setting-section-target">
        <VSCodeDropdown id="jdk-dropdown" value={activeVmInstallPath} className="setting-section-dropdown" position="below">
          <div className="dropdown-description dropdown-above-description">
            <p>{optionDescription ?? activeVmInstallPath}</p>
            <VSCodeDivider></VSCodeDivider>
          </div>
          {jdkSelections}
          <VSCodeDivider></VSCodeDivider>
          {addNewJdk}
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
