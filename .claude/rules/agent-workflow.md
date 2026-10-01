# Shared agent workflow

- Follow the scope, prerequisites, approval gates, and deliverables in the
  active agent's `.claude/agents/` instructions.
- Inspect the current implementation and the closest tests before changing
  behavior. Treat the repository as the source of truth when guidance conflicts
  with existing code.
- Preserve unrelated working-tree changes. Do not replace existing user-authored
  content without first integrating it.
- Make focused changes for the requested outcome. Update directly related tests
  and documentation, and avoid unrelated cleanup.
- Validate changes with the narrowest existing check that covers them. Report
  what was run and its result; never claim checks, commits, pushes, or PR
  operations that did not actually complete.
- If a required input is missing or existing requirements conflict, surface the
  blocker rather than inventing facts or silently changing scope.
- Write every generated SDLC artifact (requirements, architecture, design
  review, implementation plan, code review, verification report) to the root
  `artifacts/` folder, creating it if needed. `docs/` contains only the
  `docs/input/` user-story drop zone; never write generated files there.
- Every SDLC agent runs `.claude/hooks/pre-tool-guard.js` as a `PreToolUse`
  hook. It blocks broad staging (`git add .`/`-A`/`--all`, `git commit -a`),
  force pushes, `git reset --hard`, `git clean -f`, whole-tree
  `git checkout`/`git restore`, and writes to secret files (`.env*` other than
  `.env.example`, keys, certificates). When a call is blocked, use the safe
  alternative in the message or surface the blocker; do not work around it.
- Precedence when guidance conflicts: `artifacts/requirements.md` (approved
  scope) > the current code and tests > `.claude/skills/` playbooks and
  `CLAUDE.md` examples. Skills describe the existing appointment-booking app
  and its Express/Prisma/React/Jest stack; never import their business rules
  (slot times, Sunday blocking, SMS, departments) or stack choices into a
  project whose requirements or architecture say otherwise. When a skill
  disagrees with the requirements or code, follow the requirements and code,
  and list the skill as stale in your stage report.
