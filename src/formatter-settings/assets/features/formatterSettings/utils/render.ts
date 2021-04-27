// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const settings = {
    whitespaceOpacity: 0.2,
    copyableWhitespace: false,
    space: '·',
    tab: '→',
};

// Constants
const WS_CLASS = 'glebm-ws';
const ROOT_SELECTOR = 'code';
const NODE_FILTER = {
    acceptNode(node) {
        let parent = node.parentNode;
        if (node.nodeType === 3) {
            return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
    }
};

function main() {
    const styleNode = document.createElement('style');
    styleNode.textContent = 
        `.${WS_CLASS}::before {
  opacity: ${settings.whitespaceOpacity};
  position: absolute;
  text-indent: 0;
}
/* desktop non-diff, mobile diff */
.blob-code .${WS_CLASS}::before {
  line-height: 20px;
}
/* horizontal scroll */
.blob-file-content pre,
.diff-view .file .highlight,
.blob-wrapper {
  position: relative;
}`;
    document.head.appendChild(styleNode);

    const initDOM = () => {
        for (const root of document.querySelectorAll(ROOT_SELECTOR)) {
            showWhitespaceIn(root);
        }
    };
    document.addEventListener('pjax:success', initDOM);
    initDOM();
}

function showWhitespaceIn(root) {
    const rootStyle = window.getComputedStyle(root);
    //const tab = settings.tab.padEnd(+(rootStyle['tab-size'] || rootStyle['-moz-tab-size'] || root.dataset.tabSize));
    const tab = settings.tab;
    const treeWalker =
        document.createTreeWalker(root, NodeFilter.SHOW_TEXT, NODE_FILTER);
    const nodes = [];
    while (treeWalker.nextNode()) nodes.push(treeWalker.currentNode);

    const isDiff = /* desktop */ root.classList.contains('diff-table') ||
        /* mobile */ root.classList.contains('file-diff');
    for (const node of nodes) replaceWhitespace(node, tab, settings.space, isDiff);
}

function isSpace(char) {
    return char === ' ';
}

function replaceWhitespace(node, tab, space, isDiff) {
    let originalText = node.nodeValue;
    const parent = node.parentNode;
    const ignoreFirstSpace = isDiff &&
        isSpace(originalText.charAt(0)) &&
        parent.firstChild === node &&
        parent.classList.contains('blob-code-inner') &&
        parent.parentNode.classList.contains('blob-expanded') &&
        // "Refined Github" extension removes the extra first space:
        // https://github.com/sindresorhus/refined-github/blob/34f713a331bf7dbf65c2082d3d2c667e06f22021/src/features/remove-diff-signs.js#L20
        !parent.matches('.refined-github-diff-signs *');
    if (ignoreFirstSpace) {
        if (isSpace(originalText)) return;
        originalText = originalText.slice(1);
        parent.insertBefore(document.createTextNode(' '), node);
    }
    const tabParts = originalText.split('\t');
    const tabSpaceParts = tabParts.map(s => s.split(/[ \xa0]/));
    if (!ignoreFirstSpace && tabSpaceParts.length === 1 &&
        tabSpaceParts[0].length === 1) return;
    const insert = (newNode) => {
        parent.insertBefore(newNode, node);
    };
    insertParts(tabSpaceParts,
        spaceParts => spaceParts.length === 1 && spaceParts[0] === '',
        n => insert(createWhitespaceNode('t', '\t', tab, n)),
        spaceParts =>
            insertParts(spaceParts,
                text => text === '',
                n => insert(createWhitespaceNode('s', ' ', space, n)),
                text => insert(document.createTextNode(text))));
    parent.removeChild(node);
}


var WS_ADDED_STYLES = new Set();
function createWhitespaceNode(type, originalText, text, n) {
    const node = document.createElement('span');
    node.classList.add(WS_CLASS);
    if (settings.copyableWhitespace) {
        node.textContent = text.repeat(n);
    } else {
        const className = `${type}-${n}`;
        if (!WS_ADDED_STYLES.has(className)) {
            const styleNode = document.createElement('style');
            styleNode.textContent =
                `.${WS_CLASS}-${className}::before { content: '${text.repeat(n)}'; }`;
            document.head.appendChild(styleNode);
            WS_ADDED_STYLES.add(className);
        }
        node.classList.add(`${WS_CLASS}-${className}`);
        node.textContent = originalText.repeat(n);
    }
    return node;
}

function insertParts(parts, isConsecutiveFn, addInterFn, addPartFn) {
    const n = parts.length;
    parts.reduce((consecutive, part, i) => {
        const isConsecutive = isConsecutiveFn(part);
        if (isConsecutive && i !== n - 1) return consecutive + 1;
        if (consecutive > 0) addInterFn(consecutive);
        if (!isConsecutive) addPartFn(part);
        return 1;
    }, 0);
}
