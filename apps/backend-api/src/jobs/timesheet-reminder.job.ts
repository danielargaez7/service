import prisma from '../prisma';
import { NotificationService } from '../services/notification.service';

const notificationService = new NotificationService();

// Run daily at configured time (default: every 4 hours during business hours)
const INTERVAL_MS = 4 * 60 * 60 * 1000;

/**
 * Finds employees who have worked (have time entries) but haven't
 * submitted their timesheets for review. Sends email reminders.
 */
async function checkAndRemind(): Promise<void> {
  try {
    // Get the current pay period (semi-monthly: 1-15 and 16-end)
    const now = new Date();
    const day = now.getDate();
    const periodStart = day <= 15
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth(), 16);
    const periodEnd = day <= 15
      ? new Date(now.getFullYear(), now.getMonth(), 15, 23, 59, 59)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Only remind in the last 3 days of the pay period
    const daysUntilEnd = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilEnd > 3) {
      return;
    }

    // Find employees with PENDING entries (not yet submitted)
    const pendingEntries = await prisma.timeEntry.findMany({
      where: {
        clockIn: { gte: periodStart, lte: periodEnd },
        status: 'PENDING',
        deletedAt: null,
      },
      include: { employee: true },
    });

    // Group by employee
    const byEmployee = new Map<string, { email: string; name: string; count: number }>();
    for (const entry of pendingEntries) {
      if (!entry.employee) continue;
      const existing = byEmployee.get(entry.employeeId);
      if (existing) {
        existing.count++;
      } else {
        byEmployee.set(entry.employeeId, {
          email: entry.employee.email,
          name: `${entry.employee.firstName} ${entry.employee.lastName}`,
          count: 1,
        });
      }
    }

    if (byEmployee.size === 0) {
      console.log('[timesheet-reminder] No pending timesheets to remind about.');
      return;
    }

    // Send reminders
    let sent = 0;
    for (const [, emp] of byEmployee) {
      const result = await notificationService.sendEmail(
        emp.email,
        'Timesheet Submission Reminder — ServiceCore',
        `Hi ${emp.name},\n\nYou have ${emp.count} timesheet ${emp.count === 1 ? 'entry' : 'entries'} pending submission for the current pay period (${periodStart.toLocaleDateString()} – ${periodEnd.toLocaleDateString()}).\n\nPlease submit your timesheets for manager review before the pay period closes.\n\nThank you,\nServiceCore Time Tracking`
      );

      if (result.delivered) sent++;
    }

    console.log(`[timesheet-reminder] Sent ${sent}/${byEmployee.size} reminders (${daysUntilEnd} days until period close)`);
  } catch (err) {
    console.error('[timesheet-reminder] Error:', err);
  }
}

export function startTimesheetReminderJob(): void {
  console.log('[timesheet-reminder] Job started — checking every 4 hours');
  // Run once on startup
  checkAndRemind();
  setInterval(checkAndRemind, INTERVAL_MS);
}
