// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "vscode-button": any;
      "vscode-badge": any;
      "vscode-checkbox": any;
      "vscode-collapsible": any;
      "vscode-divider": any;
      "vscode-icon": any;
      "vscode-label": any;
      "vscode-option": any;
      "vscode-progress-ring": any;
      "vscode-radio": any;
      "vscode-radio-group": any;
      "vscode-single-select": any;
      "vscode-tab-header": any;
      "vscode-tab-panel": any;
      "vscode-tabs": any;
      "vscode-table": any;
      "vscode-table-body": any;
      "vscode-table-cell": any;
      "vscode-table-header": any;
      "vscode-table-header-cell": any;
      "vscode-table-row": any;
      "vscode-textfield": any;
      "vscode-textarea": any;
    }
  }
}

// Re-export JSX globally for files using JSX.Element without import
declare global {
  namespace JSX {
    type Element = React.JSX.Element;
  }
}
