# Doctor Appointment Booking System

A phone-based clinic appointment booking system built end-to-end via an **Agentic SDLC cycle** using Claude Agent Mode.

Receptionists receive calls, open the browser UI, and book, cancel, or reschedule patient appointments. Patients receive an automatic SMS confirmation after every action.

---

## Quick Start

```bash
# 1 — Copy env file and fill in your values
cp .env.example .env

# 2 — Start the database
docker compose up -d db

# 3 — Run migrations and seed
cd backend
npm install
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/appointments \
  npx prisma migrate deploy && npx prisma db seed

# 4 — Generate a bcrypt hash for the receptionist password
node scripts/hash-password.js admin123
# → copy the hash into .env as RECEPTIONIST_PASSWORD_HASH

# 5 — Start the API (port 4000)
npm run dev

# 6 — Start the frontend (port 3000, new terminal)
cd ../frontend && npm install && npm run dev
```

Open **http://localhost:3000** — log in with `receptionist / admin123`.

---

## Running Tests

```bash
cd backend
npm test              # 109 unit + integration tests
```

```bash
node scripts/check-docs.js   # 181 document quality checks
```

---

## Project Documents

| Document | Purpose |
|---|---|
| [requirements.md](requirements.md) | FR-01–FR-08 and NFR-01–NFR-08 |
| [architecture.md](architecture.md) | System design, ER diagram, ADRs |
| [design-review.md](design-review.md) | Pre-code architecture review (12 findings) |
| [impl-plan.md](impl-plan.md) | 41-task dependency-ordered implementation plan |
| [code-review.md](code-review.md) | Post-implementation peer review (10 findings, all fixed) |
| [CHANGELOG.md](CHANGELOG.md) | Release history |

---

## Architecture

```
Browser (Receptionist)
  └── React 18 + Tailwind CSS
        └── POST/GET/PATCH /api/*
              └── Express 4 + Prisma 5
                    ├── PostgreSQL 16  (appointments, doctors, SMS logs)
                    └── Twilio SMS API (patient notifications)
```

Key design decisions: [architecture.md § ADRs](architecture.md#10-key-architecture-decisions)

---

## Departments & Doctors (seeded)

| Department | Doctors |
|---|---|
| Cardiology | Dr. Arjun Mehta, Dr. Nisha Kapoor |
| General Medicine | Dr. Priya Sharma, Dr. Suresh Iyer |
| Bone Health | Dr. Rajesh Patel, Dr. Ananya Bose |

---

## Environment Variables

See [.env.example](.env.example) for all required variables. Key ones:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session signing secret (required in production) |
| `PHONE_ENCRYPTION_KEY` | 64-char hex key for AES-256-GCM phone encryption |
| `PHONE_HMAC_SECRET` | HMAC secret for phone number lookup hashing |
| `TWILIO_*` | Twilio credentials (leave blank to disable SMS in dev) |

---

## CI / CD

GitHub Actions workflows in [`.github/workflows/`](.github/workflows/):

| Workflow | Trigger | Jobs |
|---|---|---|
| `ci.yml` | Every PR to `main` | Tests · Doc quality · Frontend build |
| `agentic-pre-hooks.yml` | PR opened / updated | Security scan · Doc gate · PR description check |
| `agentic-post-merge.yml` | Merge to `main` | Deployment health · Smoke test |

Claude Agent definitions in [`.github/agents/`](.github/agents/) automate pre-merge blocking checks and post-merge release tasks.

---

## Agentic SDLC Cycle

This project was built following a structured agentic cycle:

1. **Requirements** — Clarifying Q&A → `requirements.md`
2. **Architecture** — Component diagrams, tech choices, ADRs → `architecture.md`
3. **Design Review** — Pre-code review of architecture (12 findings) → `design-review.md`
4. **Implementation Plan** — 41 dependency-ordered tasks → `impl-plan.md`
5. **Implementation** — Full backend + frontend (53 files, ~7,500 LOC)
6. **Code Review** — Peer review (10 findings, all fixed) → `code-review.md`
7. **Tests** — 109 Jest tests + 181 doc checks
8. **PR** — This pull request, created by Claude Agent Mode

---

*Built with [Claude Agent Mode](https://claude.ai/code) · Anthropic*
