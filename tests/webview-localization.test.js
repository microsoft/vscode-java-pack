// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");
const l10n = require("@vscode/l10n");
const { createL10n } = require("./helpers/l10n");

function loader(mocks = {}, globals = {}) {
    const cache = new Map();
    function load(relativePath) {
        const filename = path.resolve(__dirname, "..", relativePath);
        if (cache.has(filename)) return cache.get(filename).exports;
        const module = { exports: {} };
        cache.set(filename, module);
        const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
            fileName: filename,
        });
        const resolve = name => {
            if (Object.hasOwn(mocks, name)) return mocks[name];
            if (!name.startsWith(".")) return require(name);
            const absolute = path.resolve(path.dirname(filename), name);
            const candidate = [absolute + ".ts", absolute + ".tsx", path.join(absolute, "index.ts")].find(fs.existsSync);
            assert.ok(candidate, `Unresolved test module ${name} in ${filename}`);
            return load(candidate);
        };
        vm.runInNewContext(outputText, { module, exports: module.exports, require: resolve, console, process, Buffer, ...globals }, { filename });
        return module.exports;
    }
    return load;
}

test.afterEach(() => l10n.config({ contents: {} }));

test("native bootstrap keeps hostile catalog text inert and escapes HTML attributes", () => {
    const malicious = '</script><img src=x onerror="bad">&\'\u2028\u2029';
    const bundle = { message: malicious };
    const load = loader({ vscode: { env: { language: 'zh-cn" data-bad="true' }, l10n: { bundle } } });
    const host = load(path.join("src", "l10n", "host.ts"));
    const script = host.localizationBootstrap('nonce"&');
    assert.equal((script.match(/<\/script>/g) || []).length, 1);
    assert.ok(!script.includes("<img"));
    assert.match(script, /nonce="nonce&quot;&amp;"/);
    const serialized = script.slice(script.indexOf(">") + 1, script.lastIndexOf("</script>"));
    assert.equal(JSON.parse(serialized).bundle.message, malicious);
    assert.equal(host.webviewLanguage(), "zh-cn&quot; data-bad=&quot;true");
    assert.equal(host.formatHtml("<b>{0}</b> & {1}", ["<a href='command:stable'>link</a>", "text"]),
        "&lt;b&gt;<a href='command:stable'>link</a>&lt;/b&gt; &amp; text");
    assert.throws(() => host.formatHtml("{2}", []), /Unknown localized HTML placeholder/);
});

test("browser config uses only the host bundle and falls back for missing bundle/key", () => {
    const document = { documentElement: {}, getElementById: () => ({ textContent: JSON.stringify({
        language: "zh-cn", bundle: { "Hello {name}": "{name}，你好" },
    }) }) };
    loader({}, { document })(path.join("src", "l10n", "browser.ts"));
    assert.equal(document.documentElement.lang, "zh-cn");
    assert.equal(l10n.t("Hello {name}", { name: "Java" }), "Java，你好");
    assert.equal(l10n.t("Missing {0}", "key"), "Missing key");
    loader({}, { document: { getElementById: () => null } })(path.join("src", "l10n", "browser.ts"));
    assert.equal(l10n.t("Hello {name}", { name: "Java" }), "Hello Java");
});

test("malformed bootstraps fail explicitly instead of pretending localization succeeded", () => {
    for (const textContent of ["not JSON", "null", '{"language":"zh-cn","bundle":[]}', '{"language":"zh-cn","bundle":{"x":42}}']) {
        assert.throws(() => loader({}, { document: {
            getElementById: () => ({ textContent }), documentElement: {},
        } })(path.join("src", "l10n", "browser.ts")));
    }
});

test("reordered rich text retains trusted links and escapes translated markup", () => {
    const { createElement } = require("react");
    const { renderToStaticMarkup } = require("react-dom/server");
    const { richText } = loader()(path.join("src", "l10n", "richText.tsx"));
    l10n.config({ contents: { "Use {0} then {1}.": "{1} <script>bad</script> {0}" } });
    const html = renderToStaticMarkup(createElement("p", null, richText(l10n.t("Use {0} then {1}."), [
        createElement("a", { href: "command:stable" }, "Java"), "JDK",
    ])));
    assert.equal(html, '<p>JDK &lt;script&gt;bad&lt;/script&gt; <a href="command:stable">Java</a></p>');
    assert.throws(() => richText("{2}", []), /Unknown localized React placeholder/);
});

