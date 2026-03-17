/**
 * Seed Script for ServiceCore PostgreSQL Database
 *
 * Creates 20 realistic drivers, 2 weeks of time entry history,
 * certifications, pay rates, and schedules. Includes deliberate
 * anomalies for demo purposes.
 *
 * Run: npx ts-node tools/seed/seed-postgres.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Driver Roster ───────────────────────────────────────────────────────────

const DRIVERS = [
  { firstName: 'Marcus',   lastName: 'Rivera',     email: 'mrivera@servicecore.com',    class: 'CDL_A',  state: 'CO', avgHours: 42, jobType: 'RESIDENTIAL_SANITATION', motorCarrier: true },
  { firstName: 'DeShawn',  lastName: 'Williams',   email: 'dwilliams@servicecore.com',  class: 'CDL_A',  state: 'CO', avgHours: 38, jobType: 'ROLL_OFF_DELIVERY',      motorCarrier: true },
  { firstName: 'Carlos',   lastName: 'Mendoza',    email: 'cmendoza@servicecore.com',   class: 'CDL_B',  state: 'CO', avgHours: 45, jobType: 'SEPTIC_PUMP',            motorCarrier: true },
  { firstName: 'Jake',     lastName: 'Thompson',   email: 'jthompson@servicecore.com',  class: 'CDL_A',  state: 'CO', avgHours: 40, jobType: 'RESIDENTIAL_SANITATION', motorCarrier: true },
  { firstName: 'Ahmad',    lastName: 'Hassan',     email: 'ahassan@servicecore.com',    class: 'CDL_A',  state: 'CO', avgHours: 41, jobType: 'ROLL_OFF_PICKUP',        motorCarrier: true },
  { firstName: 'Tyler',    lastName: 'Nguyen',     email: 'tnguyen@servicecore.com',    class: 'CDL_B',  state: 'CO', avgHours: 37, jobType: 'GREASE_TRAP',            motorCarrier: false },
  { firstName: 'Brandon',  lastName: 'O\'Brien',   email: 'bobrien@servicecore.com',    class: 'CDL_A',  state: 'CA', avgHours: 44, jobType: 'SEPTIC_PUMP',            motorCarrier: true },
  { firstName: 'Luis',     lastName: 'Garcia',     email: 'lgarcia@servicecore.com',    class: 'CDL_A',  state: 'CO', avgHours: 39, jobType: 'RESIDENTIAL_SANITATION', motorCarrier: true },
  { firstName: 'David',    lastName: 'Kowalski',   email: 'dkowalski@servicecore.com',  class: 'NON_CDL',state: 'CO', avgHours: 36, jobType: 'YARD_MAINTENANCE',       motorCarrier: false },
  { firstName: 'James',    lastName: 'Mitchell',   email: 'jmitchell@servicecore.com',  class: 'CDL_A',  state: 'CO', avgHours: 43, jobType: 'ROLL_OFF_DELIVERY',      motorCarrier: true },
  { firstName: 'Kevin',    lastName: 'Patel',      email: 'kpatel@servicecore.com',     class: 'CDL_B',  state: 'CO', avgHours: 38, jobType: 'EMERGENCY_SEPTIC',       motorCarrier: true },
  { firstName: 'Robert',   lastName: 'Jackson',    email: 'rjackson@servicecore.com',   class: 'CDL_A',  state: 'CO', avgHours: 40, jobType: 'RESIDENTIAL_SANITATION', motorCarrier: true },
  { firstName: 'Miguel',   lastName: 'Santos',     email: 'msantos@servicecore.com',    class: 'CDL_A',  state: 'CO', avgHours: 41, jobType: 'SEPTIC_PUMP',            motorCarrier: true },
  { firstName: 'Chris',    lastName: 'Anderson',   email: 'canderson@servicecore.com',  class: 'NON_CDL',state: 'CO', avgHours: 35, jobType: 'YARD_MAINTENANCE',       motorCarrier: false },
  { firstName: 'Tony',     lastName: 'Russo',      email: 'trusso@servicecore.com',     class: 'CDL_A',  state: 'CO', avgHours: 39, jobType: 'ROLL_OFF_PICKUP',        motorCarrier: true },
  { firstName: 'Derek',    lastName: 'Chen',       email: 'dchen@servicecore.com',      class: 'CDL_B',  state: 'CA', avgHours: 42, jobType: 'GREASE_TRAP',            motorCarrier: false },
  { firstName: 'Brian',    lastName: 'Murphy',     email: 'bmurphy@servicecore.com',    class: 'CDL_A',  state: 'CO', avgHours: 38, jobType: 'RESIDENTIAL_SANITATION', motorCarrier: true },
  { firstName: 'Jose',     lastName: 'Herrera',    email: 'jherrera@servicecore.com',   class: 'CDL_A',  state: 'CO', avgHours: 40, jobType: 'SEPTIC_PUMP',            motorCarrier: true },
  { firstName: 'Mark',     lastName: 'Davis',      email: 'mdavis@servicecore.com',     class: 'CDL_A',  state: 'CO', avgHours: 37, jobType: 'ROLL_OFF_DELIVERY',      motorCarrier: true },
  { firstName: 'Sam',      lastName: 'Lee',        email: 'slee@servicecore.com',       class: 'NON_CDL',state: 'CO', avgHours: 34, jobType: 'OFFICE',                 motorCarrier: false },
];

const MANAGERS = [
  { firstName: 'Sarah',   lastName: 'Palmer',  email: 'spalmer@servicecore.com',  role: 'ROUTE_MANAGER' },
  { firstName: 'Mike',    lastName: 'Torres',  email: 'mtorres@servicecore.com',  role: 'DISPATCHER' },
];

const HR_STAFF = [
  { firstName: 'Lisa',    lastName: 'Chen',    email: 'lchen@servicecore.com',    role: 'HR_ADMIN' },
  { firstName: 'Tom',     lastName: 'Baker',   email: 'tbaker@servicecore.com',   role: 'PAYROLL_ADMIN' },
  { firstName: 'Rachel',  lastName: 'Adams',   email: 'radams@servicecore.com',   role: 'EXECUTIVE' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DENVER_LAT = 39.7392;
const DENVER_LNG = -104.9903;

function randomOffset(range: number): number {
  return (Math.random() - 0.5) * range;
}

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function workday(baseDate: Date, dayOffset: number, hour: number, minute: number): Date {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// ─── Seed Functions ──────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding ServiceCore database...\n');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.payRate.deleteMany();
  await prisma.certification.deleteMany();
  await prisma.employee.deleteMany();

  // Create managers first
  const managerRecords = [];
  for (const mgr of MANAGERS) {
    const record = await prisma.employee.create({
      data: {
        kimaiUserId: 100 + managerRecords.length,
        firstName: mgr.firstName,
        lastName: mgr.lastName,
        email: mgr.email,
        passwordHash: '$2b$12$placeholder.hash.for.seed.data',
        role: mgr.role as 'ROUTE_MANAGER' | 'DISPATCHER',
        employeeClass: 'NON_CDL',
        stateCode: 'CO',
        isMotorCarrier: false,
      },
    });
    managerRecords.push(record);
    console.log(`  ✓ Manager: ${mgr.firstName} ${mgr.lastName} (${mgr.role})`);
  }

  // Create HR/Admin staff
  for (const hr of HR_STAFF) {
    await prisma.employee.create({
      data: {
        kimaiUserId: 200 + HR_STAFF.indexOf(hr),
        firstName: hr.firstName,
        lastName: hr.lastName,
        email: hr.email,
        passwordHash: '$2b$12$placeholder.hash.for.seed.data',
        role: hr.role as 'HR_ADMIN' | 'PAYROLL_ADMIN' | 'EXECUTIVE',
        employeeClass: 'OFFICE',
        stateCode: 'CO',
        isMotorCarrier: false,
      },
    });
    console.log(`  ✓ Staff: ${hr.firstName} ${hr.lastName} (${hr.role})`);
  }

  // Create drivers
  const driverRecords = [];
  for (let i = 0; i < DRIVERS.length; i++) {
    const d = DRIVERS[i];
    const manager = managerRecords[i % managerRecords.length];
    const record = await prisma.employee.create({
      data: {
        kimaiUserId: i + 1,
        firstName: d.firstName,
        lastName: d.lastName,
        email: d.email,
        passwordHash: '$2b$12$placeholder.hash.for.seed.data',
        role: 'DRIVER',
        employeeClass: d.class as 'CDL_A' | 'CDL_B' | 'NON_CDL',
        stateCode: d.state,
        isMotorCarrier: d.motorCarrier,
        managerId: manager.id,
      },
    });
    driverRecords.push(record);

    // Pay rates
    const baseRate = d.class === 'CDL_A' ? 28 : d.class === 'CDL_B' ? 24 : 18;
    await prisma.payRate.create({
      data: {
        employeeId: record.id,
        jobType: d.jobType as any,
        ratePerHour: baseRate + randomBetween(-2, 4),
        effectiveFrom: new Date(2026, 0, 1),
      },
    });

    // Certifications
    if (d.class === 'CDL_A' || d.class === 'CDL_B') {
      const cdlType = d.class === 'CDL_A' ? 'CDL_CLASS_A' : 'CDL_CLASS_B';
      // Deliberate: driver index 2 (Carlos Mendoza) has EXPIRED CDL
      const expiryDate = i === 2
        ? new Date(2026, 2, 1) // expired March 1
        : new Date(2026, 8 + Math.floor(Math.random() * 6), 1);

      await prisma.certification.create({
        data: {
          employeeId: record.id,
          type: cdlType as any,
          issueDate: new Date(2024, 0, 1),
          expiryDate,
          alertSent30: i === 2,
          alertSent7: i === 2,
        },
      });

      // DOT Physical — driver index 4 (Ahmad Hassan) expiring in 20 days
      const dotExpiry = i === 4
        ? new Date(Date.now() + 20 * 86400000)
        : new Date(2027, Math.floor(Math.random() * 12), 1);

      await prisma.certification.create({
        data: {
          employeeId: record.id,
          type: 'DOT_PHYSICAL',
          issueDate: new Date(2025, 0, 1),
          expiryDate: dotExpiry,
        },
      });
    }

    console.log(`  ✓ Driver: ${d.firstName} ${d.lastName} (${d.class}, ${d.state})`);
  }

  // Generate 2 weeks of time entries
  console.log('\n📋 Generating 2 weeks of time entries...');
  const now = new Date();
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  let kimaiId = 1;

  for (const driver of driverRecords) {
    const driverDef = DRIVERS[driverRecords.indexOf(driver)];

    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const dayOfWeek = new Date(twoWeeksAgo.getTime() + dayOffset * 86400000).getDay();
      // Skip weekends (mostly)
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const clockInHour = 5 + Math.floor(Math.random() * 2); // 5-6 AM
      const clockInMinute = Math.floor(Math.random() * 30);
      const hoursWorked = driverDef.avgHours / 5 + randomBetween(-1, 1.5);
      const clockIn = workday(twoWeeksAgo, dayOffset, clockInHour, clockInMinute);
      const clockOut = new Date(clockIn.getTime() + hoursWorked * 3600000);

      // Deliberate anomaly: driver index 7 (Luis Garcia) has a 3AM clock-in on day 3
      const isAnomaly = driverRecords.indexOf(driver) === 7 && dayOffset === 3;
      const anomalyClockIn = isAnomaly
        ? workday(twoWeeksAgo, dayOffset, 3, 15)
        : clockIn;

      // Deliberate anomaly: driver index 10 (Kevin Patel) has GPS mismatch on day 5
      const gpsAnomaly = driverRecords.indexOf(driver) === 10 && dayOffset === 5;

      await prisma.timeEntry.create({
        data: {
          kimaiTimesheetId: kimaiId++,
          employeeId: driver.id,
          clockIn: anomalyClockIn,
          clockOut,
          jobType: driverDef.jobType as any,
          routeId: `route-${driverDef.jobType.toLowerCase().slice(0, 4)}-${(dayOffset % 3) + 1}`,
          hoursWorked: Math.round(hoursWorked * 100) / 100,
          regularHours: Math.min(hoursWorked, 8),
          overtimeHours: Math.max(0, hoursWorked - 8),
          payRateApplied: driverDef.class === 'CDL_A' ? 28 : driverDef.class === 'CDL_B' ? 24 : 18,
          gpsClockIn: {
            lat: DENVER_LAT + randomOffset(0.05),
            lng: DENVER_LNG + randomOffset(0.05),
            accuracy: gpsAnomaly ? 500 : randomBetween(5, 25),
          },
          gpsClockOut: {
            lat: DENVER_LAT + randomOffset(gpsAnomaly ? 0.5 : 0.05),
            lng: DENVER_LNG + randomOffset(gpsAnomaly ? 0.5 : 0.05),
            accuracy: randomBetween(5, 25),
          },
          anomalyScore: isAnomaly ? 0.85 : gpsAnomaly ? 0.72 : randomBetween(0.01, 0.15),
          anomalyFlags: isAnomaly
            ? ['Unusual clock-in time: 3:15 AM (z=3.2)']
            : gpsAnomaly
              ? ['GPS mismatch: 4200m from job site']
              : [],
          status: dayOffset < 7 ? 'APPROVED' : 'PENDING',
          approved: dayOffset < 7,
          approvedBy: dayOffset < 7 ? managerRecords[0].id : null,
          approvedAt: dayOffset < 7 ? new Date() : null,
        },
      });
    }
  }

  const entryCount = await prisma.timeEntry.count();
  const employeeCount = await prisma.employee.count();
  const certCount = await prisma.certification.count();

  console.log(`\n✅ Seed complete!`);
  console.log(`   ${employeeCount} employees (${driverRecords.length} drivers + ${MANAGERS.length + HR_STAFF.length} staff)`);
  console.log(`   ${entryCount} time entries (2 weeks history)`);
  console.log(`   ${certCount} certifications`);
  console.log(`\n🚨 Deliberate anomalies for demo:`);
  console.log(`   - Carlos Mendoza: EXPIRED CDL (March 1, 2026)`);
  console.log(`   - Ahmad Hassan: DOT Physical expiring in ~20 days`);
  console.log(`   - Luis Garcia: 3:15 AM clock-in anomaly (day 3)`);
  console.log(`   - Kevin Patel: GPS mismatch anomaly (day 5)`);
}

seed()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
