# Gradle import fixture

| Plan | Gradle | Daemon/toolchain | Source |
|---|---|---|---|
| `java-gradle` | 8.5 | JDK 21 | `src/java21` |
| `java-gradle-java25` | 9.8.1 | JDK 25 | `src/java25`, including the finalized `ScopedValue` API |

This wrapper-free fixture uses each plan's explicit Gradle version and JVM.
Configuration fails if the importer uses the wrong Gradle/JDK pair.
The plans intentionally do not test wrapper precedence or automatic compatible-JDK
selection; explicit settings avoid conflating those behaviors with import coverage.

Successful IDE import requires freshly generated Gradle project/classpath metadata
(Buildship or the Gradle Build Server importer),
the expected compiler source level, and completion of a Commons Lang API not present
in the fixture source text. Generic keyword completion is not sufficient.
The temporary invalid completion probe is removed and saved before building.

CI installs the matching Gradle CLI and preserves `JAVA21_HOME`/`JAVA25_HOME`.
For local runs, set the applicable variable, put that Gradle version on `PATH`,
and update the plan's JDK paths for your installation. The terminal verifier runs
a clean build, checks the actual Gradle and Java versions, program output and class
file version, and emits its success marker only after all checks pass.
Generated IDE metadata and build logs are not fixture inputs.
