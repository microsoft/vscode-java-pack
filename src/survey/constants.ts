// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export const BannerActions = {
    bannerLabelYes: 'Take Survey',
    bannerLabelNo: 'Don\'t show again',
    remindLater: 'Remind Me later'
}

export const SurveyBanner = {
    message: 'Do you mind taking a quick feedback survey about the Java extension pack?',
    action: [
        BannerActions.bannerLabelYes,
        BannerActions.bannerLabelNo,
        BannerActions.remindLater
    ],
    FIRST_STAGE_URL: 'https://www.microsoft.com',
    SECOND_STAGE_URL: 'https://www.microsoft.com',
    THIRD_STAGE_URL: 'https://www.microsoft.com',
}

export enum SurveyKeys {
    FIRST_ACTIVATION_TIME = 'packFirstActicationTime',
    DISABLED_SURVEY_UNTIL = 'packDisableSurveyUntil',
    DO_NOT_SHOW_AGAIN = 'packDoNotShowSurveyAgain'
}

export enum SurveyTimespan {
    FIRST_DAY = 1000 * 60 * 60 * 24, // 1 day
    SURVEY_DISABLE_TIME = 1000 * 60 * 60 * 24 * 3, // 3 days
    FIRST_STAGE = 1000 * 60 * 60 * 24 * 7, // 1 week
    SECOND_STAGE = 1000 * 60 * 60 * 24 * 21 // 3 weeks
}

export const PROBABILITY = 0.1;
