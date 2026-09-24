---
name: check-slot-availability
description: Query and debug slot availability for a given doctor/date, including Sunday blocking, valid slot times, and conflict detection
model: claude-sonnet-4-6
---

# Skill: Check Slot Availability

## Purpose
Slot conflicts are the most critical business rule in this system. This skill
provides SQL queries and Node.js snippets to inspect availability, trace why a
slot is being rejected, and verify the double-booking guarantee is working.

## When to Use
- A booking returns `409 SLOT_UNAVAILABLE` unexpectedly
- A slot appears available in the UI but fails on submit
- Testing that Sunday dates are correctly blocked
- Auditing how many slots are free for a doctor on a given day
- Verifying that a reschedule correctly freed the old slot

## Valid Slot Times
`SlotService.validateSlot()` only accepts these exact strings:
```
09:00, 09:30, 10:00, 10:30, 11:00, 11:30
14:00, 14:30, 15:00, 15:30, 16:00, 16:30
```
Any other value → `INVALID_DATE` error.

## Sunday Blocking
Sundays are blocked at the **frontend** (`BookingForm.jsx` disables Sunday dates
in the date picker). The backend does NOT have a Sunday guard in `AppointmentService` —
it relies on the frontend. If you hit Sunday slots via direct API calls, they
will succeed. Keep this in mind when writing tests.

## Queries

### List all taken slots for a doctor on a date
```sql
SELECT "slotTime", status, "patientName", id
FROM "Appointment"
WHERE "doctorId" = '<doctor-uuid>'
  AND "appointmentDate" = '2026-10-15'
  AND status = 'CONFIRMED'
ORDER BY "slotTime";
```

### List all FREE slots for a doctor on a date
```sql
SELECT s.slot
FROM (VALUES
  ('09:00'),('09:30'),('10:00'),('10:30'),('11:00'),('11:30'),
  ('14:00'),('14:30'),('15:00'),('15:30'),('16:00'),('16:30')
) AS s(slot)
WHERE s.slot NOT IN (
  SELECT "slotTime"
  FROM "Appointment"
  WHERE "doctorId" = '<doctor-uuid>'
    AND "appointmentDate" = '2026-10-15'
    AND status = 'CONFIRMED'
);
```

### Check if a specific slot is taken
```sql
SELECT id, status, "patientName", "createdAt"
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
```

### Count all slots taken today across all doctors
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
```js
const prisma = require('./backend/src/lib/prisma');
const SlotService = require('./backend/src/services/SlotService');

const doctorId = '<uuid>';
const date = new Date('2026-10-15');
const slot = '10:00';

// 1. Validate slot format
console.log('Valid slot?', SlotService.validateSlot(slot));

// 2. Check for conflict
const conflict = await prisma.appointment.findFirst({
  where: { doctorId, appointmentDate: date, slotTime: slot, status: 'CONFIRMED' },
});
console.log('Conflict:', conflict ?? 'none — slot is free');
```

## Verifying the Unique Index
```sql
-- Confirm the index exists (prevents race conditions at DB level)
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'Appointment'
  AND indexname = 'doctor_slot_unique';
```
If this index is missing, concurrent bookings can double-book.
Re-apply via: `npx prisma migrate deploy` in `backend/`.
