// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { JavaRuntimeEntryPanel } from "./jdk.entries";
import { JdkInstallationPanel, JdkRquestHandler } from "./jdk.installation";
import { JavaRuntimeEntry, JdkData } from "../types";

export interface JdkAcquisitionPanelProps {
  jdkEntries: JavaRuntimeEntry[];
  jdkData: JdkData;
  onRequestJdk: JdkRquestHandler;
}

export const JdkAcquisitionPanel = (props: JdkAcquisitionPanelProps) => {
  return (
    <div className="col">
      <div className="row mb-3">
        <div className="col">
          <h3 className="font-weight-light">Configure</h3>
          <p>
            Java Development Kit (JDK) 11 or later is required for developing Java applications. The path to the JDK is searched in the following order:
          </p>
          <div className="card">
            <div className="card-body">
              <JavaRuntimeEntryPanel data={props.jdkEntries} />
            </div>
          </div>
        </div>
      </div>
      <div className="row mb-3">
        <div className="col">
          <h3 className="font-weight-light">Install</h3>
          <p>
            To download and install JDK, follow the links below:
          </p>
          <div className="card">
            <div className="card-body">
              <JdkInstallationPanel data={props.jdkData} onRequestJdk={props.onRequestJdk} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
