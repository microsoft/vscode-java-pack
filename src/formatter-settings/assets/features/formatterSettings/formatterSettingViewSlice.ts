// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { createSlice } from "@reduxjs/toolkit";
import { SupportedSettings, VSCodeSettings } from "../../../FormatterConstants";
import { Category, ExampleKind, JavaFormatterSetting } from "../../../types";
import { onWillChangeExampleKind } from "../../utils";

export const formatterSettingsViewSlice = createSlice({
  name: "formatterSettings",
  initialState: {
    activeCategory: Category.Indentation,
    profileSettings: [] as JavaFormatterSetting[],
    vscodeSettings: [] as JavaFormatterSetting[],
    detectIndentation: false,
    formattedContent: "",
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
  },
});

export const {
  changeActiveCategory,
  loadProfileSetting,
  loadVSCodeSetting,
  applyFormatResult,
} = formatterSettingsViewSlice.actions;

export default formatterSettingsViewSlice.reducer;
