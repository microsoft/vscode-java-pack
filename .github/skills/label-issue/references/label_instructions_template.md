# Label Instructions Template

This template shows the expected format for `.github/label-instructions.md` in target repositories.

## Example Format

```markdown
# Issue Labeling Instructions

## Available Labels

### Type Labels
- **bug**: Something isn't working correctly
- **feature**: New feature request
- **enhancement**: Improvement to existing functionality
- **documentation**: Documentation updates needed
- **question**: Questions about usage or behavior

### Priority Labels
- **priority:critical**: Blocking issue, needs immediate attention
- **priority:high**: Important, should be addressed soon
- **priority:medium**: Normal priority
- **priority:low**: Nice to have, can wait

### Area Labels
- **area:ui**: User interface related
- **area:api**: API or backend related
- **area:performance**: Performance issues
- **area:security**: Security concerns

## Labeling Rules

1. Every issue should have exactly one **type** label
2. Add **priority** labels based on user impact and urgency
3. Add relevant **area** labels based on affected components
4. Issues mentioning "crash", "error", or "broken" should be labeled `bug`
5. Issues starting with "Feature request" or "Please add" should be labeled `feature`
6. Security-related issues should always get `priority:critical` and `area:security`

## Keywords to Label Mapping

| Keywords | Labels |
|----------|--------|
| crash, error, broken, not working | bug |
| feature request, please add, would be nice | feature |
| slow, performance, timeout, lag | area:performance |
| security, vulnerability, CVE | area:security, priority:critical |
| documentation, docs, readme | documentation |
```

## Best Practices

1. **Be specific**: Include concrete keywords and patterns
2. **Define priorities clearly**: Explain what qualifies for each priority level
3. **List all available labels**: Include descriptions for each label
4. **Provide examples**: Show sample issues and their expected labels
