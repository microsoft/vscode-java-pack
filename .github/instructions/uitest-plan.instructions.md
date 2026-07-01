---
applyTo: "test-plans/**/*.yaml"
description: "Authoring rules for vscode-java-pack AutoTest UI/E2E YAML test plans"
---

# AutoTest UI/E2E test plan instructions

Test plans under `test-plans/` are executable YAML files consumed by `@vscjava/vscode-autotest`. They should describe stable user scenarios, not raw implementation details.

## Setup rules

- Use `setup.extension: "redhat.java"` plus `setup.extensions: ["vscjava.vscode-java-pack"]` for most Java extension pack scenarios.
- Use a local VSIX at runtime with `--vsix <path>` when validating current-branch changes.
- Keep setup paths relative to the test plan file. Use `~/` in verification paths to refer to the runtime workspace root.
- Prefer existing lightweight fixtures in `test-fixtures/` or external sample projects already used by CI (`../vscode-java`, `../eclipse.jdt.ls`). Do not add large binary fixtures.
- Disable noisy startup surfaces with settings when relevant, for example `java.help.showReleaseNotes: false` and `java.help.firstView: "none"`.

## Action rules

- Prefer stable commands and command IDs (`run command`, `executeVSCodeCommand`) before UI locators.
- Use `clickInWebview` and `verifyWebview` for webview scenarios.
- Use `insertLineInFile` for Java edits that the language server must analyze. Use `typeInEditor` only for text that does not require language-server analysis.
- Use `waitForLanguageServer`, `waitForTestDiscovery`, or verifier polling before static waits. Short static waits are acceptable only for UI rendering settle time.
- Quote action arguments that contain spaces:

```yaml
action: 'contextMenu "Maven Dependencies" "Add JAR"'
```

## Verification rules

- Add deterministic verification to every meaningful step. The natural-language `verify` field is context for humans and failure analysis; it is not pass/fail authority by itself.
- Prefer `verifyFile` after language-server edits such as code actions, organize imports, or rename. VS Code can open duplicate editor tabs with stale buffers.
- Use `verifyProblems` for compiler/problem expectations and `verifyCompletion` for IntelliSense expectations.
- Use screenshots only as diagnostics produced by AutoTest; do not make screenshots the only evidence of pass/fail.

## Local validation commands

```powershell
npx -y @vscjava/vscode-autotest validate test-plans\<name>.yaml
npm ci   # first time only; on later iterations run just the three commands below
npm run build
npx @vscode/vsce@latest package -o vscode-java-pack-pr.vsix
npx -y @vscjava/vscode-autotest run test-plans\<name>.yaml --vsix vscode-java-pack-pr.vsix --no-llm
```

