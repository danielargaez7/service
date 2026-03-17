export interface HOSDutyEntry {
  startTime: Date;
  endTime: Date;
  type: 'DRIVING' | 'ON_DUTY' | 'OFF_DUTY' | 'SLEEPER';
}

export interface HOSLimits {
  maxDrivingHoursPerDay: number;
  maxOnDutyHoursPerDay: number;
  maxWeeklyHours: number;
  requiredOffDutyHours: number;
}

export interface HOSViolation {
  type: 'DRIVING_LIMIT' | 'ON_DUTY_LIMIT' | 'WEEKLY_LIMIT' | 'REST_REQUIREMENT';
  message: string;
  hoursOver: number;
}

export interface HOSStatus {
  drivingHoursToday: number;
  onDutyHoursToday: number;
  hoursAvailableToday: number;
  weeklyHoursUsed: number;
  weeklyHoursRemaining: number;
  violations: HOSViolation[];
}

/** FMCSA default limits (property-carrying drivers). */
export const DEFAULT_FMCSA_LIMITS: HOSLimits = {
  maxDrivingHoursPerDay: 11,
  maxOnDutyHoursPerDay: 14,
  maxWeeklyHours: 70, // 70-hour / 8-day rule (most common)
  requiredOffDutyHours: 10,
};

function hoursFromEntries(entries: HOSDutyEntry[], ...types: HOSDutyEntry['type'][]): number {
  return entries
    .filter((e) => types.includes(e.type))
    .reduce((sum, e) => {
      const ms = e.endTime.getTime() - e.startTime.getTime();
      return sum + ms / (1000 * 60 * 60);
    }, 0);
}

/**
 * Calculate the current HOS status for a driver based on today's duty entries
 * and weekly duty entries.
 */
export function calculateHOSStatus(
  entries: HOSDutyEntry[],
  weeklyEntries: HOSDutyEntry[],
  limits: HOSLimits = DEFAULT_FMCSA_LIMITS
): HOSStatus {
  const drivingHoursToday = hoursFromEntries(entries, 'DRIVING');
  const onDutyHoursToday = hoursFromEntries(entries, 'DRIVING', 'ON_DUTY');

  const weeklyHoursUsed = hoursFromEntries(weeklyEntries, 'DRIVING', 'ON_DUTY');

  const drivingRemaining = Math.max(0, limits.maxDrivingHoursPerDay - drivingHoursToday);
  const onDutyRemaining = Math.max(0, limits.maxOnDutyHoursPerDay - onDutyHoursToday);
  const weeklyRemaining = Math.max(0, limits.maxWeeklyHours - weeklyHoursUsed);

  const hoursAvailableToday = Math.min(drivingRemaining, onDutyRemaining, weeklyRemaining);
  const weeklyHoursRemaining = weeklyRemaining;

  const violations = checkViolations(entries, weeklyEntries, limits);

  return {
    drivingHoursToday,
    onDutyHoursToday,
    hoursAvailableToday,
    weeklyHoursUsed,
    weeklyHoursRemaining,
    violations,
  };
}

/**
 * Check a set of duty entries against HOS limits and return any violations.
 */
export function checkViolations(
  entries: HOSDutyEntry[],
  weeklyEntries: HOSDutyEntry[],
  limits: HOSLimits = DEFAULT_FMCSA_LIMITS
): HOSViolation[] {
  const violations: HOSViolation[] = [];

  const drivingHours = hoursFromEntries(entries, 'DRIVING');
  if (drivingHours > limits.maxDrivingHoursPerDay) {
    violations.push({
      type: 'DRIVING_LIMIT',
      message: `Driving hours (${drivingHours.toFixed(1)}h) exceed the ${limits.maxDrivingHoursPerDay}h daily limit.`,
      hoursOver: drivingHours - limits.maxDrivingHoursPerDay,
    });
  }

  const onDutyHours = hoursFromEntries(entries, 'DRIVING', 'ON_DUTY');
  if (onDutyHours > limits.maxOnDutyHoursPerDay) {
    violations.push({
      type: 'ON_DUTY_LIMIT',
      message: `On-duty hours (${onDutyHours.toFixed(1)}h) exceed the ${limits.maxOnDutyHoursPerDay}h daily window.`,
      hoursOver: onDutyHours - limits.maxOnDutyHoursPerDay,
    });
  }

  const weeklyHours = hoursFromEntries(weeklyEntries, 'DRIVING', 'ON_DUTY');
  if (weeklyHours > limits.maxWeeklyHours) {
    violations.push({
      type: 'WEEKLY_LIMIT',
      message: `Weekly hours (${weeklyHours.toFixed(1)}h) exceed the ${limits.maxWeeklyHours}h limit.`,
      hoursOver: weeklyHours - limits.maxWeeklyHours,
    });
  }

  // Check if required consecutive off-duty rest was taken between shifts.
  // We look at OFF_DUTY and SLEEPER entries for rest periods.
  const restEntries = entries
    .filter((e) => e.type === 'OFF_DUTY' || e.type === 'SLEEPER')
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  // Merge consecutive/overlapping rest periods
  const mergedRest: { start: number; end: number }[] = [];
  for (const entry of restEntries) {
    const start = entry.startTime.getTime();
    const end = entry.endTime.getTime();
    if (mergedRest.length > 0 && start <= mergedRest[mergedRest.length - 1].end) {
      mergedRest[mergedRest.length - 1].end = Math.max(mergedRest[mergedRest.length - 1].end, end);
    } else {
      mergedRest.push({ start, end });
    }
  }

  const hasRequiredRest = mergedRest.some(
    (r) => (r.end - r.start) / (1000 * 60 * 60) >= limits.requiredOffDutyHours
  );

  // Only flag a rest violation when there are on-duty entries but no qualifying rest period.
  const hasOnDutyWork = entries.some((e) => e.type === 'DRIVING' || e.type === 'ON_DUTY');
  if (hasOnDutyWork && !hasRequiredRest) {
    const longestRestHours =
      mergedRest.length > 0
        ? Math.max(...mergedRest.map((r) => (r.end - r.start) / (1000 * 60 * 60)))
        : 0;
    violations.push({
      type: 'REST_REQUIREMENT',
      message: `No off-duty period of at least ${limits.requiredOffDutyHours}h found. Longest rest: ${longestRestHours.toFixed(1)}h.`,
      hoursOver: limits.requiredOffDutyHours - longestRestHours,
    });
  }

  return violations;
}
