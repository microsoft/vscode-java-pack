// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "@vscode-elements/elements/dist/vscode-single-select/index.js";
import "@vscode-elements/elements/dist/vscode-option/index.js";

import { useSelector } from "react-redux";
import { VSCodeSettings } from "../../../../FormatterConstants";
import { Category, ExampleKind, JavaFormatterSetting, ValueKind } from "../../../../types";
import { onWillChangeExampleKind, onWillChangeSetting } from "../../../utils";

const Setting = (): JSX.Element => {

  const profileSettings: JavaFormatterSetting[] = useSelector((state: any) => state.formatterSettings.profileSettings);
  const vscodeSettings: JavaFormatterSetting[] = useSelector((state: any) => state.formatterSettings.vscodeSettings);
  const activeCategory: Category = useSelector((state: any) => state.formatterSettings.activeCategory);
  const detectIndentation: boolean = useSelector((state: any) => state.formatterSettings.detectIndentation);
  const readOnly: boolean = useSelector((state: any) => state.formatterSettings.readOnly);

  const handleChangeCheckbox = (e: any) => {
    const id = e.target.id;
    const value = (e.target.checked === true) ? "true" : "false";
    onWillChangeSetting(id, value);
  };

  const handleChangeInput = (e: any) => {
    onWillChangeSetting(e.target.id, e.target.value);
  };

  const handleSelect = (setting: JavaFormatterSetting, value: string) => {
    onWillChangeSetting(setting.id, value);
  };

  const handleClick = (exampleKind: ExampleKind) => {
    onWillChangeExampleKind(exampleKind);
  };

  const generateSetting = (setting: JavaFormatterSetting) => {
    if (!setting.name || !setting.id) {
      return null;
    }
    switch (setting.valueKind as ValueKind) {
      case ValueKind.Boolean:
        const willBeOverriden = detectIndentation && setting.id === VSCodeSettings.DETECT_INDENTATION;
        return (
          <div className="setting-section" key={`${setting.id}`} onClick={() => handleClick(setting.exampleKind)}>
            <div className="pl-0">
              <label className="setting-section-description">
                <input type="checkbox" id={`${setting.id}`} checked={setting.value === "true"} onChange={handleChangeCheckbox} disabled={readOnly} />
                <i className="codicon codicon-check"></i>
                <span className="setting-section-description-checkbox">{setting.name}.</span>
              </label>
              <br />
              <span className="warning">
                {willBeOverriden ? "When enabled, the indentation settings will be overriden based on the file contents." : ""}
              </span>
            </div>
          </div>
        );
      case ValueKind.Enum:
        if (!setting.candidates) {
          return null;
        }
        return (
          <div className="setting-section" key={`${setting.id}`} onClick={() => handleClick(setting.exampleKind)}>
            <span className="setting-section-description">{setting.name}.</span>
            <vscode-single-select
              className="mt-1"
              value={setting.value}
              disabled={readOnly}
              onChange={(e: any) => handleSelect(setting, e.target.value)}
            >
              {setting.candidates.map(candidate => (
                <vscode-option key={`${setting.id}.${candidate}`} value={candidate} selected={candidate === setting.value}>
                  {candidate}
                </vscode-option>
              ))}
            </vscode-single-select>
          </div>
        );
      case ValueKind.Number:
        return (
          <div className="setting-section" key={`${setting.id}`} onClick={() => handleClick(setting.exampleKind)}>
            <label className="setting-section-description my-0">{setting.name}.</label>
            <input className="form-control pl-1 mt-1" type="number" id={setting.id} value={setting.value} onChange={handleChangeInput} disabled={readOnly} />
          </div>
        );
      default:
        return null;
    }
  };

  const result = [];
  if (activeCategory === Category.Indentation) {
    for (const setting of vscodeSettings) {
      result.push(generateSetting(setting));
    }
  } else {
    for (const setting of profileSettings) {
      if (setting.category === activeCategory) {
        result.push(generateSetting(setting));
      }
    }
  }
  return (
    <div className="setting">{result}</div>
  );
};

export default Setting;
