---
name: scaffold-endpoint
description: Add a new REST API endpoint following the project's route→service→schema→test layering
model: claude-sonnet-4-6
---

# Skill: Scaffold API Endpoint

## Purpose
Generate all four layers required for a new REST endpoint in this project:
route handler, service method, Zod validation schema, and Jest test cases.
Ensures no layer is skipped and naming conventions stay consistent.

## When to Use
- Adding a new resource route (e.g. `/api/reports`, `/api/admin/...`)
- Extending an existing resource with a new action
- Any time a new `router.get/post/patch/delete` call is needed

## Inputs
- `RESOURCE` — plural noun for the route (e.g. `reports`, `doctors`)
- `ACTION` — verb describing the operation (e.g. `list`, `create`, `cancel`)
- `METHOD` — HTTP verb: GET | POST | PATCH | DELETE
- `AUTH` — whether the route requires the `authenticate` middleware (yes/no)

## Steps

```
1. backend/src/schemas/index.js
   - Add a new Zod schema: export const <Action><Resource>Schema = z.object({...})
   - Add it to the named exports at the bottom

2. backend/src/services/<Resource>Service.js  (create if it doesn't exist)
   - Add async function <action><Resource>({ ...params })
   - Follow the Prisma pattern: prisma.<model>.<operation>({ where, data, include })
   - Throw from helpers/errors.js for domain errors; never throw raw strings
   - Export the function at the bottom

3. backend/src/routes/<resource>.js  (create if it doesn't exist)
   - Import Router, the service, validate middleware, and the schema
   - Add: router.<method>('/<path>', [authenticate,] validate(Schema), async (req, res, next) => {...})
   - Map the DB model to a public shape via a local toPublic() function
   - Always wrap the handler body in try/catch and call next(err)

4. backend/src/app.js
   - Import the new router
   - Mount it: app.use('/api/<resource>', authenticate, <resource>Router)
   - (Only if the route needs global auth — check existing mount pattern)

5. backend/__tests__/integration/<resource>.test.js  (create if it doesn't exist)
   - Use the existing setup/testEnv.js helpers for DB seeding
   - Write at minimum: happy-path test + one 4xx validation test
   - Follow the describe/it naming convention used in appointments.test.js
```

## Conventions to Follow
- Route file: `src/routes/<resource>.js` (lowercase, singular or plural matching existing files)
- Service file: `src/services/<Resource>Service.js` (PascalCase)
- Schema name: `<Action><Resource>Schema` exported from `src/schemas/index.js`
- Error codes: only use codes already defined in `src/helpers/errors.js`; add new ones there if needed
- Never access `prisma` directly from a route — always go through the service layer

## Output
Four files created/modified:
1. `backend/src/schemas/index.js` — new schema added
2. `backend/src/services/<Resource>Service.js` — new method added
3. `backend/src/routes/<resource>.js` — new route handler added
4. `backend/__tests__/integration/<resource>.test.js` — tests added
