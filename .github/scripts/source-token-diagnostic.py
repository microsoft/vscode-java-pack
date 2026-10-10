"""Isolated read-only experiment; never invokes IssueLens or changes source state."""

import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request

PIN = "a81d2d96167fc0e69ac631c2edc85f858e693289"
COORDINATOR = "microsoft/vscode-java-pack"
REF = "refs/heads/chagong-public-source-token-diagnostic"
WORKFLOW = ".github/workflows/team-memory-coordinator.yml"
SOURCE_WORKFLOW = ".github/workflows/team-memory-post-merge.yml"
MAX_COMMITS = 1000
MAX_RESPONSE = 4 * 1024 * 1024
DISCOVERY_SECONDS = 180
CASES = (
    ("microsoft/vscode-java-debug", 102584737, "main", 38035350789, "65ff83e0392a8e0d3ed40ca283f6968b3bd34313", 1708),
    ("microsoft/java-debug", 102583752, "main", 38035350981, "ebbe6db9046ffdfbb2c89408fa0e924bebb47434", 638),
    ("microsoft/vscode-java-test", 110522074, "main", 38035351006, "e01f7e0ee79f42a5d9f3e56e5a6dd523a63c0591", 1941),
    ("microsoft/build-server-for-gradle", 626812412, "develop", 38035350973, "977a64d63921e51fba0194ae81f50883a9431524", 238),
    ("microsoft/vscode-java-dependency", 129053101, "main", 38035351138, "16eed355bff237b4a8e844063683e18a877c3157", 1106),
    ("microsoft/vscode-maven", 116921700, "main", 38035350856, "d83e339b4a1cbeb7ba3f39fbabce179786909a23", 1224),
)


class DiagnosticFailure(Exception):
    pass


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def require(condition, message):
    if not condition:
        raise DiagnosticFailure(message)


def full_sha(value):
    require(isinstance(value, str) and re.fullmatch(r"[0-9a-f]{40}", value)
            and value != "0" * 40, "Expected a full nonzero commit SHA")
    return value


def positive(value):
    require(type(value) is int and 0 < value < 10**15, "Invalid positive numeric identifier")
    return value


def identity(value, repository, identifier, id_key="id", name_key="full_name"):
    require(isinstance(value, dict) and type(value.get(id_key)) is int
            and value[id_key] == identifier and isinstance(value.get(name_key), str)
            and value[name_key].lower() == repository.lower(), "Repository identity mismatch")


def validate_range(comparison, before, count):
    require(isinstance(comparison.get("base_commit"), dict)
            and isinstance(comparison.get("merge_base_commit"), dict)
            and comparison["base_commit"].get("sha") == before
            and comparison["merge_base_commit"].get("sha") == before
            and comparison.get("status") == "ahead"
            and type(comparison.get("behind_by")) is int and comparison["behind_by"] == 0
            and type(comparison.get("ahead_by")) is int and comparison["ahead_by"] == count
            and type(comparison.get("total_commits")) is int and comparison["total_commits"] == count,
            "Range is not a complete fast-forward inventory")


