---
paths:
  - "backend/src/**/*.js"
  - "backend/__tests__/**/*.js"
  - "backend/prisma/**/*.js"
  - "backend/prisma/**/*.prisma"
  - "frontend/src/**/*.js"
  - "frontend/src/**/*.jsx"
---

# Healthcare data and secrets

- Treat patient names, phone numbers, appointment details, and linkable
  identifiers as sensitive. Use synthetic values in tests, examples, fixtures,
  screenshots, logs, and documentation; never copy production records into
  development artifacts.
- Do not log or expose patient data, credentials, encryption keys, or provider
  responses in command output, errors, metrics, traces, test failures, or pull
  request evidence. Report secret configuration only as present/absent or valid/
  invalid in shape, never by printing its value.
- Keep secrets in environment configuration. Do not place credentials or
  encryption keys in source files, migrations, tests, or examples.
- Before changing phone persistence, read the current Prisma schema and
  `backend/src/helpers/crypto.js`. Preserve the separation between encrypted
  phone values and lookup hashes; SQL migrations must not transform ciphertext.
- Avoid real external SMS sends and production-data queries in tests unless
  explicitly authorized and safely isolated.
- These safeguards do not constitute a claim of regulatory compliance.
