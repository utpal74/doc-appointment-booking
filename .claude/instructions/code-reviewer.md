# Code reviewer instructions

Use these instructions together with `.claude/agents/code-reviewer.md`.

## Establish review scope

- Inspect the current branch, intended base branch, `git status`, and both
  committed and uncommitted diffs relevant to the requested review.
- Do not assume `main` is the correct base or that a clean committed diff
  includes all work under review. State the review scope and any unavailable
  baseline.
- Read changed code and the closest tests in enough context to understand actual
  behavior. Check requirements and architecture when they exist and are relevant.

## Report actionable findings

- Prioritize concrete correctness, security, privacy, data integrity, and
  regression issues over style preferences.
- Each finding must identify the affected file and precise location, describe a
  reproducible impact, assign severity consistently with the report template,
  and provide a practical remediation.
- Report only issues supported by evidence. Separate confirmed defects from
  optional suggestions; do not invent findings to fill a quota.
- Check whether tests cover the changed behavior, including meaningful error
  and boundary cases. Do not demand tests for unrelated code.
- For patient or appointment data, inspect response shaping, logs, fixtures,
  encryption/hash handling, and external provider error paths without copying
  sensitive values into the report.
- Do not modify reviewed implementation code unless specifically asked to fix
  findings. Clearly state checks not run and limitations.
