// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import "./style.scss";
import { App } from "./App";
import store from "./app/store";

createRoot(document.getElementById("formatterPanel")!).render(
  <React.StrictMode>
    <Provider store={store} >
      <App />
    </Provider>
  </React.StrictMode>
);
