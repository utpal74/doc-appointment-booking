---
name: project-conventions
description: Use when exploring or changing code in this repo's Express + Prisma + React + Jest stack to follow its existing backend, frontend, API, error-handling, and testing patterns. Not for projects built on a different stack.
---

# Project Conventions

Use this skill when a task needs project-wide implementation guidance. Inspect the current source and nearby tests before relying on a convention; the codebase is the source of truth when it differs from an example here.

## Project shape

- The backend is organized around Express routes, service modules, Zod schemas, Prisma, and Jest tests.
- The frontend is a React application that consumes backend API endpoints.
- Backend integration and unit tests live under `backend/__tests__/`.
- Prisma's schema and migration history live under `backend/prisma/`.

## Working conventions

- Follow the closest existing implementation and test pattern; avoid introducing parallel abstractions for an existing concern.
- Keep route handlers focused on HTTP concerns. Put domain and database operations in the appropriate service.
- Validate untrusted API input at the route boundary using the project's existing validation middleware and schemas.
- Map database records to intentional public response shapes; do not return internal records wholesale.
- Reuse existing error helpers, response shapes, logging, and authentication middleware.
- Update tests alongside behavior changes. Prefer targeted tests first, then the narrowest available project validation command.
- For changes that span backend and frontend, verify both the API contract and the user-visible loading, success, and failure states.
- Do not assume a path, exported symbol, test helper, or command from a guide still exists; confirm it in the current tree.

## Scope and safety

- Implement only the requested behavior and its necessary tests/documentation.
- Preserve unrelated working-tree changes.
- Never put credentials or real patient data in source code, logs, test fixtures, or generated documentation.
- For patient data handling, load `healthcare-data-privacy` as needed.
