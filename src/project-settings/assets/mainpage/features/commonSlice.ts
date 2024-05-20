// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { createSlice } from "@reduxjs/toolkit";
import { ProjectType } from "../../../../utils/webview";
import { ProjectState, SectionId } from "../../../types";
import _ from "lodash";

export const commonSlice = createSlice({
    name: "commonConfiguration",
    initialState: {
        ui: {
            activeSection: SectionId.Classpath,
            activeProjectIndex: 0,
        },
        data: {
            projects: [],
            projectType: [] as ProjectType[],
            projectState: [] as ProjectState[],
        }
    },
    reducers: {
        updateActiveSection: (state, action) => {
            state.ui.activeSection = action.payload;
        },
        listProjects: (state, action) => {
            state.data.projects = action.payload;
            const projectNum = state.data.projects.length;
            state.data.projectType = Array(projectNum).fill("");
            state.data.projectState = Array(projectNum).fill(ProjectState.Unloaded);
        },
        activeProjectChange: (state, action) => {
            state.ui.activeProjectIndex = action.payload;
            if (state.data.projectType[state.ui.activeProjectIndex] === ProjectType.Maven
                    && state.ui.activeSection === SectionId.Maven) {
                        state.ui.activeSection = SectionId.Classpath;
            }
        },
        setProjectType: (state, action) => {
            state.data.projectState[state.ui.activeProjectIndex] = ProjectState.Loaded;
            state.data.projectType[state.ui.activeProjectIndex] = action.payload.projectType;
        },
    },
});

export const {
    updateActiveSection,
    listProjects,
    activeProjectChange,
    setProjectType,
} = commonSlice.actions;

export default commonSlice.reducer;
