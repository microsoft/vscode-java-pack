---
name: label-issue
description: Classify and label GitHub issues based on repository-specific labeling instructions. Use when (1) auto-labeling new issues, (2) classifying issue types (bug, feature, etc.), (3) adding priority or area labels, (4) applying consistent labeling rules. Triggers on requests like "label issue", "classify issue", "what labels should this issue have", "add labels to issue".
---

# Label Issue Skill

Automatically classify and label GitHub issues based on repository-specific labeling instructions.

## Overview

This skill analyzes GitHub issue content (title, body, comments) and applies appropriate labels based on labeling rules defined in the target repository's `.github/llms.md` file.

## Workflow

1. **Input**: Receive issue URL or issue number with repository (owner/repo)
2. **Fetch labeling instructions**: Read `.github/llms.md` from the repository
3. **Fetch issue**: Get issue details (title, body, existing labels)
4. **Analyze issue**: Match issue content against labeling rules
5. **Determine labels**: Select appropriate labels based on:
   - Keyword matching
   - Issue type detection (bug, feature, question, etc.)
   - Priority assessment
   - Area/component identification
6. **Apply labels**: Use Python script to add labels via GitHub API
7. **Report**: Confirm labels applied with reasoning

## Reading Labeling Instructions

Fetch `.github/llms.md` from the target repository using GitHub MCP tools. The file should define:

- **Available labels**: List of valid labels with descriptions
- **Labeling rules**: Criteria for when to apply each label
- **Keywords mapping**: Keywords that trigger specific labels

**Only apply labels explicitly defined in this document. Do not apply any other labels.**

If `.github/llms.md` is not found:
1. Fetch the list of labels defined in the target repository using `github/list_labels`
2. Create a brief summary of available labels based on their names and descriptions
3. Use the summary to determine which labels best match the issue content

## Issue Analysis

Analyze issue content to determine appropriate labels by:

1. **Type Detection**: Match issue keywords against label names/descriptions
2. **Priority Assessment**: Identify severity indicators in the issue
3. **Area Detection**: Match issue content against area-specific labels

## Applying Labels

Run the bundled Python script to add labels:

```bash
# Install dependency
pip install requests

# Add labels to an issue
python scripts/label_issue.py <owner> <repo> <issue_number> <labels>

# Example: add bug and priority:high labels
python scripts/label_issue.py microsoft vscode 123 "bug,priority:high"

# Example: add multiple area labels
python scripts/label_issue.py microsoft vscode 123 "bug,area:ui,area:api"
```

The script [scripts/label_issue.py](scripts/label_issue.py) handles the GitHub API call.

## Example Commands

- "Label issue #123 in microsoft/vscode"
- "What labels should this issue have? https://github.com/owner/repo/issues/456"
- "Classify and label issue #789"
- "Add appropriate labels to this bug report"

## Output

Report the labeling decision with:

- **Labels applied**: List of labels added
- **Reasoning**: Why each label was chosen
  - Type: "Detected as bug (keywords: 'not working', 'error')"
  - Priority: "High priority (affects core functionality)"
  - Area: "Matched 'ui' area (keywords: button, dialog)"
- **Existing labels**: Labels already on the issue (not modified)

## Example Output

```
✅ Labels added to issue #123: bug, priority:high, area:ui

**Reasoning:**
- **bug**: Issue describes broken functionality ("button not working")
- **priority:high**: Core feature affected, no workaround mentioned
- **area:ui**: UI-related keywords detected (button, click, display)

**Existing labels:** needs-triage (unchanged)
```

## Configuration

The skill requires:

1. **GITHUB_ACCESS_TOKEN** or **GITHUB_TOKEN** environment variable with `repo` scope
2. **.github/llms.md** in target repository (optional but recommended)

## Fallback Behavior

If labeling instructions are not found:
1. Use default type detection rules
2. Skip priority and area labels
3. Report that default rules were used
