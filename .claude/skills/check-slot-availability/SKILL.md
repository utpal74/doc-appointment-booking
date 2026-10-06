---
name: check-slot-availability
description: Appointment-booking app only — query and debug this repo's doctor slot availability, including its Sunday blocking, 10:00–18:30 slot grid, and double-booking conflict detection
---

# Skill: Check Slot Availability

## Purpose
Slot conflicts are the most critical business rule in this system. This skill
documents how slots are generated, validated, and protected against
double-booking, with SQL and Node.js snippets to inspect availability and trace
why a slot is rejected.

Verify the facts below against `backend/src/services/SlotService.js`,
`backend/src/schemas/index.js`, `backend/src/routes/slots.js`, and
`backend/prisma/migrations/` before relying on them; the code is the source of
truth.

## When to Use
- A booking or reschedule returns `409 SLOT_UNAVAILABLE` unexpectedly
- A slot appears available in the UI but fails on submit
- Testing that Sunday and past dates are rejected
- Auditing how many slots are free for a doctor on a given day
- Verifying that a cancellation or reschedule freed the old slot

## Valid Slot Times
`SlotService.generateAllSlots()` builds 30-minute slots from 10:00 up to (not
including) 19:00 — **18 slots per doctor per day**:
```
10:00, 10:30, 11:00, 11:30, 12:00, 12:30, 13:00, 13:30, 14:00,
14:30, 15:00, 15:30, 16:00, 16:30, 17:00, 17:30, 18:00, 18:30
```
- Request schemas only check the `HH:MM` format. `AppointmentService` then calls
  `SlotService.validateSlot()`; any value not in the list above (for example
  `09:30`, `19:00`, or `10:15`) is rejected with `422 INVALID_DATE`.
- `GET /api/slots?doctorId=&date=` returns `{ date, doctorId, availableSlots }`:
  all 18 slots minus those held by `CONFIRMED` appointments.

## Date Rules (Sundays and past dates)
Sundays are blocked on **both** sides:
- **Backend:** `BookAppointmentSchema` and `RescheduleSchema` reject Sunday
  dates (`isWeekday`, using `getUTCDay()`) with the message
  "Appointments are not available on Sundays", and reject dates before today.
  `GET /api/slots` returns `422 INVALID_DATE` for a Sunday.
- **Frontend:** `BookingForm.jsx` shows "Sundays are not available" and prevents
  choosing a Sunday.

Pass dates as `YYYY-MM-DD`. The Sunday check uses UTC, so tests should use date
strings rather than locally constructed `Date` objects near midnight.

## Double-Booking Protection
Two layers protect each `(doctorId, appointmentDate, slotTime)`:
1. **Serializable transaction:** `createAppointment` and
   `rescheduleAppointment` check for an existing `CONFIRMED` appointment inside
   a `Serializable` transaction. A conflict, or a Prisma serialization failure
   (`P2034`) from a concurrent booking, becomes `409 SLOT_UNAVAILABLE`.
2. **Partial unique index:** migration `add_slot_unique_index` creates
   `"UX_appt_slot"` on `("doctorId", "appointmentDate", "slotTime") WHERE
   status = 'CONFIRMED'`. It is defined in SQL, not in `schema.prisma`, so
   Prisma will not recreate it if it is dropped.

Only `CONFIRMED` appointments hold a slot:
- **Cancel** sets status to `CANCELLED`, which frees the slot.
- **Reschedule** sets the old appointment to `RESCHEDULED` (freeing its slot)
  and creates a new `CONFIRMED` appointment with `previousAppointmentId`
  pointing to the original.

## Queries
These queries avoid selecting patient names or phone values. Do not add them
when sharing output; see the `healthcare-data-privacy` skill.

### List taken slots for a doctor on a date
```sql
SELECT "slotTime", status, id
FROM "Appointment"
WHERE "doctorId" = '<doctor-uuid>'
  AND "appointmentDate" = '2026-10-15'
  AND status = 'CONFIRMED'
ORDER BY "slotTime";
```

