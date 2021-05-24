// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import checkIcon from "@iconify-icons/codicon/check";
import chevronDownIcon from "@iconify-icons/codicon/chevron-down";
import { Icon } from "@iconify/react";
import React from "react";
import { Dropdown, Form } from "react-bootstrap";
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

  const handleSelect = (setting: JavaFormatterSetting, entry: string) => {
    onWillChangeSetting(setting.id, entry);
  };

  const handleClick = (exampleKind: ExampleKind) => {
    onWillChangeExampleKind(exampleKind);
  };

  const generateSetting = (setting: JavaFormatterSetting) => {
    if (!setting.name || !setting.id) {
      return null;
    }
    const candidates = [];
    switch (setting.valueKind as ValueKind) {
      case ValueKind.Boolean:
        const willBeOverriden = detectIndentation && setting.id === VSCodeSettings.DETECT_INDENTATION;
        return (
          <div className="setting-section" key={`${setting.id}`} onClick={() => handleClick(setting.exampleKind)}>
            <Form.Check type="checkbox" className="pl-0" id={`${setting.id}`} >
              <Form.Check.Input type="checkbox" checked={setting.value === "true"} onChange={handleChangeCheckbox} disabled={readOnly} />
              <Form.Check.Label className="setting-section-description">
                <Icon className="codicon" icon={checkIcon} />
                <div className="setting-section-description-checkbox">{setting.name}.</div>
              </Form.Check.Label>
              <br></br>
              <span className="warning">
                {willBeOverriden ? "When enabled, the indentation settings will be overriden based on the file contents." : ""}
              </span>
            </Form.Check>
          </div>
        );
      case ValueKind.Enum:
        if (!setting.candidates) {
          return null;
        }
        for (const candidate of setting.candidates) {
          candidates.push(
            <Dropdown.Item key={`${setting.id}.${candidate}`} className="dropdown-item py-0 pl-1" onSelect={() => handleSelect(setting, candidate)}>
              {candidate}
            </Dropdown.Item>
          );
        }
        return (
          <div className="setting-section" key={`${setting.id}`} onClick={() => handleClick(setting.exampleKind)}>
            <span className="setting-section-description">{setting.name}.</span>
            <Dropdown className="mt-1">
              <Dropdown.Toggle className="dropdown-button flex-vertical-center text-left" disabled={readOnly}>
                <span>{setting.value}</span>
                <Icon className="codicon" icon={chevronDownIcon} />
              </Dropdown.Toggle>
              <Dropdown.Menu className="dropdown-menu mt-0 p-0">
                {candidates}
              </Dropdown.Menu>
            </Dropdown>
          </div >
        );
      case ValueKind.Number:
        return (
          <div className="setting-section" key={`${setting.id}`} onClick={() => handleClick(setting.exampleKind)}>
            <Form.Label className="setting-section-description my-0">{setting.name}.</Form.Label>
            <Form.Control className="pl-1 mt-1" type="number" id={setting.id} value={setting.value} onChange={handleChangeInput} disabled={readOnly}></Form.Control>
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
