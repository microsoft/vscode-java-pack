// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import { sendInfo } from "vscode-extension-telemetry-wrapper";
import { BannerActions, SurveyBanner, SurveyKeys, SurveyTimespan, PROBABILITY } from './constants'

function getActivationTime(context: vscode.ExtensionContext): number {
  return context.globalState.get(
    SurveyKeys.FIRST_ACTIVATION_TIME,
    0
  );
}

function getDoNotShowAgain(context: vscode.ExtensionContext): boolean {
  return context.globalState.get(
    SurveyKeys.DO_NOT_SHOW_AGAIN,
    false
  );
}

function getDisableTimeUntil(context: vscode.ExtensionContext): number {
  return context.globalState.get(
    SurveyKeys.DISABLED_SURVEY_UNTIL,
    0  
  );
}

function saveFirstActivationTime(context: vscode.ExtensionContext, currentTime: number) {
  let activationTime = getActivationTime(context);
  if (!activationTime) {
    context.globalState.update(
      SurveyKeys.FIRST_ACTIVATION_TIME,
      currentTime
    );
  }
}

function shouldShowSurvey(context: vscode.ExtensionContext, currentTime: number): boolean {
  if (currentTime - getActivationTime(context) < SurveyTimespan.FIRST_DAY) {
    return false;
  }
  if (getDoNotShowAgain(context)) {
    return false;
  }
  let disableTimeUntil = getDisableTimeUntil(context);
  if (disableTimeUntil && currentTime < disableTimeUntil) {
    return false;
  }
  // randomly sample 10% users
  if (Math.random() > PROBABILITY) {
    return false;
  }
  return true;
}

function openURL(URL: string) {
  const uri = vscode.Uri.parse(URL);
  vscode.env.openExternal(uri);
}

function disableSeed() {
  // vary disable time with half day randomly
  return Math.random() * SurveyTimespan.FIRST_DAY - SurveyTimespan.FIRST_DAY / 2;
}

function lauchSurvey(context: vscode.ExtensionContext, currentTime: number) {
  // show different survey according to user's stage
  let firstStageEnd = getActivationTime(context) + SurveyTimespan.FIRST_STAGE;
  let secondStageEnd = getActivationTime(context) + SurveyTimespan.SECOND_STAGE;

  if (currentTime <= firstStageEnd) {
    openURL(SurveyBanner.FIRST_STAGE_URL);
    context.globalState.update(
      SurveyKeys.DISABLED_SURVEY_UNTIL,
      firstStageEnd
    );
  } else if (currentTime > firstStageEnd && currentTime <= secondStageEnd) {
    openURL(SurveyBanner.SECOND_STAGE_URL);
    context.globalState.update(
      SurveyKeys.DISABLED_SURVEY_UNTIL,
      secondStageEnd
    );
  } else {
    openURL(SurveyBanner.THIRD_STAGE_URL);
    // disable survey for 12 weeks
    context.globalState.update(
      SurveyKeys.DISABLED_SURVEY_UNTIL,
      currentTime + SurveyTimespan.FIRST_STAGE * 12
    );
  }
}

async function showSurveyBanner(context: vscode.ExtensionContext, currentTime: number) {
  let answer = await vscode.window.showInformationMessage(SurveyBanner.message, ...SurveyBanner.action);
  
  sendInfo("", {
    infoType: "surveyChoice",
    choiceForSurvey: answer || "ignored",
  });

  if (!answer) {
    return;
  }
  if (answer === BannerActions.bannerLabelYes) {
    lauchSurvey(context, currentTime);
  } else if (answer === BannerActions.bannerLabelNo) {
    context.globalState.update(
      SurveyKeys.DO_NOT_SHOW_AGAIN,
      true
    );
  } else {
    context.globalState.update(
      SurveyKeys.DISABLED_SURVEY_UNTIL,
      currentTime + SurveyTimespan.SURVEY_DISABLE_TIME + disableSeed()
    );
  }
}

export function initialize(context: vscode.ExtensionContext) {
  let currentTime = new Date().getTime();
  saveFirstActivationTime(context, currentTime);
  if (shouldShowSurvey(context, currentTime)) {
    showSurveyBanner(context, currentTime);
  }
}
