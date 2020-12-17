// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import "bootstrap/js/src/tab";
import * as $ from "jquery";
import * as React from "react";
import * as ReactDOM from "react-dom";
import "../../assets/vscode.scss";
import { JavaFormatterSetting } from ".";
import { formatCode } from "./vscode.api";
import { Editor } from "./java.formatter.code";

export interface WhitespaceSettingsProps {
  whitespaceSettings?: JavaFormatterSetting[];
}

export const WhitespaceSettingsPanel = (props: WhitespaceSettingsProps) => {
  let test = "class MyClass \{int a = 0,b = 1,c = 2,d = 3;\}";
  return (
    <div className="col">
      <div className="row">
        <div className="col-6">
          <div className="row">
            <h2 className="font-weight-light col-10">WhiteSpace</h2>
            <div className="row">
            <button id="btnCollapse" className="btn btn-link btn-sm" title="Collapse All" >Collapse All</button>
            </div>
          </div>
          <div className="col">
            <details>
              <summary>Operators</summary>
              <div className="form-check">
                <input type="checkbox" className="form-check-input" id="beforeBinaryOperator"></input>
                <label className="form-check-label" htmlFor="beforeBinaryOperator">Insert Whitespace Before binary operator</label>
              </div>
              <div className="form-check">
                <input type="checkbox" className="form-check-input" id="afterBinaryOperator"></input>
                <label className="form-check-label" htmlFor="afterBinaryOperator">Insert Whitespace After binary operator</label>
              </div>
            </details>
            <details>
              <summary>Comma</summary>
              <div className="form-check">
                <input type="checkbox" className="form-check-input" id="beforeComma"></input>
                <label className="form-check-label" htmlFor="beforeComma">Insert Whitespace Before comma</label>
              </div>
              <div className="form-check">
                <input type="checkbox" className="form-check-input" id="afterComma"></input>
                <label className="form-check-label" htmlFor="afterComma">Insert Whitespace After comma</label>
              </div>
            </details>
            <details>
              <summary>Parenthesis</summary>
              <div className="form-check">
                <input type="checkbox" className="form-check-input" id="beforeClosingParenthesis"></input>
                <label className="form-check-label" htmlFor="beforeClosingParenthesis">Insert Whitespace Before Closing Parenthesis</label>
              </div>
              <div className="form-check">
                <input type="checkbox" className="form-check-input" id="beforeOpeningParenthesis"></input>
                <label className="form-check-label" htmlFor="beforeOpeningParenthesis">Insert Whitespace Before Opening Parenthesis</label>
              </div>
              <div className="form-check">
                <input type="checkbox" className="form-check-input" id="afterOpeningParenthesis"></input>
                <label className="form-check-label" htmlFor="afterOpeningParenthesis">Insert Whitespace After Opening Parenthesis</label>
              </div>
            </details>
            <details>
              <summary>Braces</summary>
              <div className="form-check">
                <input type="checkbox" className="form-check-input" id="beforeOpeningBrace"></input>
                <label className="form-check-label" htmlFor="beforeOpeningBrace">Insert Whitespace Before Opening Brace</label>
              </div>
            </details>
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

export function baz(test: string) {
  formatCode(test);
}
