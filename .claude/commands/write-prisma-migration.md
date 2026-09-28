---
name: write-prisma-migration
description: Write and apply a safe Prisma migration for this schema, accounting for encrypted fields, unique indexes, and serializable transactions
model: claude-sonnet-4-6
---

# Skill: Write Prisma Migration

## Purpose
Guide through writing and applying a Prisma schema migration that is safe for
the production data model — specifically: encrypted phone columns, the slot
uniqueness index, the `previousAppointmentId` self-reference, and serializable
transaction isolation.

## When to Use
- Adding a new column to `Appointment`, `Doctor`, `Department`, or `SmsLog`
- Changing a column type or constraint
- Adding or removing an index
- Renaming a field (destructive — see warning below)

## Schema Locations
```
backend/prisma/schema.prisma   — source of truth
backend/prisma/migrations/     — applied migration history
```

## Steps

### 1 — Edit schema.prisma
Make your change in `backend/prisma/schema.prisma`.

Key constraints to preserve:
```prisma
// Slot uniqueness — never remove this index
@@unique([doctorId, appointmentDate, slotTime], name: "doctor_slot_unique")

// Self-reference for reschedule chain
previousAppointmentId  String?  @map("previous_appointment_id")
previousAppointment    Appointment? @relation("RescheduleChain", fields: [previousAppointmentId], references: [id])
```

### 2 — Generate the migration
```bash
cd backend
npx prisma migrate dev --name <describe_the_change>
# Example: --name add_notes_to_appointment
```
This creates `backend/prisma/migrations/<timestamp>_<name>/migration.sql`
and applies it to the local dev database.

### 3 — Review the generated SQL before committing
```bash
cat backend/prisma/migrations/<timestamp>_<name>/migration.sql
```

**Red flags to check:**
- `DROP COLUMN` on `patient_phone` or `patient_phone_hash` — these hold
  encrypted/hashed PII; dropping them is irreversible
- `ALTER COLUMN ... SET NOT NULL` on an existing column without a DEFAULT —
  will fail if any rows exist; add a DEFAULT or backfill first
- Removing `doctor_slot_unique` index — breaks the double-booking guarantee;
  never remove without a replacement constraint

### 4 — Backfill pattern for NOT NULL additions
If adding a required column to a table that already has rows:
```prisma
// Step A: add as nullable first
newField  String?

// Step B: after backfill migration runs, change to required
newField  String
```
```sql
-- In the migration SQL, add the backfill before the NOT NULL constraint:
ALTER TABLE "Appointment" ADD COLUMN "priority" TEXT;
UPDATE "Appointment" SET "priority" = 'NORMAL';
ALTER TABLE "Appointment" ALTER COLUMN "priority" SET NOT NULL;
```

### 5 — Apply to staging / production
```bash
# Never use `migrate dev` in production — use deploy:
npx prisma migrate deploy
```

### 6 — Regenerate the Prisma client
```bash
npx prisma generate
```
Required after any schema change so `prisma.<model>` typings update.

### 7 — Run tests to confirm nothing broke
```bash
cd backend && npm test
```

## Renaming Warning
Prisma treats a rename as `DROP COLUMN` + `ADD COLUMN`, losing all data.
To rename safely:
1. Add the new column (nullable)
2. Backfill values from the old column
3. Make new column NOT NULL
4. Drop the old column in a separate migration

## Column-level Encryption Note
`patientPhone` is encrypted at the application layer (AES-256-GCM in
`helpers/crypto.js`). Prisma migrations must never try to transform its value
in SQL — always read, decrypt in Node, re-encrypt, write back.
