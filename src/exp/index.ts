// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { IExperimentationService, IExperimentationTelemetry, TargetPopulation, getExperimentationServiceAsync } from "vscode-tas-client";
import { addContextProperty, sendInfo } from "vscode-extension-telemetry-wrapper";
import { getExtensionName, getExtensionVersion, isInsiders } from "../utils";

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

function getTargetPopulation() {
  return isInsiders() ? TargetPopulation.Insiders : TargetPopulation.Public;
}

export async function initialize(context: vscode.ExtensionContext) {
  expService = await getExperimentationServiceAsync(
    getExtensionName(),
    getExtensionVersion(),
    getTargetPopulation(),
    new ExperimentationTelemetry(),
    context.globalState
  );
}
