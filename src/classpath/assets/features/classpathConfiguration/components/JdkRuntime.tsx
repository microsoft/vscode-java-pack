// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React from "react";
import { encodeCommandUriWithTelemetry } from "../../../../../utils/webview";
import { WEBVIEW_ID } from "../../../utils";
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import SectionHeader from "./common/SectionHeader";

const JdkRuntime = (): JSX.Element => {
  return (
    <div className="setting-section">
      <SectionHeader title="JDK Runtime" subTitle={undefined}/>
      <span className="setting-section-description">To configure JDK runtimes, please edit in <VSCodeLink href={encodeCommandUriWithTelemetry(WEBVIEW_ID, "classpath.runtime", "java.runtime")}>Configure Java Runtime</VSCodeLink>.</span>
    </div>
  );
};

export default JdkRuntime;
