import prisma from '../prisma';
import { TimesheetStatus, Prisma } from '@prisma/client';
import { AnomalyService } from './anomaly.service';

const anomalyService = new AnomalyService();

const ANOMALY_THRESHOLD = 0.6;

export interface JobCompletionData {
  employeeId: string;
  jobType: string;
  startedAt: string; // ISO
  completedAt: string; // ISO
  routeId?: string;
  gpsStart?: { lat: number; lng: number; accuracy: number };
  gpsEnd?: { lat: number; lng: number; accuracy: number };
  extraFlags?: string[];
}

export interface TimesheetFilters {
  employeeId?: string;
  status?: TimesheetStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class TimesheetService {
  async createFromJobCompletion(data: JobCompletionData) {
    const clockIn = new Date(data.startedAt);
    const clockOut = new Date(data.completedAt);
    const hoursWorked = Math.max(0, (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60));

    // Score for anomalies
    const anomaly = await anomalyService.scorePunch({
      type: 'IN',
      timestamp: data.startedAt,
      gps: data.gpsStart ?? { lat: 0, lng: 0, accuracy: 999 },
      employeeId: data.employeeId,
    });

    const anomalyFlags = [...anomaly.flags, ...(data.extraFlags ?? [])];
    const anomalyScore = Math.min(1, anomaly.score + (data.extraFlags?.length ?? 0) * 0.15);

    const status: TimesheetStatus =
      anomalyScore >= ANOMALY_THRESHOLD ? 'FLAGGED' : 'SUBMITTED';

    const entry = await prisma.timeEntry.create({
      data: {
        employeeId: data.employeeId,
        clockIn,
        clockOut,
        jobType: data.jobType as any,
        routeId: data.routeId ?? null,
        gpsClockIn: data.gpsStart ? (data.gpsStart as any) : Prisma.JsonNull,
        gpsClockOut: data.gpsEnd ? (data.gpsEnd as any) : Prisma.JsonNull,
        hoursWorked,
        regularHours: Math.min(hoursWorked, 8),
        overtimeHours: Math.max(0, hoursWorked - 8),
        doubleTimeHours: 0,
        anomalyScore,
        anomalyFlags,
        status,
        notes: anomalyFlags.length > 0 ? `anomaly:${anomalyFlags.join(',')}` : null,
      },
      include: { employee: true },
    });

    return entry;
  }

  async findByFilters(filters: TimesheetFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.TimeEntryWhereInput = {
      deletedAt: null,
    };

    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.clockIn = {};
      if (filters.startDate) where.clockIn.gte = filters.startDate;
      if (filters.endDate) where.clockIn.lte = filters.endDate;
    }

    const [data, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where,
        include: { employee: true },
        orderBy: { clockIn: 'desc' },
        skip,
        take: limit,
      }),
      prisma.timeEntry.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findActive() {
    return prisma.timeEntry.findMany({
      where: { clockOut: null, deletedAt: null },
      include: { employee: true },
      orderBy: { clockIn: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.timeEntry.findFirst({
      where: { id, deletedAt: null },
      include: { employee: true },
    });
  }

  async approve(id: string, approvedBy: string) {
    const entry = await prisma.timeEntry.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approved: true,
        approvedBy,
        approvedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: approvedBy,
        action: 'APPROVE_TIMESHEET',
        resource: 'TimeEntry',
        resourceId: id,
        details: { newStatus: 'APPROVED' },
      },
    });

    return entry;
  }

  async reject(id: string, reason: string, rejectedBy: string) {
    const entry = await prisma.timeEntry.update({
      where: { id },
      data: {
        status: 'REJECTED',
        flagReason: reason,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: rejectedBy,
        action: 'REJECT_TIMESHEET',
        resource: 'TimeEntry',
        resourceId: id,
        details: { newStatus: 'REJECTED', reason },
      },
    });

    return entry;
  }

  async findByEmployeeAndDateRange(employeeId: string, start: Date, end: Date) {
    return prisma.timeEntry.findMany({
      where: {
        employeeId,
        clockIn: { gte: start, lte: end },
        deletedAt: null,
      },
      include: { employee: true },
      orderBy: { clockIn: 'asc' },
    });
  }

