// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { createSlice } from "@reduxjs/toolkit";
import { ExampleManager, initializeSupportedProfileSettings, initializeSupportedVSCodeSettings } from "../../../FormatterConstants";
import { Catagory, ExampleKind } from "../../../types";

export const formatterSettingsViewSlice = createSlice({
  name: "formatterSettings",
  initialState: {
    activeCatagory: Catagory.Common,
    // only for display, settings will come from backend in next PR.
    settings: [...initializeSupportedProfileSettings(20), ...initializeSupportedVSCodeSettings()],
    exampleKind: ExampleKind.COMMON_EXAMPLE,
    // only for display, code will come from backend in next PR.
    formattedContent: ExampleManager.getExample(ExampleKind.COMMON_EXAMPLE),
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
      state.formattedContent = ExampleManager.getExample(state.exampleKind);
    },
    changeSetting: (state, action) => {
      for (const setting of state.settings) {
        if (setting.id === action.payload.id) {
          setting.value = action.payload.value;
          if (setting.exampleKind !== state.exampleKind) {
            state.exampleKind = setting.exampleKind;
            state.formattedContent = ExampleManager.getExample(state.exampleKind);
          }
          break;
        }
      }
    },
  },
});

export const {
  changeActiveCatagory,
  changeSetting,
} = formatterSettingsViewSlice.actions;

export default formatterSettingsViewSlice.reducer;
