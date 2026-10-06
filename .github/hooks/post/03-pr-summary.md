---
name: pr-summary-generator
phase: post-merge
blocking: false
model: claude-sonnet-4-6
---

# Agent: PR Summary Generator

## Purpose
After a PR is merged, generate a concise, non-technical release note
suitable for sharing with stakeholders (product owner, QA, management).
Posts the summary as a comment on the merged PR.

## Trigger
- Push to `main` (PR merge detected by checking `github.event.head_commit.message`)

## Inputs
- Merged PR number, title, and body
- List of files changed
- Test results from CI artefacts (if available)

## Steps

```
1. Fetch the merged PR via GitHub API
2. Read PR body, extract "Summary" and "Changes Made" sections
3. Count files changed (added / modified / deleted)
4. Summarise in ≤5 bullet points, avoiding technical jargon
5. Note any "Known Limitations" from the PR body
6. Post as a comment on the PR prefixed with [Release Note]
```

## Output Format (example)
```markdown
**[Release Note] Doctor Appointment Booking — v1.0.0**

What's new in this release:

- 📅 Receptionists can now book, cancel, and reschedule patient
  appointments from a web browser
- 📱 Patients receive an SMS confirmation after every booking action
- 🔒 The system enforces secure login; only authorised staff can
  access patient records
- 🏥 Three departments are now live: Cardiology, General Medicine,
  and Bone Health

Known limitations in this release:
- SMS delivery requires Twilio credentials to be configured by an admin
- No mobile/patient-facing self-booking portal (planned for v2)
```

## Failure Behavior
- Non-blocking: if summary generation fails, skip silently
- The merged PR is not affected
