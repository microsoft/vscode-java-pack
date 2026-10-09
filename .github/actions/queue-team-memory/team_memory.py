"""Java coordinator provenance adapter for the pinned IssueLens client."""

import argparse
import importlib.util
import json
import os
import re
import tempfile
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

COORDINATOR = "microsoft/vscode-java-pack"
SOURCE_WORKFLOW = ".github/workflows/team-memory-post-merge.yml"
COORDINATOR_WORKFLOW = ".github/workflows/team-memory-coordinator.yml"
SOURCE_INPUTS = ("SOURCE_RUN_ID", "SOURCE_RUN_ATTEMPT", "SOURCE_ARTIFACT_ID")
MAX_SOURCE_BYTES = 64 * 1024
# Reviewed public sources with an existing policy targeting the Java Pack wiki.
SOURCES = {
    COORDINATOR: (104967329, "main"),
    "microsoft/vscode-java-debug": (102584737, "main"),
    "microsoft/vscode-java-test": (110522074, "main"),
    "microsoft/vscode-java-dependency": (129053101, "main"),
    "microsoft/vscode-maven": (116921700, "main"),
    "microsoft/vscode-gradle": (216314492, "develop"),
    "microsoft/java-debug": (102583752, "main"),
    "microsoft/build-server-for-gradle": (626812412, "develop"),
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def positive(value):
    require(re.fullmatch(r"[1-9][0-9]{0,14}", str(value)), "Invalid positive numeric identifier")
    return int(value)


def full_sha(value):
    require(isinstance(value, str) and re.fullmatch(r"[0-9a-f]{40}", value)
            and value != "0" * 40, "Expected a full nonzero commit SHA")
    return value


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, "Duplicate JSON key")
        result[key] = value
    return result


def read_json(path, limit):
    with path.open("rb") as source:
        content = source.read(limit + 1)
    require(len(content) <= limit, "Source JSON exceeds its size limit")
    result = json.loads(content, object_pairs_hook=unique_object)
    require(isinstance(result, dict), "Expected a JSON object")
    return result


def matching_metadata(actual, expected):
    return (isinstance(actual, dict) and actual == expected
            and all(type(actual[key]) is type(value) for key, value in expected.items()))


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def github_read(path, token):
    require(isinstance(token, str) and token.strip(), "Required GitHub token is empty")
    request = urllib.request.Request(
        "https://api.github.com" + path,
        headers={"Authorization": "Bearer " + token, "Accept": "application/vnd.github+json",
                 "Content-Type": "application/json", "X-GitHub-Api-Version": "2022-11-28"},
    )
    with urllib.request.build_opener(NoRedirect()).open(request, timeout=30) as response:
        content = response.read(4 * 1024 * 1024 + 1)
    require(len(content) <= 4 * 1024 * 1024, "GitHub response exceeds its size limit")
    result = json.loads(content, object_pairs_hook=unique_object)
    require(isinstance(result, dict), "Invalid GitHub response")
    return result


def project(repository, token):
    require(repository in SOURCES, "Source repository is not allowlisted")
    identity, branch = SOURCES[repository]
    result = github_read(f"/repos/{repository}", token)
    require(result.get("full_name") == repository and result.get("id") == identity
            and result.get("default_branch") == branch
            and result.get("private") is False and result.get("archived") is False,
            "Repository identity, public visibility, or default branch changed; review the allowlist")
    return result


def workflow_context(repository, workflow, event_name, token):
    require(os.environ["GITHUB_REPOSITORY"] == repository
            and os.environ["GITHUB_EVENT_NAME"] == event_name, "Unexpected workflow context")
    event = read_json(Path(os.environ["GITHUB_EVENT_PATH"]), 32 * 1024 * 1024)
    current = project(repository, token)
    require(isinstance(event.get("repository"), dict)
            and event["repository"].get("full_name") == repository
            and event["repository"].get("id") == current["id"], "Event repository mismatch")
    reference = "refs/heads/" + current["default_branch"]
    require(os.environ["GITHUB_REF"] == reference
            and os.environ["GITHUB_WORKFLOW_REF"] == repository + "/" + workflow + "@" + reference,
            "Run the trusted workflow from the current default branch")
    full_sha(os.environ["GITHUB_WORKFLOW_SHA"])
    return current, event