class Probe:
    def __init__(self, repository, token, rows):
        self.repository = repository
        self.token = token
        self.rows = rows
        self.deadline = time.monotonic() + DISCOVERY_SECONDS
        self.statuses = []

    def read(self, path, payload=None):
        remaining = self.deadline - time.monotonic()
        require(remaining > 0, "Discovery exceeded its 180-second budget")
        require(path == f"/repos/{self.repository}" or path.startswith(f"/repos/{self.repository}/")
                or path == "/graphql",
                "Request is outside this source")
        require(payload is None or (path == "/graphql" and set(payload) == {"query", "variables"}
                                    and payload["query"].startswith("query(")),
                "Only REST GET and GraphQL queries are permitted")
        request = urllib.request.Request(
            "https://api.github.com" + path,
            data=None if payload is None else json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": "Bearer " + self.token,
                "Accept": "application/vnd.github+json",
                "Content-Type": "application/json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        method = "GET" if payload is None else "POST (query)"
        try:
            with urllib.request.build_opener(NoRedirect()).open(request, timeout=min(30, remaining)) as response:
                status = response.status
                self.statuses.append(str(status))
                print(f"{self.repository}: {method} {path}: HTTP {status}", flush=True)
                data = response.read(MAX_RESPONSE + 1)
        except urllib.error.HTTPError as error:
            self.statuses.append(str(error.code))
            print(f"{self.repository}: {method} {path}: HTTP {error.code}", flush=True)
            error.close()
            raise DiagnosticFailure(f"HTTP {error.code}; no redirect, retry, or fallback") from None
        except (urllib.error.URLError, TimeoutError, ConnectionError) as error:
            self.statuses.append("transport-error")
            raise DiagnosticFailure(f"Transport failure ({type(error).__name__}); no retry") from None
        require(status == 200, f"Unexpected HTTP {status}")
        require(len(data) <= MAX_RESPONSE, "Response exceeds the 4-MiB preflight limit")
        require(time.monotonic() < self.deadline, "Discovery exceeded its 180-second budget")
        try:
            result = json.loads(data)
        except (json.JSONDecodeError, UnicodeDecodeError):
            raise DiagnosticFailure("Invalid JSON response") from None
        require(isinstance(result, dict), "Invalid GitHub response")
        return result

    def record(self, family, outcome, detail):
        row = (self.repository, family, ", ".join(self.statuses) or "-", outcome, detail)
        self.rows.append(row)
        print(f"{self.repository}: {family}: {outcome}: {detail}", flush=True)

    def run(self, family, operation):
        self.statuses = []
        try:
            result = operation()
        except DiagnosticFailure as error:
            self.record(family, "FAIL", str(error))
            return None
        except (KeyError, TypeError, AttributeError, IndexError) as error:
            self.record(family, "FAIL", f"Invalid response shape ({type(error).__name__})")
            return None
        self.record(family, "PASS", "HTTP and semantic checks passed")
        return result

    def skip(self, family, detail):
        self.statuses = []
        self.record(family, "SKIP", detail)


def check_repository(probe, identifier, branch):
    project = probe.read(f"/repos/{probe.repository}")
    identity(project, probe.repository, identifier)
    require(project["full_name"] == probe.repository and project.get("default_branch") == branch
            and project.get("visibility") == "public", "Canonical name, default branch, or visibility mismatch")
    return project


def check_run(probe, identifier, branch, run, after):
    source = probe.read(f"/repos/{probe.repository}/actions/runs/{run}/attempts/1")
    require(type(source.get("id")) is int and source["id"] == run
            and type(source.get("run_attempt")) is int and source["run_attempt"] == 1
            and source.get("event") == "push" and source.get("path") == SOURCE_WORKFLOW
            and source.get("head_sha") == after and source.get("head_branch") == branch,
            "Source run ID, attempt, workflow path, event, or head/default identity mismatch")
    identity(source.get("repository"), probe.repository, identifier)
    identity(source.get("head_repository"), probe.repository, identifier)
    for key in ("actor", "triggering_actor"):
        actor = source.get(key)
        require(isinstance(actor, dict) and isinstance(actor.get("login"), str)
                and re.fullmatch(r"[A-Za-z0-9-]+(?:\[bot\])?", actor["login"]), "Invalid source run actor")
    return source


def merge_parent(probe, after):
    commit = probe.read(f"/repos/{probe.repository}/commits/{after}")
    require(commit.get("sha") == after and isinstance(commit.get("parents"), list)
            and len(commit["parents"]) > 0, "Merge SHA or first parent unavailable")
    before = full_sha(commit["parents"][0].get("sha"))
    require(before != after, "Requested range is empty")
    print(f"{probe.repository}: requested before={before}; after={after}; first parent, NOT original push provenance")
    return before


def read_pull(probe, identifier, branch, number):
    pull = probe.read(f"/repos/{probe.repository}/pulls/{number}")
    require(type(pull.get("number")) is int and pull["number"] == number
            and pull.get("merged") is True and pull.get("state") == "closed", "Selected PR is not merged")
    base = pull.get("base")
    require(isinstance(base, dict) and base.get("ref") == branch, "PR default base branch mismatch")
    identity(base.get("repo"), probe.repository, identifier)
    full_sha(pull.get("merge_commit_sha"))
    require(isinstance(pull.get("merged_at"), str) and 0 < len(pull["merged_at"]) <= 64,
            "Merged PR has no bounded merge timestamp")
    return pull


def check_pull(probe, identifier, branch, number, after):
    pull = read_pull(probe, identifier, branch, number)
    require(pull["merge_commit_sha"] == after, "Trusted PR merge SHA mismatch")
    return pull


def branch_tip(probe, branch):
    tip = probe.read(f"/repos/{probe.repository}/branches/{urllib.parse.quote(branch, safe='')}")
    require(tip.get("name") == branch and isinstance(tip.get("commit"), dict), "Default branch identity mismatch")
    sha = full_sha(tip["commit"].get("sha"))
    print(f"{probe.repository}: current default tip={sha}")
    return sha


def check_ancestry(probe, after, tip):
    comparison = probe.read(f"/repos/{probe.repository}/compare/{after}...{tip}?per_page=1&page=2")
    count = comparison.get("total_commits")
    require(type(count) is int and count > 0, "Source head is not an ancestor of current default branch")
    validate_range(comparison, after, count)
    return count


def inventory(probe, before, after):
    count, shas = None, []
    for page in range(1, MAX_COMMITS // 100 + 1):
        comparison = probe.read(f"/repos/{probe.repository}/compare/{before}...{after}?per_page=100&page={page}")
        if count is None:
            count = comparison.get("total_commits")
            require(type(count) is int and 0 < count <= MAX_COMMITS, "Range empty or exceeds 1000 commits")
        validate_range(comparison, before, count)
        commits = comparison.get("commits")
        require(isinstance(commits, list) and len(commits) == min(100, count - len(shas))
                and all(isinstance(commit, dict) for commit in commits), "Incomplete commit pagination")
        shas.extend(full_sha(commit.get("sha")) for commit in commits)
        require(len(set(shas)) == len(shas) and before not in shas, "Duplicate or invalid inventory identities")
        if len(shas) == count:
            require(after in shas, "Inventory does not contain source run head")
            print(f"{probe.repository}: complete requested inventory={count} commits")
            return shas
    raise DiagnosticFailure("Incomplete commit pagination")


def associations(probe, identifier, branch, after, number, shas, tip, selected_pull):
    owner, name = probe.repository.split("/", 1)
    pulls, rest_merges = {}, {}
    if selected_pull is not None:
        rest_merges[number] = selected_pull
    for offset in range(0, len(shas), 20):
        batch = shas[offset:offset + 20]
        selections = " ".join(
            f"c{index}: object(oid: {json.dumps(sha)}) {{ ... on Commit {{ oid "
            "associatedPullRequests(first:100) { totalCount pageInfo { hasNextPage } nodes { "
            "number state merged mergedAt baseRefName baseRepository { databaseId nameWithOwner } "
            "mergeCommit { oid } } } } }"
            for index, sha in enumerate(batch)
        )
        response = probe.read("/graphql", {
            "query": "query($owner:String!,$name:String!) { repository(owner:$owner,name:$name) { "
                     "databaseId nameWithOwner defaultBranchRef { name target { oid } } " + selections + " } }",
            "variables": {"owner": owner, "name": name},
        })
        if response.get("errors"):
            errors = response["errors"]
            require(isinstance(errors, list) and all(isinstance(error, dict) for error in errors),
                    "Invalid GraphQL error shape")
            types = sorted({error.get("type", "UNSPECIFIED") for error in errors
                            if isinstance(error.get("type", "UNSPECIFIED"), str)
                            and re.fullmatch(r"[A-Z_]{1,64}", error.get("type", "UNSPECIFIED"))})
            denied = any("Resource not accessible by integration" in str(error.get("message", ""))
                         for error in errors)
            raise DiagnosticFailure(f"GraphQL errors: {','.join(types) or 'UNSPECIFIED'}; integration access denial={denied}")
        require(isinstance(response.get("data"), dict), "Missing GraphQL data")
        resolved = response["data"].get("repository")
        identity(resolved, probe.repository, identifier, "databaseId", "nameWithOwner")
        default = resolved.get("defaultBranchRef")
        require(isinstance(default, dict) and default.get("name") == branch
                and isinstance(default.get("target"), dict), "GraphQL default branch identity unavailable")
        current_tip = full_sha(default["target"].get("oid"))
        require(tip is None or current_tip == tip, "Default branch changed during discovery")
        for index, sha in enumerate(batch):
            commit = resolved.get(f"c{index}")
            require(isinstance(commit, dict) and commit.get("oid") == sha
                    and isinstance(commit.get("associatedPullRequests"), dict), "Missing or different GraphQL commit")
            connection = commit["associatedPullRequests"]
            nodes = connection.get("nodes")
            require(isinstance(nodes, list) and len(nodes) <= 100
                    and type(connection.get("totalCount")) is int and connection["totalCount"] == len(nodes)
                    and isinstance(connection.get("pageInfo"), dict)
                    and connection["pageInfo"].get("hasNextPage") is False, "Incomplete PR associations")
            for pull in nodes:
                require(isinstance(pull, dict), "Invalid associated PR metadata")
                identity(pull.get("baseRepository"), probe.repository, identifier, "databaseId", "nameWithOwner")
                pull_number = positive(pull.get("number"))
                require(type(pull.get("merged")) is bool and pull.get("state") in {"OPEN", "CLOSED", "MERGED"}
                        and pull["merged"] == (pull["state"] == "MERGED")
                        and isinstance(pull.get("baseRefName"), str), "Invalid associated PR state")
                if not pull["merged"] or pull["baseRefName"] != branch:
                    continue
                require("mergeCommit" in pull, "Missing mergeCommit metadata")
                merge = pull["mergeCommit"]
                if merge is None:
                    if pull_number not in rest_merges:
                        require(len(rest_merges) < 100, "PR fallback lookup limit exceeded")
                        rest_merges[pull_number] = read_pull(probe, identifier, branch, pull_number)
                    rest = rest_merges[pull_number]
                    require(rest["merged_at"] == pull.get("mergedAt"), "Fallback PR merge identity changed")
                    merge_sha = rest["merge_commit_sha"]
                else:
                    require(isinstance(merge, dict), "Invalid mergeCommit metadata")
                    merge_sha = full_sha(merge.get("oid"))
                if merge_sha not in shas:
                    continue
                require(isinstance(pull.get("mergedAt"), str) and 0 < len(pull["mergedAt"]) <= 64,
                        "Missing bounded PR merge timestamp")
                item = (merge_sha, pull["mergedAt"])
                require(pull_number not in pulls or pulls[pull_number] == item, "Associated PR identity changed")
                pulls[pull_number] = item
                require(len(pulls) <= 100, "PR batch limit exceeded")
    require(time.monotonic() < probe.deadline, "Discovery exceeded its 180-second budget")
    require(number in pulls and pulls[number][0] == after, "Trusted merged PR absent from GraphQL inventory")
    require(selected_pull is None or pulls[number][1] == selected_pull["merged_at"], "REST/GraphQL timestamp mismatch")
    return pulls


def summary(rows):
    lines = [
        "# Public source built-in GITHUB_TOKEN diagnostic",
        f"Reviewed source: microsoft/IssueLens@{PIN}",
        f"Diagnostic SHA: {os.environ['GITHUB_SHA']}",
        f"Workflow ref: {os.environ['GITHUB_WORKFLOW_REF']}",
        "Token: this job's github.token; contents:read, actions:read, pull-requests:read; no id-token permission.",
        "No retries, redirects, anonymous fallback, alternative token, Azure login, IssueLens invocation, or business writes.",
        "Requested before is the merge commit's first parent, not attested original push provenance.",
        "",
        "| Source | Read family | HTTP | Result | Validation |",
        "|---|---|---|---|---|",
    ]
    lines.extend("| " + " | ".join(row) + " |" for row in rows)
    failures = sum(row[3] == "FAIL" for row in rows)
    lines.append(f"\nValidation failures: {failures}.")
    text = "\n".join(lines) + "\n"
    print(text)
    with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as output:
        output.write(text)
    return 1 if failures else 0


def main():
    require(os.environ.get("GITHUB_ACTIONS") == "true"
            and os.environ.get("GITHUB_REPOSITORY") == COORDINATOR
            and os.environ.get("GITHUB_REF") == REF
            and os.environ.get("GITHUB_EVENT_NAME") == "workflow_dispatch"
            and os.environ.get("GITHUB_WORKFLOW_REF") == f"{COORDINATOR}/{WORKFLOW}@{REF}",
            "Unexpected diagnostic execution context")
    sha = full_sha(os.environ.get("GITHUB_SHA"))
    require(os.environ.get("GITHUB_WORKFLOW_SHA") == sha, "Workflow is not from immutable diagnostic commit")
    token = os.environ.get("SOURCE_GH_TOKEN", "")
    require(re.fullmatch(r"[\x21-\x7e]{1,4096}", token), "Built-in token is missing or invalid")
    print(f"Diagnostic commit={sha}; ref={REF}; built-in job token only", flush=True)
    rows = []
    central = Probe(COORDINATOR, token, rows)
    central.run("repository", lambda: check_repository(central, 104967329, "main"))
    for repository, identifier, branch, run, after, number in CASES:
        probe = Probe(repository, token, rows)
        print(f"\nSOURCE {repository}: ID={identifier}; default={branch}; run={run}/attempt1; PR={number}; merge={after}")
        probe.run("repository", lambda: check_repository(probe, identifier, branch))
        probe.run("run attempt", lambda: check_run(probe, identifier, branch, run, after))
        before = probe.run("merge first parent (diagnostic)", lambda: merge_parent(probe, after))
        pull = probe.run("merged PR REST", lambda: check_pull(probe, identifier, branch, number, after))
        tip = probe.run("default branch", lambda: branch_tip(probe, branch))
        if tip is None:
            probe.skip("current-tip ancestry", "BLOCKED: current default tip unavailable")
        elif tip == after:
            probe.skip("current-tip ancestry", "Not needed: source head equals current default tip")
        else:
            probe.run("current-tip ancestry", lambda: check_ancestry(probe, after, tip))
        if before is None:
            probe.skip("complete requested range", "BLOCKED: requested first parent unavailable")
            shas = None
        else:
            shas = probe.run("complete requested range", lambda: inventory(probe, before, after))
        if shas is None:
            print(f"{repository}: testing trusted merge GraphQL query only; complete range remains unverified")
        probe.run("GraphQL commit-to-PR", lambda: associations(
            probe, identifier, branch, after, number, shas if shas is not None else [after], tip, pull))
    return summary(rows)


if __name__ == "__main__":
    raise SystemExit(main())
