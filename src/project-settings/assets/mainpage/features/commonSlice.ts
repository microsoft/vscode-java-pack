// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { createSlice } from "@reduxjs/toolkit";
import { ProjectType } from "../../../../utils/webview";
import { SectionId } from "../../../types";
import _ from "lodash";

export const commonSlice = createSlice({
    name: "commonConfiguration",
    initialState: {
        ui: {
            activeSection: SectionId.Classpath,
            activeProjectIndex: 0,
            exception: undefined,
            loadingState: false,
        },
        data: {
            projects: [],
            projectType: [] as ProjectType[],
        }
    },
    reducers: {
        updateActiveSection: (state, action) => {
            state.ui.activeSection = action.payload;
        },
        catchException: (state, action) => {
          state.ui.exception = action.payload;
        },
        updateLoadingState: (state, action) => {
          state.ui.loadingState = action.payload;
        },
        listProjects: (state, action) => {
            state.data.projects = action.payload;
            const projectNum = state.data.projects.length;
            state.data.projectType = Array(projectNum).fill("");
        },
        activeProjectChange: (state, action) => {
            state.ui.activeProjectIndex = action.payload;
            // If the active project is not a Maven project, the Maven section is invisible,
            // switch to the Classpath section.
            if (state.data.projectType[state.ui.activeProjectIndex] !== ProjectType.Maven
                    && state.ui.activeSection === SectionId.Maven) {
                        state.ui.activeSection = SectionId.Classpath;
            }
        },
        setProjectType: (state, action) => {
            state.data.projectType[state.ui.activeProjectIndex] = action.payload.projectType;
        },
    },
});

export const {
    updateActiveSection,
    catchException,
    updateLoadingState,
    listProjects,
    activeProjectChange,
    setProjectType,
} = commonSlice.actions;

export default commonSlice.reducer;
