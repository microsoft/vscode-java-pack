# Java 27 UI test fixture

This small project is shared by five AutoTest plans:

| Plan | Coverage |
| --- | --- |
| `java-maven-java27` | Maven import with Java 27 source compliance, clean compilation and execution |
| `java-gradle-java27` | Gradle 9.8.1 import/toolchain with Java 27, clean compilation and execution |
| `java27-primitive-patterns` | Primitive patterns in `switch`, `instanceof`, and nested record patterns (JEP 532) |
| `java27-api` | `LazyConstant` and the Java 27 `Set.ofLazy` preview API (JEP 531), including completion |
| `java27-preview` | Editing the Maven preview setting: enabled, disabled with diagnostics/build failure, and enabled again |

Both build files target **release 27** and enable preview. Each plan explicitly
enables only its intended Java importer, so the presence of both build files
does not make the import type ambiguous. The language server uses its normal
runtime (vscode-java 1.57.0 bundles JDK 25); the project runtime is registered
separately as `JavaSE-27`. The import plans explicitly generate JDT metadata at
the project root to assert source compliance. The API plan requests completion
for `Set.ofL`, keeping `ofLazy` visible in VS Code's virtualized suggestion list.

The fixture also includes the JDT preview preferences required for Gradle
projects: Gradle's `--enable-preview` compiler argument alone does not enable
preview analysis in the IDE. This follows the
[vscode-java preview configuration guide](https://github.com/redhat-developer/vscode-java/wiki/Enabling-Java-preview-features).
Maven derives its preview setting from `pom.xml`; the preview-toggle plan
verifies that setting it to false overrides the initially enabled state.

The E2E workflow provisions JDK 27 for these plans, sets `JAVA27_HOME`, rewrites
the plan's JDK path for Linux/macOS, and installs Gradle 9.8.1 for the Gradle
plan. Existing plans keep their original JDK setup.

`verify.mjs` runs inside the VS Code terminal. It requires JDK 27, checks the
build exit status and Java 27 class-file version, and asserts exact application
output before printing a success marker. The marker is not part of the sent
terminal command, so echoed input cannot satisfy the terminal verifier.
Compiler/runtime logs are written to `.autotest/` in the isolated workspace.
The preview-disabled case requires a real preview-disabled compiler diagnostic,
not just any nonzero build exit code.

For `java-gradle-java27`, CI also exports `JAVA27_DIAGNOSTICS_DIR` and
`JAVA27_CI_GRADLE`. The helper keeps its original PATH-based Gradle invocation
and persists its actual terminal Node/PATH/JDK identity, command exit metadata,
and full compiler/runtime output outside AutoTest's temporary worktree.
Gradle builds additionally use `--stacktrace --info`, not `--debug`.
After a failed PATH-based build, a labelled control uses the absolute
CI-provisioned Gradle with the same arguments, workspace and JDK, and checks
Java 27 bytecode and execution. The control never replaces the original failure
or prints the plan's success marker.

The workflow prints the terminal logs in Actions and includes them with the
CI toolchain identity and Gradle/Java/extension-host logs under
`toolchains/java-gradle-java27/` in each existing results artifact. For release
comparisons, use `test_plan=java-gradle-java27`, `pre_release=false`, and an exact
vscode-java release URL in `vsix_urls`; keep the failed run's release unchanged
when isolating a toolchain failure.

For local runs, install Maven, JDK 27, and Gradle 9.8.1, set `JAVA27_HOME`, and
adjust the plan's `JavaSE-27` runtime path if necessary. Run with the platform
VSIX from redhat-developer/vscode-java v1.57.0, or another release whose JDT
supports Java 27 preview features:

```powershell
$env:JAVA27_HOME = 'C:\Program Files\Java\jdk-27'
npx -y @vscjava/vscode-autotest run test-plans\java27-api.yaml --vsix java-win32-x64-1.57.0-1095.vsix --no-llm
```

AutoTest creates Git worktrees from `HEAD`; fixture changes must be included in
the tested checkout, or a non-Git copy of this fixture must be supplied through
`--override workspace=<copy>`.
