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
          <h3 className="font-weight-light">WhiteSpace</h3>
          <div id="accordion">
            <div className="card">
              <div className="card-header" id="headingOne">
                <h5 className="mb-0">
                  <button className="btn btn-link" data-toggle="collapse" data-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
                    Operators
                  </button>
                </h5>
              </div>
              <div id="collapseOne" className="collapse show" aria-labelledby="headingOne" data-parent="#accordion">
                <div className="card-body">
                  <div className="form-check">
                    <input type="checkbox" className="form-check-input" id="beforeBinaryOperator"></input>
                    <label className="form-check-label" htmlFor="beforeBinaryOperator">Insert Whitespace Before binary operator</label>
                  </div>
                  <div className="form-check">
                    <input type="checkbox" className="form-check-input" id="afterBinaryOperator"></input>
                    <label className="form-check-label" htmlFor="afterBinaryOperator">Insert Whitespace After binary operator</label>
                  </div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-header" id="headingTwo">
                <h5 className="mb-0">
                  <button className="btn btn-link collapsed" data-toggle="collapse" data-target="#collapseTwo" aria-expanded="false" aria-controls="collapseTwo">
                    Comma
                  </button>
                </h5>
              </div>
              <div id="collapseTwo" className="collapse" aria-labelledby="headingTwo" data-parent="#accordion">
                <div className="card-body">
                  <div className="form-check">
                    <input type="checkbox" className="form-check-input" id="beforeComma"></input>
                    <label className="form-check-label" htmlFor="beforeComma">Insert Whitespace Before comma</label>
                  </div>
                  <div className="form-check">
                    <input type="checkbox" className="form-check-input" id="afterComma"></input>
                    <label className="form-check-label" htmlFor="afterComma">Insert Whitespace After comma</label>
                  </div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-header" id="headingThree">
                <h5 className="mb-0">
                  <button className="btn btn-link collapsed" data-toggle="collapse" data-target="#collapseThree" aria-expanded="false" aria-controls="collapseThree">
                    Parenthesis
                  </button>
                </h5>
              </div>
              <div id="collapseThree" className="collapse" aria-labelledby="headingThree" data-parent="#accordion">
                <div className="card-body">
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
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-header" id="headingFour">
                <h5 className="mb-0">
                  <button className="btn btn-link collapsed" data-toggle="collapse" data-target="#collapseFour" aria-expanded="false" aria-controls="collapseFour">
                    Braces
                  </button>
                </h5>
              </div>
              <div id="collapseFour" className="collapse" aria-labelledby="headingFour" data-parent="#accordion">
                <div className="card-body">
                  <div className="form-check">
                    <input type="checkbox" className="form-check-input" id="beforeOpeningBrace"></input>
                    <label className="form-check-label" htmlFor="beforeOpeningBrace">Insert Whitespace Before Opening Brace</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6">
          <h3 className="font-weight-light">Preview</h3>
          <Editor name={test} />
        </div>
      </div>
    </div>
  );
};

export function baz(test: string) {
  formatCode(test);
}
