#!/usr/bin/env python3
"""
Add labels to GitHub issues with gh CLI after validating them against .github/llms.md.

Usage:
    python label_issue.py <owner> <repo> <issue_number> <labels> [--dry-run]

Environment Variables:
    GH_TOKEN or GITHUB_TOKEN: GitHub token with issues: write permission
"""

import sys
import argparse
import re
import subprocess
from pathlib import Path


LLMS_PATH = Path(".github/llms.md")
LIFECYCLE_LABELS = {"ai-triaged", "duplicate"}


def add_labels(owner: str, repo: str, issue_number: int, labels: list[str]) -> None:
    """Add labels to a GitHub issue using gh CLI."""
    subprocess.run(
        [
            "gh",
            "issue",
            "edit",
            str(issue_number),
            "--repo",
            f"{owner}/{repo}",
            "--add-label",
            ",".join(labels),
        ],
        check=True,
    )


def load_allowed_labels(llms_path: Path = LLMS_PATH) -> set[str]:
    """Load labels explicitly defined in .github/llms.md."""
    if not llms_path.exists():
        raise FileNotFoundError(f"Required labeling instructions not found: {llms_path}")

    content = llms_path.read_text(encoding="utf-8")
    labels = set(re.findall(r"^-\s+`([^`]+)`\s*:", content, flags=re.MULTILINE))
    labels.update(LIFECYCLE_LABELS)
    return labels


def validate_labels(labels: list[str], allowed_labels: set[str]) -> None:
    invalid_labels = [label for label in labels if label not in allowed_labels]
    if invalid_labels:
        allowed = ", ".join(sorted(allowed_labels))
        invalid = ", ".join(invalid_labels)
        raise ValueError(
            f"Labels not allowed by .github/llms.md: {invalid}. Allowed labels: {allowed}"
        )


def main():
    parser = argparse.ArgumentParser(
        description="Add labels to GitHub issues."
    )
    parser.add_argument("owner", help="Repository owner (e.g., 'microsoft')")
    parser.add_argument("repo", help="Repository name (e.g., 'vscode')")
    parser.add_argument("issue_number", type=int, help="Issue number to label")
    parser.add_argument(
        "labels", help="Comma-separated list of labels (e.g., 'bug,ai-triaged')"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Validate labels without calling the GitHub API"
    )

    args = parser.parse_args()
    labels = [label.strip() for label in args.labels.split(",") if label.strip()]

    if not labels:
        print("❌ No labels provided.", file=sys.stderr)
        sys.exit(1)

    try:
        allowed_labels = load_allowed_labels()
        validate_labels(labels, allowed_labels)
        if args.dry_run:
            print(f"✅ Labels valid for issue #{args.issue_number}: {', '.join(labels)}")
            sys.exit(0)
        add_labels(args.owner, args.repo, args.issue_number, labels)
        print(f"✅ Labels added to issue #{args.issue_number}: {', '.join(labels)}")
        sys.exit(0)
    except FileNotFoundError as e:
        print(f"❌ Labeling instructions error: {e}", file=sys.stderr)
        sys.exit(1)
    except ValueError as e:
        print(f"❌ Label validation error: {e}", file=sys.stderr)
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        print(f"❌ gh CLI error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
