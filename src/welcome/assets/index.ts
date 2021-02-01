// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import * as ReactDOM from "react-dom";
import { GetStartedPage } from "./components/GetStartedPage";
import "./style.scss";


window.addEventListener("message", event => {
    const {data} = event;
    if (data.command === "renderWelcomePage") {
        ReactDOM.render(React.createElement(GetStartedPage, data.props), document.getElementById("content"));
    }
  });
  

function render() {
    ReactDOM.render(React.createElement(GetStartedPage), document.getElementById("content"));
}

render();
