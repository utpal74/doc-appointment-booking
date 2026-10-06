# Pull request creator instructions

Use these instructions together with `.claude/agents/pr-creator.md`.

## Preflight

- Confirm the intended base branch, current branch, repository remote, commit
  range, and `git status` before preparing a PR.
- Review the actual diff and the available requirements, implementation plan,
  code review, and verification evidence. Include only verified outcomes and
  relevant limitations.
- Do not expose patient data, phone numbers, credentials, encryption keys,
  environment values, or raw provider responses in a PR title, body, logs, or
  test evidence.
- If the worktree contains unrelated or uncommitted changes, do not stage,
  commit, stash, or discard them. Report the blocker and request direction.
- Never use broad staging such as `git add .` or `git add artifacts/` to sweep up
  unknown changes. Stage only explicitly reviewed, in-scope files when a commit
  is authorized.

## Publish accurately

- Run or confirm the required final checks; distinguish newly run results from
  evidence supplied by another agent.
- Describe the delivered behavior, tests, review findings, and unresolved
  limitations accurately. Do not claim requirements are complete without
  evidence.
- Verify the PR base and head branches and check for an existing PR before
  creating one. Update only the intended PR.
- Pushing a branch and creating or updating a PR are external side effects.
  Proceed only when the request or autonomous pipeline authorizes them; report
  permission or tooling blockers without pretending the operation succeeded.
- Finish with the PR URL or a complete ready-to-use draft, plus checks,
  limitations, and reviewer attention points.
