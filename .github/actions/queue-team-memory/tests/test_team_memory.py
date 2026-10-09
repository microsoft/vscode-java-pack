import copy
import importlib.util
import io
import json
import os
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from email.message import Message
from pathlib import Path
from unittest.mock import Mock, patch

ACTION = Path(__file__).resolve().parents[1]
ROOT = ACTION.parents[2]
spec = importlib.util.spec_from_file_location("java_team_memory", ACTION / "team_memory.py")
action = importlib.util.module_from_spec(spec)
spec.loader.exec_module(action)


class Response:
    def __init__(self, content=b"", status=204):
        self.content = io.BytesIO(content)
        self.status = status
        self.headers = Message()
        self.headers["Content-Type"] = "text/event-stream"

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def readline(self, limit):
        return self.content.readline(limit)


class TeamMemoryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = action.load_client()

    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.repository = "microsoft/vscode-gradle"
        self.before, self.merge, self.after, self.tip = [letter * 40 for letter in "daef"]
        self.project = self.make_project(self.repository)
        self.central = self.make_project(action.COORDINATOR)
        self.environment = {
            "GITHUB_REPOSITORY": action.COORDINATOR, "GITHUB_EVENT_NAME": "workflow_dispatch",
            "GITHUB_REF": "refs/heads/main", "GITHUB_SHA": self.tip, "GITHUB_WORKFLOW_SHA": self.tip,
            "GITHUB_WORKFLOW_REF": action.COORDINATOR + "/" + action.COORDINATOR_WORKFLOW + "@refs/heads/main",
            "GITHUB_ACTOR": "maintainer", "GITHUB_TRIGGERING_ACTOR": "rerunner",
            "GITHUB_RUN_ID": "999", "GITHUB_RUN_ATTEMPT": "1",
            "GITHUB_EVENT_PATH": str(self.directory / "event.json"), "RUNNER_TEMP": str(self.directory),
            "GITHUB_OUTPUT": str(self.directory / "output.txt"),
            "COORDINATOR_TOKEN": "test-coordinator-token", "GH_TOKEN": "test-source-token",
            "DISPATCH_TOKEN": "test-dispatch-token", "SOURCE_REPOSITORY": self.repository,
            "SOURCE_RUN_ID": "123456", "SOURCE_RUN_ATTEMPT": "2", "SOURCE_ARTIFACT_ID": "456",
            "DISPATCH_PR": "", "OUTPUT_MODE": "quiet", "SUMMARY_MODE": "none",
            "AGENT_URL": "https://test.services.ai.azure.com/agents/test/protocols/invocations",
            "AGENT_SCOPE": "api://test/.default",
        }
        self.env_patch = patch.dict(os.environ, self.environment, clear=True)
        self.env_patch.start()
        self.addCleanup(self.env_patch.stop)
        self.write_event({"repository": self.central})
        self.source_run = {
            "id": 123456, "run_attempt": 2, "event": "push", "path": action.SOURCE_WORKFLOW,
            "head_branch": "develop", "head_sha": self.after,
            "repository": self.project, "head_repository": self.project,
            "actor": {"login": "maintainer"}, "triggering_actor": {"login": "rerunner"},
        }
        now = datetime.now(timezone.utc) - timedelta(minutes=1)
        self.artifact = {
            "id": 456, "name": "issuelens-team-memory-source-2", "expired": False, "size_in_bytes": 2048,
            "digest": "sha256:" + "1" * 64, "created_at": now.isoformat(),
            "expires_at": (now + timedelta(days=7)).isoformat(),
            "workflow_run": {
                "id": 123456, "repository_id": self.project["id"], "head_repository_id": self.project["id"],
                "head_branch": "develop", "head_sha": self.after,
            },
        }
        self.metadata = {
            "repository": self.repository, "repository_id": self.project["id"], "base_ref": "develop",
            "event_name": "push", "event_action": "push", "actor_login": "maintainer", "triggering_actor": "rerunner",
            "workflow_ref": self.repository + "/" + action.SOURCE_WORKFLOW + "@refs/heads/develop",
            "workflow_sha": self.after, "run_id": 123456, "run_attempt": 2,
        }
        self.push = {
            "repository": {"id": self.project["id"], "full_name": self.repository}, "ref": "refs/heads/develop",
            "before": self.before, "after": self.after, "created": False, "deleted": False, "forced": False,
            "commits": [{"id": self.merge}, {"id": self.after}], "head_commit": {"id": self.after},
        }
        self.snapshot = {"metadata": self.metadata, "event": self.push}
        self.pull = {
            "number": 27, "merged": True, "state": "closed", "merge_commit_sha": self.merge,
            "merged_at": "2026-10-08T00:00:00Z", "base": {"ref": "develop", "repo": self.project},
        }
        self.comparison = {
            "base_commit": {"sha": self.before}, "merge_base_commit": {"sha": self.before}, "status": "ahead",
            "ahead_by": 2, "behind_by": 0, "total_commits": 2, "commits": [{"sha": self.after}],
        }
        node = {
            "number": 27, "state": "MERGED", "merged": True, "mergedAt": self.pull["merged_at"],
            "baseRefName": "develop", "baseRepository": {"databaseId": self.project["id"], "nameWithOwner": self.repository},
            "mergeCommit": {"oid": self.merge},
        }
        connection = {"totalCount": 1, "pageInfo": {"hasNextPage": False}, "nodes": [node]}
        self.graphql = {"data": {"repository": {
            "databaseId": self.project["id"], "nameWithOwner": self.repository,
            "defaultBranchRef": {"name": "develop", "target": {"oid": self.tip}},
            "c0": {"oid": self.merge, "associatedPullRequests": copy.deepcopy(connection)},
            "c1": {"oid": self.after, "associatedPullRequests": copy.deepcopy(connection)},
        }}}
        self.api_reads = []
        self.mock_read = patch.object(action, "github_read", side_effect=self.api_read).start()
        self.addCleanup(patch.stopall)
        patch.object(self.client, "github_read", side_effect=lambda path, payload=None: self.api_read(
            path, os.environ["GH_TOKEN"], payload)).start()
        patch.object(action, "load_client", return_value=self.client).start()
        self.opener = Mock()
        self.opener.open.return_value = Response()
        patch("urllib.request.build_opener", return_value=self.opener).start()
        self.azure = patch.object(self.client.subprocess, "check_output", return_value="test-azure-token").start()
        self.log = patch("sys.stdout", new_callable=io.StringIO).start()

    def make_project(self, repository):
        identity, branch = action.SOURCES[repository]
        return {"full_name": repository, "id": identity, "default_branch": branch, "private": False, "archived": False}

    def api_read(self, path, token, payload=None):
        self.api_reads.append((path, token, payload))
        responses = {
            f"/repos/{action.COORDINATOR}": self.central, f"/repos/{self.repository}": self.project,
            f"/repos/{self.repository}/actions/runs/123456/attempts/2": self.source_run,
            f"/repos/{self.repository}/actions/artifacts/456": self.artifact,
            f"/repos/{self.repository}/pulls/27": self.pull,
            f"/repos/{self.repository}/compare/{self.before}...{self.after}?per_page=1&page=2": self.comparison,
            "/graphql": self.graphql,
        }
        self.assertIn(path, responses, "Unexpected API access")
        return copy.deepcopy(responses[path])

    def write_event(self, event):
        Path(os.environ["GITHUB_EVENT_PATH"]).write_text(json.dumps(event), encoding="utf-8")

    def write_source(self, content=None):
        path = action.source_event_path()
        path.parent.mkdir(exist_ok=True)
        path.write_bytes(json.dumps(self.snapshot).encode() if content is None else content)
        return path

    def output(self):
        path = Path(os.environ["GITHUB_OUTPUT"])
        return dict(line.split("=", 1) for line in path.read_text().splitlines()) if path.exists() else {}

    def envelope(self):
        return json.loads(Path(self.output()["request-path"]).read_text())

    def select_push(self):
        os.environ.update(
            GITHUB_REPOSITORY=self.repository, GITHUB_EVENT_NAME="push", GITHUB_SHA=self.after,
            GITHUB_WORKFLOW_SHA=self.after, GITHUB_REF="refs/heads/develop",
            GITHUB_WORKFLOW_REF=self.metadata["workflow_ref"], GITHUB_RUN_ID="123456", GITHUB_RUN_ATTEMPT="2",
        )
        self.write_event(self.push)

    def execute(self, command):
        action.run(command)
        self.azure.assert_not_called()

    def test_identity_only_source_excludes_all_untrusted_text_and_tokens(self):
        self.select_push()
        event = copy.deepcopy(self.push)
        event["commits"][0]["message"] = "UNTRUSTED_COMMIT_MESSAGE"
        event["repository"]["description"] = "UNTRUSTED_REPOSITORY_TEXT"
        self.write_event(event)
        self.execute("prepare-dispatch")
        path = Path(self.output()["source-event-path"])
        self.assertEqual(json.loads(path.read_bytes()), self.snapshot)
        self.assertNotIn("UNTRUSTED", path.read_text())
        self.assertNotIn("test-source-token", path.read_text())
        self.opener.open.assert_not_called()

    def test_maximum_inventory_fits_and_matches_upstream_limits(self):
        self.assertEqual(action.MAX_PUSH_COMMITS, self.client.MAX_PUSH_COMMITS)
        self.assertEqual(action.MAX_SOURCE_BYTES, self.client.MAX_SOURCE_BYTES)
        self.select_push()
        event = copy.deepcopy(self.push)
        event["commits"] = [{"id": f"{number:040x}"} for number in range(1, 1000)] + [{"id": self.after}]
        self.write_event(event)
        self.execute("prepare-dispatch")
        self.assertLess(action.source_event_path().stat().st_size, action.MAX_SOURCE_BYTES)

    def test_every_allowlisted_source_uses_its_own_identity_and_default_branch(self):
        original = dict(os.environ)
        for repository, (identity, branch) in action.SOURCES.items():
            with self.subTest(repository=repository), patch.dict(os.environ, {
                **original, "GITHUB_REPOSITORY": repository, "GITHUB_EVENT_NAME": "push",
                "GITHUB_REF": "refs/heads/" + branch, "GITHUB_SHA": self.after, "GITHUB_WORKFLOW_SHA": self.after,
                "GITHUB_WORKFLOW_REF": repository + "/" + action.SOURCE_WORKFLOW + "@refs/heads/" + branch,
            }, clear=True), patch.object(action, "github_read", return_value=self.make_project(repository)):
                self.write_event({**self.push, "repository": {"id": identity, "full_name": repository},
                                  "ref": "refs/heads/" + branch})
                snapshot = action.push_snapshot()
                self.assertEqual(snapshot["metadata"]["repository_id"], identity)
                self.assertEqual(snapshot["metadata"]["base_ref"], branch)
                self.assertEqual(snapshot["event"]["repository"]["full_name"], repository)

    def test_push_rejects_unsafe_or_incomplete_identities(self):
        self.select_push()
        cases = [
            {"forced": True}, {"created": True}, {"deleted": True}, {"before": "0" * 40},
            {"after": self.before}, {"head_commit": {"id": self.merge}}, {"ref": "refs/heads/main"},
            {"commits": []}, {"commits": [{"id": self.after}] * 2},
            {"commits": [{"id": self.after}] * 1001}, {"commits": [{"id": "short"}]},
        ]
        for changes in cases:
            with self.subTest(changes=changes):
                self.write_event({**self.push, **changes})
                with self.assertRaises(SystemExit):
                    self.execute("prepare-dispatch")
                self.assertFalse(action.source_event_path().exists())
                self.assertEqual(self.output(), {})

    def test_push_rejects_wrong_workflow_branch_revision_and_repository(self):
        self.select_push()
        original = dict(os.environ)
        for name, value in (
            ("GITHUB_WORKFLOW_REF", self.repository + "/.github/workflows/untrusted.yml@refs/heads/develop"),
            ("GITHUB_REF", "refs/heads/main"), ("GITHUB_WORKFLOW_SHA", self.tip),
            ("GITHUB_EVENT_NAME", "pull_request"), ("GITHUB_REPOSITORY", "microsoft/vscode-spring-initializr"),
        ):
            with self.subTest(name=name), patch.dict(os.environ, {**original, name: value}, clear=True):
                with self.assertRaises(SystemExit):
                    self.execute("prepare-dispatch")
                self.assertEqual(self.output(), {})

    def test_dispatch_sends_one_post_to_central_main_with_separate_tokens(self):
        self.select_push()
        self.write_source()
        self.execute("dispatch")
        self.assertEqual([(path, token) for path, token, _ in self.api_reads], [
            (f"/repos/{self.repository}", "test-source-token"),
            (f"/repos/{action.COORDINATOR}", "test-dispatch-token"),
        ])
        self.opener.open.assert_called_once()
        request = self.opener.open.call_args.args[0]
        self.assertEqual(request.full_url,
                         f"https://api.github.com/repos/{action.COORDINATOR}/actions/workflows/team-memory-coordinator.yml/dispatches")
        self.assertEqual(request.get_method(), "POST")
        self.assertEqual(json.loads(request.data), {"ref": "main", "inputs": {
            "source_repository": self.repository, "source_run_id": "123456",
            "source_run_attempt": "2", "source_artifact_id": "456",
        }})
        self.assertNotIn(b"test-", request.data)
        self.assertIn("completion is reported by the coordinator", self.log.getvalue())

    def test_dispatch_does_not_retry_ambiguous_failure_or_leak_transport_details(self):
        self.select_push()
        self.write_source()
        self.opener.open.side_effect = OSError("PRIVATE_TRANSPORT_DETAIL")
        with self.assertRaisesRegex(SystemExit, "outcome is unknown"):
            self.execute("dispatch")
        self.opener.open.assert_called_once()
        self.assertNotIn("PRIVATE_TRANSPORT_DETAIL", self.log.getvalue())
        self.assertEqual(self.output(), {})

    def test_explicit_empty_dispatch_token_fails_before_any_network_access(self):
        self.select_push()
        for token in ("", " \t"):
            with self.subTest(token=token), patch.dict(os.environ, {"DISPATCH_TOKEN": token}):
                with self.assertRaisesRegex(SystemExit, "dispatch-token must be non-empty"):
                    self.execute("dispatch")
        self.mock_read.assert_not_called()
        self.opener.open.assert_not_called()

    def test_dispatch_revalidates_the_original_event_not_only_saved_metadata(self):
        self.select_push()
        self.snapshot["event"]["before"] = self.merge
        self.write_source()
        with self.assertRaisesRegex(SystemExit, "Source event changed"):
            self.execute("dispatch")
        self.opener.open.assert_not_called()

    def test_invalid_mixed_and_missing_inputs_fail_before_network(self):
        cases = [
            {"SOURCE_REPOSITORY": ""}, {"SOURCE_REPOSITORY": "microsoft/IssueLens"},
            {"SOURCE_RUN_ID": ""}, {"SOURCE_RUN_ATTEMPT": ""}, {"SOURCE_ARTIFACT_ID": ""},
            {"SOURCE_RUN_ID": "1; unsafe"}, {"SOURCE_RUN_ATTEMPT": "0"}, {"SOURCE_ARTIFACT_ID": "01"},
            {"DISPATCH_PR": "27"}, {name: "" for name in action.SOURCE_INPUTS},
        ]
        for changes in cases:
            with self.subTest(changes=changes), patch.dict(os.environ, changes):
                with self.assertRaises(SystemExit):
                    self.execute("select-source")
        self.mock_read.assert_not_called()

    def test_only_central_default_branch_coordinator_may_select_a_source(self):
        for change in (
            {"GITHUB_REPOSITORY": self.repository}, {"GITHUB_EVENT_NAME": "push"},
            {"GITHUB_REF": "refs/heads/feature"}, {"GITHUB_WORKFLOW_SHA": "short"},
            {"GITHUB_WORKFLOW_REF": action.COORDINATOR + "/.github/workflows/untrusted.yml@refs/heads/main"},
        ):
            with self.subTest(change=change), patch.dict(os.environ, change):
                with self.assertRaises(SystemExit):
                    self.execute("select-source")
        self.assertEqual(self.output(), {})

    def test_source_selection_precedes_external_token_minting(self):
        self.execute("select-source")
        self.assertEqual(self.output(), {"external": "true", "source-name": "vscode-gradle"})
        self.assertEqual(self.api_reads, [(f"/repos/{action.COORDINATOR}", "test-coordinator-token", None)])

    def test_java_pack_manual_source_needs_no_external_credentials(self):
        self.repository = action.COORDINATOR
        self.project = self.central
        self.pull["base"] = {"ref": "main", "repo": self.central}
        os.environ.update({**{name: "" for name in action.SOURCE_INPUTS},
                           "DISPATCH_PR": "27", "SOURCE_REPOSITORY": action.COORDINATOR,
                           "GH_TOKEN": "test-coordinator-token"})
        self.execute("select-source")
        self.assertEqual(self.output(), {"external": "false", "source-name": "vscode-java-pack"})
        Path(os.environ["GITHUB_OUTPUT"]).unlink()
        self.execute("preflight")
        metadata = self.envelope()["metadata"]
        self.assertEqual(metadata["repository"], action.COORDINATOR)
        self.assertEqual(metadata["base_ref"], "main")
        self.assertEqual(metadata["required_wiki_repository"], action.COORDINATOR)
        self.assertTrue(all(token == "test-coordinator-token" for _, token, _ in self.api_reads))

    def test_validates_external_source_run_and_artifact_before_download(self):
        self.execute("validate-dispatch")
        self.assertEqual(self.output(), {
            "automatic": "true", "source-repository": self.repository,
            "source-run-id": "123456", "source-artifact-id": "456",
        })
        self.assertEqual([path for path, _, _ in self.api_reads], [
            f"/repos/{action.COORDINATOR}", f"/repos/{self.repository}",
            f"/repos/{self.repository}/actions/runs/123456/attempts/2",
            f"/repos/{self.repository}/actions/artifacts/456",
        ])
        self.assertTrue(all(token == "test-source-token" for _, token, _ in self.api_reads[1:]))
        self.opener.open.assert_not_called()

    def test_rejects_changed_identity_visibility_or_default_branch(self):
        original = copy.deepcopy(self.project)
        for changes in (
            {"id": original["id"] + 1}, {"full_name": "microsoft/other"}, {"default_branch": "main"},
            {"private": True}, {"private": None}, {"archived": True},
        ):
            with self.subTest(changes=changes):
                self.project = {**original, **changes}
                with self.assertRaises(SystemExit):
                    self.execute("validate-dispatch")
        self.assertFalse(any("/actions/" in path for path, _, _ in self.api_reads))

    def test_forged_run_cannot_proceed_to_artifact_validation(self):
        original = copy.deepcopy(self.source_run)
        for changes in (
            {"id": 123457}, {"run_attempt": 1}, {"event": "workflow_dispatch"}, {"path": "untrusted.yml"},
            {"head_branch": "main"}, {"head_sha": "short"},
            {"repository": self.central}, {"head_repository": self.central},
            {"actor": {"login": "unsafe\nactor"}},
        ):
            with self.subTest(changes=changes):
                self.source_run = {**original, **changes}
                with self.assertRaises(SystemExit):
                    self.execute("validate-dispatch")
        self.assertFalse(any("/artifacts/" in path for path, _, _ in self.api_reads))

    def test_foreign_expired_oversized_or_digestless_artifacts_fail(self):
        original = copy.deepcopy(self.artifact)
        for changes in (
            {"id": 457}, {"name": "issuelens-team-memory-source-1"}, {"expired": True}, {"digest": None},
            {"digest": "short"}, {"size_in_bytes": 0}, {"size_in_bytes": True},
            {"size_in_bytes": action.MAX_SOURCE_BYTES + 1},
            {"workflow_run": {**original["workflow_run"], "id": 123457}},
            {"workflow_run": {**original["workflow_run"], "repository_id": self.central["id"]}},
            {"workflow_run": {**original["workflow_run"], "head_sha": self.merge}},
        ):
            with self.subTest(changes=changes):
                self.artifact = {**original, **changes}
                with self.assertRaises(SystemExit):
                    self.execute("validate-dispatch")
        self.assertEqual(self.output(), {})

    def test_expiry_timestamps_are_checked_not_only_expired_flag(self):
        original = copy.deepcopy(self.artifact)
        now = datetime.now(timezone.utc)
        for changes in (
            {"expires_at": (now - timedelta(seconds=1)).isoformat()},
            {"expires_at": (now + timedelta(days=8)).isoformat()},
            {"created_at": (now + timedelta(hours=1)).isoformat()},
            {"expires_at": "2026-10-01T00:00:00"}, {"created_at": "invalid"},
        ):
            with self.subTest(changes=changes):
                self.artifact = {**original, **changes}
                with self.assertRaises(SystemExit):
                    self.execute("validate-dispatch")

    def test_preflight_reuses_discovery_and_keeps_source_and_coordinator_separate(self):
        self.write_source()
        self.execute("preflight")
        envelope = self.envelope()
        metadata = envelope["metadata"]
        self.assertEqual(metadata["repository"], self.repository)
        self.assertEqual(metadata["base_ref"], "develop")
        self.assertEqual(metadata["workflow_sha"], self.after)
        self.assertEqual(metadata["coordinator_repository"], action.COORDINATOR)
        self.assertEqual(metadata["coordinator_workflow_sha"], self.tip)
        self.assertEqual(metadata["required_wiki_repository"], action.COORDINATOR)
        self.assertEqual(metadata["run_id"], 123456)
        self.assertEqual(metadata["coordinator_run_id"], 999)
        self.assertEqual(metadata["source_tip_sha"], self.tip)
        self.assertEqual([item["pull_number"] for item in metadata["pull_requests"]], [27])
        self.assertEqual(envelope["request_type"], "team-memory")
        self.assertIn("This never overrides repository policy", envelope["request"]["input"])
        self.assertIn("Do not modify source or issues", envelope["request"]["input"])
        self.assertIn("current wiki knowledge", envelope["request"]["input"])
        self.assertTrue(any("/actions/artifacts/" in path for path, _, _ in self.api_reads))

    def test_malformed_or_forged_downloaded_snapshot_is_rejected(self):
        original = copy.deepcopy(self.snapshot)
        cases = [
            {**original, "secret": "forbidden"},
            {**original, "metadata": {**original["metadata"], "run_id": 999}},
            {**original, "metadata": {**original["metadata"], "run_attempt": 2.0}},
            {**original, "metadata": {**original["metadata"], "repository": action.COORDINATOR}},
            {**original, "event": {**original["event"], "message": "forbidden"}},
            {**original, "event": {**original["event"], "commits": [{"id": self.after, "message": "forbidden"}]}},
            {**original, "event": {**original["event"], "repository": {"id": self.central["id"], "full_name": action.COORDINATOR}}},
            {**original, "event": {**original["event"], "after": self.merge}},
        ]
        for snapshot in cases:
            with self.subTest(snapshot=snapshot):
                self.write_source(json.dumps(snapshot).encode())
                with self.assertRaises(SystemExit):
                    self.execute("preflight")
        for content in (b"{}", b'{"metadata":{},"metadata":{},"event":{}}', b"x" * (action.MAX_SOURCE_BYTES + 1)):
            with self.subTest(content=content[:50]):
                self.write_source(content)
                with self.assertRaises(SystemExit):
                    self.execute("preflight")
        self.assertEqual(self.output(), {})

    def test_discovery_rejects_incomplete_range_and_association_pagination(self):
        self.write_source()
        self.comparison["total_commits"] = 3
        with self.assertRaisesRegex(SystemExit, "complete fast-forward"):
            self.execute("preflight")
        self.comparison["total_commits"] = 2
        self.graphql["data"]["repository"]["c0"]["associatedPullRequests"]["pageInfo"]["hasNextPage"] = True
        with self.assertRaisesRegex(SystemExit, "associations are incomplete"):
            self.execute("preflight")
        self.assertEqual(self.output(), {})

    def test_rebased_merge_uses_pinned_rest_revalidation(self):
        self.write_source()
        for key in ("c0", "c1"):
            self.graphql["data"]["repository"][key]["associatedPullRequests"]["nodes"][0]["mergeCommit"] = None
        self.execute("preflight")
        self.assertEqual(self.envelope()["metadata"]["pull_requests"][0]["merge_commit_sha"], self.merge)
        self.assertEqual(sum(path.endswith("/pulls/27") for path, _, _ in self.api_reads), 1)

    def test_no_merged_pr_is_an_explicit_skip_before_login(self):
        self.write_source()
        for key in ("c0", "c1"):
            self.graphql["data"]["repository"][key]["associatedPullRequests"] = {
                "totalCount": 0, "pageInfo": {"hasNextPage": False}, "nodes": [],
            }
        self.execute("preflight")
        self.assertEqual(self.output(), {"eligible": "false", "status": "skipped", "skip-reason": "no_merged_pull_requests"})

    def test_manual_external_pr_uses_source_default_branch_and_same_wiki(self):
        os.environ.update({**{name: "" for name in action.SOURCE_INPUTS}, "DISPATCH_PR": "27"})
        self.execute("validate-dispatch")
        self.assertEqual(self.output(), {"automatic": "false", "source-repository": self.repository})
        Path(os.environ["GITHUB_OUTPUT"]).unlink()
        self.execute("preflight")
        metadata = self.envelope()["metadata"]
        self.assertEqual(metadata["repository"], self.repository)
        self.assertEqual(metadata["base_ref"], "develop")
        self.assertEqual(metadata["pull_number"], 27)
        self.assertEqual(metadata["required_wiki_repository"], action.COORDINATOR)
        self.assertNotIn("workflow_sha", metadata)
        self.assertFalse(any("/actions/" in path for path, _, _ in self.api_reads))

    def test_manual_unmerged_or_wrong_source_pr_is_rejected(self):
        os.environ.update({**{name: "" for name in action.SOURCE_INPUTS}, "DISPATCH_PR": "27"})
        original = copy.deepcopy(self.pull)
        for changes in (
            {"merged": False}, {"state": "open"}, {"merge_commit_sha": "short"},
            {"base": {"ref": "main", "repo": self.project}},
            {"base": {"ref": "develop", "repo": self.central}},
        ):
            with self.subTest(changes=changes):
                self.pull = {**original, **changes}
                with self.assertRaises(SystemExit):
                    self.execute("preflight")
        self.assertEqual(self.output(), {})

    def result(self, status="no-change"):
        return {
            "source_repository": self.repository, "push_before": self.before, "push_after": self.after,
            "status": status, "wiki_repository": action.COORDINATOR, "wiki_sha": "b" * 40,
            "reason": "Verified source and wiki", "results": [
                {"pull_number": 27, "merge_commit_sha": self.merge, "status": status, "reason": "Verified"},
            ],
        }

    def submit(self, result, done=True):
        os.environ["REQUEST_PATH"] = self.output()["request-path"]
        stream = 'data: ' + json.dumps({"type": "assistant.message", "data": {"content": json.dumps(result)}}) + "\n\n"
        if done:
            stream += 'event: done\ndata: {"invocation_id":"test","session_id":"test"}\n\n'
        self.opener.open.return_value = Response(stream.encode())
        self.client.run("submit")

    def test_completed_stream_with_valid_receipt_is_required_for_success(self):
        self.write_source()
        self.execute("preflight")
        self.submit(self.result())
        self.assertEqual(self.output()["status"], "no-change")
        self.assertEqual(self.output()["wiki-repository"], action.COORDINATOR)
        self.opener.open.assert_called_once()

    def test_stream_completion_alone_wrong_wiki_missing_pr_or_receipt_is_not_success(self):
        self.write_source()
        self.execute("preflight")
        original = self.result()
        for changes in (
            {"wiki_repository": "microsoft/IssueLens"}, {"wiki_sha": None}, {"results": []},
            {"source_repository": action.COORDINATOR}, {"push_after": self.merge}, {"status": "completed"},
        ):
            with self.subTest(changes=changes):
                with self.assertRaises(SystemExit):
                    self.submit({**original, **changes})
                self.assertNotIn("status", self.output())

    def test_incomplete_stream_fails_without_retry(self):
        self.write_source()
        self.execute("preflight")
        with self.assertRaisesRegex(SystemExit, "completion event"):
            self.submit(self.result(), done=False)
        self.opener.open.assert_called_once()
        self.assertNotIn("status", self.output())

    def test_failed_or_partial_batch_does_not_claim_whole_batch_success(self):
        self.write_source()
        self.execute("preflight")
        with self.assertRaisesRegex(SystemExit, "batch incomplete"):
            self.submit(self.result("failed"))
        self.assertEqual(self.output()["status"], "failed")
        self.opener.open.assert_called_once()

    def test_partial_publication_is_reported_but_fails_the_coordinator(self):
        self.write_source()
        connection = self.graphql["data"]["repository"]["c1"]["associatedPullRequests"]
        connection["nodes"].append({**copy.deepcopy(connection["nodes"][0]),
                                    "number": 28, "mergeCommit": {"oid": self.after}})
        connection["totalCount"] = 2
        self.execute("preflight")
        result = self.result()
        result["status"] = "partial"
        result["results"].append({"pull_number": 28, "merge_commit_sha": self.after,
                                  "status": "needs-review", "reason": "Incomplete evidence"})
        with self.assertRaisesRegex(SystemExit, "batch incomplete"):
            self.submit(result)
        self.assertEqual(self.output()["status"], "partial")
        self.assertEqual(self.output()["wiki-repository"], action.COORDINATOR)
        self.opener.open.assert_called_once()


