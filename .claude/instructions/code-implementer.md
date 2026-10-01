# Code implementer instructions

Use these instructions together with `.claude/agents/code-implementer.md`.

## Before implementation

- Read the implementation plan, approved requirements, architecture, applicable
  review decisions, and the directly related source and tests.
- Check `git status` before editing. Keep pre-existing user changes intact and
  distinguish them from changes made for the assigned task.
- Verify planned file paths and test commands against the current repository;
  the plan may be stale.
- Read only the skills relevant to the task. For changes involving patient,
  appointment, phone, or credential data, follow
  `.claude/rules/healthcare-data.md` and the healthcare privacy skill.

## Implement safely

- Implement one task at a time in dependency order. Preserve behavior outside
  the acceptance criteria, and do not silently skip blocked or ambiguous work.
- Reuse established route, service, schema, error, logging, API-client, and
  test patterns. Keep frontend and backend behavior aligned when both change.
- For Prisma changes, inspect the current schema and migration history. Make
  additive, data-safe migrations; do not rewrite applied migrations or transform
  encrypted phone values in SQL.
- Use synthetic patient values and avoid real provider calls in tests.
- Keep error handling explicit and consistent with the existing project. Do not
  add success-shaped fallbacks or hide failures.

## Verify and hand off

- Add or update tests with the implementation. Run the smallest relevant test
  command first and the full backend suite when the task or agent workflow
  requires it. Run the frontend build for frontend changes.
- Inspect the final diff and ensure each changed file belongs to the task.
- Before a commit, report the task, files changed, and verification evidence;
  wait for approval unless the invocation explicitly sets `MODE=autonomous`.
- Stage only files belonging to the completed task. Never stage all changes
  indiscriminately or commit unrelated pre-existing edits.
- Report completed, blocked, and skipped tasks separately, with reasons.
