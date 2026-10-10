import copy
import importlib.util
import io
import json
import os
import subprocess
import tempfile
import unittest
from email.message import Message
from pathlib import Path
from unittest.mock import Mock, patch

import yaml

ROOT = Path(__file__).resolve().parents[4]
SHARED = Path(os.environ["ISSUELENS_ACTIONS_PATH"]).resolve()
PIN = "a81d2d96167fc0e69ac631c2edc85f858e693289"
COORDINATOR = "microsoft/vscode-java-pack"


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def read_yaml(path):
    return yaml.load(path.read_text(encoding="utf-8"), Loader=yaml.BaseLoader)


invoker = load(SHARED / "issuelens" / "issuelens_action.py", "shared_invoker")
dispatcher = load(SHARED / "queue-team-memory" / "dispatch.py", "shared_dispatcher")
source_workflow = read_yaml(ROOT / ".github" / "workflows" / "team-memory-post-merge.yml")
central_workflow = read_yaml(ROOT / ".github" / "workflows" / "team-memory-coordinator.yml")
source_job = source_workflow["jobs"]["dispatch"]
central_job = central_workflow["jobs"]["reconcile"]
ALLOWED = json.loads(central_job["env"]["ISSUELENS_SOURCE_REPOSITORIES"])


class Response:
    def __init__(self, content=b"", status=200):
        self.content = io.BytesIO(content)
        self.status = status
        self.headers = Message()
        self.headers["Content-Type"] = "text/event-stream"

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self, limit):
        return self.content.read(limit)

    def readline(self, limit):
        return self.content.readline(limit)


class ContractTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.before, self.merge, self.after, self.tip = [letter * 40 for letter in "daef"]
        self.source = "microsoft/vscode-gradle"
        self.central = self.project(COORDINATOR)
        self.source_project = self.project(self.source)
        self.environment = {
            "GITHUB_REPOSITORY": COORDINATOR, "GITHUB_EVENT_NAME": "workflow_dispatch",
            "GITHUB_REF": "refs/heads/main", "GITHUB_SHA": self.tip, "GITHUB_WORKFLOW_SHA": self.tip,
            "GITHUB_WORKFLOW_REF": COORDINATOR + "/.github/workflows/team-memory-coordinator.yml@refs/heads/main",
            "GITHUB_ACTOR": "maintainer", "GITHUB_TRIGGERING_ACTOR": "rerunner",
            "GITHUB_RUN_ID": "999", "GITHUB_RUN_ATTEMPT": "1",
            "GITHUB_EVENT_PATH": str(self.directory / "event.json"), "RUNNER_TEMP": str(self.directory),
            "GITHUB_OUTPUT": str(self.directory / "output.txt"),
            "GH_TOKEN": "test-coordinator-token", "SOURCE_GH_TOKEN": "test-source-token",
            "SOURCE_REPOSITORY": self.source, "SOURCE_REPOSITORIES": json.dumps(ALLOWED),
            "SOURCE_RUN_ID": "123456", "SOURCE_RUN_ATTEMPT": "2",
            "PUSH_BEFORE": self.before, "PUSH_AFTER": self.after, "DISPATCH_PR": "",
            "REQUEST_TYPE": "team-memory", "TASK_INPUT": "", "OUTPUT_MODE": "quiet", "SUMMARY_MODE": "none",
            "AGENT_URL": "https://test.services.ai.azure.com/agents/test/protocols/invocations",
            "AGENT_SCOPE": "api://test/.default", "DISPATCH_TOKEN": "test-dispatch-token",
            "COORDINATOR_REPOSITORY": COORDINATOR, "COORDINATOR_WORKFLOW": "team-memory-coordinator.yml",
            "COORDINATOR_REF": "main",
        }
        self.env_patch = patch.dict(os.environ, self.environment, clear=True)
        self.env_patch.start()
        self.addCleanup(self.env_patch.stop)
        Path(os.environ["GITHUB_EVENT_PATH"]).write_text(json.dumps({"repository": self.central}))
        self.source_run = {
            "id": 123456, "run_attempt": 2, "event": "push", "path": invoker.DISPATCH_WORKFLOW,
            "head_branch": "develop", "head_sha": self.after, "repository": self.source_project,
            "head_repository": self.source_project, "actor": {"login": "maintainer"},
            "triggering_actor": {"login": "rerunner"},
        }
        self.branch = {"name": "develop", "commit": {"sha": self.tip}}
        self.ancestry = self.comparison(self.after, 1)
        self.inventory = self.comparison(self.before, 2, [self.merge, self.after])
        self.pull = {
            "number": 27, "merged": True, "state": "closed", "merge_commit_sha": self.merge,
            "merged_at": "2026-10-09T00:00:00Z", "base": {"ref": "develop", "repo": self.source_project},
        }
        self.graphql = self.associations([self.merge, self.after])
        self.target_workflow = {"id": 789, "path": ".github/workflows/team-memory-coordinator.yml", "state": "active"}
        self.target_branch = {"name": "main", "commit": {"sha": self.tip}}
        self.submit_response = Response()
        self.requests = []
        self.opener = Mock()
        self.opener.open.side_effect = self.respond
        self.patches = [
            patch("urllib.request.build_opener", return_value=self.opener),
            patch.object(invoker.subprocess, "check_output", return_value="test-azure-token"),
            patch("sys.stdout", new_callable=io.StringIO),
        ]
        _, self.azure, self.log = [item.start() for item in self.patches]
        for item in self.patches:
            self.addCleanup(item.stop)

    def project(self, name):
        branch = "develop" if name in {"microsoft/vscode-gradle", "microsoft/build-server-for-gradle"} else "main"
        return {"id": ALLOWED[name], "full_name": name, "default_branch": branch, "visibility": "public"}

    def comparison(self, before, count, shas=()):
        return {"base_commit": {"sha": before}, "merge_base_commit": {"sha": before},
                "status": "ahead", "ahead_by": count, "behind_by": 0, "total_commits": count,
                "commits": [{"sha": sha} for sha in shas]}

    def associations(self, shas):
        result = {"databaseId": self.source_project["id"], "nameWithOwner": self.source,
                  "defaultBranchRef": {"name": self.source_project["default_branch"], "target": {"oid": self.tip}}}
        for index, sha in enumerate(shas):
            node = {"number": 27, "state": "MERGED", "merged": True, "mergedAt": self.pull["merged_at"],
                    "baseRefName": self.source_project["default_branch"],
                    "baseRepository": {"databaseId": self.source_project["id"], "nameWithOwner": self.source},
                    "mergeCommit": {"oid": self.merge}}
            result[f"c{index}"] = {"oid": sha, "associatedPullRequests": {
                "totalCount": 1, "pageInfo": {"hasNextPage": False}, "nodes": [node]}}
        return {"data": {"repository": result}}

    def select_source(self, name):
        self.source = name
        self.source_project = self.project(name)
        os.environ["SOURCE_REPOSITORY"] = name
        self.source_run.update(repository=self.source_project, head_repository=self.source_project,
                               head_branch=self.source_project["default_branch"])
        self.branch["name"] = self.source_project["default_branch"]
        self.pull["base"] = {"ref": self.source_project["default_branch"], "repo": self.source_project}
        self.graphql = self.associations([self.merge, self.after])

    def respond(self, request, timeout):
        self.requests.append(request)
        path = request.full_url.removeprefix("https://api.github.com")
        if request.full_url == os.environ["AGENT_URL"]:
            return self.submit_response
        if path.endswith("/dispatches"):
            return Response(status=204)
        responses = {
            f"/repos/{COORDINATOR}": self.central, f"/repos/{self.source}": self.source_project,
            f"/repos/{COORDINATOR}/actions/workflows/team-memory-coordinator.yml": self.target_workflow,
            f"/repos/{COORDINATOR}/branches/main": self.target_branch,
            f"/repos/{self.source}/actions/runs/123456/attempts/2": self.source_run,
            f"/repos/{self.source}/branches/{self.source_project['default_branch']}": self.branch,
            f"/repos/{self.source}/compare/{self.after}...{self.tip}?per_page=1&page=2": self.ancestry,
            f"/repos/{self.source}/compare/{self.before}...{self.after}?per_page=100&page=1": self.inventory,
            f"/repos/{self.source}/pulls/27": self.pull, "/graphql": self.graphql,
        }
        self.assertIn(path, responses, "Unexpected network path")
        return Response(json.dumps(responses[path]).encode())

    def outputs(self):
        path = Path(os.environ["GITHUB_OUTPUT"])
        return dict(line.split("=", 1) for line in path.read_text().splitlines()) if path.exists() else {}

    def preflight(self):
        invoker.run("preflight")
        self.azure.assert_not_called()
        self.assertFalse(any(request.get_method() == "POST" and not request.full_url.endswith("/graphql")
                             for request in self.requests))
        return json.loads(Path(self.outputs()["request-path"]).read_text()) if self.outputs().get("eligible") == "true" else None

    def dispatch_inputs(self):
        content = source_job["steps"][0]["with"]["workflow-inputs"]
        replacements = {"github.repository": self.source, "github.run_id": "123456", "github.run_attempt": "2",
                        "github.event.before": self.before, "github.sha": self.after}
        for name, value in replacements.items():
            content = content.replace("${{ " + name + " }}", value)
        return content

    def test_source_main_and_develop_dispatch_scalar_inputs_to_central_main(self):
        for name in (COORDINATOR, "microsoft/vscode-gradle"):
            with self.subTest(source=name):
                self.select_source(name)
                self.requests.clear()
                os.environ["WORKFLOW_INPUTS"] = self.dispatch_inputs()
                dispatcher.run()
                posted, = [request for request in self.requests if request.get_method() == "POST"]
                self.assertEqual(json.loads(posted.data), {"ref": "main", "inputs": {
                    "source_repository": name, "source_run_id": "123456", "source_run_attempt": "2",
                    "push_before": self.before, "push_after": self.after,
                }})
                self.assertEqual(len(self.requests), 4)
                self.assertTrue(all(request.get_header("Authorization") == "Bearer test-dispatch-token"
                                    for request in self.requests))
                self.azure.assert_not_called()

    def test_generic_dispatch_payload_drives_shared_invocation_without_artifacts(self):
        os.environ["WORKFLOW_INPUTS"] = self.dispatch_inputs()
        dispatcher.run()
        inputs = json.loads(self.requests[-1].data)["inputs"]
        os.environ.update({name.upper(): value for name, value in inputs.items()})
        self.requests.clear()
        metadata = self.preflight()["metadata"]
        self.assertEqual(metadata["repository"], self.source)
        self.assertEqual(metadata["required_wiki_repository"], COORDINATOR)
        self.assertEqual(metadata["range_origin"], "authorized-reconciliation")
        self.assertFalse(any("artifact" in request.full_url for request in self.requests))

    def test_dispatch_ambiguous_post_has_no_retry_or_completion_claim(self):
        os.environ["WORKFLOW_INPUTS"] = self.dispatch_inputs()
        original = self.respond

        def fail_post(request, timeout):
            if request.get_method() == "POST":
                self.requests.append(request)
                raise OSError("PRIVATE_TRANSPORT_DETAIL")
            return original(request, timeout)

        self.opener.open.side_effect = fail_post
        with self.assertRaisesRegex(SystemExit, "outcome is unknown"):
            dispatcher.run()
        self.assertEqual(sum(request.get_method() == "POST" for request in self.requests), 1)
        self.assertNotIn("PRIVATE_TRANSPORT_DETAIL", self.log.getvalue())
        self.assertEqual(self.outputs(), {})

    def test_dispatch_empty_token_and_invalid_payloads_fail_before_network(self):
        for changes in ({"DISPATCH_TOKEN": ""}, {"WORKFLOW_INPUTS": '{"run":1}'},
                        {"WORKFLOW_INPUTS": '{"run":"1","run":"2"}'},
                        {"WORKFLOW_INPUTS": "\u20ac" * 22000}, {"COORDINATOR_WORKFLOW": "../bad.yml"}):
            with self.subTest(changes=changes), patch.dict(os.environ, changes), self.assertRaises(SystemExit):
                dispatcher.run()
        self.opener.open.assert_not_called()

    def test_inactive_target_workflow_or_wrong_branch_cannot_dispatch(self):
        os.environ["WORKFLOW_INPUTS"] = self.dispatch_inputs()
        self.target_workflow["state"] = "disabled_manually"
        with self.assertRaisesRegex(SystemExit, "workflow is inactive"):
            dispatcher.run()
        self.target_workflow["state"] = "active"
        self.target_branch["name"] = "develop"
        with self.assertRaisesRegex(SystemExit, "branch identity"):
            dispatcher.run()
        self.assertFalse(any(request.get_method() == "POST" for request in self.requests))

    def test_all_eight_trusted_ids_use_current_source_default_branch(self):
        for name, identity in ALLOWED.items():
            with self.subTest(source=name):
                self.select_source(name)
                metadata = self.preflight()["metadata"]
                self.assertEqual(metadata["repository_id"], identity)
                self.assertEqual(metadata["base_ref"], self.source_project["default_branch"])
                self.assertEqual(metadata["coordinator_repository"], COORDINATOR)
                self.assertEqual(metadata["required_wiki_repository"], COORDINATOR)

    def test_source_and_coordinator_identity_and_read_credentials_stay_separate(self):
        envelope = self.preflight()
        metadata = envelope["metadata"]
        self.assertEqual(metadata["workflow_sha"], self.after)
        self.assertEqual(metadata["coordinator_workflow_sha"], self.tip)
        self.assertEqual(metadata["run_id"], 123456)
        self.assertEqual(metadata["coordinator_run_id"], 999)
        self.assertEqual(self.requests[0].get_header("Authorization"), "Bearer test-coordinator-token")
        self.assertTrue(all(request.get_header("Authorization") == "Bearer test-source-token"
                            for request in self.requests[1:]))
        self.assertNotIn("test-source-token", json.dumps(envelope))
        self.assertIn("This never overrides repository policy", envelope["request"]["input"])
        self.assertIn("Do not modify source or issues", envelope["request"]["input"])

    def test_requested_before_is_an_ancestor_selection_not_original_push_proof(self):
        requested = "c" * 40
        os.environ["PUSH_BEFORE"] = requested
        self.before = requested
        self.inventory = self.comparison(requested, 2, [self.merge, self.after])
        envelope = self.preflight()
        self.assertEqual(envelope["metadata"]["push_before"], requested)
        self.assertIn("not an attestation of the original push boundary", envelope["request"]["input"])
        self.assertEqual(set(invoker.SOURCE_INPUTS), {"SOURCE_RUN_ID", "SOURCE_RUN_ATTEMPT", "PUSH_BEFORE", "PUSH_AFTER"})

    def test_unknown_source_mixed_inputs_and_empty_source_token_fail_before_network(self):
        for changes in ({"SOURCE_REPOSITORY": "microsoft/IssueLens"}, {"SOURCE_RUN_ID": ""},
                        {"SOURCE_RUN_ATTEMPT": "0"}, {"PUSH_BEFORE": ""}, {"PUSH_AFTER": "short"},
                        {"PUSH_BEFORE": self.after}, {"DISPATCH_PR": "27"},
                        {"SOURCE_GH_TOKEN": ""}, {"SOURCE_GH_TOKEN": "bad\ncredential"}):
            with self.subTest(changes=changes), patch.dict(os.environ, changes), self.assertRaises(SystemExit):
                self.preflight()
        self.opener.open.assert_not_called()

    def test_changed_source_id_canonical_name_or_private_visibility_is_rejected(self):
        original = copy.deepcopy(self.source_project)
        for changes in ({"id": original["id"] + 1}, {"full_name": "microsoft/renamed"},
                        {"visibility": "private"}, {"visibility": "internal"}):
            with self.subTest(changes=changes):
                self.source_project = {**original, **changes}
                with self.assertRaises(SystemExit):
                    self.preflight()
        self.assertFalse(any("/actions/runs/" in request.full_url for request in self.requests))

    def test_forged_source_run_attempt_workflow_head_or_branch_cannot_invoke(self):
        original = copy.deepcopy(self.source_run)
        for changes in ({"id": 123457}, {"run_attempt": 1}, {"event": "pull_request"},
                        {"path": ".github/workflows/untrusted.yml"}, {"head_sha": self.tip},
                        {"head_branch": "main"}, {"head_repository": self.central}):
            with self.subTest(changes=changes):
                self.source_run = {**original, **changes}
                with self.assertRaisesRegex(SystemExit, "Source run does not match"):
                    self.preflight()
        self.assertEqual(self.outputs(), {})

    def test_wrong_coordinator_workflow_or_nondefault_ref_is_rejected(self):
        for changes in ({"GITHUB_REF": "refs/heads/feature"}, {
            "GITHUB_WORKFLOW_REF": COORDINATOR + "/.github/workflows/untrusted.yml@refs/heads/main"}):
            with self.subTest(changes=changes), patch.dict(os.environ, changes), self.assertRaises(SystemExit):
                self.preflight()
        self.assertEqual(self.outputs(), {})

    def test_divergent_head_or_current_source_tip_race_is_rejected(self):
        self.ancestry["behind_by"] = 1
        with self.assertRaisesRegex(SystemExit, "complete fast-forward"):
            self.preflight()
        self.ancestry["behind_by"] = 0
        self.graphql["data"]["repository"]["defaultBranchRef"]["target"]["oid"] = self.merge
        with self.assertRaisesRegex(SystemExit, "changed during reconciliation"):
            self.preflight()

    def test_truncated_duplicate_divergent_or_missing_head_range_fails(self):
        original = copy.deepcopy(self.inventory)
        for changes in ({"commits": [{"sha": self.after}]},
                        {"commits": [{"sha": self.after}, {"sha": self.after}]},
                        {"commits": [{"sha": self.merge}, {"sha": self.tip}]},
                        {"status": "diverged"}, {"total_commits": 1001}, {"total_commits": 0}):
            with self.subTest(changes=changes):
                self.inventory = {**original, **changes}
                with self.assertRaises(SystemExit):
                    self.preflight()
        self.assertEqual(self.outputs(), {})

    def test_complete_1000_commit_pagination_and_partial_final_page(self):
        for count in (102, 1000):
            with self.subTest(count=count):
                shas = [f"{number:040x}" for number in range(1, count)] + [self.after]
                pages = [self.comparison(self.before, count, shas[start:start + 100]) for start in range(0, count, 100)]
                with patch.object(invoker, "github_read", side_effect=pages) as read:
                    actual = invoker.read_reconciliation_inventory(self.source, self.before, self.after, float("inf"))
                self.assertEqual(actual, shas)
                self.assertEqual(read.call_count, len(pages))
                self.assertTrue(all(call.kwargs["token"] == "test-source-token" for call in read.call_args_list))
                self.assertTrue(read.call_args.args[0].endswith(f"page={len(pages)}"))

    def test_missing_second_range_page_and_incomplete_pr_associations_fail(self):
        shas = [f"{number:040x}" for number in range(1, 102)] + [self.after]
        pages = [self.comparison(self.before, len(shas), shas[:100]),
                 self.comparison(self.before, len(shas), shas[100:-1])]
        with patch.object(invoker, "github_read", side_effect=pages), self.assertRaisesRegex(ValueError, "pagination"):
            invoker.read_reconciliation_inventory(self.source, self.before, self.after, float("inf"))
        self.graphql["data"]["repository"]["c0"]["associatedPullRequests"]["pageInfo"]["hasNextPage"] = True
        with self.assertRaisesRegex(SystemExit, "associations are incomplete"):
            self.preflight()

    def test_rebase_merge_rest_validation_and_no_merged_pr_skip(self):
        for name in ("c0", "c1"):
            self.graphql["data"]["repository"][name]["associatedPullRequests"]["nodes"][0]["mergeCommit"] = None
        self.assertEqual(self.preflight()["metadata"]["pull_requests"][0]["merge_commit_sha"], self.merge)
        self.assertEqual(sum(request.full_url.endswith("/pulls/27") for request in self.requests), 1)
        for name in ("c0", "c1"):
            self.graphql["data"]["repository"][name]["associatedPullRequests"] = {
                "totalCount": 0, "pageInfo": {"hasNextPage": False}, "nodes": []}
        Path(os.environ["GITHUB_OUTPUT"]).unlink()
        self.assertIsNone(self.preflight())
        self.assertEqual(self.outputs(), {"eligible": "false", "status": "skipped", "skip-reason": "no_merged_pull_requests"})

    def test_manual_pr_uses_same_shared_invoker_and_source_default_branch(self):
        os.environ.update({**{name: "" for name in invoker.SOURCE_INPUTS}, "DISPATCH_PR": "27"})
        metadata = self.preflight()["metadata"]
        self.assertEqual(metadata["base_ref"], "develop")
        self.assertEqual(metadata["pull_number"], 27)
        self.assertEqual(metadata["required_wiki_repository"], COORDINATOR)
        self.assertFalse(any("/actions/runs/" in request.full_url for request in self.requests))
        self.pull["merged"] = False
        with self.assertRaisesRegex(SystemExit, "not merged"):
            self.preflight()

    def result(self):
        return {"source_repository": self.source, "push_before": self.before, "push_after": self.after,
                "status": "no-change", "wiki_repository": COORDINATOR, "wiki_sha": "b" * 40,
                "reason": "Verified source and wiki", "results": [
                    {"pull_number": 27, "merge_commit_sha": self.merge, "status": "no-change", "reason": "Verified"}]}

    def submit(self, result, done=True):
        os.environ["REQUEST_PATH"] = self.outputs()["request-path"]
        stream = "data: " + json.dumps({"type": "assistant.message", "data": {"content": json.dumps(result)}}) + "\n\n"
        if done:
            stream += 'event: done\ndata: {"invocation_id":"test","session_id":"test"}\n\n'
        self.submit_response = Response(stream.encode())
        invoker.run("submit")

    def test_completed_stream_requires_valid_receipt_with_shared_wiki_and_sha(self):
        self.preflight()
        self.submit(self.result())
        self.assertEqual(self.outputs()["status"], "no-change")
        self.assertEqual(self.outputs()["wiki-repository"], COORDINATOR)
        self.assertEqual(sum(request.full_url == os.environ["AGENT_URL"] for request in self.requests), 1)
        self.assertEqual(self.opener.open.call_args.kwargs["timeout"], 300)

    def test_wrong_wiki_source_missing_pr_or_success_shaped_status_cannot_succeed(self):
        self.preflight()
        original = self.result()
        for changes in ({"wiki_repository": "microsoft/IssueLens"}, {"wiki_sha": None},
                        {"source_repository": COORDINATOR}, {"results": []}, {"status": "completed"}):
            with self.subTest(changes=changes), self.assertRaises(SystemExit):
                self.submit({**original, **changes})
            self.assertNotIn("status", self.outputs())

    def test_incomplete_stream_is_unknown_and_never_retried(self):
        self.preflight()
        with self.assertRaisesRegex(SystemExit, "completion event; outcome unknown"):
            self.submit(self.result(), done=False)
        self.assertEqual(sum(request.full_url == os.environ["AGENT_URL"] for request in self.requests), 1)
        self.assertNotIn("status", self.outputs())

    def test_partial_publication_keeps_receipt_but_fails_batch(self):
        connection = self.graphql["data"]["repository"]["c1"]["associatedPullRequests"]
        connection["nodes"].append({**copy.deepcopy(connection["nodes"][0]), "number": 28,
                                    "mergeCommit": {"oid": self.after}})
        connection["totalCount"] = 2
        self.preflight()
        result = self.result()
        result["status"] = "partial"
        result["results"].append({"pull_number": 28, "merge_commit_sha": self.after,
                                  "status": "needs-review", "reason": "Incomplete evidence"})
        with self.assertRaisesRegex(SystemExit, "batch incomplete"):
            self.submit(result)
        self.assertEqual(self.outputs()["status"], "partial")
        self.assertEqual(self.outputs()["wiki-repository"], COORDINATOR)