def source_event_path():
    return Path(os.environ["RUNNER_TEMP"]) / "issuelens-team-memory-source" / "source-event.json"


def outputs(values):
    with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
        for name, value in values.items():
            output.write(f"{name}={value}\n")


def selection():
    repository = os.environ.get("SOURCE_REPOSITORY", "")
    require(repository in SOURCES, "Supply an allowlisted source_repository")
    values = [os.environ.get(name, "") for name in SOURCE_INPUTS]
    manual = os.environ.get("DISPATCH_PR", "")
    require((all(values) and not manual) or (not any(values) and manual),
            "Supply all three source identifiers or one manual PR, not both")
    identifiers = tuple(positive(value) for value in values) if all(values) else None
    if manual:
        positive(manual)
    workflow_context(COORDINATOR, COORDINATOR_WORKFLOW, "workflow_dispatch", os.environ["COORDINATOR_TOKEN"])
    return repository, identifiers


def select_source():
    repository, _ = selection()
    outputs({"source-name": repository.split("/")[1],
             "external": "true" if repository != COORDINATOR else "false"})


def verify_source(repository, current, identifiers):
    run_id, attempt, artifact_id = identifiers
    token = os.environ["GH_TOKEN"]
    run = github_read(f"/repos/{repository}/actions/runs/{run_id}/attempts/{attempt}", token)
    require(type(run.get("id")) is int and run["id"] == run_id
            and type(run.get("run_attempt")) is int and run["run_attempt"] == attempt and run.get("event") == "push"
            and run.get("path") == SOURCE_WORKFLOW and run.get("head_branch") == current["default_branch"]
            and isinstance(run.get("repository"), dict) and run["repository"].get("id") == current["id"]
            and run["repository"].get("full_name") == repository
            and isinstance(run.get("head_repository"), dict) and run["head_repository"].get("id") == current["id"]
            and run["head_repository"].get("full_name") == repository,
            "Source run is not the allowlisted default-branch push workflow")
    head = full_sha(run.get("head_sha"))
    actors = [run.get(name) for name in ("actor", "triggering_actor")]
    require(all(isinstance(actor, dict) and isinstance(actor.get("login"), str)
                and re.fullmatch(r"[A-Za-z0-9-]+(?:\[bot\])?", actor["login"]) for actor in actors),
            "Invalid source run actors")
    artifact = github_read(f"/repos/{repository}/actions/artifacts/{artifact_id}", token)
    origin = artifact.get("workflow_run")
    require(artifact.get("id") == artifact_id and artifact.get("expired") is False
            and artifact.get("name") == f"issuelens-team-memory-source-{attempt}"
            and isinstance(artifact.get("digest"), str)
            and re.fullmatch(r"sha256:[0-9a-f]{64}", artifact["digest"])
            and type(artifact.get("size_in_bytes")) is int and 0 < artifact["size_in_bytes"] <= MAX_SOURCE_BYTES
            and isinstance(origin, dict) and origin.get("id") == run_id
            and origin.get("repository_id") == current["id"] and origin.get("head_repository_id") == current["id"]
            and origin.get("head_branch") == current["default_branch"] and origin.get("head_sha") == head,
            "Source artifact is expired, oversized, lacks a digest, or belongs to a different run")
    created = datetime.fromisoformat(artifact["created_at"].replace("Z", "+00:00"))
    expires = datetime.fromisoformat(artifact["expires_at"].replace("Z", "+00:00"))
    require(created.tzinfo is not None and expires.tzinfo is not None
            and created < expires <= created + timedelta(days=7)
            and created <= datetime.now(timezone.utc) < expires, "Source artifact is outside its seven-day lifetime")
    return {
        "repository": repository, "repository_id": current["id"], "base_ref": current["default_branch"],
        "event_name": "push", "event_action": "push",
        "actor_login": actors[0]["login"], "triggering_actor": actors[1]["login"],
        "workflow_ref": repository + "/" + SOURCE_WORKFLOW + "@refs/heads/" + current["default_branch"],
        "workflow_sha": head, "run_id": run_id, "run_attempt": attempt,
    }


