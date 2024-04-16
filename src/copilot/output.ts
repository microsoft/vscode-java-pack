import { window } from "vscode";

const channel = window.createOutputChannel("Rewriting Suggestions");
class Output {
    public debug(message?: unknown, ...optionalParams: unknown[]): void {
        channel.appendLine(`[DEBUG][${new Date().toISOString()}] ${message} ${optionalParams.join(' ')}`);
    }
    public log(message?: unknown, ...optionalParams: unknown[]): void {
        channel.appendLine(`[LOG][${new Date().toISOString()}] ${message} ${optionalParams.join(' ')}`);
    }
    public info(message?: unknown, ...optionalParams: unknown[]): void {
        channel.appendLine(`[INFO][${new Date().toISOString()}] ${message} ${optionalParams.join(' ')}`);
    }
    public warn(message?: unknown, ...optionalParams: unknown[]): void {
        channel.appendLine(`[WARN][${new Date().toISOString()}] ${message} ${optionalParams.join(' ')}`);
    }
    public error(message?: unknown, ...optionalParams: unknown[]): void {
        channel.appendLine(`[ERROR][${new Date().toISOString()}] ${message} ${optionalParams.join(' ')}`);
    }
}

const output = new Output;
export { output };

