# ServiceCore Demo Runbook

This runbook is the standard 10-20 minute demo path for ServiceCore local environments.

## 1) Pre-Demo Setup (Night Before)

```bash
# stop any stale local processes
npm run dev:stop

# start docker services
docker compose up -d

# run apps in demo-safe mode (TimeTrex integration disabled)
npm run dev:demo

# run service health checks
npm run demo:preflight
```

Expected status:
- manager dashboard up on `http://localhost:4200`
- driver app up on `http://localhost:4201`
- backend health green at `http://localhost:3000/api/health`
- docker services healthy (Kimai, TimeTrex mock, anomaly service)

## 2) Demo Credentials

Use any non-empty password with:
- `admin@servicecore.com`
- `manager@servicecore.com`
- `driver@servicecore.com`
- `exec@servicecore.com`

## 3) Live Demo Sequence

1. **Driver clock-in flow**
   - Open driver app and clock in.
   - Confirm successful punch.
2. **Manager operations**
   - Open manager dashboard.
   - Show timesheets/compliance snapshots.
3. **Payroll preview**
   - Trigger payroll preview in manager dashboard.
   - Confirm results and anomaly metadata.
4. **AI capability**
   - Run NLQ or chat query tied to payroll/timesheet context.
   - Optionally provide thumbs up/down feedback.

## 4) Fast Recovery Commands

```bash
# if ports are stuck
npm run dev:stop

# if app state is stale
npm run dev:demo

# re-check health
npm run demo:preflight
```

## 5) Demo Guardrails

- Keep `TIMETREX_INTEGRATION_ENABLED=false` during demos unless real credentials are verified.
- Never use live production API keys in demo files.
- If any single subsystem fails, continue with mocked/stubbed views and complete the sequence.
