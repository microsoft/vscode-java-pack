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
    exampleKind: ExampleKind.INDENTATION_EXAMPLE,
    detectIndentation: false,
    formattedContent: "",
  },
  reducers: {
    changeActiveCategory: (state, action) => {
      const activeCategory: Category = action.payload as Category;
      state.activeCategory = activeCategory;
      switch (activeCategory) {
        case Category.BlankLine:
          state.exampleKind = ExampleKind.BLANKLINE_EXAMPLE;
          break;
        case Category.Comment:
          state.exampleKind = ExampleKind.COMMENT_EXAMPLE;
          break;
        case Category.Indentation:
          state.exampleKind = ExampleKind.INDENTATION_EXAMPLE;
          break;
        case Category.InsertLine:
          state.exampleKind = ExampleKind.INSERTLINE_EXAMPLE;
          break;
        case Category.Whitespace:
          state.exampleKind = ExampleKind.WHITESPACE_EXAMPLE;
          break;
        case Category.Wrapping:
          state.exampleKind = ExampleKind.WRAPPING_EXAMPLE;
          break;
      }
      onWillChangeExampleKind(state.exampleKind);
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
    activateExampleKind: (state, action) => {
      if (state.exampleKind !== action.payload.exampleKind) {
        state.exampleKind = action.payload.exampleKind;
        onWillChangeExampleKind(state.exampleKind);
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
  activateExampleKind,
} = formatterSettingsViewSlice.actions;

export default formatterSettingsViewSlice.reducer;
