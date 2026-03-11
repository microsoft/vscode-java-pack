---
name: send-notification
description: Send adaptive card notifications to Microsoft Teams via Azure Logic App. Use when (1) sending issue triage reports to Teams, (2) posting JSON payloads as Teams notifications, (3) triggering workflow result notifications. Triggers on requests like "send notification", "notify team", "post to Teams", "send report".
---

# Send Notification Skill

Send adaptive card notifications to Microsoft Teams via an Azure Logic App HTTP trigger.

## Overview

This skill posts a JSON payload to a configured Logic App endpoint, which transforms the data into an adaptive card and sends it to a bound Teams group chat.

## Usage

### Required Environment Variable

The notification URL must be set via environment variable:
- `NOTIFICATION_URL`: The Azure Logic App HTTP trigger URL

### Input Format

The payload should be a JSON object matching the IssueLens triage report schema:

```json
{
  "title": "Daily Issue Report for Java Tooling",
  "timeFrame": "January 28, 2026",
  "totalIssues": 8,
  "criticalIssues": 3,
  "overallSummary": "Today, 8 issues were reported. 3 were identified as critical.",
  "criticalIssuesSummary": [
    {
      "issueNumber": 1234,
      "url": "https://github.com/org/repo/issues/1234",
      "title": "Issue title here",
      "summary": "Brief description of the issue and reason for criticality.",
      "labels": "🔴 **High Priority** | 🏷️ bug, critical"
    }
  ],
  "allIssues": [
    {
      "issueNumber": 1234,
      "url": "https://github.com/org/repo/issues/1234",
      "title": "Issue title here"
    }
  ],
  "workflowRunUrl": "https://github.com/org/repo/actions/runs/12345"
}
```

For the full JSON schema, see [references/payload-schema.json](references/payload-schema.json).

## Workflow

1. Receive JSON payload from user or another skill/agent
2. Validate that `NOTIFICATION_URL` environment variable is set
3. POST the JSON payload to the Logic App endpoint
4. Report success or failure to the user

## Example Commands

- "Send this triage report as a notification"
- "Post the issue summary to Teams"
- "Notify the team about critical issues"

## Implementation

Use curl or equivalent HTTP client to POST the JSON:

```bash
curl -X POST "$NOTIFICATION_URL" \
  -H "Content-Type: application/json" \
  -d '<json_payload>'
```

## Response Handling

- **HTTP 2xx**: Notification sent successfully ✅
- **HTTP 4xx/5xx**: Failed to send notification ❌

Report the result to the user with the HTTP status code.

## Integration with IssueLens Agent

This skill is designed to work with the IssueLens triage agent. After the agent generates a JSON report, invoke this skill to send the notification:

1. IssueLens agent triages issues and outputs JSON
2. User requests "send notification" with the JSON payload
3. This skill POSTs to the Logic App
4. Teams receives an adaptive card notification
