// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { AdoptiumAsset, AdoptiumReleaseInfo } from '../../../utils/adoptiumApi'

// Define a type for the slice state
interface State {
  availableReleases?: AdoptiumReleaseInfo;
  asset?: AdoptiumAsset;
  currentVersion?: number;
}

// Define the initial state using that type
const initialState: State = {
};

export const slice = createSlice({
  name: 'jdks',
  initialState,
  reducers: {
    listReleases: (state, action: PayloadAction<AdoptiumReleaseInfo>) => {
        state.availableReleases = action.payload;
        state.currentVersion = state.availableReleases.most_recent_lts;
    },
    selectVersion: (state, action: PayloadAction<number>) => {
        state.currentVersion = action.payload;
    },
    showAsset: (state, action: PayloadAction<AdoptiumAsset | undefined>) => {
        state.asset = action.payload;
    }
  },
})

export const { 
    listReleases,
    selectVersion,
    showAsset
} = slice.actions

export default slice.reducer;
