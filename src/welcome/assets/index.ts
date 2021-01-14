// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import * as ReactDOM from "react-dom";
import { GetStartedPage } from "./components/GetStartedPage";
import "./style.scss";

function render() {
    ReactDOM.render(React.createElement(GetStartedPage), document.getElementById("content"));
}

render();
