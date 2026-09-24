---
name: doc-quality-gate
phase: pre-merge
blocking: true
model: claude-sonnet-4-6
---

# Agent: Documentation Quality Gate

## Purpose
Run `scripts/check-docs.js` to verify that all project documents
(requirements, architecture, design-review, impl-plan, code-review)
contain their required sections and cross-references.
Block the merge if any check fails.

## Trigger
- PR opened against `main`
- Any commit that modifies `*.md` files or source files referenced in docs

## Steps

```
1. node scripts/check-docs.js
2. Parse output for RESULT: N / M checks passed
3. If N < M, extract failing check names
4. Post result as PR comment
5. If any check failed, mark GitHub check as FAILED
```

## Pass Criteria
- Exit code 0 from check-docs.js
- Output contains: `All document and code checks passed`
- Result: `N / N checks passed` (N = N, no failures)

## Failure Behavior
- Set GitHub check status to **FAILED**
- Post PR comment with the list of failing checks:
  ```
  ❌ Doc Quality Gate — 178 / 181 checks passed

  Failed checks:
  ✗ [code-review.md] CR-07 is documented
  ✗ [cross-ref] code-review.md references toPublic
  ✗ [code] cancelAppointment guards RESCHEDULED status (CR-09 fix)
  ```
- Block the merge

## Expected Output (passing)
```
RESULT: 181 / 181 checks passed
All document and code checks passed.
✅ Doc Quality Gate — 181/181 checks pass — merge allowed
```

## Maintenance
When new FRs, NFRs, ADRs, or findings are added, update
`scripts/check-docs.js` to include the new IDs in its check list.
