---
name: test-runner
phase: pre-merge
blocking: true
model: claude-sonnet-4-6
---

# Agent: Test Runner

## Purpose
Run the full Jest test suite (unit + integration) before allowing a PR to merge.
Block the merge if any test fails.

## Trigger
- PR opened against `main`
- New commits pushed to a PR branch
- PR marked "Ready for Review"

## Pre-conditions
- PostgreSQL container is running (Docker Compose `db` service or GitHub Actions service)
- `DATABASE_URL` points to a test-specific database (`appointments_test`)
- All required environment variables are available from CI secrets

## Steps

```
1. cd backend
2. npm ci
3. npx prisma generate
4. npx prisma migrate deploy
5. node prisma/seed.js
6. npm test -- --forceExit
```

## Pass Criteria
- Exit code 0 from Jest
- Output contains: `Tests: N passed, N total` with 0 failures
- Output does NOT contain `FAIL __tests__/`

## Failure Behavior
- Set GitHub check status to **FAILED**
- Post a PR comment listing the failing test names:
  ```
  ❌ Test Runner — 3 / 109 tests failing

  Failed tests:
  - AppointmentService › cancelAppointment › 409 when cancelling RESCHEDULED
  - SlotService › validateSlot › returns false for 19:00
  - crypto › hashPhone › same input produces same hash
  ```
- Block the merge (required check)

## Expected Output (passing)
```
Tests: 109 passed, 109 total
Test Suites: 8 passed, 8 total
✅ Test Runner — 109/109 tests pass — merge allowed
```
