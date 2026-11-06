// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Fragment, ReactNode } from "react";

export function richText(message: string, nodes: readonly ReactNode[]): ReactNode {
    return message.split(/(\{\d+\})/g).map((part, index) => {
        const match = /^\{(\d+)\}$/.exec(part);
        const nodeIndex = match ? Number(match[1]) : undefined;
        if (nodeIndex !== undefined && nodeIndex >= nodes.length) {
            throw new Error(`Unknown localized React placeholder: ${nodeIndex}`);
        }
        return <Fragment key={index}>{nodeIndex === undefined ? part : nodes[nodeIndex]}</Fragment>;
    });
}
