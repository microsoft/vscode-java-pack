// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React from "react";
import { encodeCommandUriWithTelemetry } from "../../../../../utils/webview";
import { WEBVIEW_ID } from "../../../utils";

const JdkRuntime = (): JSX.Element => {
  return (
    <div>
      <h4 className="setting-section-header mb-1">JDK Runtime</h4>
      <span className="setting-section-description">To configure JDK runtimes, please edit in <a href={encodeCommandUriWithTelemetry(WEBVIEW_ID, "classpath.runtime", "java.runtime")}>Configure Java Runtime</a>.</span>
    </div>
  );
};

export default JdkRuntime;
