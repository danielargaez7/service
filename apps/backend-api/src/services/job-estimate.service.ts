import prisma from '../prisma';

export interface JobEstimate {
  employeeId: string;
  employeeName: string;
  jobType: string;
  dayOfWeek: number; // 0=Sun, 6=Sat
  avgHours: number;
  minHours: number;
  maxHours: number;
  dataPoints: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface LaborInsight {
  type: 'OT_RISK' | 'EFFICIENCY' | 'COST' | 'TREND';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  employeeId?: string;
  employeeName?: string;
  metric?: number;
}

export interface AnalyticsSummary {
  totalLaborCost: number;
  totalOTCost: number;
  avgHoursPerEmployee: number;
  otEmployeeCount: number;
  totalEmployees: number;
  totalHours: number;
  totalRegularHours: number;
  totalOTHours: number;
}

export interface CostByJobType {
  jobType: string;
  regularPay: number;
  overtimePay: number;
  totalHours: number;
}

export interface OTByWeek {
  weekLabel: string;
  otHours: number;
  otCost: number;
}

export interface EmployeeOTRanking {
  employeeId: string;
  employeeName: string;
  otHours: number;
  avgRate: number;
}

export class JobEstimateService {
  /**
   * Get estimated hours for a specific employee + job type + day of week.
   * Based on historical completed time entries.
   */
  async getEstimate(
    employeeId: string,
    jobType: string,
    dayOfWeek?: number
  ): Promise<JobEstimate | null> {
    const where: any = {
      employeeId,
      jobType,
      clockOut: { not: null },
      hoursWorked: { not: null, gt: 0 },
      deletedAt: null,
    };

    const entries = await prisma.timeEntry.findMany({
      where,
      select: {
        hoursWorked: true,
        clockIn: true,
        employee: { select: { firstName: true, lastName: true } },
      },
      orderBy: { clockIn: 'desc' },
      take: 100, // last 100 entries max
    });

    if (entries.length === 0) return null;

    // Filter by day of week if specified
    const filtered = dayOfWeek !== undefined
      ? entries.filter((e) => e.clockIn.getDay() === dayOfWeek)
      : entries;

    if (filtered.length === 0) return null;

    const hours = filtered.map((e) => Number(e.hoursWorked));
    const avg = hours.reduce((s, h) => s + h, 0) / hours.length;
    const emp = entries[0].employee;

    return {
      employeeId,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : employeeId,
      jobType,
      dayOfWeek: dayOfWeek ?? -1,
      avgHours: Math.round(avg * 10) / 10,
      minHours: Math.round(Math.min(...hours) * 10) / 10,
      maxHours: Math.round(Math.max(...hours) * 10) / 10,
      dataPoints: filtered.length,
      confidence: filtered.length >= 20 ? 'HIGH' : filtered.length >= 10 ? 'MEDIUM' : 'LOW',
    };
  }

