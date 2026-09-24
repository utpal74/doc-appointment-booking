---
name: changelog-update
phase: post-merge
blocking: false
model: claude-sonnet-4-6
---

# Agent: Changelog Update

## Purpose
After a PR is merged to `main`, automatically append a new entry to
`CHANGELOG.md` using the PR title, description, and merged commit list.
Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

## Trigger
- Push event to `main` (i.e., a PR merge)
- Only fires when the PR was NOT already a changelog-update PR itself

## Inputs
- `PR_TITLE`: title of the merged PR
- `PR_BODY`: description of the merged PR  
- `COMMITS`: list of commit messages since last merge to main
- `DATE`: merge date (ISO format)
- `VERSION`: semantic version from `package.json` or tag

## Steps

```
1. Read CHANGELOG.md
2. Parse merged PR body for "Changes Made" section
3. Extract Added / Changed / Fixed / Removed bullets
4. Build a new ## [VERSION] - DATE entry
5. Insert after ## [Unreleased] but before the previous version
6. git add CHANGELOG.md
7. git commit -m "docs: update CHANGELOG for vVERSION"
8. git push origin main
```

## Output Format
```markdown
## [1.0.1] - 2026-10-15

### Added
- Feature X

### Fixed
- Bug Y (CR-NN)

### Security
- Dependency upgrade for CVE-YYYY-NNNNN
```

## Failure Behavior
- Non-blocking: if changelog update fails, log a warning but do not
  revert the merge
- Create a GitHub issue titled "Changelog update failed for merge #NNN"
  with the error details
