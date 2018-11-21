import * as vscode from 'vscode';
import { instrumentOperation } from 'vscode-extension-telemetry-wrapper';

export type CommandHandler = (context: vscode.ExtensionContext, operationId: string, ...args: any[]) => any;

export function instrumentCommand(context: vscode.ExtensionContext, operationName: string, callback: CommandHandler): (...args: any[]) => any {
  const stub = async (operationId: string, ...args: any[]) => {
    return await callback(context, operationId, ...args);
  };

  return instrumentOperation(operationName, stub);
}
