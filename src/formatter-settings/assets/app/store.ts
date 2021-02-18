// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { configureStore } from "@reduxjs/toolkit";
import formatterSettingsViewReducer from "../features/formatterSettings/formatterSettingViewSlice";

export default configureStore({
  reducer: {
    formatterSettings: formatterSettingsViewReducer
  },
});
