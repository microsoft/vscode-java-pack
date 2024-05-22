// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { configureStore } from "@reduxjs/toolkit";
import classpathConfigurationViewReducer from "./classpath/features/classpathConfigurationViewSlice";
import compilerConfigurationViewReducer from "./compiler/features/compilerConfigurationViewSlice";
import commonReducer from "./mainpage/features/commonSlice";
import mavenConfigurationViewReducer from "./maven/features/mavenConfigurationViewSlice";

export default configureStore({
  reducer: {
    commonConfig: commonReducer,
    classpathConfig: classpathConfigurationViewReducer,
    compilerConfig: compilerConfigurationViewReducer,
    mavenConfig: mavenConfigurationViewReducer,
  },
});