  /**
   * Get estimates for all employees for a given job type.
   */
  async getEstimatesForJobType(jobType: string): Promise<JobEstimate[]> {
    const employees = await prisma.employee.findMany({
      where: { deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
    });

    const results: JobEstimate[] = [];
    for (const emp of employees) {
      const est = await this.getEstimate(emp.id, jobType);
      if (est) results.push(est);
    }

    return results.sort((a, b) => a.avgHours - b.avgHours);
  }

  /**
   * Generate AI-style insights from historical data.
   * No ML needed — just smart SQL queries presented as natural language.
   */
  async generateInsights(periodStart: Date, periodEnd: Date): Promise<LaborInsight[]> {
    const insights: LaborInsight[] = [];

    // Get all entries in the period with employee data
    const entries = await prisma.timeEntry.findMany({
      where: {
        clockIn: { gte: periodStart, lte: periodEnd },
        clockOut: { not: null },
        deletedAt: null,
      },
      include: { employee: true },
    });

    if (entries.length === 0) return insights;

    // Group by employee
    const byEmployee = new Map<string, { name: string; hours: number; otHours: number; entries: number }>();
    for (const e of entries) {
      const id = e.employeeId;
      const hours = Number(e.hoursWorked ?? 0);
      const ot = Number(e.overtimeHours ?? 0);
      const existing = byEmployee.get(id);
      const name = e.employee ? `${e.employee.firstName} ${e.employee.lastName}` : id;
      if (existing) {
        existing.hours += hours;
        existing.otHours += ot;
        existing.entries++;
      } else {
        byEmployee.set(id, { name, hours, otHours: ot, entries: 1 });
      }
    }

    const allEmps = [...byEmployee.values()];
    const avgHours = allEmps.reduce((s, e) => s + e.hours, 0) / allEmps.length;
    const totalOT = allEmps.reduce((s, e) => s + e.otHours, 0);

    // OT risk: employees with high weekly hours
    for (const [, emp] of byEmployee) {
      if (emp.otHours > avgHours * 0.15) {
        insights.push({
          type: 'OT_RISK',
          severity: emp.otHours > 10 ? 'critical' : 'warning',
          title: `${emp.name} has ${emp.otHours.toFixed(1)}h overtime`,
          message: `${emp.name} logged ${emp.hours.toFixed(1)} total hours with ${emp.otHours.toFixed(1)}h overtime this period. Consider redistributing workload.`,
          employeeName: emp.name,
          metric: emp.otHours,
        });
      }
    }

    // Efficiency: fastest vs slowest on same job type
    const byJobType = new Map<string, { employees: Map<string, { name: string; avgHours: number; count: number }> }>();
    for (const e of entries) {
      const jt = e.jobType;
      const hours = Number(e.hoursWorked ?? 0);
      if (!byJobType.has(jt)) byJobType.set(jt, { employees: new Map() });
      const jtData = byJobType.get(jt)!;
      const existing = jtData.employees.get(e.employeeId);
      const name = e.employee ? `${e.employee.firstName} ${e.employee.lastName}` : e.employeeId;
      if (existing) {
        existing.avgHours = (existing.avgHours * existing.count + hours) / (existing.count + 1);
        existing.count++;
      } else {
        jtData.employees.set(e.employeeId, { name, avgHours: hours, count: 1 });
      }
    }

    for (const [jobType, data] of byJobType) {
      const emps = [...data.employees.values()].filter((e) => e.count >= 3);
      if (emps.length < 2) continue;
      emps.sort((a, b) => a.avgHours - b.avgHours);
      const fastest = emps[0];
      const teamAvg = emps.reduce((s, e) => s + e.avgHours, 0) / emps.length;
      const pctFaster = ((teamAvg - fastest.avgHours) / teamAvg) * 100;
      if (pctFaster > 8) {
        const label = jobType.replace(/_/g, ' ').toLowerCase();
        insights.push({
          type: 'EFFICIENCY',
          severity: 'info',
          title: `${fastest.name} completes ${label} ${Math.round(pctFaster)}% faster`,
          message: `${fastest.name} averages ${fastest.avgHours.toFixed(1)}h on ${label} routes vs team average of ${teamAvg.toFixed(1)}h. Consider this driver for high-priority ${label} assignments.`,
          employeeName: fastest.name,
          metric: pctFaster,
        });
      }
    }

    // Cost trend
    if (totalOT > 20) {
      const avgOTRate = 42; // approximate
      insights.push({
        type: 'COST',
        severity: 'warning',
        title: `$${Math.round(totalOT * avgOTRate).toLocaleString()} in overtime costs this period`,
        message: `Total overtime across ${allEmps.filter((e) => e.otHours > 0).length} employees is costing approximately $${Math.round(totalOT * avgOTRate).toLocaleString()}. Reducing OT by 20% would save ~$${Math.round(totalOT * avgOTRate * 0.2).toLocaleString()}.`,
        metric: totalOT * avgOTRate,
      });
    }

    return insights.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });
  }

