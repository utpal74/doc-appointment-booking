# Agentic SDLC — File Layout & Conventions

This document describes the full agent/skill/hook layout for the agentic SDLC pipeline.

## Directory Structure

```
.github/
├── workflows/                        GitHub Actions (what actually runs in CI)
│   ├── ci.yml                          Core CI: test + lint on every PR
│   ├── agentic-pre-hooks.yml           Pre-merge: security scan, doc quality, PR completeness
│   ├── agentic-post-merge.yml          Post-merge: deploy health check, smoke test
│   ├── skill-scaffold-endpoint.yml     Manual: scaffold a new REST endpoint via Claude
│   ├── skill-debug-sms.yml             Manual: diagnose SMS delivery failures via Claude
│   ├── skill-add-department.yml        Manual: add a department + doctors via Claude
│   ├── skill-write-prisma-migration.yml Manual: write + apply a safe Prisma migration
│   └── skill-check-slot-availability.yml Weekly + manual: audit slot availability
├── hooks/                            Runbooks (spec for what each CI job does)
│   ├── pre/
│   │   ├── 01-test-runner.md           Spec: block merge if Jest fails
│   │   ├── 02-doc-quality.md           Spec: block merge if doc coverage < 100%
│   │   └── 03-security-scan.md         Spec: block merge on high CVEs / hardcoded secrets
│   └── post/
│       ├── 01-changelog-update.md      Spec: append CHANGELOG entry after merge
│       ├── 02-smoke-test.md            Spec: verify deployed service is healthy
│       └── 03-pr-summary.md            Spec: post non-technical release note on PR
├── instructions/                     Developer guidance (this file)
│   └── hooks-overview.md
├── config/
│   └── defaults.yml                  Default model + token settings for skill workflows
├── CODEOWNERS
├── PULL_REQUEST_TEMPLATE.md
└── dependabot.yml

.claude/
├── agents/                           Claude Code subagents (SDLC pipeline steps)
│   ├── sdlc-orchestrator.md            Master: reads docs/input/, runs all 8 steps
│   ├── requirements-analyst.md         Step 1: user story → docs/requirements.md
│   ├── architecture-designer.md        Step 2: requirements → docs/architecture.md
│   ├── design-reviewer.md              Step 3: architecture review → docs/design-review.md
│   ├── implementation-planner.md       Step 4: architecture → docs/impl-plan.md
│   ├── code-implementer.md             Step 5: impl-plan → working code + tests
│   ├── code-reviewer.md                Step 6: diff review → docs/code-review.md
│   ├── test-verifier.md                Step 7: test coverage audit + evidence
│   └── pr-creator.md                   Step 8: push branch + create/update PR
├── commands/                         Claude Code slash commands (reusable skills)
│   ├── scaffold-endpoint.md            /scaffold-endpoint  — add a new REST endpoint
│   ├── debug-sms.md                    /debug-sms          — diagnose SMS failures
│   ├── add-department.md               /add-department     — onboard a new department
│   ├── write-prisma-migration.md       /write-prisma-migration — safe DB migrations
│   └── check-slot-availability.md      /check-slot-availability — audit slot conflicts
└── settings.json                     Permissions + UserPromptSubmit auto-trigger hook
```

## How Agents Are Triggered

### GitHub Actions (CI/CD)
| Workflow | Trigger | What it does |
|---|---|---|
| `agentic-pre-hooks.yml` | PR opened / synchronised | Security scan, doc quality gate, PR completeness |
| `agentic-post-merge.yml` | Push to `main` | Deploy health check, smoke test |
| `skill-*.yml` | `workflow_dispatch` (manual) | Invoke a Claude skill for a specific task |

### Claude Code (local development)
| How to invoke | What runs |
|---|---|
| Drop a file in `docs/input/` | Auto-trigger via `UserPromptSubmit` hook → `sdlc-orchestrator` |
| "Run the sdlc-orchestrator agent" | Full 8-step SDLC pipeline |
| `/scaffold-endpoint` | Add a new REST endpoint |
| `/debug-sms` | Diagnose SMS delivery failures |
| `/add-department` | Add a new department + doctors |
| `/write-prisma-migration` | Write a safe Prisma migration |
| `/check-slot-availability` | Audit slot conflicts |

## Skill → Agent Wiring

Skills are invoked by SDLC agents when specific tasks arise:

| Agent | Uses skill | When |
|---|---|---|
| `code-implementer` | `scaffold-endpoint` | Adding a new REST endpoint |
| `code-implementer` | `write-prisma-migration` | Modifying Prisma schema |
| `code-implementer` | `add-department` | Seeding a new department |
| `test-verifier` | `check-slot-availability` | Writing slot-related tests |
| `code-reviewer` | `debug-sms` | Reviewing SMS delivery code |
| `code-reviewer` | `check-slot-availability` | Reviewing slot booking logic |
