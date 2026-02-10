// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./mainpage/features/App";

createRoot(document.getElementById("content")!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
