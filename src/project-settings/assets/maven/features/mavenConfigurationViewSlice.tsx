// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { createSlice } from "@reduxjs/toolkit";
import _ from "lodash";

export const mavenConfigurationViewSlice = createSlice({
  name: "mavenConfig",
  initialState: {
    data: {
      activeProfiles: [] as string[],
    },
  },
  reducers: {
    updateActiveProfiles: (state, action) => {
      const activeProjectIndex = action.payload.activeProjectIndex;
      state.data.activeProfiles[activeProjectIndex] = action.payload.activeProfiles;
    },
    initializeMavenData: (state, action) => {
      const projectNum = action.payload.projectsNum;
      state.data.activeProfiles = Array(projectNum).fill(undefined);
    },
  },
});

export const {
  updateActiveProfiles,
  initializeMavenData,
} = mavenConfigurationViewSlice.actions;

export default mavenConfigurationViewSlice.reducer;
