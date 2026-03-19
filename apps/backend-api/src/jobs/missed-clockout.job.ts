import { timesheetService } from '../services/timesheet.service';

const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const THRESHOLD_HOURS = 14;

export function startMissedClockoutJob() {
  console.log('[missed-clockout] Job started — checking every 30 minutes');

  const run = async () => {
    try {
      const flagged = await timesheetService.detectMissedClockOuts(THRESHOLD_HOURS);
      if (flagged.length > 0) {
        console.log(`[missed-clockout] Flagged ${flagged.length} entries`);
      }
    } catch (err) {
      console.error('[missed-clockout] Error:', err);
    }
  };

  // Run once on startup, then on interval
  run();
  setInterval(run, INTERVAL_MS);
}
