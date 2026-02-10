// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { createRoot } from "react-dom/client";
import { GetStartedPage } from "./components/GetStartedPage";
import "./style.scss";
import { onWillFetchInitProps } from "./utils";

const root = createRoot(document.getElementById("content")!);

const onInitialize =  (event: any) => {
    const { data } = event;
    if (data.command === "onDidFetchInitProps") {
        root.render(React.createElement(GetStartedPage, data.props));
    }
};

window.addEventListener("message", onInitialize);
onWillFetchInitProps();
