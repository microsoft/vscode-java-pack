// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export function toElapsed(start?: number, end?: number) {
    if (start && end) {
        return end - start;
    } else {
        return undefined;
    }
}