test("display mappings are lazy and leave formatter protocol, candidates, defaults and XML values unchanged", () => {
    const load = loader();
    const constants = load(path.join("src", "formatter-settings", "FormatterConstants.ts"));
    const { ExampleKind } = load(path.join("src", "formatter-settings", "types.ts"));
    const { FormatterConverter } = load(path.join("src", "formatter-settings", "FormatterConverter.ts"));
    const labels = load(path.join("src", "formatter-settings", "assets", "labels.ts"));
    const { ProjectType } = load(path.join("src", "utils", "webview.ts"));
    const { projectTypeLabel } = load(path.join("src", "l10n", "display.ts"));
    const chinese = require("../l10n/bundle.l10n.zh-cn.json");
    const settings = new Map(constants.getSupportedVSCodeSettings());
    for (let version = 1; version <= 23; version++) {
        for (const [id, setting] of constants.getSupportedProfileSettings(version)) settings.set(id, setting);
    }
    const snapshot = JSON.stringify([...settings]);
    for (const setting of settings.values()) assert.equal(labels.formatterSettingLabel(setting), setting.name);
    assert.equal(projectTypeLabel(ProjectType.UnmanagedFolder), "Unmanaged folder");
    l10n.config({ contents: chinese });
    for (const setting of settings.values()) {
        assert.ok(Object.hasOwn(chinese, setting.name), `Unmapped formatter label: ${setting.name}`);
        assert.equal(labels.formatterSettingLabel(setting), chinese[setting.name]);
        for (const candidate of setting.candidates || []) {
            assert.equal(labels.formatterCandidateLabel(candidate), chinese[candidate] ?? candidate);
        }
    }
    assert.equal(JSON.stringify([...settings]), snapshot);
    assert.deepEqual(Object.values(ProjectType), ["Default project", "Unmanaged folder", "Maven", "Gradle", "Others"]);
    assert.equal(projectTypeLabel(ProjectType.UnmanagedFolder), "非托管文件夹");
    assert.equal(projectTypeLabel(ProjectType.Maven), "Maven");
    assert.deepEqual(Object.values(ExampleKind), ["Indentation", "Blank line", "Comment", "Insert Line", "Braced type",
        "Braced record", "Braced enum", "Annotation and anonymous", "Whitespace", "Wrapping"]);
    for (const kind of Object.values(ExampleKind)) assert.equal(labels.formatterExampleLabel(kind), chinese[kind]);
    const { TABULATION_CHAR, KEEP_TYPE_DECLARATION_ON_ONE_LINE } = constants.SupportedSettings;
    assert.equal(constants.getDefaultValue(TABULATION_CHAR), "tab");
    assert.equal(FormatterConverter.webView2ProfileConvert(TABULATION_CHAR, "tab"), "tab");
    for (const [candidate, xml] of [["never", "one_line_never"], ["if empty", "one_line_if_empty"],
        ["if at most one item", "one_line_if_single_item"]]) {
        assert.equal(FormatterConverter.webView2ProfileConvert(KEEP_TYPE_DECLARATION_ON_ONE_LINE, candidate), xml);
        assert.equal(FormatterConverter.profile2WebViewConvert(KEEP_TYPE_DECLARATION_ON_ONE_LINE, xml), candidate);
    }
});

