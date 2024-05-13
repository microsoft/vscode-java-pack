// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React from "react";
import { Provider } from "react-redux";
import store from "../../store";
import ProjectSettingView from "./ProjectSettingView";

const App = (): JSX.Element => {
    return (
        <Provider store={store}>
            <ProjectSettingView />
        </Provider>
    );
};

export default App;
