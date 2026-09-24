---
name: security-scan
phase: pre-merge
blocking: true
model: claude-sonnet-4-6
---

# Agent: Security Scan

## Purpose
Perform a pre-merge security audit:
1. Run `npm audit --audit-level=high` to catch known CVEs
2. Verify no `.env` file (real secrets) is committed
3. Verify no hardcoded credentials appear in source files
4. Verify the global error handler doesn't leak internals (CR-07 fix present)

## Trigger
- PR opened against `main`
- Any commit that modifies `package.json`, `package-lock.json`, or `src/**`

## Steps

```
1. cd backend && npm audit --audit-level=high
2. git ls-files | grep -E '^\.env$' (must return empty)
3. grep -rn 'AC[a-f0-9]{32}' src/  (no Twilio SIDs in source)
4. grep -rn 'password.*=.*["\x27][^$\{]' src/ (no hardcoded passwords)
5. Verify app.js error handler contains "status < 500" (CR-07 guard)
6. Verify SESSION_SECRET check for production in app.js (CR-06 guard)
```

## Pass Criteria
- `npm audit` reports 0 high or critical vulnerabilities
- No `.env` files in git tree
- No hardcoded Twilio SIDs or passwords
- CR-06 and CR-07 guards are present in source

## Failure Behavior
- Set GitHub check status to **FAILED** for any high/critical CVE
- Post PR comment with CVE details and recommended patch version
- Block merge until CVEs are resolved or explicitly suppressed via `.npmrc`

## Known Acceptable Risks (update as needed)
- Low/moderate severity in dev-only dependencies (jest, pino-pretty): acceptable
- Any `high` or `critical` in production dependencies: must be fixed before merge
