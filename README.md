# ServiceCore Time Platform

ServiceCore is a full-stack SaaS platform for field service labor management — time tracking, payroll, compliance, and workforce analytics built for portable sanitation, septic, and dumpster rental businesses.

## Stack

- **Frontend:** Angular 21 + PrimeNG (manager dashboard), Angular 21 + Ionic 7 + Capacitor 6 (driver mobile app)
- **Backend:** Node 22 + Express 5 + PostgreSQL 16 + Prisma ORM
- **AI:** Anthropic Claude (NLQ, chatbot), Python scikit-learn (anomaly detection)
- **Infrastructure:** Nx 22.5 monorepo, Docker Compose, Railway (production), GitHub Actions CI
- **Security:** Helmet.js, JWT + refresh tokens, rate limiting, Zod validation, AI guardrails

## Apps

- `apps/manager-dashboard` — manager web dashboard (`http://localhost:4200`)
- `apps/driver-app` — driver mobile/web app (`http://localhost:4201`)
- `apps/backend-api` — REST + WebSocket backend (`http://localhost:3000`)

## Shared Libraries

- `libs/shared-models` — shared domain models/types
- `libs/api-client` — API client utilities
- `libs/hos-engine` — hours-of-service logic
- `libs/overtime-engine` — overtime calculation logic
- `libs/geofence` — geofence/domain support
- `libs/genkit-flows` — AI/genkit flow helpers

## Day 1 Setup

```bash
# use workspace Node version
nvm use

# install dependencies
npm install

# start all local services
npm run dev:all
```

Local URLs:

- Manager dashboard: `http://localhost:4200`
- Driver app: `http://localhost:4201`
- Backend API health: `http://localhost:3000/api/health`

Stop all three services:

```bash
npm run dev:stop
```

## Development Commands

```bash
# run all services together
npm run dev:all

# run individually
npm run dev:api
npm run dev:dashboard
npm run dev:driver

# stop common local ports
npm run dev:stop

# build/test/lint
npx nx run-many -t build
npx nx run-many -t test
npx nx run-many -t lint
```

## Environment Variables

Copy `.env.example` to `.env` and fill values as needed.

Most important local values:

- `PORT` (defaults to `3000` in backend app)
- `HOST` (optional, defaults to `localhost`)
- `JWT_SECRET` (used by API auth middleware/routes)
- integration keys (Kimai, TimeTrex, Twilio, SendGrid, etc.) only when those features are enabled

TimeTrex mode quick guide:

- **Demo-safe default**
  - `TIMETREX_INTEGRATION_ENABLED=false`
  - `TIMETREX_API_MODE=rest`
  - uses local stub/mock-backed payroll behavior for predictable demos
- **Real legacy RPC mode**
  - `TIMETREX_INTEGRATION_ENABLED=true`
  - `TIMETREX_API_MODE=legacy_rpc`
  - choose one auth path:
    - `TIMETREX_AUTH_MODE=env_session` with `TIMETREX_SESSION_COOKIE` + `TIMETREX_CSRF_TOKEN`
    - `TIMETREX_AUTH_MODE=rpc_login` with `TIMETREX_USERNAME` + `TIMETREX_PASSWORD`
- Quick auth visibility:
  - `GET /api/payroll/timetrex-auth-check`

## Auth and API Notes

- Public endpoint:
  - `GET /api/health`
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
- Protected endpoints require `Authorization: Bearer <token>`:
  - `/api/timesheets`, `/api/employees`, `/api/payroll`, `/api/compliance`, `/api/analytics`, `/api/ai`, `/api/schedule`
  - includes `/api/payroll/timetrex-auth-check` for quick TimeTrex auth diagnostics (HR/PAYROLL/SYSTEM roles)

Optional hardening:

- set `REQUIRE_API_KEY=true` and provide `SERVICECORE_API_KEY` in your environment
- when enabled, protected endpoints also require `x-api-key: <your-key>`

TimeTrex legacy RPC auth modes:

- `TIMETREX_AUTH_MODE=env_session` (default): uses `TIMETREX_SESSION_COOKIE` + `TIMETREX_CSRF_TOKEN`
- `TIMETREX_AUTH_MODE=rpc_login`: backend logs in using `TIMETREX_USERNAME` + `TIMETREX_PASSWORD`, caches session auth, and auto-retries once on auth expiry

Current login accepts any email/password and grants full SYSTEM_ADMIN access (demo mode). The dashboard login form is pre-filled with `admin@servicecore.io` / `demo` for one-click access.

## Troubleshooting

- **Node version mismatch**
  - this repo expects Node 22 (`.nvmrc`)
  - run `nvm use` before install/serve

- **Too many open files (`EMFILE`)**
  - frontend serve scripts are configured with polling to reduce watcher pressure
  - if needed, stop and restart with:
    - `npm run dev:stop`
    - `npm run dev:all`

- **Port already in use**
  - run `npm run dev:stop`

- **Nx Cloud warning in local sandboxed environments**
  - warnings can be ignored for local development

## Key Features

- **Timesheet Approval Queue** — daily entries with approve/flag/edit workflow
- **Pre-Payroll Audit** — confidence score, employee breakdown with expandable daily punches, one-click approve & export
- **AI Chat Assistant** — floating widget powered by Claude with workforce guardrails and live DB context
- **Driver Compliance** — CDL/DOT/HOS tracking with SMS alert notifications
- **Fleet Map** — real-time driver positions across Denver metro
- **Overtime Engine** — FLSA, state rules, Motor Carrier exemptions, CBA support
- **What-If Simulator** — model labor cost scenarios before committing
- **Auto-seed** — fresh demo data generated on server startup daily

## CI/CD

- **GitHub Actions** — lint, test, and build on every PR and push to main
- **Railway** — production deployment at `service-production-931a.up.railway.app`

## Current Roadmap

- [x] PrimeNG compatibility alignment for Angular 21.1
- [x] one-command local startup (`dev:all`)
- [x] local stop helper (`dev:stop`)
- [x] watcher stability updates for local serve
- [x] helmet.js + pino structured logging
- [x] GitHub Actions CI pipeline
- [x] floating AI chat widget with guardrails
- [x] payroll confidence score + approve & export
- [ ] replace remaining starter/scaffold docs in repo
- [ ] broaden e2e coverage for manager + driver critical paths

## Demo Runbook

- Standard walkthrough and recovery steps live in `docs/DEMO_RUNBOOK.md`.
- AGPL/process review guidance lives in `docs/AGPL_COMPLIANCE_CHECKLIST.md`.
- Recommended demo startup:
  - `npm run dev:demo`
  - `npm run demo:preflight`
