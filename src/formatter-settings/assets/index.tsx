// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import "./style.scss";
import { App } from "./App";
import store from "./app/store";

const root = createRoot(document.getElementById("formatterPanel")!);
root.render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);