def validate_dispatch():
    repository, identifiers = selection()
    current = project(repository, os.environ["GH_TOKEN"])
    if identifiers is not None:
        verify_source(repository, current, identifiers)
    outputs({"automatic": "true" if identifiers is not None else "false", "source-repository": repository,
             **({"source-run-id": identifiers[0], "source-artifact-id": identifiers[2]} if identifiers else {})})
    print("Validated queued source metadata" if identifiers else "Validated manual source selection")


def load_client():
    spec = importlib.util.spec_from_file_location("issuelens_client", os.environ["ISSUELENS_CLIENT_PATH"])
    require(spec is not None and spec.loader is not None, "Pinned IssueLens client is unavailable")
    client = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(client)
    return client


def coordinator_metadata():
    return {
        "coordinator_repository": COORDINATOR, "coordinator_workflow_ref": os.environ["GITHUB_WORKFLOW_REF"],
        "coordinator_workflow_sha": full_sha(os.environ["GITHUB_WORKFLOW_SHA"]),
        "coordinator_run_id": positive(os.environ["GITHUB_RUN_ID"]),
        "coordinator_run_attempt": positive(os.environ["GITHUB_RUN_ATTEMPT"]),
        "required_wiki_repository": COORDINATOR,
    }


def preflight():
    repository, identifiers = selection()
    current = project(repository, os.environ["GH_TOKEN"])
    central = coordinator_metadata()
    client = load_client()
    client.display_options()
    if identifiers is not None:
        metadata = verify_source(repository, current, identifiers)
        snapshot = read_json(source_event_path(), MAX_SOURCE_BYTES)
        require(set(snapshot) == {"metadata", "event"} and matching_metadata(snapshot["metadata"], metadata),
                "Source artifact metadata does not match the verified run")
        push = snapshot["event"]
        require(isinstance(push, dict)
                and set(push) == {"repository", "ref", "before", "after", "created", "deleted",
                                 "forced", "commits", "head_commit"}
                and push["repository"] == {"id": current["id"], "full_name": repository}
                and isinstance(push["commits"], list)
                and all(isinstance(item, dict) and set(item) == {"id"} for item in push["commits"])
                and push["head_commit"] == {"id": metadata["workflow_sha"]},
                "Invalid identity-only push artifact")
        try:
            envelope = client.prepare_push_memory(repository, current, push, {**metadata, **central})
        except client.SkippedRequest as skipped:
            outputs({"eligible": "false", "status": "skipped", "skip-reason": str(skipped)})
            print(f"No maintenance request: {skipped}")
            return
    else:
        merged = client.read_merged_pr(repository, current, positive(os.environ["DISPATCH_PR"]))
        metadata = {"repository": repository, "repository_id": current["id"], "base_ref": current["default_branch"],
                    "event_name": "workflow_dispatch", "event_action": "workflow_dispatch", **merged, **central}
        envelope = {"metadata": metadata, "request": client.build_team_memory_request(metadata)}
    envelope["request_type"] = "team-memory"
    descriptor, path = tempfile.mkstemp(prefix="issuelens-request-", suffix=".json", dir=os.environ["RUNNER_TEMP"])
    with os.fdopen(descriptor, "w", encoding="utf-8") as request:
        json.dump(envelope, request)
    outputs({"request-path": path, "eligible": "true"})
    print("Prepared bounded Java wiki maintenance request")


def run(command):
    try:
        {"select-source": select_source, "validate-dispatch": validate_dispatch, "preflight": preflight}[command]()
    except ValueError as error:
        raise SystemExit(f"::error::{error}") from None
    except Exception:
        raise SystemExit("::error::Java team-memory validation failed; no agent request was sent") from None


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("select-source", "validate-dispatch", "preflight"))
    run(parser.parse_args().command)
