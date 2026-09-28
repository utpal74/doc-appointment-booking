# docs/input — User Story Drop Zone

Place your user story document here before starting the SDLC pipeline.

## Supported formats

| Format | Notes |
|---|---|
| `.docx` | Word document — text is extracted automatically via Python/PowerShell |
| `.txt` | Plain text |
| `.md` | Markdown |

## How it works

1. Drop your file here (e.g. `user-story.docx`).
2. The next time you type anything in Claude Code, the `check-input-hook.js` script detects the file and automatically triggers the `sdlc-orchestrator` agent.
3. The orchestrator runs all 8 SDLC steps unattended and opens a PR when complete.

## Manual trigger

If the auto-trigger does not fire, say:

> "Run the sdlc-orchestrator agent"

or invoke it directly as a subagent type named `sdlc-orchestrator`.

## One file at a time

The pipeline processes one user story per run. Archive or delete the processed file before dropping a new one.
