# Security Review Reference

Use this reference for security-focused reviews.
Run the shared workflow in `../SKILL.md` first.

## Review Checklist

### Authentication and Authorization (Firebase)

- Are Firestore operations guarded by Firebase Auth checks in the client (`userStore` auth state)?
- Are `adminOnly` routes enforced both in `router.beforeEach()` and Firestore Security Rules?
- Is guild access checked before exposing guild-scoped data?
- Are there any paths where unauthenticated users can trigger writes?
- Are Firestore Security Rules the last line of defense (not just client-side guards)?

### Telegram Bot (Cloud Functions)

- Is the incoming webhook request validated (correct Telegram token in the URL/header)?
- Is user input from Telegram messages sanitized before use in Firestore queries or replies?
- Are duplicate update checks (`markUpdateProcessed`) in place to prevent replay attacks?
- Are session states validated before acting on them (e.g., bait choice, modifier flows)?
- Is the webhook endpoint restricted to Telegram's IP ranges where possible?

### Injection and Input Handling

- Is user input validated before being written to Firestore?
- Are Firestore document IDs derived from user input validated/sanitized?
- Is output to Telegram messages escaped to prevent Markdown injection?
- Are file paths or dynamic imports constructed from user input?

### Secrets and Credentials

- Are Firebase config values (API keys, project IDs) stored in environment variables or `.env` files not committed to git?
- Are Telegram bot tokens stored in Firebase Functions config / Secret Manager, not hardcoded?
- Are no secrets logged in Cloud Function output?

### Data Protection

- Is sensitive player data (e.g., guild info, treasury balances) scoped correctly in Firestore rules?
- Is logging in Cloud Functions avoiding sensitive data (user IDs, amounts, tokens)?
- Are admin-only Firestore collections protected by Security Rules, not just client-side checks?

### Dependencies and Configuration

- Are there known-vulnerable dependencies? Check with `npm audit` (root and `functions/`).
- Is Firebase Hosting serving with appropriate security headers (check `firebase.json`)?
- Is Firestore in production mode (not test mode with open rules)?
- Are Cloud Functions deployed with minimum required IAM permissions?

### Cryptography and Randomness

- Are dice rolls (`dice.js`) using sufficiently random sources for the game's fairness requirements?
- Are no custom crypto implementations present where standard libraries exist?

## Output Format

```markdown
## Security Review: [branch name]

### Summary
[One sentence: what this branch does and its security-relevant surface area]

### Findings

#### Critical
[Issues that could be exploited now. Include file, line, and a fix.]

#### Warning
[Issues that could become exploitable or violate security best practices.]

#### Informational
[Observations worth noting but not directly exploitable.]

### No Issues Found
[List areas reviewed where no issues were found, so coverage is clear.]

### Recommendations
[Specific, actionable fixes, prioritized by severity.]
```
