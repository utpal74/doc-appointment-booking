---
paths:
  - "backend/src/**/*.js"
  - "backend/prisma/**/*.js"
  - "backend/prisma/**/*.prisma"
---

# Backend conventions

- Keep Express routes focused on HTTP concerns. Validate request input at the
  route boundary with the existing Zod schemas and `validate` middleware; follow
  the established status codes and error response shape.
- Put domain behavior and Prisma operations in the existing service layer.
  Reuse the shared error, logging, sanitization, authentication, and validation
  helpers instead of introducing parallel patterns.
- Map Prisma results to explicit public response shapes. Do not expose complete
  database records, internal fields, or secrets in API responses.
- Preserve existing transaction, uniqueness, and appointment-state guarantees
  when changing booking, cancellation, or rescheduling behavior.
- For schema changes, follow the project's Prisma migration workflow and protect
  existing data. Never edit an applied migration to change its behavior.
