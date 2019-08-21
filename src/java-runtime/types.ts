// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export interface JavaRuntimeEntry {
  name: string;
  path: string | undefined;
  type: string;
  actionUri?: string;
  isValid?: boolean;
  hint?: string;
}

export enum JavaRuntimeEntryTypes {
  UserSetting = "User Setting",
  EnvironmentVariable = "Environment Variable",
  Other = "Other"
}
