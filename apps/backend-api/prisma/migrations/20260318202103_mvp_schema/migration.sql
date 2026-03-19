-- CreateEnum
CREATE TYPE "Role" AS ENUM ('DRIVER', 'DISPATCHER', 'ROUTE_MANAGER', 'HR_ADMIN', 'PAYROLL_ADMIN', 'EXECUTIVE', 'SYSTEM_ADMIN');

-- CreateEnum
CREATE TYPE "EmployeeClass" AS ENUM ('CDL_A', 'CDL_B', 'NON_CDL', 'OFFICE', 'YARD', 'TEMP_SEASONAL');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('RESIDENTIAL_SANITATION', 'ROLL_OFF_DELIVERY', 'ROLL_OFF_PICKUP', 'SEPTIC_PUMP', 'GREASE_TRAP', 'EMERGENCY_SEPTIC', 'YARD_MAINTENANCE', 'OFFICE', 'TRAINING', 'TRAVEL');

-- CreateEnum
CREATE TYPE "TimesheetStatus" AS ENUM ('PENDING', 'SUBMITTED', 'APPROVED', 'FLAGGED', 'REJECTED', 'EXPORTED');

-- CreateEnum
CREATE TYPE "CertificationType" AS ENUM ('CDL_CLASS_A', 'CDL_CLASS_B', 'DOT_PHYSICAL', 'HAZWOPER_8HR', 'HAZWOPER_40HR', 'DRUG_TEST', 'BACKGROUND_CHECK', 'TANKER_ENDORSEMENT', 'HAZMAT_ENDORSEMENT');

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "kimaiUserId" INTEGER,
    "timetrexId" INTEGER,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'DRIVER',
    "employeeClass" "EmployeeClass" NOT NULL,
    "managerId" TEXT,
    "cbAgreementId" TEXT,
    "stateCode" TEXT NOT NULL,
    "isMotorCarrier" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "refreshToken" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "kimaiTimesheetId" INTEGER,
    "employeeId" TEXT NOT NULL,
    "clockIn" TIMESTAMP(3) NOT NULL,
    "clockOut" TIMESTAMP(3),
    "jobType" "JobType" NOT NULL,
    "routeId" TEXT,
    "gpsClockIn" JSONB,
    "gpsClockOut" JSONB,
    "photoUrl" TEXT,
    "hoursWorked" DECIMAL(65,30),
    "regularHours" DECIMAL(65,30),
    "overtimeHours" DECIMAL(65,30),
    "doubleTimeHours" DECIMAL(65,30),
    "payRateApplied" DECIMAL(65,30),
    "anomalyScore" DOUBLE PRECISION,
    "anomalyFlags" TEXT[],
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "status" "TimesheetStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "flagReason" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "CertificationType" NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "documentUrl" TEXT,
    "alertSent30" BOOLEAN NOT NULL DEFAULT false,
    "alertSent7" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayRate" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "jobType" "JobType" NOT NULL,
    "ratePerHour" DECIMAL(65,30) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),

    CONSTRAINT "PayRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "routeId" TEXT,
    "jobType" "JobType" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_kimaiUserId_key" ON "Employee"("kimaiUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_timetrexId_key" ON "Employee"("timetrexId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_role_idx" ON "Employee"("role");

-- CreateIndex
CREATE INDEX "Employee_managerId_idx" ON "Employee"("managerId");

-- CreateIndex
CREATE INDEX "Employee_deletedAt_idx" ON "Employee"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntry_kimaiTimesheetId_key" ON "TimeEntry"("kimaiTimesheetId");

-- CreateIndex
CREATE INDEX "TimeEntry_employeeId_idx" ON "TimeEntry"("employeeId");

-- CreateIndex
CREATE INDEX "TimeEntry_clockIn_idx" ON "TimeEntry"("clockIn");

-- CreateIndex
CREATE INDEX "TimeEntry_status_idx" ON "TimeEntry"("status");

-- CreateIndex
CREATE INDEX "TimeEntry_deletedAt_idx" ON "TimeEntry"("deletedAt");

-- CreateIndex
CREATE INDEX "Certification_employeeId_idx" ON "Certification"("employeeId");

-- CreateIndex
CREATE INDEX "Certification_expiryDate_idx" ON "Certification"("expiryDate");

-- CreateIndex
CREATE INDEX "PayRate_employeeId_idx" ON "PayRate"("employeeId");

-- CreateIndex
CREATE INDEX "Schedule_employeeId_idx" ON "Schedule"("employeeId");

-- CreateIndex
CREATE INDEX "Schedule_date_idx" ON "Schedule"("date");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_resource_resourceId_idx" ON "AuditLog"("resource", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayRate" ADD CONSTRAINT "PayRate_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
