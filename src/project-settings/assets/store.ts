// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { configureStore } from "@reduxjs/toolkit";
import classpathConfigurationViewReducer from "./classpath/features/classpathConfigurationViewSlice";
import commonReducer from "./mainpage/features/commonSlice";

export default configureStore({
  reducer: {
    classpathConfig: classpathConfigurationViewReducer,
    commonConfig: commonReducer
  },
});
