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

CI exports a case-specific `JAVA27_DIAGNOSTICS_DIR` for all five Java 27 plans,
under the external staging directory, so Maven as well as Gradle compiler/runtime
logs and command metadata survive temporary workspace cleanup and output initialization.
For `java-gradle-java27`, CI also exports
`JAVA27_CI_GRADLE`. When `GITHUB_ACTIONS=true` or `CI=true`, the helper requires
an absolute `JAVA27_CI_GRADLE` and uses that executable for the actual build
instead of resolving Gradle from the terminal's PATH. Missing or relative CI
paths fail explicitly, even when diagnostics are disabled; a failed CI build
does not retry with PATH Gradle. Node, the existing JDK 27 configuration and
terminal profiles are unchanged.

The helper persists its actual terminal Node/PATH/JDK identity, selected Gradle
command, command exit metadata, and full compiler/runtime output outside
AutoTest's temporary worktree. It records both PATH Gradle and CI Gradle
versions so macOS PATH reordering remains visible without affecting the build.
Gradle builds additionally use `--stacktrace --info`, not `--debug`.
Local runs keep their original PATH-based invocation. When local diagnostics
are enabled, a failed PATH-based build runs a labelled control using the absolute
CI-provisioned Gradle with the same arguments, workspace and JDK, and checks
Java 27 bytecode and execution. The control never replaces the original failure
or prints the plan's success marker. CI already uses that executable for the
primary build and does not run a duplicate control after failure.

Gradle preparation only resolves the provisioned executable, verifies version
9.8.1 and binds it for the terminal helper. Version output is saved under
`diagnostics/ci/gradle-version.log`, not printed into the workflow log.
For release comparisons, use `test_plan=java-gradle-java27`, `pre_release=false`, and an exact
vscode-java release URL in `vsix_urls`; keep the failed run's release unchanged
when isolating a toolchain failure.

Every E2E case enables AutoTest file logging through the CI CLI flags and writes
all final output under `test-results/<plan>/`. AutoTest's shared
`test-plans/config/artifacts.yaml` configuration declares the files to archive;
the workflow generates toolchain diagnostics but delegates file selection,
copying and indexing to the published collector (available since 0.7.34).
The configuration stays in a subdirectory so nonrecursive `test-plans/*.yaml`
discovery includes only executable UI plans.
The workflow resolves `@latest` once and uses that release in every job.
Its existing `results-<plan>-<os>` artifact contains:

| Path in the artifact | Contents |
| --- | --- |
| `results.json`, `screenshots/`, `analysis/`, `evidence/` | Verdicts, screenshots, per-case LLM analysis and deterministic diagnostic evidence |
| `artifacts/manifest.json` | Collection status, source configuration hashes, missing/deferred sources, errors, omissions, sizes and SHA-256 hashes |
| `logs/` | AutoTest console and launch/failure logs, plus bounded diagnostic evidence |
| `logs/console/console.log` | Final externally redirected CLI stdout/stderr |
| `logs/ide/logs/`, `logs/jdtls/User/workspaceStorage/` | Full VS Code/extension-host and hidden JDT LS logs, preserving the root-relative directory tree |
| `logs/display/xvfb.log`, `logs/crashes/` | Linux virtual-display output or current-run macOS crash reports, when available |
| `diagnostics/ci/ci-toolchain.json` | CI Node/Java/Gradle paths, project runtime and PATH |
| `diagnostics/ci/*-version.log` | CI Node/Java version probes and the selected Gradle version |
| `diagnostics/ci/terminal/` | Java 27 compiler/runtime logs, terminal toolchain identity and process exit metadata |
| `diagnostics/workspace/.autotest/` | Declared runtime-workspace log/JSON snapshots taken before cleanup |

Actions prints only the exit status and collection summary; detailed console output
and diagnostics remain in the artifact. Collection and upload run after
failures too, including when startup stops before `results.json` exists.
Pre-run logs are staged outside AutoTest's output directory until collection,
because AutoTest clears that directory when a run starts.
Artifact names and the per-case LLM/evidence/verdict behavior are unchanged.
Run-phase sources are archived after VS Code shutdown, before workspace cleanup;
their bounded `evidence: tail` excerpts feed the existing case analysis.
Console, display and native reports are supplemented by the unconditional
`autotest collect` command without rewriting results or saved analysis.
CI declares test-electron's persistent `.vscode-test/user-data` root explicitly
so post-run collection can recover available IDE/JDT logs after a native runner
exit. Product paths stay in consumer configuration, not in AutoTest.
Native reports require the collector's persisted run start; a run that never
started cannot claim historical reports. Optional missing sources are visible
in the manifest. I/O, invalid text and size/count errors fail collection
independently of the original test exit code.
Text archives use AutoTest's redaction, with default limits of 1,000 files,
50 MiB per source file and 200 MiB stored total; omissions are explicit,
not silent truncation. Full archives remain separate from bounded LLM input.
The Gradle import, primitive-pattern and webview migration plans use the same
case-local runner-log layout for local runs. The first two retain verbose Java LSP
tracing; the primitive-patterns helper's lifecycle log is included in
`logs/ide/logs/`. macOS crash collection applies to every case, not only webviews.

The primitive-patterns plan loads the test-only extension in
`../java27-autotest-support`; it is excluded from the pack VSIX. For its temporary
unresolved type, the extension closes all target-file tabs, waits for the actual
VS Code text-document close event, and awaits a Java `getProjectSettings`
request before writing the source once. JDT handles `didClose` synchronously,
so the subsequent request/response on the same standard-server connection
provides the server-close barrier without a fixed sleep or a JVM agent.
It then creates a new text-document lifecycle, checks its full text against
disk, awaits another server round trip, and requires the target file's specific
unresolved-type diagnostic with no additional incremental insertion.

This case deliberately tests full-file reloading, not continuous editor edits:
the previous disk-write plus `File: Revert File` could race JDT's clean-buffer
disk reload and apply the same insertion twice. One additional output-channel
check waits for the helper's successful completion; the existing file-content,
one-error, deletion/save zero-error, and compiler/runtime assertions remain.
Failure logs contain the lifecycle phase and target diagnostics rather than
silently falling back to Revert. Other plans retain `insertLineInFile`.
The request barrier confirms document processing, not a versioned diagnostics
acknowledgement; Java diagnostics do not carry a document version.

Release metadata lookup uses the workflow's read-only `GITHUB_TOKEN` to avoid
shared-runner anonymous API limits. Asset downloads do not forward that token.

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
