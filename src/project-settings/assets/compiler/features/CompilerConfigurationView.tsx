// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "@vscode-elements/elements/dist/vscode-divider/index.js";
import "@vscode-elements/elements/dist/vscode-single-select/index.js";
import "@vscode-elements/elements/dist/vscode-option/index.js";
import "@vscode-elements/elements/dist/vscode-checkbox/index.js";
import "@vscode-elements/elements/dist/vscode-table/index.js";
import "@vscode-elements/elements/dist/vscode-table-body/index.js";
import "@vscode-elements/elements/dist/vscode-table-row/index.js";
import "@vscode-elements/elements/dist/vscode-table-cell/index.js";


import { Dispatch, useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateCompilerSettings, updateAvailableComplianceLevels } from "./compilerConfigurationViewSlice";
import { CompilerRequest } from "../../vscode/utils";
import { VmInstall } from "../../../types";
import { updateActiveSection } from "../../mainpage/features/commonSlice";
import { updateActiveTab } from "../../classpath/features/classpathConfigurationViewSlice";
import Hint from "./components/Hint";

const CompilerConfigurationView = (): JSX.Element | null => {

  const dispatch: Dispatch<any> = useDispatch();

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

  // Hide the preview checkbox if the current JDK version is not latest & preview flag is already disabled.
  const showPreviewFlag: boolean = !!(availableComplianceLevels.find((level) => {
    return Number(level) > currentJdkComplianceLevel;
  }) === undefined) || enablePreview;

  const showSourceTargetWarning: boolean = !useRelease && (sourceLevel !== "" && targetLevel !== "" && Number(sourceLevel) > Number(targetLevel));
  const showJdkLevelWarning: boolean = Number(complianceLevel) > currentJdkComplianceLevel ||
      Number(sourceLevel) > currentJdkComplianceLevel ||
      Number(targetLevel) > currentJdkComplianceLevel;

  const complianceRef = useRef<HTMLElement>(null);
  const sourceRef = useRef<HTMLElement>(null);
  const targetRef = useRef<HTMLElement>(null);

  const onMessage = (event: any) => {
    const message = event.data;
    if (message.command === "compiler.onDidGetAvailableComplianceLevels") {
      dispatch(updateAvailableComplianceLevels({
        availableComplianceLevels: message.complianceLevels
      }));
    }
  };

  useEffect(() => {
    window.addEventListener("message", onMessage);
    if (availableComplianceLevels?.length === 0) {
      CompilerRequest.onWillGetAvailableComplianceLevels();
    }
    return () => {
      window.removeEventListener("message", onMessage);
    }
  }, []);

  // The vscode-single-select element renders its options in the shadow DOM and
  // only emits a native `change` event on the host element, so the click handlers
  // on the slotted vscode-option children never fire. Listen to `change` instead.
  const useSelectChange = (ref: React.RefObject<HTMLElement | null>, onChange: (value: string) => void) => {
    useEffect(() => {
      const el = ref.current;
      if (!el) {
        return;
      }
      const handler = (e: Event) => {
        const value = (e.target as any).value;
        if (value) {
          onChange(value);
        }
      };
      el.addEventListener("change", handler);
      return () => el.removeEventListener("change", handler);
    }, [ref, onChange]);
  };

  const onChangeComplianceLevel = useCallback((value: string) => {
    dispatch(updateCompilerSettings({ activeProjectIndex, complianceLevel: value }));
  }, [dispatch, activeProjectIndex]);
  const onChangeSourceLevel = useCallback((value: string) => {
    dispatch(updateCompilerSettings({ activeProjectIndex, sourceLevel: value }));
  }, [dispatch, activeProjectIndex]);
  const onChangeTargetLevel = useCallback((value: string) => {
    dispatch(updateCompilerSettings({ activeProjectIndex, targetLevel: value }));
  }, [dispatch, activeProjectIndex]);

  useSelectChange(complianceRef, onChangeComplianceLevel);
  useSelectChange(sourceRef, onChangeSourceLevel);
  useSelectChange(targetRef, onChangeTargetLevel);

  // Keep the rendered selection in sync with the redux state.
  useEffect(() => {
    if (complianceRef.current && complianceLevel) {
      (complianceRef.current as any).value = complianceLevel;
    }
  }, [complianceLevel, availableComplianceLevels]);
  useEffect(() => {
    if (sourceRef.current && sourceLevel) {
      (sourceRef.current as any).value = sourceLevel;
    }
  }, [sourceLevel, availableComplianceLevels]);
  useEffect(() => {
    if (targetRef.current && targetLevel) {
      (targetRef.current as any).value = targetLevel;
    }
  }, [targetLevel, availableComplianceLevels]);

  const jdkLevels = (selectedLevel: string, label: string) => {
    return availableComplianceLevels.map((level) => {

      return (
        <vscode-option
          className="setting-section-option"
          key={`${label}-${level}`}
          value={level}
          selected={level === selectedLevel ? true : undefined}
        >
          <span>{level}</span>
        </vscode-option>
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
        <div>
          <vscode-checkbox checked={useRelease} onClick={onClickUseRelease}>Use '--release' option for cross-compilation (Java 9 and later)</vscode-checkbox>
        </div>
        <div>
          <vscode-table >
            <vscode-table-body slot="body">
            <vscode-table-row className={useRelease ? "" : "invisible"}>
              <vscode-table-cell className="flex-center pl-0 pr-0" >
                <span>Bytecode version:</span>
              </vscode-table-cell>
              <vscode-table-cell className="flex-center pl-0 pr-0" >
                <vscode-single-select ref={complianceRef}>
                  {jdkLevels(complianceLevel, "compliance")}
                </vscode-single-select>
              </vscode-table-cell>
            </vscode-table-row>
            <vscode-table-row className={useRelease ? "invisible" : ""}>
              <vscode-table-cell className="flex-center pl-0 pr-0" >
                <span>Source compatibility:</span>
              </vscode-table-cell>
              <vscode-table-cell className="flex-center pl-0 pr-0" >
                <vscode-single-select ref={sourceRef}>
                  {jdkLevels(sourceLevel, "source")}
                </vscode-single-select>
              </vscode-table-cell>
            </vscode-table-row>
            <vscode-table-row className={useRelease ? "invisible" : ""}>
              <vscode-table-cell className="flex-center pl-0 pr-0" >
                <span>Target compatibility:</span>
              </vscode-table-cell>
              <vscode-table-cell className="flex-center pl-0 pr-0" >
                <vscode-single-select ref={targetRef}>
                  {jdkLevels(targetLevel, "target")}
                </vscode-single-select>
              </vscode-table-cell>
            </vscode-table-row>
            </vscode-table-body>
          </vscode-table>
        </div>
        <div className={`mt-2 mb-2 ${showSourceTargetWarning ? "" : "invisible"}`}>
          <span className="setting-section-warning">
            Target compatibility must be equal or greater than source compatibility.
          </span>
        </div>
        <div className={`mt-2 mb-2 ${showJdkLevelWarning ? "" : "invisible"}`}>
          <span className="setting-section-warning">
            Please make sure to have a compatible JDK configured (currently {currentJdkComplianceLevel}). You can change the JDK under the <a href="" onClick={() => onClickChangeJdk()}>JDK Runtime</a> tab.
          </span>
        </div>
        <div className={showPreviewFlag ? "" : "invisible"}>
          <vscode-checkbox checked={enablePreview} onClick={onClickEnablePreview}>Enable preview features</vscode-checkbox>
        </div>
        <vscode-divider className="mt-3" />
        <h4 className="mt-3 mb-3">Class File Generation</h4>
        <div>
          <vscode-checkbox checked={generateDebugInfo} onClick={onClickGenerateDebugInfo}>Generate debugging information</vscode-checkbox>
        </div>
        <div>
          <vscode-checkbox checked={storeMethodParamNames} onClick={onClickStoreMethodParamNames}>Store information about method parameters</vscode-checkbox>
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
