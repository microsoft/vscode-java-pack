// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const settings = {
    space: " ",
    tab: "→",
};
const STYLE_NAME = "white-space";

export function renderWhitespace() {
    const style = document.getElementById("whitespaceStyle");
    if (!style) {
        const styleNode = document.createElement("style");
        styleNode.id = "whitespaceStyle";
        styleNode.textContent =
        `.${STYLE_NAME} {
        opacity: 0.3;
        font-style: normal;
        font-family: SpaceDiff, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        color: var(--vscode-editor-foreground);
        }`;
        document.head.appendChild(styleNode);
        
    }
    for (const element of document.querySelectorAll("code")) {
        if (element.getElementsByClassName(STYLE_NAME).length > 0) {
            continue;
        }
        showWhitespaceIn(element);
    }
}

function showWhitespaceIn(root) {
    const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (treeWalker.nextNode()) {
        nodes.push(treeWalker.currentNode);
    }

    for (const node of nodes) {
        replaceWhitespace(node, settings.tab, settings.space);
    }
}

function replaceWhitespace(node, tab, space) {
    let originalText = node.nodeValue;
    const parent = node.parentNode;
    const tabParts = originalText.split("\t");
    const tabSpaceParts = tabParts.map(s => s.split(/[ \xa0]/));
    if (tabSpaceParts.length === 1 &&
        tabSpaceParts[0].length === 1) { return; }
    const insert = (newNode) => {
        parent.insertBefore(newNode, node);
    };
    insertParts(tabSpaceParts,
        spaceParts => spaceParts.length === 1 && spaceParts[0] === "",
        n => insert(createWhitespaceNode(tab, n)),
        spaceParts =>
            insertParts(spaceParts,
                text => text === "",
                n => insert(createWhitespaceNode(space, n)),
                text => insert(document.createTextNode(text))));
    parent.removeChild(node);
}

function createWhitespaceNode(text, n) {
    const node = document.createElement("span");
    node.classList.add(STYLE_NAME);
    node.textContent = text.repeat(n);
    return node;
}

function insertParts(parts, isConsecutiveFn, addInterFn, addPartFn) {
    const n = parts.length;
    parts.reduce((consecutive, part, i) => {
        const isConsecutive = isConsecutiveFn(part);
        if (isConsecutive && i !== n - 1) { return consecutive + 1; }
        if (consecutive > 0) { addInterFn(consecutive); }
        if (!isConsecutive) { addPartFn(part); }
        return 1;
    }, 0);
}
