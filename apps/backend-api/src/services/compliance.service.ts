import {
  Certification,
  ComplianceRisk,
  ComplianceSeverity,
} from '@servicecore/shared-models';

const severityWeight: Record<ComplianceSeverity, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

interface DutyEntry {
  startTime: Date;
  endTime: Date;
  type: 'DRIVING' | 'ON_DUTY' | 'OFF_DUTY' | 'SLEEPER';
}

function sumHours(entries: DutyEntry[], ...types: DutyEntry['type'][]): number {
  return entries
    .filter((entry) => types.includes(entry.type))
    .reduce((total, entry) => {
      const ms = entry.endTime.getTime() - entry.startTime.getTime();
      return total + ms / (1000 * 60 * 60);
    }, 0);
}

export class ComplianceService {
  sortRisksBySeverity(risks: ComplianceRisk[]): ComplianceRisk[] {
    return [...risks].sort(
      (a, b) => severityWeight[a.severity] - severityWeight[b.severity]
    );
  }

  getExpiringCertifications(
    certifications: Certification[],
    withinDays: number
  ): Certification[] {
    const now = new Date();
    const cutoff = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
    return certifications.filter((cert) => cert.expiryDate >= now && cert.expiryDate <= cutoff);
  }

  buildHOSRiskIfNeeded(
    employeeId: string,
    employeeName: string,
    todayEntries: DutyEntry[],
    weeklyEntries: DutyEntry[]
  ): ComplianceRisk | null {
    const maxWeeklyHours = 70;
    const maxDailyDrivingHours = 11;
    const drivingHoursToday = sumHours(todayEntries, 'DRIVING');
    const weeklyHoursUsed = sumHours(weeklyEntries, 'DRIVING', 'ON_DUTY');
    const weeklyHoursRemaining = Math.max(0, maxWeeklyHours - weeklyHoursUsed);
    const hasViolation =
      drivingHoursToday > maxDailyDrivingHours || weeklyHoursUsed > maxWeeklyHours;

    if (weeklyHoursRemaining > 3 && !hasViolation) {
      return null;
    }

    const message = hasViolation
      ? `HOS limit exceeded (driving today: ${drivingHoursToday.toFixed(1)}h, weekly: ${weeklyHoursUsed.toFixed(1)}h).`
      : `Approaching weekly HOS threshold: ${weeklyHoursRemaining.toFixed(1)}h remaining`;

    return {
      id: `risk-hos-${employeeId}`,
      employeeId,
      employeeName,
      type: 'HOS_WARNING',
      severity: hasViolation ? 'HIGH' : 'MEDIUM',
      details: message,
      hoursRemaining: Math.max(0, Number(weeklyHoursRemaining.toFixed(1))),
    };
  }
}
