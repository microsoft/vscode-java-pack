// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import * as fs from "fs";
import { gt } from "semver";
import { sendError } from "vscode-extension-telemetry-wrapper";

type ReleaseNotesEntry = { fileName: string, version: string };

export async function getReleaseNotesEntries(context: vscode.ExtensionContext): Promise<ReleaseNotesEntry[]> {
  const dir = context.asAbsolutePath('release-notes');
  const regex = /v((0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*))\.md/g;

  return new Promise<ReleaseNotesEntry[]>((resolve, reject) => {
    fs.readdir(dir, (err, files) => {
      if (err) {
        sendError(err);
        reject(err);
        return;
      }

      const entries: any[] = [];

      files.forEach(fileName => {
        const match = regex.exec(fileName);
        if (!match) {
          return;
        }

        const [, semver] = match;

        entries.push({
          fileName: fileName,
          version: semver
        });
      });

      resolve(entries);
    });
  });
}

export function findLatestReleaseNotes(entries: ReleaseNotesEntry[]) {
  let latest = entries[0];
  entries.forEach(entry => {
    if (gt(entry.version, latest.version)) {
      latest = entry;
    }
  });

  return latest;
}
