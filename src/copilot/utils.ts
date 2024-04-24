import { LogOutputChannel, window } from "vscode";

export const logger: LogOutputChannel = window.createOutputChannel("Java Rewriting Suggestions", { log: true });
