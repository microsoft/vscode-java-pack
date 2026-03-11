---
name: send-personal-notification
description: Send workflow bot messages to Teams personal chat via Azure Logic App. Use when (1) sending personal notifications to individuals, (2) delivering triage summaries to specific recipients, (3) triggering personal workflow alerts. Triggers on requests like "send personal notification", "notify user", "send message to", "personal message".
---

# Send Personal Notification Skill

Send workflow bot messages to Microsoft Teams personal chat via an Azure Logic App HTTP trigger.

## Overview

This skill posts a JSON payload to a configured Logic App endpoint, which sends a workflow bot message directly to a specified recipient's Teams personal chat.

## Usage

### Required Environment Variable

The notification URL must be set via environment variable:
- `PERSONAL_NOTIFICATION_URL`: The Azure Logic App HTTP trigger URL for personal notifications

### Input Format

The payload should be a JSON object with the following structure:

```json
{
  "title": "Daily Issue Triage Report - February 2, 2026",
  "message": "## Triage Summary\n\nToday's triage identified **5 issues** requiring attention. 2 issues are SLA violations, 2 are compliant, and 1 is waiting on reporter.\n\n### Issues Triaged\n\n| Issue # | Title | Assignees |\n|---------|-------|----------|\n| #1234 | Java debugger crashes on Windows with JDK 21 | @javadev, @debugteam |\n| #1256 | Add support for Java 22 preview features | @featurelead |\n| #1278 | IntelliSense not working for record classes | @intellisense-team |\n| #1290 | Build fails with Gradle 8.5 | @buildtools, @qaengineer |\n| #1301 | Documentation missing for new refactoring options | @docwriter |",
  "workflowRunUrl": "https://github.com/microsoft/vscode-java-pack/actions/runs/12345678/job/98765432",
  "recipient": "johndeo@microsoft.com"
}
```

For the full JSON schema, see [references/payload-schema.json](references/payload-schema.json).

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Title of the notification message |
| `message` | string | Main content of the message (supports markdown) |
| `workflowRunUrl` | string | URL to the workflow run that generated this notification |
| `recipient` | string | Email address of the recipient |

## Workflow

1. Receive JSON payload from user or another skill/agent
2. Validate that `PERSONAL_NOTIFICATION_URL` environment variable is set
3. Validate that required fields are present (especially `recipient`)
4. POST the JSON payload to the Logic App endpoint
5. Report success or failure to the user

## Example Commands

- "Send this triage summary as a personal notification to user@example.com"
- "Notify john@company.com about the issue report"
- "Send a personal message to the assignee"

## Implementation

Use curl or equivalent HTTP client to POST the JSON:

```bash
curl -X POST "$PERSONAL_NOTIFICATION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Daily Issue Triage Report - February 2, 2026",
    "message": "## Triage Summary\n\n...",
    "workflowRunUrl": "https://github.com/org/repo/actions/runs/12345",
    "recipient": "user@example.com"
  }'
```

## Response Handling

- **HTTP 2xx**: Personal notification sent successfully ✅
- **HTTP 4xx/5xx**: Failed to send notification ❌

Report the result to the user with the HTTP status code.

## Integration with Other Skills

This skill can be used in conjunction with the IssueLens triage agent or other reporting workflows to deliver personalized notifications:

1. A triage agent or workflow generates a report
2. User requests "send personal notification" with recipient and message
3. This skill POSTs to the Logic App
4. Recipient receives a personal Teams message from the workflow bot
