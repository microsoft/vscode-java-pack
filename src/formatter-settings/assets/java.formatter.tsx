import * as React from "react";
import { JavaFormatterSetting } from ".";
import { WhitespaceSettingsPanel } from "./java.formatter.whitespace";
import { CommentSettingsPanel } from "./java.formatter.comment";

interface JavaFormatterPanelProps {
  whitespaceSettings?: JavaFormatterSetting[];
  commentSettings?: JavaFormatterSetting[];
}

export class JavaFormatterPanel extends React.Component<JavaFormatterPanelProps> {

  render = () => {

    const whitespaceSettingsPanel = React.createElement(WhitespaceSettingsPanel, this.props);
    const commentSettingsPanel = React.createElement(CommentSettingsPanel, this.props);

    return (
      <div>
        <div className="row">
          <div className="col-lg-12">
            <button id="btnExport" className="btn btn-primary mr-2 float-right" title="Export Settings">Export...</button>
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
                  role="tab" aria-controls="comment-panel" aria-selected="false" title="">comment</a>
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
            </div>
          </div>
        </div>
      </div>
    );
  }
}