  async findByDateRange(start: Date, end: Date, statuses?: TimesheetStatus[]) {
    return prisma.timeEntry.findMany({
      where: {
        clockIn: { gte: start, lte: end },
        deletedAt: null,
        ...(statuses ? { status: { in: statuses } } : {}),
      },
      include: { employee: true },
      orderBy: { clockIn: 'asc' },
    });
  }

  async detectMissedClockOuts(thresholdHours = 14) {
    const cutoff = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);

    const missed = await prisma.timeEntry.findMany({
      where: {
        clockOut: null,
        clockIn: { lt: cutoff },
        status: { notIn: ['FLAGGED', 'REJECTED'] },
        deletedAt: null,
      },
    });

    if (missed.length === 0) return [];

    await prisma.timeEntry.updateMany({
      where: { id: { in: missed.map((e) => e.id) } },
      data: { status: 'FLAGGED', flagReason: 'Missed clock-out detected' },
    });

    // Add the flag to each entry individually (updateMany can't append to arrays)
    for (const entry of missed) {
      const flags = [...(entry.anomalyFlags ?? []), 'missed-clock-out'];
      await prisma.timeEntry.update({
        where: { id: entry.id },
        data: { anomalyFlags: flags },
      });
    }

    console.log(`[missed-clockout] Flagged ${missed.length} entries`);
    return missed;
  }

  async getExceptions() {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 14 * 60 * 60 * 1000);
    // Scope alerts to last 7 days for dashboard relevance
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [missedClockOuts, hosWarnings, otAlerts, allFlagged] = await Promise.all([
      // Missed clock-outs (active for 14+ hours)
      prisma.timeEntry.count({
        where: {
          clockOut: null,
          clockIn: { lt: cutoff },
          deletedAt: null,
          status: { notIn: ['REJECTED'] },
        },
      }),
      // HOS warnings (last 7 days, pending/flagged only)
      prisma.timeEntry.count({
        where: {
          anomalyFlags: { hasSome: ['hos-violation', 'hos-warning'] },
          clockIn: { gte: weekAgo },
          deletedAt: null,
          status: { in: ['PENDING', 'FLAGGED'] },
        },
      }),
      // OT alerts (last 7 days, pending/flagged only)
      prisma.timeEntry.count({
        where: {
          OR: [
            { anomalyFlags: { has: 'ot-warning' } },
            { overtimeHours: { gt: 0 } },
          ],
          clockIn: { gte: weekAgo },
          deletedAt: null,
          status: { in: ['PENDING', 'FLAGGED'] },
        },
      }),
      // All flagged entries with details
      prisma.timeEntry.findMany({
        where: {
          status: 'FLAGGED',
          deletedAt: null,
        },
        include: { employee: true },
        orderBy: { clockIn: 'desc' },
        take: 50,
      }),
    ]);

    return {
      counts: {
        missedClockOuts,
        hosWarnings,
        otAlerts,
        totalFlagged: allFlagged.length,
      },
      flaggedEntries: allFlagged,
    };
  }

  async bulkApprove(ids: string[], approvedBy: string) {
    await prisma.timeEntry.updateMany({
      where: { id: { in: ids } },
      data: {
        status: 'APPROVED',
        approved: true,
        approvedBy,
        approvedAt: new Date(),
      },
    });

    // Audit log for each
    await prisma.auditLog.createMany({
      data: ids.map((id) => ({
        userId: approvedBy,
        action: 'BULK_APPROVE_TIMESHEET',
        resource: 'TimeEntry',
        resourceId: id,
        details: { newStatus: 'APPROVED' },
      })),
    });

    return { approved: ids.length };
  }

  async markExported(ids: string[], exportedBy: string) {
    await prisma.timeEntry.updateMany({
      where: { id: { in: ids } },
      data: { status: 'EXPORTED' },
    });

    await prisma.auditLog.create({
      data: {
        userId: exportedBy,
        action: 'EXPORT_PAYROLL',
        resource: 'TimeEntry',
        resourceId: 'batch',
        details: { entryIds: ids, count: ids.length },
      },
    });
  }
}

export const timesheetService = new TimesheetService();
