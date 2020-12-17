// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import "bootstrap/js/src/tab";
import * as $ from "jquery";
import * as React from "react";
import * as ReactDOM from "react-dom";
import "../../assets/vscode.scss";
import { JavaFormatterSetting } from ".";
import { Editor } from "./java.formatter.code";

export interface NewLineSettingsProps {
  newLineSettings?: JavaFormatterSetting[];
}

export const NewLineSettingsPanel = (props: NewLineSettingsProps) => {
  let test = "class MyClass \{int a = 0,b = 1,c = 2,d = 3;\}";
  return (
    <div className="col">
      <div className="row">
        <div className="col-6">
          <h2 className="font-weight-light">New Line</h2>
          <div className="input-group mb-3">
            <div className="input-group-prepend">
              <label className="input-group-text" htmlFor="invisible">Brace Policy:</label>
            </div>
            <select className="form-control" name="jdk-for" id={"sourceLevel"} defaultValue={"runtimePath"}>
              <option>Same line</option>
              <option>Next line</option>
            </select>
          </div>
          <div className="input-group mb-3">
            <div className="input-group-prepend">
              <label className="input-group-text" htmlFor="invisible">Braced Code:</label>
            </div>
            <select className="form-control" name="jdk-for" id={"sourceLevel"} defaultValue={"runtimePath"}>
              <option>Never</option>
              <option>If empty</option>
              <option>If at most one item</option>
            </select>
          </div>
          <div className="form-check">
            <input type="checkbox" className="form-check-input" id="newLineInControlStatement"></input>
            <label className="form-check-label" htmlFor="newLineInControlStatement">New Line in Control Statement</label>
          </div>
          <div className="form-check">
            <input type="checkbox" className="form-check-input" id="KeepSimpleInControlStatement"></input>
            <label className="form-check-label" htmlFor="KeepSimpleInControlStatement">Keep simple Control Statement</label>
          </div>
        </div>
        <div className="col-6">
          <h2 className="font-weight-light">Preview</h2>
          <Editor name={test} />
        </div>
      </div>
    </div>
  );
};
