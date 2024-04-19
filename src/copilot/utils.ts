import { LogOutputChannel, window } from "vscode";

export const logger: LogOutputChannel = window.createOutputChannel("Rewriting Suggestions", { log: true });
