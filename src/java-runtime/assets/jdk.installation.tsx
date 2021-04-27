// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import * as React from "react";
import { JdkData } from "../types";

export type JdkRquestHandler = (jdkVersion: string, jvmImpl: string) => void;

export interface JdkInstallationPanelProps {
  jdkData?: JdkData;
  onRequestJdk: JdkRquestHandler;
}

interface JdkInstallationPanelState {
  isLoading: boolean;
  jdkData?: JdkData;
  jdkVersion: string;
  jvmImpl: string;
}

export class JdkInstallationPanel extends React.Component<JdkInstallationPanelProps, JdkInstallationPanelState> {
  constructor(props: JdkInstallationPanelProps) {
    super(props);
    this.state = {
      isLoading: _.isEmpty(props && props.jdkData),
      jdkVersion: "openjdk11",
      jvmImpl: "hotspot"
    };
  }

  static getDerivedStateFromProps(props: JdkInstallationPanelProps, state: JdkInstallationPanelState) {
    // only alter state when the props change for real
    if (_.isEqual(state.jdkData, props.jdkData)) {
      return null;
    }

    return {
      isLoading: _.isEmpty(props && props.jdkData),
      data: props.jdkData
    };
  }

  handleChange(event: any) {
    let newState = {
      ...this.state,
      isLoading: true,
      data: this.props.jdkData,
    };

    const target = event.target;
    if (target) {
      if (target.name === "jdkVersion") {
        newState = {
          ...newState,
          jdkVersion: target.value
        };
      } else if (target.name === "jvmImpl") {
        newState = {
          ...newState,
          jvmImpl: target.value
        };
      }
    }

    this.props?.onRequestJdk(newState.jdkVersion, newState.jvmImpl);
    this.setState(newState);
  }

  render() {
    return (
      <div className="col">
        <ul className="nav nav-tabs mb-3" id="jdkSourceTab" role="tablist">
          <li className="nav-item">
            <a className="nav-link active" id="adoptOpenJdkTab" data-toggle="tab" href="#adoptOpenJdkPanel" role="tab" aria-controls="adoptOpenJdkPanel" aria-selected="true" title="Reliable source of OpenJDK binaries for all platforms">AdoptOpenJDK</a>
          </li>
          <li className="nav-item">
            <a className="nav-link" id="otherJdkTab" data-toggle="tab" href="#otherJdkPanel" role="tab" aria-controls="otherJdkPanel" aria-selected="false" title="Other choices">Others</a>
          </li>
        </ul>
        <div className="tab-content" id="jdkTabContent">
          <div className="tab-pane fade show active" id="adoptOpenJdkPanel" role="tabpanel" aria-labelledby="adoptOpenJdkTab">
            <form>
              <div className="form-row align-items-center">
                <div className="form-group col mb-1">
                  <h6 className="text-capitalize mb-2">
                    Download for&nbsp;
                  <span>{this.props.jdkData && this.props.jdkData.os}</span>&nbsp;
                  <span>{this.props.jdkData && this.props.jdkData.arch}</span>
                  </h6>
                </div>
              </div>
              <div className="form-row" onChange={(event) => this.handleChange(event)}>
                <div className="form-group col-sm-6">
                  <label>JDK Version:</label>
                  <div className="form-check">
                    <input className="form-check-input" type="radio" name="jdkVersion" id="openjdk8Radio" value="openjdk8" />
                    <label className="form-check-label" htmlFor="openjdk8Radio">
                      OpenJDK 8 (LTS)
                  </label>
                  </div>
                  <div className="form-check">
                    <input className="form-check-input" type="radio" name="jdkVersion" id="openjdk11Radio" value="openjdk11" defaultChecked />
                    <label className="form-check-label" htmlFor="openjdk11Radio">
                      OpenJDK 11 (LTS)
                  </label>
                  </div>
                  <div className="form-check">
                    <input className="form-check-input" type="radio" name="jdkVersion" id="openjdk15Radio" value="openjdk15" />
                    <label className="form-check-label" htmlFor="openjdk15Radio">
                      OpenJDK 15 (Latest)
                  </label>
                  </div>
                </div>
                <div className="form-group col-sm-6">
                  <label>JVM:</label>
                  <div className="form-check">
                    <input className="form-check-input" type="radio" name="jvmImpl" id="hotspotRadio" value="hotspot" defaultChecked />
                    <label className="form-check-label" htmlFor="hotspotRadio">
                      Hotspot (Recommended)
                  </label>
                  </div>
                  <div className="form-check">
                    <input className="form-check-input" type="radio" name="jvmImpl" id="openj9Radio" value="openj9" />
                    <label className="form-check-label" htmlFor="openj9Radio">
                      OpenJ9
                  </label>
                  </div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group col-sm-12">
                  {
                    this.state.isLoading ?
                      <div className="spinner-border spinner-border-sm" role="status" id="jdkSpinner">
                        <span className="sr-only">Loading...</span>
                      </div>
                      :
                      <a className="btn btn-primary btn-lg" href={this.props.jdkData && this.props.jdkData.downloadLink} role="button" title="Download JDK">
                        Download
                        <br />
                        <sub>{this.props.jdkData && this.props.jdkData.name}</sub><sub> | </sub><sub>{this.props.jdkData && this.props.jdkData.size}</sub>
                      </a>
                  }
                </div>
              </div>
            </form>
          </div>
          <div className="tab-pane fade" id="otherJdkPanel" role="tabpanel" aria-labelledby="otherJdkTab">
            <ul id="jdkProviderList" className="list-unstyled">
              <li><a href="command:java.helper.openUrl?%22https%3A%2F%2Fwww.azul.com%2Fdownloads%2Fazure-only%2Fzulu%2F%22" title="Recommended for Microsoft Azure Cloud and Azure Stack applications">Azul Zulu Enterprise build of OpenJDK for Azure</a></li>
              <li><a href="command:java.helper.openUrl?%22https%3A%2F%2Fdevelopers.redhat.com%2Fproducts%2Fopenjdk%2Fdownload%22" title="Red Hat build of OpenJDK">Red Hat build of OpenJDK</a></li>
              <li><a href="command:java.helper.openUrl?%22https%3A%2F%2Fsapmachine.io%2F%22" title="SapMachine - An OpenJDK release maintained and supported by SAP">SapMachine - An OpenJDK release maintained and supported by SAP</a></li>
              <li><a href="command:java.helper.openUrl?%22https%3A%2F%2Faws.amazon.com%2Fcorretto%2F%22" title="Amazon Corretto - An OpenJDK distribution maintained and supported by Amazon">Amazon Corretto - An OpenJDK distribution maintained and supported by Amazon</a></li>
              <li><a href="command:java.helper.openUrl?%22https%3A%2F%2Fjdk.java.net%2F%22" title="OpenJDK by Oracle">Oracle OpenJDK</a></li>
            </ul>
          </div>
        </div>
        <p>When you are finished, please reload Visual Studio Code to make it effective.</p>
        <p className="mb-0">
          <a className="btn btn-primary" href="command:workbench.action.reloadWindow" role="button" title="Reload Visual Studio Code">Reload Window</a>&nbsp;
      <a className="btn btn-secondary" href="command:java.helper.openUrl?%22https%3A%2F%2Fgithub.com%2Fredhat-developer%2Fvscode-java%23setting-the-jdk%22" role="button" title="More info on how JDK is resolved">Having Trouble?</a>
        </p>
      </div>
    );
  }
}
