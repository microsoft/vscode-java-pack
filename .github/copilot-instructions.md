# Copilot instructions for vscode-java-pack

## UI and E2E tests

- When asked to add, update, run, or debug UI/E2E coverage, prefer the AutoTest YAML workflow under `test-plans/`.
- Use the `uitest` skill for UI test work. It should create or update `test-plans/*.yaml`, validate the plan, package the extension when needed, run AutoTest, and inspect `test-results/`.
- Do not create legacy VS Code extension tests for UI coverage unless the user explicitly asks for that format.
- Prefer deterministic AutoTest verifiers (`verifyWebview`, `verifyTreeItem`, `verifyFile`, `verifyProblems`, `verifyCompletion`, `verifyEditorTab`, `verifyTerminal`, `verifyOutputChannel`) over screenshot-only checks.

