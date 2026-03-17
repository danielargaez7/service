# ServiceCore Time Platform

ServiceCore is an Nx monorepo for time tracking, payroll/compliance workflows, and operations dashboards.
It includes two Angular frontends (manager + driver) and a Node/Express backend API.

## Stack

- Angular 21 + Ionic + PrimeNG
- Nx monorepo
- Node/Express API
- TypeScript across apps/libs

## Apps

- `apps/manager-dashboard` — manager web dashboard (`http://localhost:4200`)
- `apps/driver-app` — driver app/web build (`http://localhost:4201`)
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

Current login route is a demo/stub implementation for local dev:

- demo emails include:
  - `admin@servicecore.com`
  - `manager@servicecore.com`
  - `driver@servicecore.com`
  - `exec@servicecore.com`
- any non-empty password is currently accepted in the stub path

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

## Current Roadmap

- [x] PrimeNG compatibility alignment for Angular 21.1
- [x] one-command local startup (`dev:all`)
- [x] local stop helper (`dev:stop`)
- [x] watcher stability updates for local serve
- [ ] replace remaining starter/scaffold docs in repo
- [ ] broaden e2e coverage for manager + driver critical paths

## Demo Runbook

- Standard walkthrough and recovery steps live in `docs/DEMO_RUNBOOK.md`.
- Recommended demo startup:
  - `npm run dev:demo`
  - `npm run demo:preflight`
