---
name: healthcare-data-privacy
description: Use when changing, testing, reviewing, logging, or documenting patient data, phone numbers, authentication secrets, or appointment records in this project.
---

# Healthcare Data Privacy

Apply these safeguards whenever working with patient or appointment information. This guidance is not a compliance certification; follow applicable organizational and legal requirements as well.

## Data handling

- Treat patient names, phone numbers, appointment details, and identifiers that can be linked to a patient as sensitive.
- Use synthetic values in tests, fixtures, screenshots, examples, and documentation. Never copy production records into development artifacts.
- Do not print, log, or include secret values or patient data in command output, errors, metrics, traces, test failure messages, or pull request evidence.
- When checking whether a secret is configured, report only whether it is present and valid in shape; do not display its value.
- Keep API responses limited to fields required by the client. Check that logs and error responses do not serialize whole request, database, or provider objects.

## Encryption and secrets

- Read the current Prisma schema and crypto helper before changing phone persistence. This project handles `patientPhone` encryption in the application layer; SQL migrations must not transform ciphertext.
- Preserve the separation between encrypted phone values and any lookup hash. Do not weaken, bypass, or silently change these mechanisms.
- Keep credentials and encryption keys in environment configuration, not source, migration SQL, tests, or examples.
- Never recommend resetting, rotating, or reusing a key without explaining the impact on already-encrypted data and using the project's established operational process.

## Tests and reviews

- Use clearly synthetic test data and assert that sensitive values are absent from responses or logs where relevant.
- Review new debug output and provider error handling for accidental disclosure.
- Avoid real external sends or production-data queries during tests unless explicitly authorized and safely isolated.
- Do not claim a regulatory control is satisfied solely because code follows this checklist.
