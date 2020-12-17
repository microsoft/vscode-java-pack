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

export interface CommentSettingsProps {
  commentSettings?: JavaFormatterSetting[];
}

const description = "\n\n\n\n";

export const CommentSettingsPanel = (props: CommentSettingsProps) => {
  let test = "\t/**\n\t * Descriptions of parameters and return values\n\
  \t * are best appended at end of the javadoc\n\
  \t * comment.\n\
  \t * @param first  The first parameter. For an\n\
  \t * optimum result, this should be an odd\n\
  \t * number between 0 and 100.\n\
  \t */\n\
  \t int foo(int first, int second)\n\t \tthrows Exception;";
  return (
    <div className="col">
      <div className="row">
        <div className="col-6">
          <h2 className="font-weight-light">Comment</h2>
          <div className="input-group mb-3">
            <div className="input-group-prepend">
              <label className="input-group-text" htmlFor="invisible">Javadoc Alignment:</label>
            </div>
            <select className="form-control" name="jdk-for" id={"sourceLevel"} defaultValue={"runtimePath"}>
              <option>Align names and descriptions</option>
              <option>Align descriptions, grouped by type</option>
              <option>Align descriptions to tag width</option>
              <option>Don’t align</option>
            </select>
          </div>
          <div className="form-check">
            <input type="checkbox" className="form-check-input" id="offOnTag"></input>
            <label className="form-check-label" htmlFor="offOnTag">Use Off/On Tags</label>
          </div>
          <details>
            <summary> About Off/On Tags</summary>
            <p>Off/On tags can be used in any comments to turn the formatter off and on in a source file.</p>
            <p>- Off tag: @formatter:off, On tag: @formatter:on.</p>
            <p>- At the beginning of each file, the formatter is enabled.</p>
            <p>- Each time the formatter sees an off tag, it disables formatting for that comment and the source after it.</p>
            <p>- Each time the formatter sees an on tag, it enables formatting for the source after that comment.</p>
          </details>
        </div>
        <div className="col-6">
          <h2 className="font-weight-light">Preview</h2>
          <Editor name={test} />
        </div>
      </div>
    </div>
  );
};
