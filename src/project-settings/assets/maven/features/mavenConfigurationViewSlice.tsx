// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { createSlice } from "@reduxjs/toolkit";
import _ from "lodash";

export const mavenConfigurationViewSlice = createSlice({
  name: "mavenConfig",
  initialState: {
    data: {
      effective: {
        activeProfiles: [] as string[],
      },
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
      state.data.effective.activeProfiles = Array(projectNum).fill(undefined);
    },
    flushMavenSettingsToEffective: (state, action) => {
      const activeProjectIndex = action.payload.activeProjectIndex;
      state.data.effective.activeProfiles[activeProjectIndex] = state.data.activeProfiles[activeProjectIndex];
    }
  },
});

export const {
  updateActiveProfiles,
  initializeMavenData,
  flushMavenSettingsToEffective,
} = mavenConfigurationViewSlice.actions;

export default mavenConfigurationViewSlice.reducer;
