// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { createSlice } from "@reduxjs/toolkit";

export const compilerConfigurationViewSlice = createSlice({
  name: "compilerConfig",
  initialState: {
    ui: {
      availableComplianceLevels: [] as string[],
    },
    data: {
      effective: {
        useRelease: [] as boolean[],
        enablePreview: [] as boolean[],
        complianceLevel: [] as string[],
        sourceLevel: [] as string[],
        targetLevel: [] as string[],
        generateDebugInfo: [] as boolean[],
        storeMethodParamNames: [] as boolean[],
      },
      useRelease: [] as boolean[],
      enablePreview: [] as boolean[],
      complianceLevel: [] as string[],
      sourceLevel: [] as string[],
      targetLevel: [] as string[],
      generateDebugInfo: [] as boolean[],
      storeMethodParamNames: [] as boolean[],
    },
  },
  reducers: {
    initializeCompilerData: (state, action) => {
      state.ui.availableComplianceLevels = [];

      const projectNum = action.payload.projectsNum;
      state.data.useRelease = Array(projectNum).fill(false);
      state.data.enablePreview = Array(projectNum).fill(false);
      state.data.complianceLevel = Array(projectNum).fill("");
      state.data.sourceLevel = Array(projectNum).fill("");
      state.data.targetLevel = Array(projectNum).fill("");
      state.data.generateDebugInfo = Array(projectNum).fill(false);
      state.data.storeMethodParamNames = Array(projectNum).fill(false);

      state.data.effective.useRelease = Array(projectNum).fill(false);
      state.data.effective.enablePreview = Array(projectNum).fill(false);
      state.data.effective.complianceLevel = Array(projectNum).fill("");
      state.data.effective.sourceLevel = Array(projectNum).fill("");
      state.data.effective.targetLevel = Array(projectNum).fill("");
      state.data.effective.generateDebugInfo = Array(projectNum).fill(false);
      state.data.effective.storeMethodParamNames = Array(projectNum).fill(false);
    },
    updateAvailableComplianceLevels: (state, action) => {
      state.ui.availableComplianceLevels = action.payload.availableComplianceLevels;
    },
    updateCompilerSettings: (state, action) => {
      const activeProjectIndex = action.payload.activeProjectIndex;
      if (action.payload.useRelease !== undefined) {
        state.data.useRelease[activeProjectIndex] = action.payload.useRelease;
      }
      if (action.payload.enablePreview !== undefined) {
        state.data.enablePreview[activeProjectIndex] = action.payload.enablePreview;
      }
      if (action.payload.complianceLevel !== undefined) {
        state.data.complianceLevel[activeProjectIndex] = action.payload.complianceLevel;
      }
      if (action.payload.sourceLevel !== undefined) {
        state.data.sourceLevel[activeProjectIndex] = action.payload.sourceLevel;
      }
      if (action.payload.targetLevel !== undefined) {
        state.data.targetLevel[activeProjectIndex] = action.payload.targetLevel;
      }
      if (action.payload.generateDebugInfo !== undefined) {
        state.data.generateDebugInfo[activeProjectIndex] = action.payload.generateDebugInfo;
      }
      if (action.payload.storeMethodParamNames !== undefined) {
        state.data.storeMethodParamNames[activeProjectIndex] = action.payload.storeMethodParamNames;
      }
    },
    flushCompilerSettingsToEffective: (state, action) => {
      const activeProjectIndex = action.payload.activeProjectIndex;
      state.data.effective.useRelease[activeProjectIndex] = state.data.useRelease[activeProjectIndex];
      state.data.effective.enablePreview[activeProjectIndex] = state.data.enablePreview[activeProjectIndex];
      state.data.effective.complianceLevel[activeProjectIndex] = state.data.complianceLevel[activeProjectIndex];
      state.data.effective.sourceLevel[activeProjectIndex] = state.data.sourceLevel[activeProjectIndex];
      state.data.effective.targetLevel[activeProjectIndex] = state.data.targetLevel[activeProjectIndex];
      state.data.effective.generateDebugInfo[activeProjectIndex] = state.data.generateDebugInfo[activeProjectIndex];
      state.data.effective.storeMethodParamNames[activeProjectIndex] = state.data.storeMethodParamNames[activeProjectIndex];
    },
  },
});

export const {
  initializeCompilerData,
  updateAvailableComplianceLevels,
  updateCompilerSettings,
  flushCompilerSettingsToEffective,
} = compilerConfigurationViewSlice.actions;

export default compilerConfigurationViewSlice.reducer;
