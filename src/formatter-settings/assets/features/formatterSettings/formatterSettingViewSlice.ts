// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { createSlice } from "@reduxjs/toolkit";
import { SupportedSettings, VSCodeSettings } from "../../../FormatterConstants";
import { Category, JavaFormatterSetting } from "../../../types";

export const formatterSettingsViewSlice = createSlice({
  name: "formatterSettings",
  initialState: {
    activeCategory: Category.Indentation,
    profileSettings: [] as JavaFormatterSetting[],
    vscodeSettings: [] as JavaFormatterSetting[],
    detectIndentation: false,
    formattedContent: "",
    readOnly: false,
  },
  reducers: {
    changeActiveCategory: (state, action) => {
      state.activeCategory = action.payload;
    },
    loadProfileSetting: (state, action) => {
      state.profileSettings = action.payload.setting;
    },
    loadVSCodeSetting: (state, action) => {
      state.vscodeSettings = action.payload.setting;
      for (const setting of state.vscodeSettings) {
        if (setting.id === SupportedSettings.TABULATION_SIZE) {
          document.documentElement.style.setProperty("--vscode-tab-size", setting.value);
        } else if (setting.id === VSCodeSettings.DETECT_INDENTATION) {
          state.detectIndentation = (setting.value === "true");
        }
      }
    },
    applyFormatResult: (state, action) => {
      state.formattedContent = action.payload.content;
    },
    changeReadOnlyState: (state, action) => {
      state.readOnly = Boolean(action.payload.value);
    },
  },
});

export const {
  changeActiveCategory,
  loadProfileSetting,
  loadVSCodeSetting,
  applyFormatResult,
  changeReadOnlyState,
} = formatterSettingsViewSlice.actions;

export default formatterSettingsViewSlice.reducer;
