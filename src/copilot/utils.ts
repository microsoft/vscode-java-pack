import { workspace, version, Uri } from "vscode";
import { SemVer } from "semver";
import { createUuid, sendInfo, sendOperationEnd, sendOperationError, sendOperationStart } from "vscode-extension-telemetry-wrapper";
import path from "path";
import { getExpService } from "../exp";
import { TreatmentVariables } from "../exp/TreatmentVariables";

export function uncapitalize(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
}

export function isCodeLensDisabled(): boolean {
    const editorConfig = workspace.getConfiguration('editor');
    const enabled = editorConfig.get<boolean>('codeLens');
    // If it's explicitly set to false, CodeLens is turned off
    return enabled === false;
}

export async function retryOnFailure<T>(task: () => Promise<T>, timeout: number = 30000, retryInterval: number = 3000): Promise<T> {
    const startTime = Date.now();

    while (true) {
        try {
            return await task();
        } catch (error) {
            if (Date.now() - startTime >= timeout) {
                throw error;
            } else {
                await new Promise(resolve => setTimeout(resolve, retryInterval));
            }
        }
    }
}

export function isNewerThan(v: string): boolean {
    return new SemVer(version).compare(new SemVer(v)) >= 0;
}

/**
 * copied from vscode-extension-telemetry-wrapper, the only difference is we re-throw the error to the caller but the original one doesn't.
 */
export function fixedInstrumentOperation(
    operationName: string,
    cb: (operationId: string, ...args: any[]) => any,
    thisArg?: any,
): (...args: any[]) => any {
    return async (...args: any[]) => {
        let error;
        const operationId = createUuid();
        const startAt: number = Date.now();

        try {
            sendOperationStart(operationId, operationName);
            return await cb.apply(thisArg, [operationId, ...args]);
        } catch (e) {
            error = e as Error;
            sendOperationError(operationId, operationName, error);
            // NOTE: re-throw the error to the caller
            throw e;
        } finally {
            const duration = Date.now() - startAt;
            sendOperationEnd(operationId, operationName, duration, error);
        }
    };
}

/**
 * copied from vscode-extension-telemetry-wrapper, the only difference is we re-throw the error to the caller but the original one doesn't.
 */
export function fixedInstrumentSimpleOperation(operationName: string, cb: (...args: any[]) => any, thisArg?: any): (...args: any[]) => any {
    return fixedInstrumentOperation(operationName, async (_operationId, ...args) => await cb.apply(thisArg, args), thisArg /** unnecessary */);
}

export function sendEvent(eventName: string, info?: { [key: string]: any }): void {
    sendInfo('', { isEvent: "true", operationName: eventName, eventName, ...info });
}

/**
 * Checks if the parentUri is a parent of childUri.
 * 
 * @param parentUri The potential parent URI.
 * @param childUri The child URI to check.
 * @returns true if parentUri is a parent of childUri, false otherwise.
 */
export function isParentUri(parentUri: Uri, childUri: Uri): boolean {
    // Use path.relative to find the relative path from parentUri to childUri
    const relativePath = path.relative(parentUri.fsPath, childUri.fsPath);
    // If the relative path starts with '..' or is empty, parentUri is not a parent of childUri
    return !(relativePath.startsWith('..') || path.isAbsolute(relativePath));
}

export async function fileExists(uri: Uri): Promise<boolean> {
    return workspace.fs.stat(uri).then(() => true, () => false);
}


export async function isInTreatmentGroup(variable: string, dft: boolean = true): Promise<boolean> {
    try {
        const value = await getExpService()?.getTreatmentVariableAsync(TreatmentVariables.VSCodeConfig, variable, true /*checkCache*/)
        sendEvent(`exp.${uncapitalize(variable)}`, { value });
        if (value === false) {
            return false;
        } else if (value === true) {
            return true;
        }
        return dft;
    } catch (e) {
        sendEvent(`exp.${uncapitalize(variable)}.variableLoadFailed`);
        return dft;
    }
}
