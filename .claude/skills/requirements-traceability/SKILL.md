---
name: requirements-traceability
description: Use when deriving implementation tasks, implementing or reviewing a feature, or verifying tests against artifacts/requirements.md.
---

# Requirements Traceability

Keep approved requirements connected to design, implementation, and verification without inventing coverage or expanding scope.

## Method

1. Read the approved `artifacts/requirements.md` and capture its functional requirement IDs, non-functional requirements, acceptance criteria, and recorded assumptions.
2. For each requirement, identify the relevant architecture component, implementation task, changed code surface, and test evidence when those artifacts exist.
3. Treat a test as evidence only after inspecting its assertions and confirming that it exercises the stated behavior.
4. Mark missing, partial, blocked, or ambiguous coverage explicitly. Do not infer success from a test name, a passing suite alone, or an agent's claim.
5. Flag implementation or plan items that are not supported by an approved requirement. Do not silently add them to scope.
6. When a requirement changes, update downstream artifacts consistently and preserve its ID where possible. If a requirement is materially different, record the change rather than pretending existing evidence still applies.

## Reporting

- Use the project's existing requirement IDs, normally `FR-NN` and `NFR-NN`.
- In test verification, report each requirement with its test file/name and a truthful status such as `PASS`, `GAP`, or `BLOCKED`.
- Cite concrete files and test cases; do not fabricate IDs, test names, results, or coverage percentages.
- Distinguish requirements that have no test from tests that exist but fail or do not fully verify the criterion.
- Carry open questions and assumptions forward so design and implementation do not treat them as approved facts.
