// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { createSlice, current } from "@reduxjs/toolkit";
import _ from "lodash";
import { ClasspathEntry } from "../../../types";

export const classpathConfigurationViewSlice = createSlice({
    name: "classpathConfig",
    initialState: {
      activeProjectIndex: 0,
      projects: [],
      activeVmInstallPath: "",
      vmInstalls: [],
      projectType: undefined,
      sources: [] as ClasspathEntry[],
      output: "",
      libraries: [] as ClasspathEntry[],
      exception: undefined,
    },
    reducers: {
      listProjects: (state, action) => {
        state.projects = action.payload;
        state.activeProjectIndex = 0;
      },
      listVmInstalls: (state, action) => {
        state.vmInstalls = action.payload;
      },
      activeProjectChange: (state, action) => {
        state.activeProjectIndex = action.payload;
      },
      loadClasspath: (state, action) => {
        state.projectType = action.payload.projectType;
        state.output = action.payload.output;
        state.activeVmInstallPath = action.payload.activeVmInstallPath;
        // Only update the array when they have different elements.
        const currentSources = _.sortBy(current(state.sources), ["path", "output"]);
        const newSources = _.sortBy(action.payload.sources, ["path", "output"]);
        if (!_.isEqual(currentSources, newSources)) {
          state.sources = action.payload.sources;
        }

        const currentLibs = _.sortBy(current(state.libraries), ["path"]);
        const newLibs = _.sortBy(action.payload.libraries, ["path"]);
        if (!_.isEqual(currentLibs, newLibs)) {
          state.libraries = action.payload.libraries;
        }
      },
      updateSource: (state, action) => {
        state.sources = action.payload;
      },
      setOutputPath: (state, action) => {
        state.output = action.payload;
      },
      setJdks: (state, action) => {
        state.activeVmInstallPath = action.payload.activeVmInstallPath;
        if (action.payload.vmInstalls &&
              isDifferentStringArray(state.vmInstalls, action.payload.vmInstalls)) {
          state.vmInstalls = action.payload.vmInstalls;
        }
      },
      removeReferencedLibrary: (state, action) => {
        const removedIndex: number = action.payload as number;
        if (removedIndex > -1 && removedIndex < state.libraries.length) {
          state.libraries.splice(removedIndex, 1);
        }
      },
      addLibraries: (state, action) => {
        state.libraries.unshift(...action.payload);
        state.libraries = _.uniq(state.libraries);
      },
      catchException: (state, action) => {
        state.exception = action.payload;
      }
    },
});

function isDifferentStringArray(a1: string[], a2: string[]): boolean {
  return !_.isEmpty(_.xor(a1, a2));
}

export const {
  listProjects,
  listVmInstalls,
  activeProjectChange,
  loadClasspath,
  updateSource,
  setOutputPath,
  setJdks,
  removeReferencedLibrary,
  addLibraries,
  catchException,
} = classpathConfigurationViewSlice.actions;

export default classpathConfigurationViewSlice.reducer;
