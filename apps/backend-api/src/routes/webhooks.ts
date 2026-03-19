import { Router, Request, Response } from 'express';
import { z } from 'zod/v4';
import { timesheetService, type JobCompletionData } from '../services/timesheet.service';
import { OvertimeService } from '../services/overtime.service';
import { isWithinGeofence, type JobSite } from '@servicecore/geofence';
import { checkViolations, type HOSDutyEntry } from '@servicecore/hos-engine';
import prisma from '../prisma';
import { timingSafeEqual } from 'crypto';

export const webhooksRouter = Router();

const WEBHOOK_SECRET = process.env.SERVICECORE_WEBHOOK_SECRET ?? '';

const overtimeService = new OvertimeService();

// ─── Zod schema ──────────────────────────────────────────────────────────────

const jobCompleteSchema = z.object({
  routeId: z.string().optional(),
  employeeId: z.string(),
  jobType: z.string(),
  startedAt: z.iso.datetime(),
  completedAt: z.iso.datetime(),
  gpsStart: z.object({
    lat: z.number(),
    lng: z.number(),
    accuracy: z.number(),
  }).optional(),
  gpsEnd: z.object({
    lat: z.number(),
    lng: z.number(),
    accuracy: z.number(),
  }).optional(),
  customerSiteId: z.string().optional(),
  customerSiteLat: z.number().optional(),
  customerSiteLng: z.number().optional(),
  customerSiteRadius: z.number().optional(),
});

// ─── Webhook secret verification ─────────────────────────────────────────────

function verifyWebhookSecret(req: Request): boolean {
  const provided = req.headers['x-webhook-secret'] as string | undefined;
  if (!WEBHOOK_SECRET || !provided) return false;

  const a = Buffer.from(WEBHOOK_SECRET);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ─── POST /api/webhooks/job-complete ─────────────────────────────────────────

webhooksRouter.post('/job-complete', async (req: Request, res: Response) => {
  try {
    // Auth check
    if (WEBHOOK_SECRET && !verifyWebhookSecret(req)) {
      res.status(401).json({ error: 'Invalid webhook secret' });
      return;
    }

    // Validate payload
    const parsed = jobCompleteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.issues });
      return;
    }

    const body = parsed.data;

    // Verify employee exists
    const employee = await prisma.employee.findFirst({
      where: { id: body.employeeId, deletedAt: null },
      include: { payRates: true },
    });

    if (!employee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    // ─── Geofence check ───────────────────────────────────────────────────────
    const extraFlags: string[] = [];

    if (body.gpsEnd && body.customerSiteLat && body.customerSiteLng) {
      const site: JobSite = {
        id: body.customerSiteId ?? 'unknown',
        name: 'Customer Site',
        lat: body.customerSiteLat,
        lng: body.customerSiteLng,
        radiusMeters: body.customerSiteRadius ?? 200,
      };
      const result = isWithinGeofence(body.gpsEnd.lat, body.gpsEnd.lng, site);
      if (!result.isInside) {
        extraFlags.push('gps-mismatch');
      }
    }

    // ─── Create the timesheet entry ───────────────────────────────────────────
    const completionData: JobCompletionData = {
      employeeId: body.employeeId,
      jobType: body.jobType,
      startedAt: body.startedAt,
      completedAt: body.completedAt,
      routeId: body.routeId,
      gpsStart: body.gpsStart,
      gpsEnd: body.gpsEnd,
      extraFlags,
    };

    const entry = await timesheetService.createFromJobCompletion(completionData);

    // ─── Overtime check (this week) ───────────────────────────────────────────
    const now = new Date(body.completedAt);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);

    const weekEntries = await timesheetService.findByEmployeeAndDateRange(
      body.employeeId,
      weekStart,
      now
    );

    if (employee.payRates.length > 0) {
      const otResult = overtimeService.calculateForEntries(
        body.employeeId,
        weekEntries.map((e) => ({
          id: e.id,
          employeeId: e.employeeId,
          clockIn: e.clockIn,
          clockOut: e.clockOut,
          jobType: e.jobType as any,
          gpsIn: null,
          gpsOut: null,
          photoInUrl: null,
          photoOutUrl: null,
          status: e.status as any,
          approvedById: e.approvedBy,
          approvedAt: e.approvedAt,
          flagReason: e.flagReason,
          notes: e.notes,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        })),
        employee.payRates.map((pr) => ({
          id: pr.id,
          employeeId: pr.employeeId,
          jobType: pr.jobType as any,
          ratePerHour: Number(pr.ratePerHour),
          effectiveFrom: pr.effectiveFrom,
          effectiveTo: pr.effectiveTo,
        })),
        {
          employeeClass: employee.employeeClass as any,
          stateCode: employee.stateCode,
          cbAgreementId: employee.cbAgreementId ?? undefined,
          isMotorCarrierExempt: employee.isMotorCarrier,
        }
      );

      if (otResult.warnings.length > 0) {
        const flags = [...(entry.anomalyFlags ?? []), 'ot-warning'];
        await prisma.timeEntry.update({
          where: { id: entry.id },
          data: { anomalyFlags: flags },
        });
      }
    }

    // ─── HOS check ────────────────────────────────────────────────────────────
    if (employee.isMotorCarrier) {
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const todayEntries = weekEntries.filter((e) => e.clockIn >= todayStart);

      const toDutyEntry = (e: typeof weekEntries[0]): HOSDutyEntry => ({
        startTime: e.clockIn,
        endTime: e.clockOut ?? new Date(),
        type: 'ON_DUTY',
      });

      const violations = checkViolations(
        todayEntries.map(toDutyEntry),
        weekEntries.map(toDutyEntry)
      );

      if (violations.length > 0) {
        const flags = [...(entry.anomalyFlags ?? []), 'hos-violation'];
        await prisma.timeEntry.update({
          where: { id: entry.id },
          data: {
            anomalyFlags: flags,
            status: 'FLAGGED',
            flagReason: violations.map((v) => v.message).join('; '),
          },
        });
      }
    }

    res.status(201).json({ data: entry, source: 'job-completion' });
  } catch (err) {
    console.error('[webhook/job-complete]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
