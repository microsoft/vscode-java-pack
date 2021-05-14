// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import checkIcon from "@iconify-icons/codicon/check";
import chevronDownIcon from "@iconify-icons/codicon/chevron-down";
import { Icon } from "@iconify/react";
import React, { Dispatch } from "react";
import { Dropdown, Form } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { VSCodeSettings } from "../../../../FormatterConstants";
import { Category, ExampleKind, JavaFormatterSetting, ValueKind } from "../../../../types";
import { onWillChangeSetting } from "../../../utils";
import { activateExampleKind } from "../formatterSettingViewSlice";

const Setting = (): JSX.Element => {

  const dispatch: Dispatch<any> = useDispatch();
  const profileSettings: JavaFormatterSetting[] = useSelector((state: any) => state.formatterSettings.profileSettings);
  const vscodeSettings: JavaFormatterSetting[] = useSelector((state: any) => state.formatterSettings.vscodeSettings);
  const activeCategory: Category = useSelector((state: any) => state.formatterSettings.activeCategory);
  const detectIndentation: boolean = useSelector((state: any) => state.formatterSettings.detectIndentation);

  const handleChangeCheckbox = (e: any) => {
    const id = e.target.id;
    const value = (e.target.checked === true) ? "true" : "false";
    onWillChangeSetting(id, value);
  };

  const handleChangeInput = (e: any) => {
    const id = e.target.id;
    let value = e.target.value;
    if (!value || value === "") {
      value = "0";
    }
    onWillChangeSetting(id, value);
  };

  const handleSelect = (setting: JavaFormatterSetting, entry: string) => {
    onWillChangeSetting(setting.id, entry);
  };

  const handleClick = (exampleKind: ExampleKind) => {
    dispatch(activateExampleKind({ exampleKind: exampleKind }));
  };

  const generateSetting = (setting: JavaFormatterSetting): JSX.Element => {
    if (!setting.name || !setting.id || !setting.value) {
      return (<></>);
    }
    const candidates = [];
    switch (setting.valueKind as ValueKind) {
      case ValueKind.Boolean:
        const willBeOverriden = detectIndentation && setting.id === VSCodeSettings.DETECT_INDENTATION;
        return (
          <div className="setting-section" key={`${setting.id}`} onClick={() => handleClick(setting.exampleKind)}>
            <Form.Check type="checkbox" className="pl-0" id={`${setting.id}`} >
              <Form.Check.Input type="checkbox" checked={setting.value === "true"} onChange={handleChangeCheckbox} />
              <Form.Check.Label className="setting-section-description">
                <Icon className="codicon" icon={checkIcon} />
                <div className="setting-section-description-checkbox">{setting.name}.</div>
              </Form.Check.Label>
              <br></br>
              <span className="warning">
                {willBeOverriden ? "When detecting, the indentation settings will be overriden based on file contents." : ""}
              </span>
            </Form.Check>
          </div>
        );
      case ValueKind.Enum:
        if (!setting.candidates) {
          return (<></>);
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
              <Dropdown.Toggle className="dropdown-button flex-vertical-center text-left">
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
            <Form.Control className="pl-1 mt-1" type="number" id={setting.id} value={setting.value} onChange={handleChangeInput}></Form.Control>
          </div>
        );
      default:
        return (<></>);
    }
  };

  const result: JSX.Element[] = [];
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
