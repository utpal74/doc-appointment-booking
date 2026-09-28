---
name: debug-sms
description: Diagnose SMS delivery failures by walking through every failure point in the Twilio/NotificationService stack
model: claude-sonnet-4-6
---

# Skill: Debug SMS Delivery

## Purpose
The SMS path has six distinct failure points. This skill walks through each one
in order, from environment config down to the retry job, so you find the root
cause without guessing.

## When to Use
- A booking/cancel/reschedule action returns `smsStatus: "FAILED"` or `"DISABLED"`
- Patient reports never receiving a confirmation SMS
- `smsStatus` warning banner is showing in the UI
- Retry job is running but status stays `FAILED`

## Failure Points (in order)

### 1 — Twilio credentials not configured
```sql
-- Check: are the env vars present?
SELECT current_setting('app.twilio_configured', true);
```
```bash
# In the running container / local shell:
echo $TWILIO_ACCOUNT_SID   # must start with "AC"
echo $TWILIO_AUTH_TOKEN    # must be 32 chars
echo $TWILIO_PHONE_NUMBER  # must be E.164 format, e.g. +14155552671
```
If any are missing → `NotificationService.getTwilioClient()` returns `null`
→ smsLog status set to `FAILED`, function returns `'DISABLED'`.
**Fix:** set the three env vars and restart the server.

### 2 — SMS template missing from database
```sql
SELECT "messageType", LEFT("templateBody", 60)
FROM "SmsTemplate";
-- Must contain rows for: BOOKING, CANCELLATION, RESCHEDULING
```
If a row is missing → `send()` logs `'SMS template not found'` and returns `'FAILED'`.
**Fix:** run `node backend/prisma/seed.js` to restore seed data, or insert the
missing template row manually.

### 3 — Phone decryption failure
The stored `patientPhone` is AES-256-GCM encrypted. If `PHONE_ENCRYPTION_KEY`
differs between the write and read environment:
```bash
# Verify the key is the same value in all environments
echo $PHONE_ENCRYPTION_KEY | wc -c   # must be 65 chars (64 hex + newline)
```
A decryption error throws inside `dispatchSms` → caught → status `FAILED`.

### 4 — Twilio 2-second timeout
`dispatchSms` races Twilio against a 2 000 ms timeout. Slow networks or Twilio
outages cause the timeout to win first; the SMS still sends eventually via the
retry job.
```bash
# Check if Twilio is reachable:
curl -s -o /dev/null -w "%{http_code}" \
  https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID.json \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN"
# Expect 200; 401 = wrong creds; 000 = network blocked
```

### 5 — smsLog stuck in PENDING / retry job not running
```sql
SELECT id, "appointmentId", "messageType", status, "attemptCount", "createdAt"
FROM "SmsLog"
WHERE status IN ('PENDING', 'FAILED')
ORDER BY "createdAt" DESC
LIMIT 20;
```
The retry job (`backend/src/jobs/smsRetryJob.js`) polls every 60 s and
retries up to 3 times. If `attemptCount >= 3` the record stays `FAILED`
permanently — manual intervention required.
**Fix for stuck PENDING:** restart the server (job starts on boot).
**Fix for FAILED after 3 attempts:** resolve the root cause (steps 1–4 above),
then reset: `UPDATE "SmsLog" SET status='PENDING', "attemptCount"=0 WHERE id='<id>';`

### 6 — Phone number format rejected by Twilio
`normalisePhone()` strips a leading `+91` or `91` then re-adds `+91`.
If the stored number already has a different country code this produces a
malformed E.164 number.
```sql
-- Spot-check: decrypt a recent appointment's phone in psql
-- (requires pgcrypto or do it in Node)
SELECT id, LEFT("patientPhone", 20) FROM "Appointment" LIMIT 5;
```
Check Twilio error logs in the Twilio Console for the exact rejection reason.

## Quick Triage Checklist
```
[ ] TWILIO_ACCOUNT_SID starts with "AC" and is 34 chars
[ ] TWILIO_AUTH_TOKEN is set
[ ] TWILIO_PHONE_NUMBER is set in E.164 format
[ ] SmsTemplate table has BOOKING, CANCELLATION, RESCHEDULING rows
[ ] PHONE_ENCRYPTION_KEY is identical across all environments
[ ] SmsRetryJob is running (check server logs for "smsRetryJob tick")
[ ] No FAILED entries with attemptCount >= 3 blocking delivery
```
