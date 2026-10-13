---
name: uitest
description: Write, update, run, or debug vscode-java-pack UI/E2E tests using AutoTest YAML plans. Use when the user asks for a UI test, E2E test, VS Code UI validation, webview test, Java extension pack workflow test, or autotest plan.
---

# UI/E2E tests with AutoTest

Use this skill to add or update UI/E2E coverage for `vscode-java-pack`.

The repository uses `@vscjava/vscode-autotest`: YAML plans in `test-plans/*.yaml` launch VS Code, install Java extensions or local VSIX files, execute user-facing actions, capture screenshots, and write `test-results/<plan>/results.json`.

## Prerequisites (local)

- Node.js >= 18 and JDK 21+ installed and on `PATH`.
- Close any running VS Code instance before running a plan locally; a running instance can block AutoTest from launching its own VS Code.
- When a plan references a `vscode-java` sample project, download its fixture as a sibling of this repo first (CI uses the same helper):

```powershell
.\.github\scripts\prepare-autotest-fixtures.ps1 -Plan java-basic-editing
```

The helper uses a shallow, blob-filtered fetch and sparse checkout of only the plan's test project, with up to three attempts for fetch/checkout failures. It refuses to overwrite an existing `vscode-java` sibling; existing local clones can be used as-is. Plans using local fixtures skip the download, and no current plan requires an `eclipse.jdt.ls` clone. When adding a plan that uses an upstream project, update the helper's plan-to-project mapping.

## Workflow

1. Identify the scenario and search `test-plans/*.yaml` for an existing plan that already covers the area.
2. Update the existing plan when possible. Create a new `test-plans/<scenario>.yaml` only when no existing plan fits.
3. Use stable AutoTest actions and deterministic verifiers. Do not add raw Playwright tests or screenshot-only checks.
4. Validate the plan:

```powershell
npx -y @vscjava/vscode-autotest validate test-plans\<name>.yaml
```

5. If validating the current branch, build and package the extension:

```powershell
npm ci   # first time only; on later iterations run just the two commands below
npm run build
npx @vscode/vsce@latest package -o vscode-java-pack-pr.vsix
```

6. Run the plan against the packaged VSIX:

```powershell
npx -y @vscjava/vscode-autotest run test-plans\<name>.yaml --vsix vscode-java-pack-pr.vsix --no-llm
```

7. Inspect `test-results/<name>/results.json` and `test-results/<name>/screenshots/`.
8. Iterate based on the failure cause:
   - **Incorrect plan**: fix the YAML and rerun step 6. No rebuild is needed.
   - **Product code fix**: after editing extension source, re-run step 5 (build + repackage the VSIX) before rerunning step 6. Never rerun against a stale VSIX.
   - **Product bug (report only)**: report the observed behavior and cite the failing step, screenshot, and result reason.

## Authoring rules

- For most plans, use:

```yaml
setup:
  extension: "redhat.java"
  extensions:
    - "vscjava.vscode-java-pack"
  vscodeVersion: "stable"
```

- Use `--vsix vscode-java-pack-pr.vsix` to test current-branch changes.
- Prefer `executeVSCodeCommand` or `run command` for command-driven UI.
- Prefer `verifyWebview` for webview content, `verifyTreeItem` for tree views, `verifyFile` for generated or modified files, `verifyProblems` for diagnostics, and `verifyCompletion` for IntelliSense.
- Use `insertLineInFile` for Java source edits that JDT LS must observe.
- Use `verifyFile` instead of `verifyEditor` after code actions, organize imports, or rename.
- Keep step IDs unique, descriptive, and kebab-case.
- Avoid hard-coded coordinates and brittle DOM structure assumptions.

## CI

The repository workflow `.github/workflows/e2e-autotest.yml` builds a branch VSIX, discovers `test-plans/*.yaml`, runs plans on Windows/Linux/macOS, and uploads `test-results/` artifacts.

Use workflow dispatch when the user asks to validate in CI or across platforms. The `test_plan` input can target a single plan; leave it empty to run all plans.

For `java-gradle`, `java-gradle-java25`, and `java-gradle-java27`, CI uses one Gradle setup and the existing environment-binding mechanism. Java 21/25 helpers read `GRADLE_CI_GRADLE`, their `JAVA21_HOME`/`JAVA25_HOME`, and `AUTOTEST_STAGING_DIR`; the Java 27 helper retains its `JAVA27_CI_GRADLE` contract. CI does not rewrite terminal commands or override the IDE's Gradle home. Actual version, program-output and bytecode assertions remain unchanged. Local helper invocations retain their existing behavior.

For Java 21/25, the same binding exports `ORG_GRADLE_PROJECT_javaRelease` before VS Code starts. Local runs must set that project property as documented in the fixture README. These plans require BSP import, actual Gradle `build`/`run` tasks, and the exact configuration marker in Gradle for Java output; terminal success alone is insufficient. All three Gradle plans reuse the shared artifact collector: terminal diagnostics are staged outside AutoTest's output and archived under `diagnostics/ci/terminal/`, while Gradle/Java output-channel and extension-host logs are archived under `logs/ide/logs/`.
