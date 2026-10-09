# Java team-memory coordinator

Java Pack hosts the single queue for the `microsoft/vscode-java-pack` wiki.
The [push caller](../../workflows/team-memory-post-merge.yml) only preserves
source identities and dispatches the [coordinator](../../workflows/team-memory-coordinator.yml).
Manual reconciliation now runs through the coordinator too, not the old push
workflow. No source caller logs in to Azure or invokes the agent.

Both workflows require **`ISSUELENS_TEAM_MEMORY_COORDINATOR_ENABLED=true`**.
This is a new, disabled-by-default repository variable: the existing
`ISSUELENS_TEAM_MEMORY_ENABLED` does not enable this rollout. This PR does not
change variables, credentials, App installations, Azure access, or agent
deployments. Verify the prerequisites below before a separately authorized
enablement. Issue-loop and direct-task consumers are unchanged.

## Source trust and scope

The reviewed allowlist in `team_memory.py` binds names, numeric repository IDs,
public visibility, and default branches. These sources currently configure
`instructions.team_memory.wiki_repository: microsoft/vscode-java-pack`:

| Source | Default branch | Reviewed policy snapshot |
| --- | --- | --- |
| `microsoft/vscode-java-pack` | `main` | [0823dbde](https://github.com/microsoft/vscode-java-pack/blob/0823dbde1947de111c39890fc095f55c0ff0d258/.github/issuelens.yml) |
| `microsoft/vscode-java-debug` | `main` | [3705df0d](https://github.com/microsoft/vscode-java-debug/blob/3705df0d0b1215b044e759647e50e4caa231e5b6/.github/issuelens.yml) |
| `microsoft/vscode-java-test` | `main` | [cff6fdb4](https://github.com/microsoft/vscode-java-test/blob/cff6fdb4b5e3221a4e88473d2f90e1fd58f1061c/.github/issuelens.yml) |
| `microsoft/vscode-java-dependency` | `main` | [eb3fba04](https://github.com/microsoft/vscode-java-dependency/blob/eb3fba04f2763416b25833d92df4fb0210a9d668/.github/issuelens.yml) |
| `microsoft/vscode-maven` | `main` | [eee9eb0b](https://github.com/microsoft/vscode-maven/blob/eee9eb0b49b8b5bdd4a479646d700340a2b37cbd/.github/issuelens.yml) |
| `microsoft/vscode-gradle` | `develop` | [1a544c91](https://github.com/microsoft/vscode-gradle/blob/1a544c917399ead6c23251301a041e505c0a6926/.github/issuelens.yml) |
| `microsoft/java-debug` | `main` | [bcae605a](https://github.com/microsoft/java-debug/blob/bcae605a6240f11b447163a614e215721c11b107/.github/issuelens.yml) |
| `microsoft/build-server-for-gradle` | `develop` | [ab37cca9](https://github.com/microsoft/build-server-for-gradle/blob/ab37cca97693c60e90d257ce9eb6e9575da7e6f1/.github/issuelens.yml) |

The two Spring repositories are not included: they currently have no
`.github/issuelens.yml` policy. An allowlist entry is not a source migration or
authorization to ignore policy. Only Java Pack's caller changes in this PR.
Other repositories must adopt this action in separate reviewed PRs.
Renames, transfers, branch changes, or private sources require another review.

The hosted agent must resolve each source's policy and privacy constraints,
verify that its validated destination is this wiki, and stop rather than
override a conflicting policy. Requests explicitly require this destination;
the pinned client's final receipt validator rejects any other wiki. Neither
the dispatch action nor its allowlist grants wiki write access.

## Future external callers

Use `.github/workflows/team-memory-post-merge.yml` on the source's **actual
default branch**, gated by its own opt-in variable, with job permissions
`contents: read` and `actions: write`. No source checkout or copied Python is
needed for a remote reference:

```yaml
- name: Queue Java team-memory update
  uses: microsoft/vscode-java-pack/.github/actions/queue-team-memory@FULL_REVIEWED_COMMIT_SHA
  with:
    source-token: ${{ github.token }}
    dispatch-token: ${{ steps.dispatch-token.outputs.token }}
```

Replace the placeholder with the reviewed, merged 40-character revision of
this action; do not use a moving branch. The caller must obtain
`steps.dispatch-token.outputs.token` using a **dedicated dispatch GitHub App**,
restricted to Java Pack with **Actions write**. The read and dispatch tokens
are separate inputs. An explicitly empty token fails; it never falls back.
Do not distribute the hosted IssueLens App's private key to source workflows.
A source repository's `GITHUB_TOKEN` remains repository-scoped regardless of
its `actions: write` permission. Java Pack's own caller can use its token for
both inputs without new credentials.

## Coordinator prerequisites

- Existing central Azure OIDC configuration and secrets: `AZURE_CLIENT_ID`,
  `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `ISSUELENS_AGENT_URL`, and
  `ISSUELENS_AGENT_SCOPE`. Their existing names are preserved; secret presence
  does not establish that the identity or endpoint is ready.
- For external sources, a separate read-only GitHub App installation covering
  the selected allowlisted source, with **Actions read, Contents read, and
  Pull requests read**. Configure central secrets
  `ISSUELENS_SOURCE_READ_APP_CLIENT_ID` and
  `ISSUELENS_SOURCE_READ_APP_PRIVATE_KEY`. The workflow mints an ephemeral,
  single-source token only after validating source selection and revokes it at
  job end. Java Pack requests use its own `GITHUB_TOKEN` instead. Source-read
  and dispatch installations may differ and must mint separate tokens.
- The existing hosted IssueLens identity must independently have permission
  to read the source and publish to the Java Pack wiki, with its normal
  policy/privacy and wiki snapshot-precondition enforcement. Do not broaden
  its source-code/issue write permissions for this feature.

The new App secrets are setup prerequisites, not assumed existing credentials.
No live invocation is required to validate these repository changes.

## Verification and outcomes

Automatic dispatch requires explicit `source_repository`, `source_run_id`,
`source_run_attempt`, and `source_artifact_id`. Manual dispatch supplies
`source_repository` and one `pull_request_number`, with all three automatic
identifiers empty. Mixed or incomplete requests fail before source access.
All runs use the same fixed wiki concurrency group, `queue: max`, and
`cancel-in-progress: false`, including validation, discovery, invocation, and
final receipt verification. GitHub supports one active run and at most 100
pending runs in this queue; it is not an unlimited or guaranteed-delivery queue.
See GitHub's [concurrency documentation](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
for the `queue: max` contract.

The dispatcher accepts only a trusted, non-created/non-deleted/non-forced
default-branch push from the exact source workflow. Its artifact contains
repository/run/workflow identities, before/after SHAs, and commit IDs only:
no commit messages, bodies, code, credentials, or agent output. It is capped
at 64 KiB and 1,000 commits and retained for seven days.

Before downloading, the coordinator authenticates source run/attempt and
artifact metadata, repository IDs, workflow, branch, actors, digest, expiry,
and size. Pinned artifact download enforces the digest. Preflight repeats the
metadata checks, validates the downloaded identity-only schema, and reuses
IssueLens's complete bounded push/PR discovery and merge revalidation. The
client is pinned to the actual merged revision of
[microsoft/IssueLens#50](https://github.com/microsoft/IssueLens/pull/50),
`4175ea71e170938826fb847e6bd5108f0f5597cf`. Only the small Java provenance
adapter is local; request, stream, discovery, and receipt machinery is not
copied or monkey-patched. The pilot's IssueLens-only coordinator adapter is
deliberately not called.

Requests preserve source and coordinator identities separately, require
current-source/wiki comparison, and authorize wiki knowledge writes only.
A successful SSE stream or accepted dispatch is **not successful publication**.
The pinned client validates every PR outcome and the wiki identity/SHA;
partial, failed, needs-review, missing, or wrong-wiki receipts fail the job.
No merged PRs is an explicit preflight skip before Azure login.

There is one dispatch POST and one agent submission, without automatic retries.
An uploaded artifact does not prove accepted dispatch. On ambiguous dispatch,
timeout, or agent/write outcome, inspect coordinator runs and confirmed wiki
state before manually reconciling through this queue. It does not serialize
chat/direct/external writers or prove a timed-out hosted invocation stopped.

## Offline checks

With the pinned IssueLens action files available locally, set
`ISSUELENS_CLIENT_PATH` to their `issuelens_action.py` and run:

```text
python -m unittest discover -s .github/actions/queue-team-memory/tests
```

The focused CI workflow loads the same immutable client revision. These checks
use fake API/stream responses and make no dispatch, Azure, or wiki calls.
