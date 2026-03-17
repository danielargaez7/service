/* eslint-disable no-console */
const checks = [
  { name: "Manager Dashboard", url: "http://localhost:4200" },
  { name: "Driver App", url: "http://localhost:4201" },
  { name: "Backend API", url: "http://localhost:3000/api/health" },
  { name: "Kimai", url: "http://localhost:8001" },
  { name: "TimeTrex", url: "http://localhost:8002/health" },
  { name: "Anomaly Service", url: "http://localhost:8003/health" },
];

async function checkUrl(name, url) {
  try {
    const response = await fetch(url);
    const ok = response.ok;
    return { name, url, ok, status: response.status };
  } catch {
    return { name, url, ok: false, status: "UNREACHABLE" };
  }
}

async function main() {
  console.log("ServiceCore demo preflight\n");
  console.log(
    `TIMETREX_INTEGRATION_ENABLED=${process.env.TIMETREX_INTEGRATION_ENABLED ?? "(unset)"}`
  );
  console.log(`TIMETREX_API_MODE=${process.env.TIMETREX_API_MODE ?? "(unset)"}\n`);

  const results = await Promise.all(checks.map((check) => checkUrl(check.name, check.url)));

  for (const result of results) {
    const marker = result.ok ? "OK " : "FAIL";
    console.log(`${marker} | ${result.name} | ${result.status} | ${result.url}`);
  }

  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    console.log("\nPreflight failed. Start services with `npm run dev:demo` and retry.");
    process.exit(1);
  }

  console.log("\nPreflight passed. Demo environment is ready.");
}

main();