  /**
   * Get analytics summary for a period.
   */
  async getAnalyticsSummary(periodStart: Date, periodEnd: Date): Promise<AnalyticsSummary> {
    const entries = await prisma.timeEntry.findMany({
      where: {
        clockIn: { gte: periodStart, lte: periodEnd },
        clockOut: { not: null },
        deletedAt: null,
      },
      include: { employee: { include: { payRates: true } } },
    });

    const employeeIds = new Set(entries.map((e) => e.employeeId));
    let totalRegular = 0;
    let totalOT = 0;
    let totalRegularPay = 0;
    let totalOTPay = 0;

    for (const e of entries) {
      const regular = Number(e.regularHours ?? 0);
      const ot = Number(e.overtimeHours ?? 0);
      totalRegular += regular;
      totalOT += ot;

      const rate = e.employee?.payRates?.[0]
        ? Number(e.employee.payRates[0].ratePerHour)
        : 28;
      totalRegularPay += regular * rate;
      totalOTPay += ot * rate * 1.5;
    }

    const totalHours = totalRegular + totalOT;
    const empCount = employeeIds.size || 1;

    return {
      totalLaborCost: Math.round(totalRegularPay + totalOTPay),
      totalOTCost: Math.round(totalOTPay),
      avgHoursPerEmployee: Math.round((totalHours / empCount) * 10) / 10,
      otEmployeeCount: entries.filter((e) => Number(e.overtimeHours ?? 0) > 0).length,
      totalEmployees: empCount,
      totalHours: Math.round(totalHours * 10) / 10,
      totalRegularHours: Math.round(totalRegular * 10) / 10,
      totalOTHours: Math.round(totalOT * 10) / 10,
    };
  }

  /**
   * Get labor cost breakdown by job type.
   */
  async getCostByJobType(periodStart: Date, periodEnd: Date): Promise<CostByJobType[]> {
    const entries = await prisma.timeEntry.findMany({
      where: {
        clockIn: { gte: periodStart, lte: periodEnd },
        clockOut: { not: null },
        deletedAt: null,
      },
      include: { employee: { include: { payRates: true } } },
    });

    const byJob = new Map<string, CostByJobType>();
    for (const e of entries) {
      const jt = e.jobType;
      const regular = Number(e.regularHours ?? 0);
      const ot = Number(e.overtimeHours ?? 0);
      const rate = e.employee?.payRates?.find((pr) => pr.jobType === jt)
        ? Number(e.employee.payRates.find((pr) => pr.jobType === jt)!.ratePerHour)
        : 28;

      const existing = byJob.get(jt) ?? { jobType: jt, regularPay: 0, overtimePay: 0, totalHours: 0 };
      existing.regularPay += regular * rate;
      existing.overtimePay += ot * rate * 1.5;
      existing.totalHours += regular + ot;
      byJob.set(jt, existing);
    }

    return [...byJob.values()]
      .map((j) => ({
        ...j,
        regularPay: Math.round(j.regularPay),
        overtimePay: Math.round(j.overtimePay),
        totalHours: Math.round(j.totalHours * 10) / 10,
      }))
      .sort((a, b) => (b.regularPay + b.overtimePay) - (a.regularPay + a.overtimePay));
  }

  /**
   * Get top OT employees.
   */
  async getTopOTEmployees(periodStart: Date, periodEnd: Date, limit = 5): Promise<EmployeeOTRanking[]> {
    const entries = await prisma.timeEntry.findMany({
      where: {
        clockIn: { gte: periodStart, lte: periodEnd },
        clockOut: { not: null },
        deletedAt: null,
        overtimeHours: { gt: 0 },
      },
      include: { employee: { include: { payRates: true } } },
    });

    const byEmp = new Map<string, EmployeeOTRanking>();
    for (const e of entries) {
      const ot = Number(e.overtimeHours ?? 0);
      const rate = e.employee?.payRates?.[0] ? Number(e.employee.payRates[0].ratePerHour) : 28;
      const name = e.employee ? `${e.employee.firstName} ${e.employee.lastName}` : e.employeeId;
      const existing = byEmp.get(e.employeeId);
      if (existing) {
        existing.otHours += ot;
      } else {
        byEmp.set(e.employeeId, { employeeId: e.employeeId, employeeName: name, otHours: ot, avgRate: rate });
      }
    }

    return [...byEmp.values()]
      .map((e) => ({ ...e, otHours: Math.round(e.otHours * 10) / 10 }))
      .sort((a, b) => b.otHours - a.otHours)
      .slice(0, limit);
  }
}

export const jobEstimateService = new JobEstimateService();
