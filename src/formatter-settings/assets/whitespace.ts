// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const SPACE_STYLE = "whitespace-style";
const TAB_STYLE = "tab-style";
const STYLE_ID = "whitespaceStyle";

export function renderWhitespace(): void {
    const style: HTMLElement | null = document.getElementById(STYLE_ID);
    if (!style) {
        const styleElement: HTMLStyleElement = document.createElement("style");
        styleElement.id = STYLE_ID;
        styleElement.textContent = ``;
        document.head.appendChild(styleElement);
    }
    const elements = document.querySelectorAll("code");
    for (let i = 0; i < elements.length; i++) {
        const treeWalker: TreeWalker = document.createTreeWalker(elements[i], NodeFilter.SHOW_TEXT);
        const nodes: Node[] = [];
        while (treeWalker.nextNode()) {
            nodes.push(treeWalker.currentNode);
        }
        for (const node of nodes) {
            replace(node);
        }
    }
}

function replace(node: Node): void {
    const textValue: string | null = node.nodeValue;
    if (!textValue) {
        return;
    }
    const parent: (Node & ParentNode) | null = node.parentNode;
    if (!parent) {
        return;
    }
    const tabs: string[] = textValue.split("\t");
    const tabSpaces: string[][] = tabs.map(s => s.split(" "));
    if (tabSpaces.length === 1 && tabSpaces[0].length === 1) {
        return;
    }
    for (let i = 0; i < tabSpaces.length; i++) {
        if (i > 0) {
            parent.insertBefore<HTMLSpanElement>(createTabElement(), node);
        }
        let spaceCount = 0;
        for (let j = 0; j < tabSpaces[i].length; j++) {
            if (tabSpaces[i][j] === "" && j !== tabSpaces[i].length - 1) {
                spaceCount = spaceCount + 1;
                continue;
            }
            if (spaceCount > 0) {
                parent.insertBefore<HTMLSpanElement>(createSpaceElement(spaceCount), node);
            }
            parent.insertBefore<Text>(document.createTextNode(tabSpaces[i][j]), node);
            spaceCount = 1;
        }
    }
    parent.removeChild(node);
}

function createSpaceElement(count: number): HTMLSpanElement {
    const node: HTMLSpanElement = document.createElement("span");
    node.classList.add(SPACE_STYLE);
    node.textContent = " ".repeat(count);
    return node;
}

function createTabElement(): HTMLSpanElement {
    const node: HTMLSpanElement = document.createElement("span");
    node.classList.add(TAB_STYLE);
    node.textContent = "\t";
    return node;
}
