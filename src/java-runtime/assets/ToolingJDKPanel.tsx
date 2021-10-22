// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { JavaRuntimeEntry } from "../types";

export interface ToolingJDKPanelProps {
  jdkEntries?: JavaRuntimeEntry[];
  javaDotHome?: string;
  javaHomeError?: any;
}

export class ToolingJDKPanel extends React.Component<ToolingJDKPanelProps, {}> {
  render = () => {
      return (
        <div>Tooling JDK</div>
      );

  }
}