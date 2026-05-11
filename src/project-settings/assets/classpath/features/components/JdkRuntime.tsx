// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "@vscode-elements/elements/dist/vscode-divider/index.js";
import "@vscode-elements/elements/dist/vscode-single-select/index.js";
import "@vscode-elements/elements/dist/vscode-option/index.js";
import "@vscode-elements/elements/dist/vscode-button/index.js";

import { useCallback, useEffect, useRef } from "react";
import { ClasspathRequest, CommonRequest } from "../../../vscode/utils";

import { useDispatch, useSelector } from "react-redux";
import { VmInstall } from "../../../../types";
import { setJdks } from "../classpathConfigurationViewSlice";

const JdkRuntime = (): JSX.Element => {

  const activeProjectIndex: number = useSelector((state: any) => state.commonConfig.ui.activeProjectIndex);
  const activeProjectIndexRef = useRef(activeProjectIndex);
  useEffect(() => {
    activeProjectIndexRef.current = activeProjectIndex;
  }, [activeProjectIndex]);

  const vmInstalls: VmInstall[] = useSelector((state: any) => state.classpathConfig.data.vmInstalls);
  const activeVmInstallPath: string = useSelector((state: any) => state.classpathConfig.data.activeVmInstallPath[activeProjectIndex]);

  const dispatch = useDispatch();
  const selectRef = useRef<HTMLElement>(null);

  const handleSelectJdk = useCallback((path: string) => {
    if (path === "add-new-jdk") {
      ClasspathRequest.onWillAddNewJdk();
    } else if (path === "download-jdk") {
      CommonRequest.onWillExecuteCommand("java.installJdk")
    } else {
      dispatch(setJdks({
        activeProjectIndex: activeProjectIndexRef.current,
        activeVmInstallPath: path
      }));
    }
  }, [dispatch]);

  // Use native change event on the select element
  useEffect(() => {
    const el = selectRef.current;
    if (!el) return;
    const handleChange = (e: Event) => {
      const selectedValue = (e.target as any).value;
      if (selectedValue) {
        handleSelectJdk(selectedValue);
      }
    };
    el.addEventListener("change", handleChange);
    return () => el.removeEventListener("change", handleChange);
  }, [handleSelectJdk]);

  // Sync the value property on the select element when activeVmInstallPath changes
  useEffect(() => {
    const el = selectRef.current;
    if (el && activeVmInstallPath) {
      (el as any).value = activeVmInstallPath;
    }
  }, [activeVmInstallPath, vmInstalls]);

  const onDidChangeJdk = useCallback((event: OnDidChangeJdkEvent) => {
    const {data} = event;
    if (data.command === "classpath.onDidChangeJdk") {
      dispatch(setJdks({
        activeProjectIndex: activeProjectIndexRef.current,
        ...data
      }));
    }
  }, [dispatch]);

  useEffect(() => {
    window.addEventListener("message", onDidChangeJdk);
    if (vmInstalls.length === 0) {
      ClasspathRequest.onWillListVmInstalls();
    }
    return () => window.removeEventListener("message", onDidChangeJdk);
  }, [onDidChangeJdk]);

  return (
    <div className="setting-section">
      <div className="jdk-runtime-row">
        <span className="setting-section-description">JDK:</span>
        <vscode-single-select
          ref={selectRef}
          id="jdk-dropdown"
          className="setting-section-dropdown"
        >
          {vmInstalls.map((vmInstall) => (
            <vscode-option
              key={vmInstall.path}
              value={vmInstall.path}
              selected={vmInstall.path === activeVmInstallPath ? true : undefined}
              description={vmInstall.path}
            >
              {vmInstall.name}
            </vscode-option>
          ))}
        </vscode-single-select>
      </div>
      <div className="jdk-runtime-path">
        {activeVmInstallPath}
      </div>
      <div className="jdk-runtime-actions">
        <vscode-button secondary onClick={() => ClasspathRequest.onWillAddNewJdk()}>
          <span className="codicon codicon-folder-opened mr-1"></span>
          Find a local JDK...
        </vscode-button>
        <vscode-button secondary onClick={() => CommonRequest.onWillExecuteCommand("java.installJdk")}>
          <span className="codicon codicon-desktop-download mr-1"></span>
          Download a new JDK...
        </vscode-button>
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
