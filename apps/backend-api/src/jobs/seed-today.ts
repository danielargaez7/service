import prisma from '../prisma';
import logger from '../logger';

const JOB_TYPES = [
  'RESIDENTIAL_SANITATION',
  'ROLL_OFF_DELIVERY',
  'ROLL_OFF_PICKUP',
  'SEPTIC_PUMP',
  'GREASE_TRAP',
] as const;

const DENVER_COORDS = [
  { lat: 39.7392, lng: -104.9903 },
  { lat: 39.7500, lng: -104.9847 },
  { lat: 39.7200, lng: -105.0050 },
  { lat: 39.7650, lng: -104.9700 },
  { lat: 39.7100, lng: -104.9600 },
];

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function seedTodayEntries(): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Check if today already has entries
  const existing = await prisma.timeEntry.count({
    where: {
      clockIn: { gte: today, lt: tomorrow },
    },
  });

  if (existing > 0) {
    logger.info(`[ seed  ] Today already has ${existing} entries, skipping`);
    return;
  }

  // Get all driver employees
  const drivers = await prisma.employee.findMany({
    where: {
      role: 'DRIVER',
      deletedAt: null,
    },
  });

  if (drivers.length === 0) {
    logger.info('[ seed  ] No drivers found, skipping daily seed');
    return;
  }

  const entries = [];

  // Assign each driver a scenario for realistic variety
  // 8 clean, 2 overtime, 1 missed clock-out, 1 suspiciously long, 1 GPS mismatch
  type Scenario = 'clean' | 'overtime' | 'missed-clockout' | 'suspicious-long' | 'gps-mismatch';
  const scenarios: Scenario[] = [];
  for (let i = 0; i < drivers.length; i++) {
    if (i === 0) scenarios.push('missed-clockout');
    else if (i === 1) scenarios.push('suspicious-long');
    else if (i === 2) scenarios.push('gps-mismatch');
    else if (i === 3 || i === 4) scenarios.push('overtime');
    else scenarios.push('clean');
  }

  for (let i = 0; i < drivers.length; i++) {
    const driver = drivers[i];
    const scenario = scenarios[i];
    const clockIn = new Date(today);
    const startHour = randomBetween(5.5, 7.5);
    clockIn.setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);

    const coord = randomItem(DENVER_COORDS);
    const jitter = () => (Math.random() - 0.5) * 0.01;

    let shiftHours: number;
    let hasClockOut: boolean;
    const anomalyFlags: string[] = [];
    let anomalyScore = 0;

    switch (scenario) {
      case 'missed-clockout':
        // Forgot to clock out — still active since this morning
        hasClockOut = false;
        shiftHours = 0;
        break;
      case 'suspicious-long':
        // 14+ hour shift — either forgot or actually worked that long
        hasClockOut = true;
        shiftHours = randomBetween(13.5, 15);
        anomalyScore = 0.85;
        anomalyFlags.push('unusual-hours');
        break;
      case 'gps-mismatch':
        // Clocked in from wrong location
        hasClockOut = true;
        shiftHours = randomBetween(7, 8);
        anomalyScore = 0.7;
        anomalyFlags.push('gps-mismatch');
        break;
      case 'overtime':
        // Legit overtime — 9-10.5 hour shift
        hasClockOut = true;
        shiftHours = randomBetween(9, 10.5);
        break;
      default:
        // Clean — normal 7-8 hour shift
        hasClockOut = true;
        shiftHours = randomBetween(6.5, 8);
        break;
    }

    const clockOut = hasClockOut
      ? new Date(clockIn.getTime() + shiftHours * 60 * 60 * 1000)
      : null;

    const hoursWorked = hasClockOut ? shiftHours : 0;
    const regularHours = Math.min(hoursWorked, 8);
    const otHours = Math.max(0, hoursWorked - 8);

    entries.push({
      employeeId: driver.id,
      clockIn,
      clockOut,
      jobType: randomItem(JOB_TYPES),
      routeId: `R-${Math.floor(randomBetween(1, 25))}`,
      gpsClockIn: { lat: coord.lat + jitter(), lng: coord.lng + jitter() },
      gpsClockOut: hasClockOut ? { lat: coord.lat + jitter(), lng: coord.lng + jitter() } : null,
      hoursWorked: hasClockOut ? Number(hoursWorked.toFixed(2)) : null,
      regularHours: hasClockOut ? Number(regularHours.toFixed(2)) : null,
      overtimeHours: hasClockOut ? Number(otHours.toFixed(2)) : null,
      anomalyScore,
      anomalyFlags,
      status: 'PENDING' as const,
    });
  }

  await prisma.timeEntry.createMany({ data: entries });
  logger.info(`[ seed  ] Created ${entries.length} time entries for today`);
}
