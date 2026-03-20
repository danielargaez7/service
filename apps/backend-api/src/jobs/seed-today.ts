import prisma from '../prisma';

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
    console.log(`[ seed  ] Today already has ${existing} entries, skipping`);
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
    console.log('[ seed  ] No drivers found, skipping daily seed');
    return;
  }

  const entries = [];

  for (const driver of drivers) {
    // Random clock-in between 5:30 AM and 7:30 AM
    const clockIn = new Date(today);
    const startHour = randomBetween(5.5, 7.5);
    clockIn.setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);

    // Random shift length 7-10 hours
    const shiftHours = randomBetween(7, 10);
    const clockOut = new Date(clockIn.getTime() + shiftHours * 60 * 60 * 1000);

    // Only clock out if shift would have ended by now
    const now = new Date();
    const hasClockOut = clockOut < now;

    const hoursWorked = hasClockOut
      ? (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)
      : 0;
    const regularHours = Math.min(hoursWorked, 8);
    const otHours = Math.max(0, hoursWorked - 8);

    const coord = randomItem(DENVER_COORDS);
    const jitter = () => (Math.random() - 0.5) * 0.01;

    const anomalyFlags: string[] = [];
    const anomalyScore = Math.random() < 0.15 ? randomBetween(0.4, 0.8) : 0;
    if (anomalyScore > 0.5) anomalyFlags.push('unusual-hours');

    entries.push({
      employeeId: driver.id,
      clockIn,
      clockOut: hasClockOut ? clockOut : null,
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
  console.log(`[ seed  ] Created ${entries.length} time entries for today`);
}
