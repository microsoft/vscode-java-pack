// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { createSlice } from "@reduxjs/toolkit";
import _ from "lodash";
import { ClasspathEntry } from "../../../types";

export const classpathConfigurationViewSlice = createSlice({
    name: "classpathConfig",
    initialState: {
      ui: {
        activeTab: "",
      },
      data: {
        vmInstalls: [],
        effective: { // the effective classpath in LS.
          activeVmInstallPath: [] as string[],
          sources: [] as ClasspathEntry[][],
          output: [] as string[],
          libraries: [] as ClasspathEntry[][],
        },
        // below are the classpath data in the UI.
        activeVmInstallPath: [] as string[],
        sources: [] as ClasspathEntry[][],
        output: [] as string[],
        libraries: [] as ClasspathEntry[][],
      },
      loadingState: false, // TODO: move to common?
      exception: undefined,
    },
    reducers: {
      updateActiveTab: (state, action) => {
        state.ui.activeTab = action.payload;
      },
      initializeClasspathData: (state, action) => {
        const projectNum = action.payload.projectsNum;
        state.data.activeVmInstallPath = Array(projectNum).fill("");
        state.data.sources = Array(projectNum).fill([]);
        state.data.output = Array(projectNum).fill("");
        state.data.libraries = Array(projectNum).fill([]);

        state.data.effective.activeVmInstallPath = Array(projectNum).fill("");
        state.data.effective.sources = Array(projectNum).fill([]);
        state.data.effective.output = Array(projectNum).fill("");
        state.data.effective.libraries = Array(projectNum).fill([]);
      },
      listVmInstalls: (state, action) => {
        state.data.vmInstalls = action.payload;
      },
      loadClasspath: (state, action) => {
        const activeProjectIndex = action.payload.activeProjectIndex;
        state.data.output[activeProjectIndex] = action.payload.output;
        state.data.effective.output[activeProjectIndex] = action.payload.output;

        state.data.activeVmInstallPath[activeProjectIndex] = action.payload.activeVmInstallPath;
        state.data.effective.activeVmInstallPath[activeProjectIndex] = action.payload.activeVmInstallPath;

        // Only update the array when they have different elements.
        const currentSources = _.sortBy(state.data.sources[activeProjectIndex], ["path", "output"]);
        const newSources = _.sortBy(action.payload.sources, ["path", "output"]);
        if (!_.isEqual(currentSources, newSources)) {
          state.data.sources[activeProjectIndex] = action.payload.sources;
          state.data.effective.sources[activeProjectIndex] = action.payload.sources;
        }

        const currentLibs = _.sortBy(state.data.libraries[activeProjectIndex], ["path"]);
        const newLibs = _.sortBy(action.payload.libraries, ["path"]);
        if (!_.isEqual(currentLibs, newLibs)) {
          state.data.libraries[activeProjectIndex] = action.payload.libraries;
          state.data.effective.libraries[activeProjectIndex] = action.payload.libraries;
        }
      },
      flushClasspathToEffective: (state, action) => {
        const activeProjectIndex = action.payload.activeProjectIndex;
        state.data.effective.output[activeProjectIndex] = state.data.output[activeProjectIndex];
        state.data.effective.activeVmInstallPath[activeProjectIndex] = state.data.activeVmInstallPath[activeProjectIndex];
        state.data.effective.sources[activeProjectIndex] = [...state.data.sources[activeProjectIndex]];
        state.data.effective.libraries[activeProjectIndex] = [...state.data.libraries[activeProjectIndex]];
      },
      updateSource: (state, action) => {
        const activeProjectIndex = action.payload.activeProjectIndex;
        state.data.sources[activeProjectIndex] = _.uniqBy(action.payload.sources as ClasspathEntry[], "path");
      },
      setOutputPath: (state, action) => {
        const activeProjectIndex = action.payload.activeProjectIndex;
        state.data.output[activeProjectIndex] = action.payload.outputPath;
      },
      setJdks: (state, action) => {
        const activeProjectIndex = action.payload.activeProjectIndex;
        state.data.activeVmInstallPath[activeProjectIndex] = action.payload.activeVmInstallPath;
        if (action.payload.vmInstalls &&
              isDifferentStringArray(state.data.vmInstalls, action.payload.vmInstalls)) {
          state.data.vmInstalls = action.payload.vmInstalls;
        }
      },
      removeReferencedLibrary: (state, action) => {
        const activeProjectIndex: number = action.payload.activeProjectIndex;
        const removedIndex: number = action.payload.removedIndex;
        if (removedIndex > -1 && removedIndex < state.data.libraries[activeProjectIndex].length) {
          state.data.libraries[activeProjectIndex].splice(removedIndex, 1);
        }
      },
      addLibraries: (state, action) => {
        const activeProjectIndex = action.payload.activeProjectIndex;
        let newLibs = state.data.libraries[activeProjectIndex];
        newLibs.unshift(...action.payload.libraries);
        newLibs = _.uniq(newLibs);
        state.data.libraries[activeProjectIndex] = _.uniqBy(newLibs, "path");
      },
      catchException: (state, action) => {
        state.exception = action.payload;
      },
      updateLoadingState: (state, action) => {
        state.loadingState = action.payload;
      },
    },
});

function isDifferentStringArray(a1: string[], a2: string[]): boolean {
  return !_.isEmpty(_.xor(a1, a2));
}

export const {
  updateActiveTab,
  initializeClasspathData,
  listVmInstalls,
  loadClasspath,
  updateSource,
  setOutputPath,
  setJdks,
  removeReferencedLibrary,
  addLibraries,
  catchException,
  updateLoadingState,
  flushClasspathToEffective,
} = classpathConfigurationViewSlice.actions;

export default classpathConfigurationViewSlice.reducer;
