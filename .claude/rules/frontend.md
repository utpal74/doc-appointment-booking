---
paths:
  - "frontend/src/**/*.js"
  - "frontend/src/**/*.jsx"
---

# Frontend conventions

- Follow the existing React component, context, and page patterns. Keep UI
  changes consistent with the current application and avoid adding a second
  abstraction for an existing concern.
- Send API requests through the shared `frontend/src/api/client.js` client so
  credentials and normalized API errors are handled consistently.
- Keep loading, success, and failure states clear to the receptionist. Preserve
  form validation and prevent duplicate submissions where the existing flow
  does so.
- Keep frontend behavior aligned with the backend contract. When a change
  affects both, update and verify both sides rather than relying on an assumed
  response shape.
- Do not render sensitive values in diagnostics, debug output, or user-facing
  error messages unless the workflow explicitly requires them.
