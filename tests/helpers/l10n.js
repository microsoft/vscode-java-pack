// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

function createL10n(bundle = {}) {
    return {
        bundle,
        t: (message, ...args) => {
            const values = args.length === 1 && typeof args[0] === "object" ? args[0] : args;
            return (bundle[message] ?? message).replace(/\{(\w+)\}/g, (match, key) => values[key] === undefined ? match : String(values[key]));
        },
    };
}

module.exports = { createL10n };
