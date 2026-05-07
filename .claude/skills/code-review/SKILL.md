---
name: code-review
description: Review current branch for code quality, clarity, maintainability, performance, and security. Use when reviewing code, doing a code review, checking a PR, auditing code quality, optimizing slow paths, or checking for vulnerabilities. Triggers on "code review", "review this branch", "performance review", "review performance", "check performance", "security review", "review security", "check for vulnerabilities".
metadata:
  status: trial
---

# Code Review

Review the current branch for code quality, clarity, and maintainability.

## Workflow

1. Determine the base branch (usually `main`) and run `git diff <base>...HEAD` to see all changes
2. Read changed files in full to understand context
3. Check `CLAUDE.md` for codebase conventions
4. Evaluate each changed file against the review checklist below
5. Produce the review using the output format below
6. Verify: confirm all changed files from the diff are addressed in the review output

## Focus Modes

- Default mode: Use the general checklist in this file and the output format below.
- Performance mode (`--performance` or performance-related trigger): Read and follow `references/performance-review.md`.
- Security mode (`--security` or security-related trigger): Read and follow `references/security-review.md`.
- When a focus mode is selected, keep the shared workflow above and use the matching checklist/output format from the referenced file.

## Review Checklist

### 1. Clarity & Purpose

- What is this trying to accomplish? Summarize in one sentence.
- Is the intent clear from reading the code?
- Are names meaningful? Do variables, functions, and types describe their purpose?
- Is the scope appropriate? Does each change do one thing well?

### 2. Simplicity & Complexity

- Could this be simpler? Look for unnecessary abstraction, indirection, or cleverness.
- Is complexity justified? Does it solve a real problem that simple code cannot?
- Are there unused or duplicate patterns? Flag anything that doesn't pull its weight.
- Can logic be extracted? Look for repeated patterns that should be shared.

### 3. Code Quality

- Is it readable? Does the code flow naturally? Are functions appropriately sized?
- Is it well-structured? Do files and directories make sense?
- Does it follow existing patterns? Check consistency with the rest of the codebase.
- Note: no linter is configured — review style manually against existing code conventions.
- Vue-specific: Are reactive refs/computed used correctly? Is `watch` vs `watchEffect` appropriate?
- Pinia-specific: Is store state mutated only inside actions? Are getters pure?

### 4. Testing & Documentation

- Is it well-tested? Are there tests for the new/changed behavior?
- Do tests describe behavior? Tests should read like documentation.
- Are tests broken? Broken tests = broken documentation. Flag immediately.
- Are edge cases covered? Missing error handling or boundary conditions?
- Run tests with `npm test` (frontend) or `cd functions && npm test` (backend).

### 5. Security & Production Readiness

- Are Firestore operations guarded by auth checks?
- Are secrets protected? No tokens or keys in code.
- Is error handling appropriate? Graceful failures with useful messages.
- Are there performance concerns? Expensive Firestore reads, unsubscribed listeners.
- Is it production-ready? Edge cases, failure modes, observability.

### 6. Writing & Communication

- Are commit messages concise? No jargon, clear intent.
- Are comments direct? Say what you mean.
- Avoid new ad-hoc ALL_CAPS doc files. Convention files (README, CLAUDE.md) are fine.

### 7. Beyond the Checklist

Look for things the checklist doesn't cover:

- Are there better approaches? Different solutions, tradeoffs?
- What patterns emerge? Repeated code suggesting a missing abstraction?
- What might break? Edge cases, race conditions, failure modes?
- How will this age? Easy to understand in 6 months? Easy to change?
- What's missing? Logging, type safety, Firestore listener cleanup?
- Are there ecosystem best practices not being followed?
- What assumptions are being made? Are they documented and valid?

Don't limit yourself to the checklist. If you see an issue, name it. If you see a better way, suggest it.

Be direct.
Flag real issues.
Complexity is our enemy.

## Output Format

```markdown
## Code Review: [branch name]

### Summary
[One sentence: what this branch does]

### Architecture
[How the change fits into the existing Vue/Pinia/Firebase structure. Call out any structural concerns.]

### Clarity
[Are names, intent, and scope clear?]

### Simplicity
[Is unnecessary complexity present? What could be cut?]

### Quality
[Readability, conventions, Vue/Pinia patterns.]

### Testing
[Test coverage, quality, gaps.]

### Concerns
[Real issues, ranked by severity. Include file and line.]

### Strengths
[What's done well and worth preserving.]

### Opportunities
[Non-blocking improvements for future consideration.]

### Recommendations
[Specific, actionable fixes prioritized by impact.]

### Verdict
**Approve** | **Approve with suggestions** | **Request changes**
[One sentence rationale.]
```
