# Localization

English is the source language. Simplified Chinese (`zh-cn`) is the first
translation. The pack follows VS Code's display language and normal reload
behavior, with English fallback. There is no separate language setting.

## Manifest resources

Pack-owned manifest UI text uses semantic `%key%` references in `package.json`.
Keep English defaults in `package.nls.json` and translate every key in
`package.nls.<locale>.json`. This includes the walkthrough, media alternative
text, command and shortcut captions, settings descriptions and formatter editor
name. Keep the existing English wording when externalizing text.

Use VS Code locale names (for example `zh-cn`, not `zh_CN`). Preserve product
names, codicons, Markdown structure, link targets and encoded command arguments.
Never translate command IDs, settings keys, enum values, paths or telemetry
identifiers. The pack does not translate its bundled extensions.

## Native messages and webviews

The manifest's `l10n: "./l10n"` lets VS Code select the runtime bundle.
Extension-host code uses `vscode.l10n.t("Complete message {0}", value)`.
Do not dynamically translate exception messages or assemble sentences from
translated fragments. Retain original errors in logs and localize the
pack-authored explanation. Dialog actions use message-item object identity,
not comparisons against English or translated captions; cancellation remains
`undefined`.

All eight webviews are localized: Overview, Help Center, Tips for Beginners,
Extensions Guide, Install JDK, Java Runtime, Project Settings and Formatter
Settings. The legacy Java Runtime page remains supported by its serializer;
the current `java.runtime` command opens Project Settings' JDK page.

Use `src/l10n/host.ts` for native HTML titles, language attributes, escaping and
the nonce-protected inert JSON bootstrap. Pass only the active
`vscode.l10n.bundle` and `vscode.env.language`; do not discover catalogs,
inspect `navigator.language`, fetch translations, change CSP or expand
`localResourceRoots`. Browser entries import `src/l10n/browser.ts` before
rendering and use `@vscode/l10n`, never `vscode`. Missing bundles or keys use
English; malformed bootstraps are explicit errors. Restored panels rebuild
their titles and bootstrap using the current language.

Call translation functions lazily at presentation boundaries, not in
module-level metadata before initialization. Keep raw `ProjectType`,
`ExampleKind`, formatter candidates, setting IDs, XML values and telemetry
identities unchanged. Explicit display mappings live in `src/l10n/display.ts`
and `src/formatter-settings/assets/labels.ts`. Never persist translated labels.
For sentences containing links or React nodes, use reorderable placeholders
with `richText` (browser) or `formatHtml` (native HTML) and trusted nodes.
Translations must not supply arbitrary HTML or command URLs.

## Updating or adding a language

1. Use a VS Code locale name, such as `zh-cn`, in both
   `package.nls.<locale>.json` and `l10n/bundle.l10n.<locale>.json`.
2. Keep English defaults in `package.nls.json`. After editing native or browser
   messages, run `npm run l10n:export` to deterministically regenerate
   `l10n/bundle.l10n.json`. This command intentionally updates the source catalog.
3. Translate every source key in both locale catalogs. Preserve placeholder
   names and occurrence counts, but reorder them as needed. Preserve link
   targets, encoded arguments, Markdown, codicons and functional symbols.
4. Run `npm run l10n:check`, `npm test` and `npm run build`. The check discovers
   every shipped locale, requires matching manifest/runtime locales, verifies
   coverage and invariants, and extracts to a temporary directory to detect
   drift without rewriting committed catalogs. Add regression cases for new
   UI/action behavior.
5. Package with `npx @vscode/vsce@latest package -o vscode-java-pack-localized.vsix`.
   Inspect the actual VSIX, not just the checkout: `extension/` must contain
   both root manifest catalogs, runtime bundles and all eight browser assets.
   `node_modules` is intentionally excluded; browser localization is bundled.
   Install the package and verify English, the new language and unsupported
   language fallback, including link actions and restored panels.

### UI validation

Use AutoTest YAML, stable command IDs/selectors and deterministic text verifiers.
`test-plans/java-webview-migration.yaml` covers the current English command routes;
`test-plans/localization/en-native.yaml` checks native settings actions and restoration;
`test-plans/localization/zh-cn.yaml` contains the Chinese acceptance scenario.
The latter is kept outside the top-level CI discovery glob because ordinary
AutoTest launches do not currently select a display language.

Before running a translated scenario, verify the runner actually launches VS
Code in that locale and installs the matching language pack. AutoTest 0.7.35
can install `MS-CEINTL.vscode-language-pack-zh-hans` using `setup.extensions`,
but its YAML parser has no locale/launch-argument field, and its launch path
does not consume the advertised driver `launchArgs` or CLI `--attach` option.
Do not invent YAML fields or treat installing a language pack as selecting it.
Chinese installed-package acceptance therefore requires a runner with working
locale launch support or a manual localized VS Code session. Assert Chinese
text before calling the scenario a pass. English UI checks do not prove this.

VS Code also suppresses notification toasts when launched with
`--enable-smoke-test-driver`, which AutoTest uses. The English native scenario
therefore checks the AWT commands' persisted settings instead of claiming toast
coverage. The Chinese scenario retains its message assertions for a compatible
launch; selecting Chinese alone does not remove this separate limitation.
Check the English and Chinese native messages and formatter actions in a normal
installed VS Code session before release. Node tests cover translated action
identity, cancellation and reordered message placeholders, not actual toast UI.

The legacy Runtime serializer and all eight current-language HTML bootstraps
also have executable Node regression coverage. The English native scenario
exercises a real Help Center window reload and restored content/title. Legacy
Runtime restoration, Chinese restoration and actual unsupported-locale fallback
still need installed-app checks; synthetic missing-key/bundle tests do not
replace them.

### Development-only pseudolocalization

Use the standard `@vscode/l10n-dev` tooling with VS Code's Pseudo Language
Language Pack to find clipping and concatenated sentences. In a disposable
development checkout, run:

```powershell
node node_modules\@vscode\l10n-dev\dist\cli.js generate-pseudo package.nls.json l10n\bundle.l10n.json
```

This writes adjacent `qps-ploc` catalogs. Use them only in that disposable
checkout, select the Pseudo display language, and reload normally. Never commit,
publish or include these generated catalogs in the release VSIX; they are not
a supported production language. Inspect long labels, accessibility names and
trusted rich-text links as well as overall layout.

## Scope

Release notes, README/tutorial prose, external documentation, screenshots, SVG
content and embedded walkthrough media (including `walkthrough/runtime.md`) are
not translated. Pack-owned in-webview UI text and manifest media alternative
text are translated. Bundled extensions retain their own localization ownership.

## Translation review

Human review by an independent Simplified Chinese speaker is a release gate;
catalog checks do not establish translation quality. Do not automatically publish
machine translations or call a cloud translation service. Use consistent terms:
runtime = 运行时, project = 项目, classpath = 类路径, formatter = 格式化程序.
Keep Java, JDK, VS Code and extension/product names unchanged. Future
right-to-left languages also require explicit layout qualification.
