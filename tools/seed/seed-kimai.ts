/**
 * Seed Script for Kimai API (scaffold).
 *
 * This script is intentionally conservative: it validates connectivity and
 * writes a small sample entry if KIMAI_* env vars are configured.
 *
 * Run:
 *   npx ts-node tools/seed/seed-kimai.ts
 */

const KIMAI_BASE_URL = process.env.KIMAI_BASE_URL ?? 'http://localhost:8001';
const KIMAI_API_TOKEN = process.env.KIMAI_API_TOKEN ?? '';

async function request(path: string, init: RequestInit = {}) {
  const res = await fetch(`${KIMAI_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(KIMAI_API_TOKEN ? { Authorization: `Bearer ${KIMAI_API_TOKEN}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error(`Kimai request failed (${res.status}) ${await res.text()}`);
  }

  return res.json();
}

async function main() {
  console.log('🌱 ServiceCore Kimai seed starting...');
  console.log(`   endpoint: ${KIMAI_BASE_URL}`);

  if (!KIMAI_API_TOKEN) {
    console.log('⚠️  KIMAI_API_TOKEN is not set. Skipping write operations.');
    console.log('✅ Connectivity-only seed complete.');
    return;
  }

  await request('/api/doc.json');
  console.log('✅ Kimai API reachable');

  // Minimal non-destructive sample creation payload.
  // Project/activity/user IDs should be adjusted to your Kimai instance.
  const now = new Date();
  const start = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const end = now.toISOString();

  try {
    await request('/api/timesheets', {
      method: 'POST',
      body: JSON.stringify({
        begin: start,
        end,
        description: 'ServiceCore seed sample entry',
        project: 1,
        activity: 1,
        user: 1,
      }),
    });
    console.log('✅ Sample Kimai timesheet created');
  } catch (error) {
    console.log('⚠️  Sample creation skipped. Check project/activity/user IDs in your Kimai instance.');
    console.log(`   reason: ${(error as Error).message}`);
  }

  console.log('✅ ServiceCore Kimai seed complete.');
}

main().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
