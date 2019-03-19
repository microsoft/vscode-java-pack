// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import findJavaHome = require("find-java-home");

export async function validateJavaRuntime(): Promise<boolean> {
  return new Promise((resolve) => {
    findJavaHome({ allowJre: false }, (err) => {
      resolve(!err);
    });
  });
}
