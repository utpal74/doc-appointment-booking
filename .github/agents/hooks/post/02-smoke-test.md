---
name: smoke-test
phase: post-merge
blocking: false
model: claude-sonnet-4-6
---

# Agent: Post-Deploy Smoke Test

## Purpose
After code is merged to `main` and the deployment pipeline has completed,
verify the live (staging or production) service is healthy by hitting the
`/health` endpoint and a set of critical API paths.

## Trigger
- Push to `main` (after CI passes)
- `DEPLOYMENT_URL` repository variable must be set

## Steps

```
1. sleep 30  # allow deployment to stabilise
2. GET $DEPLOYMENT_URL/health
   → expect: {"status":"ok","db":"connected"}
3. GET $DEPLOYMENT_URL/api/departments (no auth)
   → expect: HTTP 401 (auth gate is enforced)
4. POST $DEPLOYMENT_URL/api/auth/login (wrong creds)
   → expect: HTTP 401 {"error":{"code":"INVALID_CREDENTIALS",...}}
5. If all pass: post green check to commit status
6. If any fail: post red check + create GitHub issue for on-call
```

## Pass Criteria
- `/health` returns `{"status":"ok","db":"connected"}` within 10s
- `/api/departments` returns HTTP 401 (auth gate active)
- `/api/auth/login` with wrong credentials returns HTTP 401 (not 500)

## Failure Behavior
- Mark commit status as `failure` on GitHub
- Create a GitHub issue titled "Smoke test failed after merge #NNN":
  ```
  ## Smoke Test Failure

  **Commit:** abc1234
  **Environment:** $DEPLOYMENT_URL
  **Failed step:** GET /health

  **Response:**
  HTTP 503 {"status":"error","db":"disconnected"}

  **Action required:** Check database connectivity on staging.
  ```
