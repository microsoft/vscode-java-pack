# Go to Super Implementation — Test Fixture

This fixture is consumed by `test-plans/java-go-to-super-implementation.yaml`.

It is a minimal self-contained Maven project intentionally configured with
JDK 11 compliance (`<release>11</release>`), so JDT runs full semantic
analysis under the JDK 21 toolchain that the E2E workflow installs.

`Derived` extends `Base` and overrides `greet()`. Hovering the overriding
`greet()` method renders vscode-java's "Go to super implementation" hover
link; the test plan clicks it and verifies navigation to `Base#greet()`.

Regression coverage for redhat-developer/vscode-java#4438, where the
"Go to super implementation" hover link was not a clickable link.