class WiringTests(unittest.TestCase):
    def test_only_verified_sources_are_allowlisted(self):
        self.assertEqual(len(action.SOURCES), 8)
        self.assertNotIn("microsoft/vscode-spring-initializr", action.SOURCES)
        self.assertNotIn("microsoft/vscode-spring-boot-dashboard", action.SOURCES)
        self.assertEqual(action.SOURCES["microsoft/build-server-for-gradle"][1], "develop")

    def test_workflows_share_new_opt_in_and_only_coordinator_invokes(self):
        source = (ROOT / ".github/workflows/team-memory-post-merge.yml").read_text()
        central = (ROOT / ".github/workflows/team-memory-coordinator.yml").read_text()
        composite = (ACTION / "action.yml").read_text()
        for workflow in (source, central):
            self.assertIn("ISSUELENS_TEAM_MEMORY_COORDINATOR_ENABLED == 'true'", workflow)
            self.assertNotIn("ISSUELENS_TEAM_MEMORY_ENABLED", workflow)
            self.assertIn("permissions: {}", workflow)
            self.assertIn("persist-credentials: false", workflow)
        self.assertNotIn("concurrency:", source)
        self.assertNotIn("workflow_dispatch:", source)
        for text in (source, composite):
            self.assertNotIn("azure/login", text)
            self.assertNotIn("agent-url", text)
            self.assertNotIn("id-token:", text)
        self.assertIn("group: issuelens-team-memory-wiki-microsoft-vscode-java-pack", central)
        self.assertIn("queue: max\n  cancel-in-progress: false", central)
        self.assertIn("digest-mismatch: error", central)
        self.assertNotIn("steps.source-token.outputs.token || github.token", central)
        self.assertIn("repository: ${{ steps.source.outputs.source-repository }}", central)
        self.assertLess(central.index("validate-dispatch"), central.index("actions/download-artifact@"))
        self.assertLess(central.index("team_memory.py preflight"), central.index("azure/login@"))
        self.assertIn('python3 -I "$ISSUELENS_CLIENT_PATH" submit', central)
        self.assertIn("retention-days: 7", composite)
        self.assertIn("GH_TOKEN: ${{ inputs.source-token }}", composite)
        self.assertIn("DISPATCH_TOKEN: ${{ inputs.dispatch-token }}", composite)

    def test_client_pin_matches_coordinator_tests_and_documentation(self):
        revision = "4175ea71e170938826fb847e6bd5108f0f5597cf"
        for relative in (".github/workflows/team-memory-coordinator.yml", ".github/workflows/team-memory-tests.yml"):
            self.assertIn("ref: " + revision, (ROOT / relative).read_text())
        self.assertIn(revision, (ACTION / "README.md").read_text())


if __name__ == "__main__":
    unittest.main()
