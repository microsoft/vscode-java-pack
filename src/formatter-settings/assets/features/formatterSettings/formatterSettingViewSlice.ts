// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { createSlice } from "@reduxjs/toolkit";
import { Example, initializeSupportedProfileSettings, initializeSupportedVSCodeSettings } from "../../../FormatterConstants";
import { Category, ExampleKind } from "../../../types";

export const formatterSettingsViewSlice = createSlice({
  name: "formatterSettings",
  initialState: {
    activeCategory: Category.Common,
    // only for display, settings will come from backend in next PR.
    settings: [...initializeSupportedProfileSettings(20), ...initializeSupportedVSCodeSettings()],
    exampleKind: ExampleKind.COMMON_EXAMPLE,
    // only for display, code will come from backend in next PR.
    formattedContent: Example.getExample(ExampleKind.COMMON_EXAMPLE),
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
        case Category.Common:
          state.exampleKind = ExampleKind.COMMON_EXAMPLE;
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
      state.formattedContent = Example.getExample(state.exampleKind);
    },
    changeSetting: (state, action) => {
      for (const setting of state.settings) {
        if (setting.id === action.payload.id) {
          setting.value = action.payload.value;
          if (setting.exampleKind !== state.exampleKind) {
            state.exampleKind = setting.exampleKind;
            state.formattedContent = Example.getExample(state.exampleKind);
          }
          break;
        }
      }
    },
  },
});

export const {
  changeActiveCategory,
  changeSetting,
} = formatterSettingsViewSlice.actions;

export default formatterSettingsViewSlice.reducer;
