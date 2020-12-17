import "bootstrap/js/src/tab";
import * as $ from "jquery";
import * as React from "react";
import * as ReactDOM from "react-dom";
import "../../assets/vscode.scss";
import { JavaFormatterSetting } from ".";
import { WhitespaceSettingsPanel } from "./java.formatter.whitespace";
import { CommentSettingsPanel } from "./java.formatter.comment";
import { NewLineSettingsPanel } from "./java.formatter.newline";
import { exportSettings } from "./vscode.api";

import { UnControlled as CodeMirror } from 'react-codemirror2'
interface JavaFormatterPanelProps {
  whitespaceSettings?: JavaFormatterSetting[];
  commentSettings?: JavaFormatterSetting[];
  newLineSettings?: JavaFormatterSetting[];
}

export class JavaFormatterPanel extends React.Component<JavaFormatterPanelProps> {

  exp = () => {
    exportSettings();
  }

  render = () => {

    const whitespaceSettingsPanel = React.createElement(WhitespaceSettingsPanel, this.props);
    const commentSettingsPanel = React.createElement(CommentSettingsPanel, this.props);
    const newLineSettingsPanel = React.createElement(NewLineSettingsPanel, this.props);

    return (
      <div>
        <div className="row">
        <CodeMirror
  value='<h1>I ♥ react-codemirror2</h1>'
  options={{
    mode: 'xml',
    theme: 'material',
    lineNumbers: true
  }}
  onChange={(editor, data, value) => {
  }}
/>
          <div className="col-lg-12">
            <button id="btnExport" className="btn btn-primary mr-2 float-right" title="Export Settings" onClick = {this.exp}>Export</button>
            <button id="btnImport" className="btn btn-primary mr-2 float-right" title="Import Settings from eclipse Java formatter settings profile">Import from Profile...</button>
          </div>
        </div>
        <div className="row">
          <div className="col d-block">
            <ul className="nav nav-tabs mb-3" role="tablist">
              <li className="nav-item">
                <a className="nav-link active" id="whitespace-tab" data-toggle="tab" href="#whitespace-panel"
                  role="tab" aria-controls="whitespace-panel" aria-selected="false" title="">Whitespace</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" id="comment-tab" data-toggle="tab" href="#comment-panel"
                  role="tab" aria-controls="comment-panel" aria-selected="false" title="">Comment</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" id="newline-tab" data-toggle="tab" href="#newline-panel"
                  role="tab" aria-controls="newline-panel" aria-selected="false" title="">NewLine</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="row">
          <div className="col">
            <div className="tab-content">
              <div className="tab-pane fade show active" id="whitespace-panel" role="tabpanel"
                aria-labelledby="whitespace-tab">
                <div className="row" id="whitespaceSettingsPanel">
                  {whitespaceSettingsPanel}
                </div>
              </div>
              <div className="tab-pane fade" id="comment-panel" role="tabpanel"
                aria-labelledby="comment-tab">
                <div className="row" id="commentSettingsPanel">
                  {commentSettingsPanel}
                </div>
              </div>
              <div className="tab-pane fade" id="newline-panel" role="tabpanel"
                aria-labelledby="newline-tab">
                <div className="row" id="newLineSettingsPanel">
                  {newLineSettingsPanel}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
