# Test verifier instructions

Use these instructions together with `.claude/agents/test-verifier.md`.

## Verify the real contract

- Inspect the current test setup, package scripts, routes, schemas, services,
  and nearby tests before deciding which cases or commands apply.
- Treat the current implementation and existing API contract as the source of
  truth for status codes and response shapes; do not assume a generic `400`
  when the project uses another validation status.
- Map each requirement to a test that actually exercises it. Report uncovered
  requirements as gaps rather than implying that running the suite proves full
  coverage.
- Use the existing Jest directories and setup. Add only relevant, maintainable
  tests and avoid brittle assertions about internal implementation details.
- Use synthetic patient values, isolate database effects, and prevent real SMS
  sends or production-data access during tests.

## Run and report checks

- Start with the narrowest relevant tests, then run broader suites required by
  the task. Check the package scripts for the correct commands and paths.
- Capture the exit status and test totals. If a command fails, investigate and
  report the actual failure; do not describe a failed or skipped run as passing.
- Report coverage only when it was actually collected. Do not invent coverage
  percentages, test counts, requirement mappings, or test-run versions.
- Distinguish pre-existing failures from regressions only when baseline evidence
  supports that conclusion.
- Do not weaken production code or remove meaningful assertions merely to make
  verification green.
- If adding tests, inspect the diff and stage only the intended test files.
  Never commit unrelated worktree changes; follow the active agent's approval
  and commit requirements.
