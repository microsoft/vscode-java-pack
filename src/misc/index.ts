// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { getReleaseNotesEntries, findLatestReleaseNotes, timeToString } from "../utils";

function showInfoButton() {
  let infoButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
  infoButton.command = "java.overview";
  infoButton.text = "$(info)";
  infoButton.tooltip = "Learn more about Java features";
  infoButton.show();
}

type ReleaseNotesPresentationHistoryEntry = { version: string, timeStamp: string };
const RELEASE_NOTE_PRESENTATION_HISTORY = 'releaseNotesPresentationHistory';

export async function showReleaseNotesOnStart(context: vscode.ExtensionContext) {
  const entries = await getReleaseNotesEntries(context);
  const latest = findLatestReleaseNotes(entries);

  const history: ReleaseNotesPresentationHistoryEntry[] = context.globalState.get(RELEASE_NOTE_PRESENTATION_HISTORY) || [];
  if (history.some(entry => entry.version === latest.version)) {
    return;
  }

  await vscode.commands.executeCommand('java.showLatestReleaseNotes');

  history.push({
    version: latest.version,
    timeStamp: timeToString(new Date())
  });

  context.globalState.update(RELEASE_NOTE_PRESENTATION_HISTORY, history);
}

export function initialize(context: vscode.ExtensionContext) {
  showInfoButton();
}
