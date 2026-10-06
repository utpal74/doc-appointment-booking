---
name: frontend-backend-change
description: Use when a feature changes both the React frontend and Express backend or modifies an API contract consumed by the frontend.
---

# Frontend and Backend Change

Use this checklist only for changes that cross the frontend/API boundary. Confirm current file paths and conventions from the codebase before editing.

## Contract first

- Identify the endpoint, HTTP method, authentication requirements, request shape, response shape, and error behavior from the existing route and client.
- Keep backend validation authoritative; frontend validation improves usability but is not a substitute.
- Preserve the project's established response and error formats. Update both producer and consumer when a contract change is intentional.
- Avoid exposing database-only fields or sensitive patient information to the browser.

## Backend

- Trace the change through schema/validation, route, service, persistence, and tests as applicable.
- Apply authentication and authorization consistently with neighboring routes.
- Use existing error handling and domain helpers; make failures explicit rather than returning success-shaped fallbacks.

## Frontend

- Follow the existing API client, state-management, and component patterns.
- Handle loading, success, validation errors, authorization failures, and server/network errors as relevant.
- Prevent duplicate submissions where the surrounding interaction requires it.
- Keep displayed data to the minimum needed for the user experience.

## Verification

- Add or update backend tests for the API contract and relevant validation/error cases.
- Update frontend tests if the project has relevant coverage; otherwise verify the changed user flow using the available project checks.
- Confirm that UI field names and types match the actual API response and that no stale hardcoded assumptions remain.
- Load `requirements-traceability` when the feature is tied to approved requirements.
