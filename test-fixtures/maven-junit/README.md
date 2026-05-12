# Maven JUnit Fixture for vscode-java-test

A minimal, self-contained Maven project used by `test-plans/java-test-runner.yaml`.

The upstream `vscode-java/test/resources/projects/maven/salut` project does not
include any `@Test` annotated classes, so `Test: Run All Tests` reports
"No tests have been found in this workspace yet" — the test-runner plan was
silently passing because the deterministic verify only checked that the palette
command ran, not that any tests existed.

This fixture provides one JUnit 5 test class (`CalculatorTest`) so the Java
Test Runner extension can discover, list, and execute it under VS Code.

Why owned by this repo:
- Pin the JUnit version and Maven Surefire configuration that we know works
  with the redhat.java + vscjava.vscode-java-test extensions on stable.
- Avoid future fixture drift in upstream `vscode-java`.
