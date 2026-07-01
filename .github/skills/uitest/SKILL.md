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
- When a plan references external sample projects, clone them as siblings of this repo first (CI does this automatically):

```powershell
git clone --depth 1 https://github.com/redhat-developer/vscode-java.git ../vscode-java
git clone --depth 1 https://github.com/eclipse-jdtls/eclipse.jdt.ls.git ../eclipse.jdt.ls
```

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

