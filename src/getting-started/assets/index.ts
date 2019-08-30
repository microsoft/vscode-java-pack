// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "../../assets/vscode.scss";
import "bootstrap/js/src/tab";
import * as $ from "jquery";

$("#navigationPanel a").click(e => {
  $($(e.target).attr("href")).tab('show');
});
