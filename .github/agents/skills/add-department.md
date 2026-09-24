---
name: add-department
description: Add a new medical department and its doctors without breaking existing data or tests
model: claude-sonnet-4-6
---

# Skill: Add Department or Doctor

## Purpose
Adding a new department or doctor touches five places: Prisma seed, potentially
a schema migration (if new seed data references new enum values), the frontend
department dropdown, test fixtures, and the doc-quality check list. Missing any
one of these causes either a runtime error or a failing pre-merge check.

## When to Use
- Clinic is onboarding a new department (e.g. Neurology, Paediatrics)
- A new doctor is joining an existing department
- Seed data needs to be refreshed after a database reset

## Current State (v1.0.0 baseline)
```
Departments: Cardiology, General Medicine, Bone Health
Doctors per department: 2 each (6 total)
```

## Steps

### 1 — Update seed data
File: `backend/prisma/seed.js`

Add the department block following the existing pattern:
```js
const newDept = await prisma.department.upsert({
  where: { name: 'Neurology' },
  update: {},
  create: { name: 'Neurology' },
});

await prisma.doctor.createMany({
  skipDuplicates: true,
  data: [
    { name: 'Dr. A Sharma', departmentId: newDept.id },
    { name: 'Dr. B Patel',  departmentId: newDept.id },
  ],
});
```

### 2 — Check for schema migration need
The `Department` and `Doctor` models use string names — no enum.
A new department is pure seed data: **no migration required** unless you are
adding a new column to either model.

If a column is needed, create a migration first:
```bash
cd backend
npx prisma migrate dev --name add_<column>_to_<model>
```

### 3 — Re-run seed against the target database
```bash
cd backend
node prisma/seed.js
```
Seed uses `upsert` / `createMany({ skipDuplicates: true })` — safe to re-run.

### 4 — Update frontend department dropdown
File: `frontend/src/components/BookingForm.jsx`

The dropdown is populated from the `/api/departments` API response at runtime,
so **no hardcoded list to update** — the new department appears automatically
once seed is applied.

Verify by running the app and checking the "Department" select in the booking form.

### 5 — Update test fixtures
File: `backend/__tests__/setup/testEnv.js` (or wherever doctors are seeded for tests)

Add the new department/doctor to the test seed so integration tests can reference it.

### 6 — Update doc-quality check
File: `scripts/check-docs.js`

If `requirements.md` or `architecture.md` lists the departments explicitly,
update those references and add the new department to the check-docs assertions.

## Verification
```bash
# Confirm the new department appears in the API response
curl -s http://localhost:3001/api/departments \
  -H "Authorization: Bearer <token>" | jq '.[].name'

# Run the full test suite to catch any fixture gaps
cd backend && npm test
```

## Rollback
```sql
-- Remove the department and its doctors (cascade if FK is set)
DELETE FROM "Doctor" WHERE "departmentId" = (SELECT id FROM "Department" WHERE name = 'Neurology');
DELETE FROM "Department" WHERE name = 'Neurology';
```
