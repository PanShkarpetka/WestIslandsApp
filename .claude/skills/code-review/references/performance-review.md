# Performance Review Reference

Use this reference for performance-focused reviews.
Run the shared workflow in `../SKILL.md` first.

## Review Checklist

### Firestore and Data Fetching

- Are there N+1 Firestore read patterns (reads inside loops)?
- Are queries using collection-group queries or subcollections appropriately?
- Are large result sets paginated or limited?
- Are real-time listeners unsubscribed when components unmount (memory/cost leak)?
- Are batched writes used instead of individual `set`/`update` calls where possible?
- Are Firestore reads cached in Pinia store instead of re-fetched on every component mount?

### Vue Reactivity

- Are expensive computations in `computed()` rather than re-computed in templates?
- Are large lists rendered with `v-for` using stable `:key` values?
- Are unnecessary re-renders caused by non-reactive data being made reactive?
- Is `watchEffect` used where `watch` with a specific source would be cheaper?
- Are components split to limit reactivity scope (avoid full-page re-renders)?

### Algorithmic Complexity

- Are there O(n²) or worse patterns that could be O(n) or O(n log n)?
- Are data structures appropriate for the access patterns (hash lookups vs linear scans)?
- Are there unnecessary repeated computations that could be memoized?
- Are sort/filter operations on store getters computed once rather than per template render?

### Memory and Resource Usage

- Are large Firestore result sets held in memory indefinitely in stores?
- Are Firestore listeners accumulated without cleanup (onSnapshot without unsubscribe)?
- Are Chart.js instances destroyed before re-creating them?
- Are event listeners added in `mounted` and removed in `unmounted`?

### Network and I/O

- Are independent Firestore reads parallelized with `Promise.all` instead of awaited sequentially?
- Are responses filtered server-side (Firestore `where`) rather than client-side?
- Are Firebase Cloud Function calls batched where possible?

### Telegram Bot (Cloud Functions)

- Are Firestore writes inside the webhook handler batched?
- Are duplicate update checks (`markUpdateProcessed`) done before expensive logic?
- Are Firestore reads inside the handler minimized (no redundant fetches)?
- Are async operations parallelized where independent?

## Output Format

```markdown
## Performance Review: [branch name]

### Summary
[One sentence: what this branch does and its performance-relevant characteristics]

### Findings

#### High Impact
[Issues likely to cause visible latency or resource problems at expected scale.
Include file, line, estimated impact, and a fix.]

#### Medium Impact
[Issues that will matter at higher scale or under load.]

#### Low Impact
[Minor inefficiencies worth noting for future optimization.]

### Positive Patterns
[Performance-conscious patterns already in the code worth preserving.]

### Recommendations
[Specific, actionable fixes, prioritized by expected impact.]
```
