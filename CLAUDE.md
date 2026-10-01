# Project instructions for Claude

These instructions apply to Claude-assisted work in this repository. Read them
alongside the applicable files under `.claude/rules/`, `.claude/agents/`,
`.claude/instructions/`, and `.claude/skills/`. SDLC agents also run the
`PreToolUse` guard in `.claude/hooks/pre-tool-guard.js`, declared in each
agent's frontmatter.

## Before starting

- Identify the requested outcome and its affected parts of the application.
- Read `.claude/rules/agent-workflow.md` and any path-scoped rules that apply.
- For a defined SDLC stage, follow its agent file in `.claude/agents/`. The
  orchestrator coordinates the stages; it does not replace their individual
  instructions.
- Load a skill when the task matches its purpose. Skills are focused playbooks,
  not a requirement to run unrelated steps. SDLC agents route process skills
  (requirements traceability, cross-boundary changes, data privacy) directly;
  stack skills only when the approved architecture uses this stack; and leave
  appointment-app skills (slots, SMS, departments, migrations) to
  auto-discovery.
- When guidance conflicts, `artifacts/requirements.md` wins over the current
  code, and the code wins over skills and the examples in this file. Report a
  stale skill instead of following it (see `.claude/rules/agent-workflow.md`).
- Confirm paths, test locations, scripts, and existing behavior in the current
  repository before relying on a playbook's examples.

## Project conventions

- The backend uses Express routes, service modules, Zod validation, Prisma, and
  Jest tests under `backend/__tests__/`.
- The frontend is React and uses the shared API client at
  `frontend/src/api/client.js`.
- Prefer nearby implementation and test patterns. Keep route handlers focused
  on HTTP, domain operations in services, and API responses explicitly shaped
  for clients.
- When a change crosses the API/UI boundary, keep both sides of the contract
  aligned and verify the relevant user-visible states.
- For department or doctor changes, read
  `.claude/skills/add-department/SKILL.md`. Inspect the current seed, API-driven
  department list, test setup, and documentation checks before changing them;
  do not hardcode a dropdown list that is already populated from the API.
- For patient, appointment, phone, or credential data, read
  `.claude/skills/healthcare-data-privacy/SKILL.md` and follow
  `.claude/rules/healthcare-data.md`.

## Change and verification expectations

- Generated SDLC documents live in the root `artifacts/` folder
  (`requirements.md`, `architecture.md`, `design-review.md`, `impl-plan.md`,
  `code-review.md`, `verification-report.md`). `docs/` holds only the
  `docs/input/` user-story drop zone.
- Keep changes scoped to the request; preserve unrelated worktree changes.
- Add or update focused tests for behavior changes and directly related
  documentation when needed.
- Run the narrowest relevant existing validation, then broaden it if the
  change warrants. Report commands and outcomes accurately.
- Do not commit, push, create a pull request, or alter user data unless the
  request and the applicable agent workflow authorize that action.
- Surface blockers and assumptions explicitly. Do not fabricate repository
  state, test results, or completion status.
