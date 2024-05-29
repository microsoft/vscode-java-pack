// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { VSCodeCheckbox, VSCodeDataGrid, VSCodeDataGridCell, VSCodeDataGridRow, VSCodeDivider, VSCodeDropdown, VSCodeLink, VSCodeOption } from "@vscode/webview-ui-toolkit/react";
import React, { Dispatch, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateCompilerSettings, updateAvailableComplianceLevels, flushCompilerSettingsToEffective } from "./compilerConfigurationViewSlice";
import { CompilerRequest } from "../../vscode/utils";
import { VmInstall } from "../../../types";
import { updateActiveSection } from "../../mainpage/features/commonSlice";
import { updateActiveTab } from "../../classpath/features/classpathConfigurationViewSlice";
import Hint from "./components/Hint";

const CompilerConfigurationView = (): JSX.Element | null => {

  const dispatch: Dispatch<any> = useDispatch();

  const projects: any[] = useSelector((state: any) => state.commonConfig.data.projects);
  const activeProjectIndex: number = useSelector((state: any) => state.commonConfig.ui.activeProjectIndex);
  const complianceLevel: string = useSelector((state: any) => state.compilerConfig.data.complianceLevel[activeProjectIndex]);
  const sourceLevel: string = useSelector((state: any) => state.compilerConfig.data.sourceLevel[activeProjectIndex]);
  const targetLevel: string = useSelector((state: any) => state.compilerConfig.data.targetLevel[activeProjectIndex]);

  // Find the version of current JDK to determine the max compliance level that can be set.
  const vmInstalls: VmInstall[] = useSelector((state: any) => state.classpathConfig.data.vmInstalls);
  const activeVmInstallPath: string = useSelector((state: any) => state.classpathConfig.data.activeVmInstallPath[activeProjectIndex]);
  const activeVmInstall: VmInstall | undefined = vmInstalls.find((vmInstall: VmInstall) => vmInstall.path === activeVmInstallPath);
  let currentJdkComplianceLevel: number = Number.MAX_SAFE_INTEGER;
  if (activeVmInstall?.version) {
    currentJdkComplianceLevel = parseJavaVersion(activeVmInstall.version);
  }

  const useRelease: boolean = useSelector((state: any) => state.compilerConfig.data.useRelease[activeProjectIndex]);
  const enablePreview: boolean = useSelector((state: any) => state.compilerConfig.data.enablePreview[activeProjectIndex]);
  const generateDebugInfo: boolean = useSelector((state: any) => state.compilerConfig.data.generateDebugInfo[activeProjectIndex]);
  const storeMethodParamNames: boolean = useSelector((state: any) => state.compilerConfig.data.storeMethodParamNames[activeProjectIndex]);
  const availableComplianceLevels: string[] = useSelector((state: any) => state.compilerConfig.ui.availableComplianceLevels);

  // Release flag only supported on Java 9+.
  const showReleaseFlag: boolean = currentJdkComplianceLevel >= 9;

  // Hide the preview checkbox if the current JDK version is not latest & preview flag is already disabled.
  const showPreviewFlag: boolean = !!(availableComplianceLevels.find((level) => {
    return Number(level) > currentJdkComplianceLevel;
  }) === undefined) || enablePreview;

  const showSourceTargetWarning: boolean = !useRelease && (sourceLevel !== "" && targetLevel !== "" && Number(sourceLevel) > Number(targetLevel));
  const showJdkLevelWarning: boolean = Number(complianceLevel) > currentJdkComplianceLevel ||
      Number(sourceLevel) > currentJdkComplianceLevel ||
      Number(targetLevel) > currentJdkComplianceLevel;

  const onMessage = (event: any) => {
    const message = event.data;
    if (message.command === "compiler.onDidGetAvailableComplianceLevels") {
      dispatch(updateAvailableComplianceLevels({
        availableComplianceLevels: message.complianceLevels
      }));
    } else if (message.command === "compiler.onDidGetCompilerSettings") {
      dispatch(updateCompilerSettings({
        activeProjectIndex,
        useRelease: message.useRelease,
        enablePreview: message.enablePreview,
        complianceLevel: message.complianceLevel,
        sourceLevel: message.sourceLevel,
        targetLevel: message.targetLevel,
        generateDebugInfo: message.generateDebugInfo,
        storeMethodParamNames: message.storeMethodParamNames
      }));
      dispatch(flushCompilerSettingsToEffective({
        activeProjectIndex,
      }));
    }
  };

  useEffect(() => {
    window.addEventListener("message", onMessage);
    if (availableComplianceLevels?.length === 0) {
      CompilerRequest.onWillGetAvailableComplianceLevels();
    }
    if (sourceLevel === "") {
      CompilerRequest.onWillGetCompilerSettings(projects[activeProjectIndex].rootPath);
    }
    return () => {
      window.removeEventListener("message", onMessage);
    }
  }, []);

  const jdkLevels = (selectedLevel: string, label: string, onClick: (value: string) => void) => {
    return availableComplianceLevels.map((level) => {

      return (
        <VSCodeOption
          className="setting-section-option"
          key={`${label}-${level}`}
          value={level}
          selected={level === selectedLevel}
          onClick={() => onClick(level)}
        >
          <span>{level}</span>
        </VSCodeOption>
      );
    });
  };

  const onClickUseRelease = (e: any) => {
    dispatch(updateCompilerSettings({
      activeProjectIndex,
      useRelease: e.target.checked
    }));
  };

  const onClickEnablePreview = (e: any) => {
    dispatch(updateCompilerSettings({
      activeProjectIndex,
      enablePreview: e.target.checked
    }));
  };

  const onClickComplianceLevel = (value: string) => {
    dispatch(updateCompilerSettings({
      activeProjectIndex,
      complianceLevel: value
    }));
  };

  const onClickSourceLevel = (value: string) => {
    dispatch(updateCompilerSettings({
      activeProjectIndex,
      sourceLevel: value
    }));
  };

  const onClickTargetLevel = (value: string) => {
    dispatch(updateCompilerSettings({
      activeProjectIndex,
      targetLevel: value
    }));
  };

  const onClickGenerateDebugInfo = (e: any) => {
    dispatch(updateCompilerSettings({
      activeProjectIndex,
      generateDebugInfo: e.target.checked
    }));
  };

  const onClickStoreMethodParamNames = (e: any) => {
    dispatch(updateCompilerSettings({
      activeProjectIndex,
      storeMethodParamNames: e.target.checked
    }));
  };

  const onClickChangeJdk = () => {
    dispatch(updateActiveSection("classpath"));
    dispatch(updateActiveTab("jdk"));
  };

  return (
    <div className="root">
      <div className="setting-section">
        <div className={showReleaseFlag ? "" : "invisible"}>
          <VSCodeCheckbox checked={useRelease} onClick={onClickUseRelease}>Use '--release' option for cross-compilation (Java 9 and later)</VSCodeCheckbox>
        </div>
        <div>
          <VSCodeDataGrid gridTemplateColumns="40% 60%">
            <VSCodeDataGridRow className={showReleaseFlag && useRelease ? "" : "invisible"}>
              <VSCodeDataGridCell className="flex-center pl-0 pr-0" gridColumn="1">
                <span>Bytecode version:</span>
              </VSCodeDataGridCell>
              <VSCodeDataGridCell className="flex-center pl-0 pr-0" gridColumn="2">
                <VSCodeDropdown value={complianceLevel}>
                  {jdkLevels(complianceLevel, "compliance", onClickComplianceLevel)}
                </VSCodeDropdown>
              </VSCodeDataGridCell>
            </VSCodeDataGridRow>
            <VSCodeDataGridRow className={showReleaseFlag && useRelease ? "invisible" : ""}>
              <VSCodeDataGridCell className="flex-center pl-0 pr-0" gridColumn="1">
                <span>Source compatibility:</span>
              </VSCodeDataGridCell>
              <VSCodeDataGridCell className="flex-center pl-0 pr-0" gridColumn="2">
                <VSCodeDropdown value={sourceLevel}>
                  {jdkLevels(sourceLevel, "source", onClickSourceLevel)}
                </VSCodeDropdown>
              </VSCodeDataGridCell>
            </VSCodeDataGridRow>
            <VSCodeDataGridRow className={showReleaseFlag && useRelease ? "invisible" : ""}>
              <VSCodeDataGridCell className="flex-center pl-0 pr-0" gridColumn="1">
                <span>Target compatibility:</span>
              </VSCodeDataGridCell>
              <VSCodeDataGridCell className="flex-center pl-0 pr-0" gridColumn="2">
                <VSCodeDropdown value={targetLevel}>
                  {jdkLevels(targetLevel, "target", onClickTargetLevel)}
                </VSCodeDropdown>
              </VSCodeDataGridCell>
            </VSCodeDataGridRow>
          </VSCodeDataGrid>
        </div>
        <div className={`mt-2 mb-2 ${showSourceTargetWarning ? "" : "invisible"}`}>
          <span className="setting-section-warning">
            Target compatibility must be equal or greater than source compatibility.
          </span>
        </div>
        <div className={`mt-2 mb-2 ${showJdkLevelWarning ? "" : "invisible"}`}>
          <span className="setting-section-warning">
            Please make sure to have a compatible JDK configured (currently {currentJdkComplianceLevel}). You can change the JDK under the <VSCodeLink href="" onClick={() => onClickChangeJdk()}>JDK Runtime</VSCodeLink> tab.
          </span>
        </div>
        <div className={showPreviewFlag ? "" : "invisible"}>
          <VSCodeCheckbox checked={enablePreview} onClick={onClickEnablePreview}>Enable preview features</VSCodeCheckbox>
        </div>
        <VSCodeDivider className="mt-3" />
        <h4 className="mt-3 mb-3">Class File Generation</h4>
        <div>
          <VSCodeCheckbox checked={generateDebugInfo} onClick={onClickGenerateDebugInfo}>Generate debugging information</VSCodeCheckbox>
        </div>
        <div>
          <VSCodeCheckbox checked={storeMethodParamNames} onClick={onClickStoreMethodParamNames}>Store information about method parameters</VSCodeCheckbox>
        </div>
      </div>
      <Hint />
    </div>
  )
}

function parseJavaVersion(version: string): number {
  if (!version.includes(".")) {
    return Number(version);
  } else if (version.startsWith("1.")) {
    return Number("1." + version.split(".")[1]);
  } else {
    return Number(version.split(".")[0]);
  }
}

export default CompilerConfigurationView;
