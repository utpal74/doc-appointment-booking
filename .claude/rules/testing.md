---
paths:
  - "backend/__tests__/**/*.js"
---

# Test conventions

- Follow the existing Jest test structure: unit tests under `backend/__tests__/unit/`
  and API integration tests under `backend/__tests__/integration/`.
- For endpoint changes, cover the relevant success path and validation,
  authorization, not-found, and boundary behavior. Use the existing setup,
  fixtures, and Supertest patterns.
- Use synthetic patient information. Isolate database effects and avoid real
  provider calls; assert externally observable behavior rather than
  implementation details.
- Do not weaken or delete assertions merely to make a failing test pass. Fix the
  underlying behavior or update an assertion only when the intended contract
  has deliberately changed.
- Run the narrowest relevant test first, then use `cd backend && npm test` when
  the change warrants a full backend verification. Report failures accurately.
