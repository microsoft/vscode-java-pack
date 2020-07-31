// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { IExperimentationService, IExperimentationTelemetry, getExperimentationService, TargetPopulation } from "vscode-tas-client";
import { addContextProperty, sendInfo } from "vscode-extension-telemetry-wrapper";
import { getExtensionName, getExtensionVersion } from "../utils";

class ExperimentationTelemetry implements IExperimentationTelemetry {

  public setSharedProperty(name: string, value: string): void {
    addContextProperty(name, value);
  }

  public postEvent(eventName: string, props: Map<string, string>): void {
    const payload: any = { __event_name__: eventName };
    for (const [key, value] of props) {
      payload[key] = value;
    }

    sendInfo("", payload);
  }

}

let expService: IExperimentationService;

export function getExpService() {
  return expService;
}

export function initialize(context: vscode.ExtensionContext) {
  expService = getExperimentationService(
    getExtensionName(),
    getExtensionVersion(),
    TargetPopulation.Public,
    new ExperimentationTelemetry(),
    context.globalState
  );
}