### List free slots for a doctor on a date
```sql
SELECT s.slot
FROM (VALUES
  ('10:00'),('10:30'),('11:00'),('11:30'),('12:00'),('12:30'),
  ('13:00'),('13:30'),('14:00'),('14:30'),('15:00'),('15:30'),
  ('16:00'),('16:30'),('17:00'),('17:30'),('18:00'),('18:30')
) AS s(slot)
WHERE s.slot NOT IN (
  SELECT "slotTime"
  FROM "Appointment"
  WHERE "doctorId" = '<doctor-uuid>'
    AND "appointmentDate" = '2026-10-15'
    AND status = 'CONFIRMED'
)
ORDER BY s.slot;
```

### Check if a specific slot is taken
```sql
SELECT id, status, "createdAt"
FROM "Appointment"
WHERE "doctorId"        = '<doctor-uuid>'
  AND "appointmentDate" = '2026-10-15'
  AND "slotTime"        = '10:00'
  AND status            = 'CONFIRMED';
-- Empty result → slot is free
-- One row      → slot is taken by that appointment
```

### Trace a reschedule chain
```sql
WITH RECURSIVE chain AS (
  SELECT id, status, "slotTime", "appointmentDate", "previousAppointmentId"
  FROM "Appointment"
  WHERE id = '<appointment-uuid>'
  UNION ALL
  SELECT a.id, a.status, a."slotTime", a."appointmentDate", a."previousAppointmentId"
  FROM "Appointment" a
  JOIN chain c ON a.id = c."previousAppointmentId"
)
SELECT * FROM chain ORDER BY "appointmentDate" DESC;
-- Expect one CONFIRMED head and RESCHEDULED predecessors
```

### Count booked slots today across doctors
```sql
SELECT d.name AS doctor, COUNT(*) AS booked_slots
FROM "Appointment" a
JOIN "Doctor" d ON d.id = a."doctorId"
WHERE a."appointmentDate" = CURRENT_DATE
  AND a.status = 'CONFIRMED'
GROUP BY d.name
ORDER BY booked_slots DESC;
```

## Node.js — Programmatic Check
Run from `backend/` with `DATABASE_URL` set to a non-production database:
```js
const prisma = require('./src/lib/prisma');
const SlotService = require('./src/services/SlotService');

(async () => {
  const doctorId = '<doctor-uuid>';
  const date = '2026-10-15';
  const slot = '10:00';

  console.log('Valid slot?', SlotService.validateSlot(slot));
  console.log('Free slots:', await SlotService.getAvailableSlots(doctorId, date));

  const conflict = await prisma.appointment.findFirst({
    where: { doctorId, appointmentDate: new Date(date), slotTime: slot, status: 'CONFIRMED' },
    select: { id: true, status: true },
  });
  console.log('Conflict:', conflict ?? 'none — slot is free');
  await prisma.$disconnect();
})();
```

## Verifying the Unique Index
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'Appointment'
  AND indexname = 'UX_appt_slot';
-- indexdef should include: WHERE (status = 'CONFIRMED'::"AppointmentStatus")
```
If the index is missing, apply pending migrations with `npx prisma migrate deploy`
in `backend/`. Because the index is created with `IF NOT EXISTS` in a migration
that is already recorded as applied, recreating a dropped index requires running
that migration's SQL manually.

## Test Cases to Cover
- Each boundary slot: `10:00` and `18:30` are accepted; `09:30` and `19:00` are rejected with `422`.
- Off-grid time (`10:15`) is rejected with `422 INVALID_DATE`; a malformed time (`9:00`) fails schema validation with `422 VALIDATION_ERROR`.
- A Sunday date is rejected by booking, reschedule, and `GET /api/slots`.
- A past date is rejected by booking and reschedule.
- A second booking of the same doctor, date, and slot returns `409 SLOT_UNAVAILABLE`.
- Cancelling frees the slot so it can be booked again.
- Rescheduling marks the original `RESCHEDULED`, frees its slot, and links the new appointment.
