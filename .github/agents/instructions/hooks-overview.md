# Agentic SDLC — Agent Definitions

This directory contains **Claude Agent** instruction files that automate quality
gates, post-merge tasks, and code-review assistance throughout the software
development lifecycle.

## Directory Structure

```
agents/
├── pre-hooks/      Agents that run BEFORE a PR is merged
│   ├── 01-test-runner.md        Block merge if any Jest test fails
│   ├── 02-doc-quality.md        Block merge if doc coverage < 100 %
│   └── 03-security-scan.md      Block merge on high-severity vulnerabilities
└── post-hooks/     Agents that run AFTER a PR is merged to main
    ├── 01-changelog-update.md   Append a new entry to CHANGELOG.md
    ├── 02-smoke-test.md         Verify the deployed service is healthy
    └── 03-pr-summary.md         Generate a human-readable release note
```

## How Agents Are Triggered

Agents are invoked by GitHub Actions workflows in `.github/workflows/`:

| Workflow | Trigger | Agents invoked |
|---|---|---|
| `agentic-pre-hooks.yml` | PR opened / synchronised | All `pre-hooks/` agents |
| `agentic-post-merge.yml` | Push to `main` | All `post-hooks/` agents |

## Running Agents Locally

```bash
# Pre-hook: validate docs before you open a PR
node scripts/check-docs.js

# Pre-hook: run full test suite
cd backend && npm test

# Post-hook: update changelog manually
node scripts/update-changelog.js
```

## Agent File Format

Each `.md` file follows this frontmatter schema:

```yaml
---
name: <kebab-case-id>
phase: pre-merge | post-merge
blocking: true | false     # true = workflow fails if this agent fails
model: claude-sonnet-4-6   # override if needed
---
```
