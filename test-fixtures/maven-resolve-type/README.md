# Maven Resolve Unknown Type — Test Fixture

This fixture is consumed by `test-plans/java-maven-resolve-type.yaml`.

It is a minimal self-contained Maven project intentionally configured with
JDK 11 compliance (`<release>11</release>`), so JDT runs full semantic
analysis under the JDK 21 toolchain that the E2E workflow installs. This
avoids the historical problem of using fixtures with `<source>1.7</source>`,
which causes JDT to emit only syntactic warnings (e.g. "compiler
compliance 1.7 but JRE 11 is used") and silently skip semantic
diagnostics — making the `Gson cannot be resolved to a type` error never
surface and breaking the `Resolve unknown type` Code Action assertion.

The plan inserts `Gson gson;` into `App.java`, expects JDT to publish the
unresolved-type diagnostic, and then exercises `vscode-maven`'s
`Resolve unknown type` Code Action.
