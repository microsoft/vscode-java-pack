
import * as React from "react";
import { JavaRuntimeEntry, ProjectRuntimeEntry } from "../types";
import { InstalledJDKPanel } from "./jdk.configure.installed";
import { ConfigureLSPanel } from "./jdk.configure.ls";
import { ProjectRuntimePanel } from "./jdk.configure.project";

interface JdkConfigurationPanelProps {
  jdkEntries?: JavaRuntimeEntry[];
  projectRuntimes?: ProjectRuntimeEntry[];
  javaDotHome?: string;
  javaHomeError?: any;
}

export class JdkConfigurationPanel extends React.Component<JdkConfigurationPanelProps, {}> {

  render = () => {
    const { javaHomeError, jdkEntries, projectRuntimes } = this.props;
    if (!projectRuntimes || !jdkEntries) {
      return (
        <div className="spinner-border spinner-border-sm" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      );
    }

    const projectRuntimePanel = React.createElement(ProjectRuntimePanel, { jdkEntries, projectRuntimes });
    const configureLsPanel = React.createElement(ConfigureLSPanel, this.props);
    const installedJdkPanel = React.createElement(InstalledJDKPanel, this.props);

    return (
      <div>
        <div className="row">
          <div className="col d-block">
            <ul className="nav nav-tabs mb-3" role="tablist">
              <li className="nav-item">
                <a className={!javaHomeError ? "nav-link active" : "nav-link"} id="configure-runtime-tab" data-toggle="tab"
                  href="#configure-runtime-panel" role="tab" aria-controls="configure-runtime-panel"
                  aria-selected="true" title="">Project JDKs</a>
              </li>
              <li className="nav-item">
                <a className={javaHomeError ? "nav-link active" : "nav-link"} id="configure-ls-tab" data-toggle="tab" href="#configure-ls-panel" role="tab"
                  aria-controls="configure-ls-panel" aria-selected="false" title="">Java Tooling Runtime</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" id="installed-jdks-tab" data-toggle="tab" href="#installed-jdks-panel"
                  role="tab" aria-controls="installed-jdks-panel" aria-selected="false" title="">Installed JDKs</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="row">
          <div className="col">
            <div className="tab-content">
              {/* <!-- Configure Runtimes --> */}
              <div className={!javaHomeError ? "tab-pane fade show active" : "tab-pane fade"} id="configure-runtime-panel" role="tabpanel"
                aria-labelledby="configure-runtime-tab">
                <div className="row" id="projectRuntimePanel">
                  {projectRuntimePanel}
                </div>
              </div>

              {/* <!-- Configure LS --> */}
              <div className={javaHomeError ? "tab-pane fade show active" : "tab-pane fade"} id="configure-ls-panel" role="tabpanel" aria-labelledby="configure-ls-tab">
                <div className="row" id="configureLsPanel">
                  {configureLsPanel}
                </div>
              </div>

              {/* <!-- Installed JDKs --> */}
              <div className="tab-pane fade" id="installed-jdks-panel" role="tabpanel"
                aria-labelledby="installed-jdks-tab">
                <div className="row" id="jdkAcquisitionPanel">
                  {installedJdkPanel}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
