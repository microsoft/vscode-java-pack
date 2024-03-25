// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { createSlice, current } from "@reduxjs/toolkit";
import _ from "lodash";
import { ClasspathEntry, ProjectState } from "../../../types";
import { ProjectType } from "../../../../utils/webview";

export const classpathConfigurationViewSlice = createSlice({
    name: "classpathConfig",
    initialState: {
      activeProjectIndex: 0,
      projects: [],
      activeVmInstallPath: [] as string[],
      vmInstalls: [],
      projectType: [] as ProjectType[],
      sources: [] as ClasspathEntry[][],
      output: [] as string[],
      libraries: [] as ClasspathEntry[][],
      projectState: [] as ProjectState[],
      loadingState: false,
      exception: undefined,
    },
    reducers: {
      listProjects: (state, action) => {
        state.projects = action.payload;
        state.activeProjectIndex = 0;
        const projectNum = state.projects.length;
        state.activeVmInstallPath = Array(projectNum).fill("");
        state.projectType = Array(projectNum).fill("");
        state.sources = Array(projectNum).fill([]);
        state.output = Array(projectNum).fill("");
        state.libraries = Array(projectNum).fill([]);
        state.projectState = Array(projectNum).fill(ProjectState.Unloaded);
      },
      listVmInstalls: (state, action) => {
        state.vmInstalls = action.payload;
      },
      activeProjectChange: (state, action) => {
        state.activeProjectIndex = action.payload;
      },
      loadClasspath: (state, action) => {
        state.projectState[state.activeProjectIndex] = ProjectState.Loaded;
        state.projectType[state.activeProjectIndex] = action.payload.projectType;
        state.output[state.activeProjectIndex] = action.payload.output;
        state.activeVmInstallPath[state.activeProjectIndex] = action.payload.activeVmInstallPath;
        // Only update the array when they have different elements.
        const currentSources = _.sortBy(current(state.sources), ["path", "output"]);
        const newSources = _.sortBy(action.payload.sources, ["path", "output"]);
        if (!_.isEqual(currentSources, newSources)) {
          state.sources[state.activeProjectIndex] = action.payload.sources;
        }

        const currentLibs = _.sortBy(current(state.libraries), ["path"]);
        const newLibs = _.sortBy(action.payload.libraries, ["path"]);
        if (!_.isEqual(currentLibs, newLibs)) {
          state.libraries[state.activeProjectIndex] = action.payload.libraries;
        }
      },
      updateSource: (state, action) => {
        state.sources[state.activeProjectIndex] = action.payload;
      },
      setOutputPath: (state, action) => {
        state.output[state.activeProjectIndex] = action.payload;
      },
      setJdks: (state, action) => {
        state.activeVmInstallPath[state.activeProjectIndex] = action.payload.activeVmInstallPath;
        if (action.payload.vmInstalls &&
              isDifferentStringArray(state.vmInstalls, action.payload.vmInstalls)) {
          state.vmInstalls = action.payload.vmInstalls;
        }
      },
      removeReferencedLibrary: (state, action) => {
        const removedIndex: number = action.payload as number;
        if (removedIndex > -1 && removedIndex < state.libraries[state.activeProjectIndex].length) {
          state.libraries[state.activeProjectIndex].splice(removedIndex, 1);
        }
      },
      addLibraries: (state, action) => {
        let newLibs = state.libraries[state.activeProjectIndex];
        newLibs.unshift(...action.payload);
        newLibs = _.uniq(newLibs);
        state.libraries[state.activeProjectIndex] = _.uniq(newLibs);
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
  updateLoadingState,
} = classpathConfigurationViewSlice.actions;

export default classpathConfigurationViewSlice.reducer;
