// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { createSlice } from "@reduxjs/toolkit";
import { Catagory, PreviewExample } from "../../../FormatterConstants";
import { initializeSupportedSettings } from "./SupportedSettings";
import { applyChanges, changeCatagory } from "../../vscode.api";

export const formatterSettingsViewSlice = createSlice({
  name: "formatterSettings",
  initialState: {
    activeCatagory: Catagory.Common,
    settings: initializeSupportedSettings(21),
    version: 21,
    content: PreviewExample.COMMON_EXAMPLE,
    formattedContent: "",
    settingsChanged: false,
    format: false,
  },
  reducers: {
    changeActiveCatagory: (state, action) => {
      const activeCatagory: Catagory = action.payload as Catagory;
      state.activeCatagory = activeCatagory;
      switch (activeCatagory) {
        case Catagory.Blankline:
          state.content = PreviewExample.BLANKLINE_EXAMPLE;
          break;
        case Catagory.Comment:
          state.content = PreviewExample.COMMENT_EXAMPLE;
          break;
        case Catagory.Common:
          state.content = PreviewExample.COMMON_EXAMPLE;
          break;
        case Catagory.Newline:
          state.content = PreviewExample.NEWLINE_EXAMPLE;
          break;
        case Catagory.Whitespace:
          state.content = PreviewExample.WHITESPACE_EXAMPLE;
          break;
        case Catagory.Wrapping:
          state.content = PreviewExample.WRAPPING_EXAMPLE;
          break;
      }
      state.format = false;
      changeCatagory(activeCatagory);
    },
    initVersion: (state, action) => {
      state.version = Number(action.payload.version);
      state.settings = initializeSupportedSettings(state.version);
    },
    initSetting: (state, action) => {
      for (const setting of state.settings) {
        if (setting.id === action.payload.id) {
          setting.value = action.payload.value;
          break;
        }
      }
    },
    updateSetting: (state, action) => {
      state.settingsChanged = true;
      for (const setting of state.settings) {
        if (setting.id === action.payload.id) {
          setting.value = action.payload.value;
          break;
        }
      }
    },
    applyFormatResult: (state, action) => {
      state.formattedContent = action.payload.content;
      state.format = true;
    },
    applySettingChange: (state, _action) => {
      state.settingsChanged = false;
      applyChanges();
    },
  },
});

export const {
  changeActiveCatagory,
  initVersion,
  initSetting,
  updateSetting,
  applyFormatResult,
  applySettingChange,
} = formatterSettingsViewSlice.actions;

export default formatterSettingsViewSlice.reducer;
