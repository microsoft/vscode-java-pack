// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { createSlice } from "@reduxjs/toolkit";
import { SupportedSettings } from "../../../FormatterConstants";
import { Catagory, ExampleKind, JavaFormatterSetting } from "../../../types";
import { changeExampleKind } from "../../vscode.api";

export const formatterSettingsViewSlice = createSlice({
  name: "formatterSettings",
  initialState: {
    activeCatagory: Catagory.Common,
    settings: [] as JavaFormatterSetting[],
    exampleKind: ExampleKind.COMMON_EXAMPLE,
    formattedContent: "",
  },
  reducers: {
    changeActiveCatagory: (state, action) => {
      const activeCatagory: Catagory = action.payload as Catagory;
      state.activeCatagory = activeCatagory;
      switch (activeCatagory) {
        case Catagory.BlankLine:
          state.exampleKind = ExampleKind.BLANKLINE_EXAMPLE;
          break;
        case Catagory.Comment:
          state.exampleKind = ExampleKind.COMMENT_EXAMPLE;
          break;
        case Catagory.Common:
          state.exampleKind = ExampleKind.COMMON_EXAMPLE;
          break;
        case Catagory.InsertLine:
          state.exampleKind = ExampleKind.INSERTLINE_EXAMPLE;
          break;
        case Catagory.Whitespace:
          state.exampleKind = ExampleKind.WHITESPACE_EXAMPLE;
          break;
        case Catagory.Wrapping:
          state.exampleKind = ExampleKind.WRAPPING_EXAMPLE;
          break;
      }
      changeExampleKind(state.exampleKind);
    },
    changePreviewExample: (state, action) => {
      for (const setting of state.settings) {
        if (setting.id === action.payload.id) {
          if (setting.exampleKind !== state.exampleKind) {
            state.exampleKind = setting.exampleKind;
          }
          changeExampleKind(state.exampleKind);
          break;
        }
      }
    },
    initSetting: (state, action) => {
      state.settings.push(action.payload.setting);
    },
    changeSetting: (state, action) => {
      for (const setting of state.settings) {
        if (setting.id === action.payload.id) {
          setting.value = action.payload.value;
          break;
        }
      }
      if (action.payload.id === SupportedSettings.TABULATION_SIZE) {
        document.documentElement.style.setProperty("--vscode-tab-size", action.payload.value);
      }
    },
    applyFormatResult: (state, action) => {
      state.formattedContent = action.payload.content;
    }
  },
});

export const {
  changeActiveCatagory,
  changePreviewExample,
  initSetting,
  changeSetting,
  applyFormatResult,
} = formatterSettingsViewSlice.actions;

export default formatterSettingsViewSlice.reducer;
