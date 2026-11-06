// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "../../l10n/browser";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./mainpage/features/App";

const root = createRoot(document.getElementById("content")!);
root.render(
    <StrictMode>
        <App />
    </StrictMode>
);
