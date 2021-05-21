// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import * as ReactDOM from "react-dom";
import { GetStartedPage } from "./components/GetStartedPage";
import "./style.scss";
import { onWillFetchInitProps } from "./utils";


const onInitialize =  (event: any) => {
    const { data } = event;
    if (data.command === "onDidFetchInitProps") {
        ReactDOM.render(React.createElement(GetStartedPage, data.props), document.getElementById("content"));
    }
};

window.addEventListener("message", onInitialize);
onWillFetchInitProps();
