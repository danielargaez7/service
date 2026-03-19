import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL ?? 'postgresql://servicecore:servicecore@localhost:5432/servicecore';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('demo', 10);

  // ─── Employees ──────────────────────────────────────────────────────────────
  const admin = await prisma.employee.upsert({
    where: { email: 'admin@servicecore.com' },
    update: {},
    create: {
      firstName: 'Sarah',
      lastName: 'Mitchell',
      email: 'admin@servicecore.com',
      phone: '303-555-0100',
      passwordHash,
      role: 'HR_ADMIN',
      employeeClass: 'OFFICE',
      stateCode: 'CO',
    },
  });

  const manager = await prisma.employee.upsert({
    where: { email: 'manager@servicecore.com' },
    update: {},
    create: {
      firstName: 'Jacob',
      lastName: 'Clark',
      email: 'manager@servicecore.com',
      phone: '303-555-0101',
      passwordHash,
      role: 'ROUTE_MANAGER',
      employeeClass: 'OFFICE',
      stateCode: 'CO',
    },
  });

  const payrollAdmin = await prisma.employee.upsert({
    where: { email: 'payroll@servicecore.com' },
    update: {},
    create: {
      firstName: 'Lisa',
      lastName: 'Nguyen',
      email: 'payroll@servicecore.com',
      phone: '303-555-0102',
      passwordHash,
      role: 'PAYROLL_ADMIN',
      employeeClass: 'OFFICE',
      stateCode: 'CO',
    },
  });

  const driver1 = await prisma.employee.upsert({
    where: { email: 'driver@servicecore.com' },
    update: {},
    create: {
      firstName: 'Carlos',
      lastName: 'Rivera',
      email: 'driver@servicecore.com',
      phone: '303-555-0200',
      passwordHash,
      role: 'DRIVER',
      employeeClass: 'CDL_A',
      stateCode: 'CO',
      isMotorCarrier: true,
      managerId: manager.id,
    },
  });

  const driver2 = await prisma.employee.upsert({
    where: { email: 'mike.chen@servicecore.com' },
    update: {},
    create: {
      firstName: 'Mike',
      lastName: 'Chen',
      email: 'mike.chen@servicecore.com',
      phone: '303-555-0201',
      passwordHash,
      role: 'DRIVER',
      employeeClass: 'CDL_B',
      stateCode: 'CO',
      isMotorCarrier: true,
      managerId: manager.id,
    },
  });

  const driver3 = await prisma.employee.upsert({
    where: { email: 'tom.garcia@servicecore.com' },
    update: {},
    create: {
      firstName: 'Tom',
      lastName: 'Garcia',
      email: 'tom.garcia@servicecore.com',
      phone: '303-555-0202',
      passwordHash,
      role: 'DRIVER',
      employeeClass: 'CDL_A',
      stateCode: 'CO',
      isMotorCarrier: true,
      cbAgreementId: 'teamsters-local-455',
      managerId: manager.id,
    },
  });

  const driver4 = await prisma.employee.upsert({
    where: { email: 'anna.kowalski@servicecore.com' },
    update: {},
    create: {
      firstName: 'Anna',
      lastName: 'Kowalski',
      email: 'anna.kowalski@servicecore.com',
      phone: '303-555-0203',
      passwordHash,
      role: 'DRIVER',
      employeeClass: 'NON_CDL',
      stateCode: 'CO',
      managerId: manager.id,
    },
  });

  const driver5 = await prisma.employee.upsert({
    where: { email: 'james.wright@servicecore.com' },
    update: {},
    create: {
      firstName: 'James',
      lastName: 'Wright',
      email: 'james.wright@servicecore.com',
      phone: '303-555-0204',
      passwordHash,
      role: 'DRIVER',
      employeeClass: 'CDL_A',
      stateCode: 'CO',
      isMotorCarrier: true,
      managerId: manager.id,
    },
  });

  // ─── 10 More Employees ───────────────────────────────────────────────────────
  const driver6 = await prisma.employee.upsert({
    where: { email: 'marcus.johnson@servicecore.com' },
    update: {},
    create: { firstName: 'Marcus', lastName: 'Johnson', email: 'marcus.johnson@servicecore.com', phone: '303-555-0205', passwordHash, role: 'DRIVER', employeeClass: 'CDL_A', stateCode: 'CO', isMotorCarrier: true, managerId: manager.id },
  });
  const driver7 = await prisma.employee.upsert({
    where: { email: 'terrell.williams@servicecore.com' },
    update: {},
    create: { firstName: 'Terrell', lastName: 'Williams', email: 'terrell.williams@servicecore.com', phone: '303-555-0206', passwordHash, role: 'DRIVER', employeeClass: 'CDL_B', stateCode: 'CO', isMotorCarrier: true, cbAgreementId: 'teamsters-local-455', managerId: manager.id },
  });
  const driver8 = await prisma.employee.upsert({
    where: { email: 'jake.hernandez@servicecore.com' },
    update: {},
    create: { firstName: 'Jake', lastName: 'Hernandez', email: 'jake.hernandez@servicecore.com', phone: '303-555-0207', passwordHash, role: 'DRIVER', employeeClass: 'CDL_A', stateCode: 'CO', isMotorCarrier: true, managerId: manager.id },
  });
  const driver9 = await prisma.employee.upsert({
    where: { email: 'deshawn.carter@servicecore.com' },
    update: {},
    create: { firstName: 'DeShawn', lastName: 'Carter', email: 'deshawn.carter@servicecore.com', phone: '303-555-0208', passwordHash, role: 'DRIVER', employeeClass: 'CDL_A', stateCode: 'CO', isMotorCarrier: true, managerId: manager.id },
  });
  const driver10 = await prisma.employee.upsert({
    where: { email: 'miguel.rodriguez@servicecore.com' },
    update: {},
    create: { firstName: 'Miguel', lastName: 'Rodriguez', email: 'miguel.rodriguez@servicecore.com', phone: '303-555-0209', passwordHash, role: 'DRIVER', employeeClass: 'NON_CDL', stateCode: 'CO', managerId: manager.id },
  });
  const driver11 = await prisma.employee.upsert({
    where: { email: 'chris.patterson@servicecore.com' },
    update: {},
    create: { firstName: 'Chris', lastName: 'Patterson', email: 'chris.patterson@servicecore.com', phone: '303-555-0210', passwordHash, role: 'DRIVER', employeeClass: 'CDL_B', stateCode: 'CO', isMotorCarrier: true, managerId: manager.id },
  });
  const driver12 = await prisma.employee.upsert({
    where: { email: 'tony.ramirez@servicecore.com' },
    update: {},
    create: { firstName: 'Tony', lastName: 'Ramirez', email: 'tony.ramirez@servicecore.com', phone: '303-555-0211', passwordHash, role: 'DRIVER', employeeClass: 'CDL_A', stateCode: 'CO', isMotorCarrier: true, cbAgreementId: 'teamsters-local-117', managerId: manager.id },
  });

  const exec = await prisma.employee.upsert({
    where: { email: 'exec@servicecore.com' },
    update: {},
    create: { firstName: 'Rachel', lastName: 'Adams', email: 'exec@servicecore.com', phone: '303-555-0300', passwordHash, role: 'EXECUTIVE', employeeClass: 'OFFICE', stateCode: 'CO' },
  });
  const dispatcher = await prisma.employee.upsert({
    where: { email: 'dispatch@servicecore.com' },
    update: {},
    create: { firstName: 'Kevin', lastName: 'Brooks', email: 'dispatch@servicecore.com', phone: '303-555-0301', passwordHash, role: 'DISPATCHER', employeeClass: 'OFFICE', stateCode: 'CO' },
  });
  const yardLead = await prisma.employee.upsert({
    where: { email: 'luis.morales@servicecore.com' },
    update: {},
    create: { firstName: 'Luis', lastName: 'Morales', email: 'luis.morales@servicecore.com', phone: '303-555-0212', passwordHash, role: 'DRIVER', employeeClass: 'YARD', stateCode: 'CO', managerId: manager.id },
  });

  const drivers = [driver1, driver2, driver3, driver4, driver5, driver6, driver7, driver8, driver9, driver10, driver11, driver12, yardLead];

  // ─── Pay Rates (realistic: each employee gets rates for their actual job) ──
  const employeeRates: Array<{ employee: typeof driver1; rates: Array<{ jobType: string; rate: number }> }> = [
    // Carlos Rivera — CDL-A, residential & roll-off
    { employee: driver1, rates: [{ jobType: 'RESIDENTIAL_SANITATION', rate: 28 }, { jobType: 'ROLL_OFF_DELIVERY', rate: 32 }, { jobType: 'TRAVEL', rate: 20 }] },
    // Mike Chen — CDL-B, roll-off
    { employee: driver2, rates: [{ jobType: 'ROLL_OFF_DELIVERY', rate: 30 }, { jobType: 'ROLL_OFF_PICKUP', rate: 30 }, { jobType: 'TRAVEL', rate: 18 }] },
    // Tom Garcia — CDL-A, septic (Teamsters)
    { employee: driver3, rates: [{ jobType: 'SEPTIC_PUMP', rate: 36 }, { jobType: 'GREASE_TRAP', rate: 32 }, { jobType: 'EMERGENCY_SEPTIC', rate: 44 }] },
    // Anna Kowalski — NON-CDL, yard
    { employee: driver4, rates: [{ jobType: 'YARD_MAINTENANCE', rate: 22 }, { jobType: 'TRAINING', rate: 20 }] },
    // James Wright — CDL-A, residential
    { employee: driver5, rates: [{ jobType: 'RESIDENTIAL_SANITATION', rate: 29 }, { jobType: 'ROLL_OFF_DELIVERY', rate: 33 }, { jobType: 'TRAVEL', rate: 20 }] },
    // Marcus Johnson — CDL-A, residential
    { employee: driver6, rates: [{ jobType: 'RESIDENTIAL_SANITATION', rate: 28 }, { jobType: 'TRAVEL', rate: 20 }] },
    // Terrell Williams — CDL-B, septic (Teamsters)
    { employee: driver7, rates: [{ jobType: 'SEPTIC_PUMP', rate: 34 }, { jobType: 'GREASE_TRAP', rate: 30 }] },
    // Jake Hernandez — CDL-A, roll-off
    { employee: driver8, rates: [{ jobType: 'ROLL_OFF_DELIVERY', rate: 32 }, { jobType: 'ROLL_OFF_PICKUP', rate: 32 }] },
    // DeShawn Carter — CDL-A, residential
    { employee: driver9, rates: [{ jobType: 'RESIDENTIAL_SANITATION', rate: 27 }, { jobType: 'TRAVEL', rate: 19 }] },
    // Miguel Rodriguez — NON-CDL, yard ops
    { employee: driver10, rates: [{ jobType: 'YARD_MAINTENANCE', rate: 23 }, { jobType: 'TRAINING', rate: 20 }] },
    // Chris Patterson — CDL-B, roll-off
    { employee: driver11, rates: [{ jobType: 'ROLL_OFF_DELIVERY', rate: 31 }, { jobType: 'ROLL_OFF_PICKUP', rate: 31 }] },
    // Tony Ramirez — CDL-A, septic (Teamsters 117)
    { employee: driver12, rates: [{ jobType: 'SEPTIC_PUMP', rate: 37 }, { jobType: 'EMERGENCY_SEPTIC', rate: 46 }, { jobType: 'GREASE_TRAP', rate: 33 }] },
    // Luis Morales — Yard lead
    { employee: yardLead, rates: [{ jobType: 'YARD_MAINTENANCE', rate: 25 }] },
  ];

  let totalPayRates = 0;
  for (const { employee, rates } of employeeRates) {
    for (const { jobType, rate } of rates) {
      await prisma.payRate.create({
        data: {
          employeeId: employee.id,
          jobType: jobType as any,
          ratePerHour: rate,
          effectiveFrom: new Date('2026-01-01'),
        },
      });
      totalPayRates++;
    }
  }

  // Office staff get a flat hourly rate
  for (const officeEmp of [admin, payrollAdmin, exec, dispatcher]) {
    await prisma.payRate.create({
      data: {
        employeeId: officeEmp.id,
        jobType: 'OFFICE' as any,
        ratePerHour: officeEmp === exec ? 55 : 35,
        effectiveFrom: new Date('2026-01-01'),
      },
    });
    totalPayRates++;
  }
  // Manager
  await prisma.payRate.create({
    data: {
      employeeId: manager.id,
      jobType: 'OFFICE' as any,
      ratePerHour: 45,
      effectiveFrom: new Date('2026-01-01'),
    },
  });
  totalPayRates++;

  // ─── Sample Time Entries (last 2 weeks) ─────────────────────────────────────
  const now = new Date();
  const entries: Array<{
    employeeId: string;
    dayOffset: number;
    startHour: number;
    hours: number;
    jobType: string;
    routeId: string;
  }> = [];

  // Generate 2 weeks of work for each driver (Mon-Fri)
  for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
    const date = new Date(now);
    date.setDate(date.getDate() - dayOffset);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // skip weekends

    for (const driver of drivers) {
      const startHour = 5 + Math.floor(Math.random() * 3); // 5-7 AM varied
      const hours = 7 + Math.random() * 3.5; // 7-10.5 hours varied

      // Each driver gets their primary job type based on their pay rates
      const driverRates = employeeRates.find((er) => er.employee.id === driver.id);
      const primaryJobType = driverRates?.rates[0]?.jobType ?? 'RESIDENTIAL_SANITATION';
      const jobType = primaryJobType;

      entries.push({
        employeeId: driver.id,
        dayOffset,
        startHour,
        hours,
        jobType,
        routeId: `route-${dayOfWeek}-${Math.floor(Math.random() * 10) + 1}`,
      });
    }
  }

  // Denver-area GPS coordinates (slight variation per entry)
  const baseLat = 39.7392;
  const baseLng = -104.9903;

  for (const entry of entries) {
    const date = new Date(now);
    date.setDate(date.getDate() - entry.dayOffset);
    date.setHours(entry.startHour, Math.floor(Math.random() * 30), 0, 0);

    const clockOut = new Date(date.getTime() + entry.hours * 60 * 60 * 1000);
    const hoursWorked = entry.hours;

    // Determine status: older entries approved, recent ones pending/submitted
    let status: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'FLAGGED' = 'APPROVED';
    if (entry.dayOffset <= 2) status = 'SUBMITTED';
    if (entry.dayOffset === 0) status = 'PENDING';

    // Randomly flag a couple entries
    const anomalyFlags: string[] = [];
    let anomalyScore = 0.05 + Math.random() * 0.1;
    if (hoursWorked > 10) {
      anomalyFlags.push('long-shift');
      anomalyScore = 0.65;
      status = 'FLAGGED';
    }

    const gpsVariation = () => (Math.random() - 0.5) * 0.05;

    await prisma.timeEntry.create({
      data: {
        employeeId: entry.employeeId,
        clockIn: date,
        clockOut,
        jobType: entry.jobType as any,
        routeId: entry.routeId,
        gpsClockIn: { lat: baseLat + gpsVariation(), lng: baseLng + gpsVariation(), accuracy: 10 + Math.random() * 20 },
        gpsClockOut: { lat: baseLat + gpsVariation(), lng: baseLng + gpsVariation(), accuracy: 10 + Math.random() * 20 },
        hoursWorked,
        regularHours: Math.min(hoursWorked, 8),
        overtimeHours: Math.max(0, hoursWorked - 8),
        doubleTimeHours: 0,
        anomalyScore,
        anomalyFlags,
        status,
        approved: status === 'APPROVED',
        approvedBy: status === 'APPROVED' ? manager.id : null,
        approvedAt: status === 'APPROVED' ? new Date() : null,
      },
    });
  }

  // Add one entry with missing clock-out (for testing missed-clockout detection)
  await prisma.timeEntry.create({
    data: {
      employeeId: driver2.id,
      clockIn: new Date(now.getTime() - 16 * 60 * 60 * 1000), // 16 hours ago
      clockOut: null,
      jobType: 'ROLL_OFF_DELIVERY',
      routeId: 'route-1-5',
      gpsClockIn: { lat: baseLat + 0.01, lng: baseLng - 0.02, accuracy: 15 },
      hoursWorked: null,
      status: 'PENDING',
      notes: 'Forgot to clock out',
    },
  });

  // ─── Certifications ─────────────────────────────────────────────────────────
  const cdlDrivers = [driver1, driver3, driver5, driver6, driver7, driver8, driver9, driver11, driver12];
  const nonCdlDrivers = [driver4, driver10, yardLead];

  // CDL drivers get CDL + DOT + Drug Test
  const certTypes = ['CDL_CLASS_A', 'DOT_PHYSICAL', 'DRUG_TEST'] as const;
  for (const driver of cdlDrivers) {
    for (const certType of certTypes) {
      const actualCertType = driver.employeeClass === 'CDL_B' && certType === 'CDL_CLASS_A' ? 'CDL_CLASS_B' : certType;
      const expiryOffset = actualCertType === 'DOT_PHYSICAL' ? 365 : 730;
      // Make a few certs expiring soon
      const daysUntilExpiry =
        (driver === driver1 && certType === 'DOT_PHYSICAL') ? 15 :
        (driver === driver8 && certType === 'CDL_CLASS_A') ? 22 :
        (driver === driver12 && certType === 'DOT_PHYSICAL') ? 8 :
        expiryOffset;
      await prisma.certification.create({
        data: {
          employeeId: driver.id,
          type: actualCertType as any,
          issueDate: new Date('2024-06-01'),
          expiryDate: new Date(now.getTime() + daysUntilExpiry * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  // Non-CDL drivers get Drug Test + Background Check
  for (const driver of nonCdlDrivers) {
    await prisma.certification.create({
      data: { employeeId: driver.id, type: 'DRUG_TEST', issueDate: new Date('2024-06-01'), expiryDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) },
    });
    await prisma.certification.create({
      data: { employeeId: driver.id, type: 'BACKGROUND_CHECK', issueDate: new Date('2024-01-15'), expiryDate: new Date(now.getTime() + 730 * 24 * 60 * 60 * 1000) },
    });
  }

  // Tanker/Hazmat endorsements for septic drivers
  for (const driver of [driver1, driver6, driver9]) {
    await prisma.certification.create({
      data: { employeeId: driver.id, type: 'TANKER_ENDORSEMENT', issueDate: new Date('2024-03-01'), expiryDate: new Date(now.getTime() + 600 * 24 * 60 * 60 * 1000) },
    });
  }

  const totalEmployees = 3 + drivers.length + 2; // admin/manager/payroll + drivers + exec/dispatcher
  console.log('Seed complete.');
  console.log(`  ${totalEmployees} employees`);
  console.log(`  ${entries.length} time entries + 1 missing clock-out`);
  console.log(`  ${totalPayRates} pay rates`);
  console.log(`  ${cdlDrivers.length * 3 + nonCdlDrivers.length * 2 + 3} certifications`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