class WiringTests(unittest.TestCase):
    def test_workflows_use_latest_real_input_schemas_and_only_shared_invocation(self):
        queue = read_yaml(SHARED / "queue-team-memory" / "action.yml")
        invoke = read_yaml(SHARED / "issuelens" / "action.yml")
        dispatch, = source_job["steps"]
        self.assertEqual(dispatch["uses"], "microsoft/IssueLens/.github/actions/queue-team-memory@" + PIN)
        self.assertTrue(set(dispatch["with"]).issubset(queue["inputs"]))
        selection, auth, invocation = central_job["steps"]
        self.assertEqual(invocation["uses"], "microsoft/IssueLens/.github/actions/issuelens@" + PIN)
        self.assertTrue(set(invocation["with"]).issubset(invoke["inputs"]))
        self.assertEqual(invocation["with"]["source-repositories"], "${{ env.ISSUELENS_SOURCE_REPOSITORIES }}")
        for name in ("source_repository", "source_run_id", "source_run_attempt", "push_before", "push_after"):
            self.assertEqual(invocation["with"][name.replace("_", "-")], "${{ inputs." + name + " }}")
        self.assertNotIn("continue-on-error", invocation)
        self.assertNotIn("run", invocation)
        preflight, login, submit = invoke["runs"]["steps"]
        self.assertEqual(preflight["env"]["SOURCE_GH_TOKEN"], "${{ inputs.source-github-token }}")
        self.assertTrue(all(step["if"] == "steps.preflight.outputs.eligible == 'true'" for step in (login, submit)))
        self.assertEqual(len(queue["runs"]["steps"]), 1)
        self.assertEqual(queue["runs"]["steps"][0]["run"], 'python3 -I "$GITHUB_ACTION_PATH/dispatch.py"')

    def test_source_gates_and_one_central_queue_cover_manual_and_automatic_requests(self):
        self.assertEqual(source_workflow["on"], {"push": {"branches": ["main"]}})
        self.assertEqual(set(central_workflow["on"]), {"workflow_dispatch"})
        self.assertEqual(central_workflow["concurrency"], {
            "group": "issuelens-team-memory-wiki-microsoft-vscode-java-pack", "queue": "max", "cancel-in-progress": "false"})
        self.assertNotIn("concurrency", source_workflow)
        for workflow, job in ((source_workflow, source_job), (central_workflow, central_job)):
            self.assertEqual(workflow["permissions"], {})
            self.assertIn("ISSUELENS_TEAM_MEMORY_COORDINATOR_ENABLED == 'true'", job["if"])
            self.assertIn("github.event.repository.default_branch", job["if"])
        for flag in ("created", "deleted", "forced"):
            self.assertIn(f"github.event.{flag} == false", source_job["if"])
        self.assertIn("github.workflow_sha == github.sha", source_job["if"])
        self.assertEqual(source_job["permissions"], {"contents": "read", "actions": "write"})
        self.assertEqual(central_job["permissions"], {
            "contents": "read", "actions": "read", "pull-requests": "read", "id-token": "write"})
        self.assertEqual(central_job["timeout-minutes"], "30")
        inputs = central_workflow["on"]["workflow_dispatch"]["inputs"]
        self.assertEqual(set(inputs), {"source_repository", "source_run_id", "source_run_attempt",
                                      "push_before", "push_after", "pull_request_number"})
        self.assertIn("not an attested original push boundary", inputs["push_before"]["description"])

    def test_trusted_allowlist_selection_precedes_single_source_read_authentication(self):
        self.assertEqual(ALLOWED, {
            COORDINATOR: 104967329, "microsoft/vscode-java-debug": 102584737,
            "microsoft/vscode-java-test": 110522074, "microsoft/vscode-java-dependency": 129053101,
            "microsoft/vscode-maven": 116921700, "microsoft/vscode-gradle": 216314492,
            "microsoft/java-debug": 102583752, "microsoft/build-server-for-gradle": 626812412})
        selection, auth, invocation = central_job["steps"]
        self.assertIn("'has($repository)'", selection["run"])
        self.assertIn('exit 1', selection["run"])
        self.assertNotIn("${{", selection["run"])
        self.assertEqual(auth["if"], "steps.selection.outputs.external == 'true'")
        self.assertEqual(auth["with"]["repositories"], "${{ steps.selection.outputs.source-name }}")
        self.assertEqual(auth["with"]["owner"], "microsoft")
        self.assertEqual({key: value for key, value in auth["with"].items() if key.startswith("permission-")},
                         {"permission-actions": "read", "permission-contents": "read", "permission-pull-requests": "read"})
        self.assertEqual(invocation["with"]["source-github-token"],
                         "${{ steps.selection.outputs.external == 'false' && github.token || steps.source-token.outputs.token }}")
        self.assertEqual(invocation["with"]["output-mode"], "activity")
        self.assertEqual(invocation["with"]["summary-mode"], "status")

    @unittest.skipIf(os.name == "nt", "Receiver selection runs on Ubuntu")
    def test_actual_source_selection_script_restricts_scoped_app_authentication(self):
        script = central_job["steps"][0]["run"]
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "output.txt"
            for repository in (*ALLOWED, "", "microsoft/IssueLens", "microsoft/vscode-spring-initializr",
                               "fork/vscode-java-pack", "microsoft/vscode-java-pack\ninjected=true"):
                with self.subTest(source=repository):
                    output.unlink(missing_ok=True)
                    result = subprocess.run(
                        ["bash", "-e", "-c", script], capture_output=True, text=True, check=False,
                        env={**os.environ, "ISSUELENS_SOURCE_REPOSITORIES": json.dumps(ALLOWED),
                             "SOURCE_REPOSITORY": repository, "GITHUB_OUTPUT": str(output)},
                    )
                    if repository in ALLOWED:
                        self.assertEqual(result.returncode, 0, result.stderr)
                        external = "false" if repository == COORDINATOR else "true"
                        self.assertEqual(output.read_text().splitlines(), [
                            f"source-name={repository.removeprefix('microsoft/')}", f"external={external}"])
                    else:
                        self.assertEqual(result.returncode, 1)
                        self.assertIn("::error::Source repository is not allowlisted", result.stdout)
                        self.assertFalse(output.exists())

    def test_no_runtime_artifacts_local_invoker_or_client_checkout(self):
        for name in ("team-memory-post-merge.yml", "team-memory-coordinator.yml"):
            content = (ROOT / ".github" / "workflows" / name).read_text()
            for forbidden in ("artifact", "actions/checkout", "issuelens_action.py", "team_memory.py",
                              "ISSUELENS_CLIENT_PATH", "azure/login@"):
                self.assertNotIn(forbidden, content)
        self.assertFalse((Path(__file__).parents[1] / "team_memory.py").exists())
        self.assertFalse((Path(__file__).parents[1] / "action.yml").exists())
        tests = read_yaml(ROOT / ".github" / "workflows" / "team-memory-tests.yml")
        self.assertEqual(tests["jobs"]["test"]["steps"][1]["with"]["ref"], PIN)
        self.assertIn(PIN, (Path(__file__).parents[1] / "README.md").read_text())


if __name__ == "__main__":
    unittest.main()