test("translated Help Center actions retain the exact command URIs and telemetry identities", () => {
    const { createElement } = require("react");
    const { renderToStaticMarkup } = require("react-dom/server");
    const load = loader({ "../utils": { WEBVIEW_ID: "java.welcome" } }, { navigator: { platform: "win32", userAgent: "Windows" } });
    const { default: QuickActionPanel } = load(path.join("src", "welcome", "assets", "components", "QuickActionPanel.tsx"));
    const { default: SocialMediaPanel } = load(path.join("src", "welcome", "assets", "components", "SocialMediaPanel.tsx"));
    const render = () => renderToStaticMarkup(createElement("div", null, createElement(QuickActionPanel), createElement(SocialMediaPanel)));
    const english = render();
    l10n.config({ contents: require("../l10n/bundle.l10n.zh-cn.json") });
    const chinese = render();
    const hrefs = html => [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(hrefs(chinese), hrefs(english));
    assert.match(chinese, /创建/);
    assert.match(chinese, /文档/);
    assert.doesNotMatch(chinese, />Documentation</);
});

function hostEnvironment() {
    const bundle = require("../l10n/bundle.l10n.zh-cn.json");
    const disposable = { dispose() {} };
    const panel = {
        viewType: "test", title: "stale translated title", reveal() {}, dispose() {}, onDidDispose: () => disposable,
        webview: { cspSource: "test-source", asWebviewUri: () => "https://webview.test/script.js",
            onDidReceiveMessage: () => disposable, postMessage: () => true },
    };
    const context = { extensionPath: "test-extension", asAbsolutePath: value => value, subscriptions: [],
        globalState: { get() {}, update() {} } };
    const vscode = {
        l10n: createL10n(bundle), env: { language: "zh-cn" }, ViewColumn: { One: 1, Active: 1 },
        Uri: { file: fsPath => ({ fsPath }) },
        extensions: { all: [], getExtension() {}, onDidChange: () => disposable },
        workspace: { getConfiguration: () => ({ get() {} }), onDidChangeConfiguration: () => disposable, onDidChangeTextDocument: () => disposable },
        languages: { createDiagnosticCollection: () => ({ set() {} }) },
        window: { createWebviewPanel: () => panel, showErrorMessage: async () => undefined },
    };
    const mockHandler = class { dispose() {} };
    const mocks = {
        vscode,
        "../utils": { getExtensionContext: () => context, getNonce: () => "stable-nonce" },
        "./handlers/ClasspathRequestHandler": { ClasspathRequestHandler: mockHandler },
        "./handlers/CompilerRequestHandler": { CompilerRequestHandler: mockHandler },
        "./handlers/MavenRequestHandler": { MavenRequestHandler: mockHandler },
        "vscode-extension-telemetry-wrapper": {
            instrumentOperation: (_, callback) => (...args) => callback("test", ...args),
            instrumentSimpleOperation: (_, callback) => callback, sendInfo() {}, sendError() {}, setUserError() {},
        },
    };
    return { panel, context, mocks };
}

for (const [page, serializer, title] of [
    ["overview", "OverviewViewSerializer", "Java 概述"],
    ["ext-guide", "JavaExtGuideViewSerializer", "Java 扩展指南"],
    ["welcome", "WelcomeViewSerializer", "Java 帮助中心"],
    ["beginner-tips", "BeginnerTipsViewSerializer", "新手提示"],
    ["install-jdk", "InstallJdkViewSerializer", "安装新 JDK"],
    ["java-runtime", "JavaRuntimeViewSerializer", "配置 Java 运行时"],
    ["project-settings", "ProjectSettingsViewSerializer", "项目设置"],
]) {
    test(`${serializer} rebuilds its title and bootstrap in the current display language`, async () => {
        const s = hostEnvironment();
        const source = loader(s.mocks)(path.join("src", page, page === "project-settings" ? "projectSettingsView.ts" : "index.ts"));
        await new source[serializer](s.context).deserializeWebviewPanel(s.panel, {});
        assert.equal(s.panel.title, title);
        assert.match(s.panel.webview.html, /<html lang="zh-cn">/);
        assert.ok(s.panel.webview.html.includes(`<title>${title}</title>`));
        assert.ok(s.panel.webview.html.indexOf('id="java-pack-l10n"') < s.panel.webview.html.indexOf('type="module"'));
        assert.match(s.panel.webview.html, /script-src 'nonce-stable-nonce'/);
    });
}

test("custom formatter editor rebuilds localized document HTML without changing its filename tab", async () => {
    const s = hostEnvironment();
    const { JavaFormatterSettingsEditorProvider } = loader(s.mocks)(path.join("src", "formatter-settings", "index.ts"));
    const provider = new JavaFormatterSettingsEditorProvider(s.context);
    s.panel.title = "profile.xml";
    await provider.resolveCustomTextEditor({}, s.panel, {});
    assert.equal(s.panel.title, "profile.xml");
    assert.match(s.panel.webview.html, /<title>Java 格式化程序设置<\/title>/);
    assert.match(s.panel.webview.html, /id="java-pack-l10n"/);
});
