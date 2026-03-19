import { Component, signal, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MessageModule } from 'primeng/message';
import { ManagerAlertsService } from '../../core/manager-alerts.service';
import { environment } from '../../../environments/environment';

interface FlaggedItem {
  id: number;
  employeeName: string;
  issue: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  resolved: boolean;
}

interface WhatIfScenario {
  label: string;
  value: string;
}

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    TagModule,
    SelectModule,
    InputNumberModule,
    SelectButtonModule,
    MessageModule,
  ],
  selector: 'app-payroll',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="payroll">
      <div class="payroll-header">
        <h2>Payroll Preview & What-If Simulator</h2>
        <p class="header-subtitle">Run pre-payroll audits and model labor cost scenarios</p>
      </div>

      <!-- ═══════ PRE-PAYROLL AUDIT ═══════ -->
      <div class="section">
        <div class="section-title-row">
          <h3><i class="pi pi-file-check"></i> Pre-Payroll Audit Report</h3>
          <div class="section-actions">
            <p-select
              [options]="payPeriodOptions"
              [(ngModel)]="selectedPayPeriod"
              optionLabel="label"
              optionValue="value"
              styleClass="pay-period-dropdown"
            />
            <button
              pButton
              label="Run Pre-Payroll Audit"
              icon="pi pi-play"
              [loading]="auditLoading()"
              (click)="runAudit()"
              class="p-button-primary"
            ></button>
          </div>
        </div>

        <!-- Summary Cards -->
        @if (auditRan()) {
          <div class="summary-strip">
            @for (card of summaryCards(); track card.label) {
              <div class="summary-card" [style.--card-color]="card.color">
                <span class="summary-value">{{ card.value }}</span>
                <span class="summary-label">{{ card.label }}</span>
              </div>
            }
          </div>

          <!-- Flagged Items -->
          <div class="flagged-section">
            <div class="flagged-header">
              <h4><i class="pi pi-exclamation-triangle"></i> Flagged Items ({{ unresolvedCount() }})</h4>
              <div class="export-actions">
                <p-select
                  [options]="exportFormatOptions"
                  [(ngModel)]="selectedExportFormat"
                  optionLabel="label"
                  optionValue="value"
                  styleClass="export-format-dropdown"
                />
                <button
                  pButton
                  [label]="'Export to ' + selectedExportFormat"
                  icon="pi pi-upload"
                  class="p-button-outlined p-button-success"
                  (click)="exportToQuickBooks()"
                ></button>
              </div>
            </div>
            <p-table [value]="flaggedItems()" [tableStyle]="{ 'min-width': '50rem' }" styleClass="p-datatable-sm p-datatable-striped">
              <ng-template pTemplate="header">
                <tr>
                  <th>Employee</th>
                  <th>Issue</th>
                  <th>Severity</th>
                  <th style="width: 160px">Action</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-item>
                <tr [class.resolved-row]="item.resolved">
                  <td><strong>{{ item.employeeName }}</strong></td>
                  <td>{{ item.issue }}</td>
                  <td>
                    <p-tag
                      [value]="item.severity"
                      [severity]="severityColor(item.severity)"
                    />
                  </td>
                  <td>
                    @if (!item.resolved) {
                      <button pButton label="Resolve" icon="pi pi-check" class="p-button-sm p-button-success p-button-text" (click)="resolveItem(item)"></button>
                      <button pButton label="Dismiss" icon="pi pi-times" class="p-button-sm p-button-secondary p-button-text" (click)="dismissItem(item)"></button>
                    } @else {
                      <span class="resolved-badge"><i class="pi pi-check-circle"></i> Resolved</span>
                    }
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        }
      </div>

      <!-- ═══════ WHAT-IF SIMULATOR ═══════ -->
      <div class="section">
        <div class="section-title-row">
          <h3><i class="pi pi-sliders-h"></i> What-If Simulator</h3>
        </div>

        <div class="simulator-layout">
          <!-- Input Panel -->
          <div class="sim-input-panel">
            <div class="sim-field">
              <label>Scenario Type</label>
              <p-selectButton
                [options]="scenarioTypes"
                [(ngModel)]="selectedScenario"
                optionLabel="label"
                optionValue="value"
                (ngModelChange)="onScenarioChange()"
              />
            </div>

            @switch (selectedScenario) {
              @case ('holiday') {
                <div class="sim-field">
                  <label>Holiday Multiplier</label>
                  <p-inputNumber
                    [(ngModel)]="holidayMultiplier"
                    mode="decimal"
                    [min]="1"
                    [max]="3"
                    [minFractionDigits]="1"
                    [maxFractionDigits]="1"
                    [step]="0.5"
                    (ngModelChange)="recalculate()"
                  />
                </div>
                <div class="sim-field">
                  <label>Affected Employees</label>
                  <p-inputNumber
                    [(ngModel)]="holidayEmployees"
                    [min]="1"
                    [max]="20"
                    (ngModelChange)="recalculate()"
                  />
                </div>
              }
              @case ('hours') {
                <div class="sim-field">
                  <label>Additional Hours per Employee</label>
                  <p-inputNumber
                    [(ngModel)]="additionalHours"
                    mode="decimal"
                    [min]="-10"
                    [max]="20"
                    [minFractionDigits]="1"
                    [step]="0.5"
                    (ngModelChange)="recalculate()"
                  />
                </div>
              }
              @case ('employee') {
                <div class="sim-field">
                  <label>Number of New Employees</label>
                  <p-inputNumber
                    [(ngModel)]="newEmployeeCount"
                    [min]="1"
                    [max]="10"
                    (ngModelChange)="recalculate()"
                  />
                </div>
                <div class="sim-field">
                  <label>Avg Hourly Rate ($)</label>
                  <p-inputNumber
                    [(ngModel)]="newEmployeeRate"
                    mode="currency"
                    currency="USD"
                    [min]="10"
                    [max]="60"
                    (ngModelChange)="recalculate()"
                  />
                </div>
              }
              @case ('rate') {
                <div class="sim-field">
                  <label>Rate Change (%)</label>
                  <p-inputNumber
                    [(ngModel)]="rateChangePercent"
                    prefix="+"
                    suffix="%"
                    [min]="-20"
                    [max]="30"
                    [minFractionDigits]="1"
                    (ngModelChange)="recalculate()"
                  />
                </div>
              }
            }
          </div>

          <!-- Results Panel -->
          <div class="sim-results-panel">
            <h4>Projected Impact</h4>
            <div class="sim-results-grid">
              @for (r of simulatorResults(); track r.label) {
                <div class="sim-result-card">
                  <span class="sim-result-label">{{ r.label }}</span>
                  <span class="sim-result-value">{{ r.newValue }}</span>
                  <span
                    class="sim-result-delta"
                    [class.delta-positive]="r.deltaNum <= 0"
                    [class.delta-negative]="r.deltaNum > 0"
                  >
                    {{ r.delta }}
                  </span>
                </div>
              }
            </div>
            <div class="sim-cashflow">
              <div class="cashflow-label">Cash Flow Impact (This Period)</div>
              <div
                class="cashflow-value"
                [class.delta-positive]="cashFlowImpact() <= 0"
                [class.delta-negative]="cashFlowImpact() > 0"
              >
                {{ cashFlowImpact() >= 0 ? '+' : '' }}{{ cashFlowImpact() | currency:'USD':'symbol':'1.0-0' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .payroll {
      max-width: 1400px;
      margin: 0 auto;
    }

    .payroll-header {
      margin-bottom: var(--sc-space-5);
    }

    .payroll-header h2 {
      font-size: var(--sc-text-2xl);
      font-weight: 700;
      color: var(--sc-text-primary);
      margin: 0 0 4px;
    }

    .header-subtitle {
      color: var(--sc-text-secondary);
      font-size: var(--sc-text-sm);
      margin: 0;
    }

    /* ── Sections ── */
    .section {
      background: var(--sc-card-bg);
      border-radius: var(--sc-radius-lg);
      border: 1px solid var(--sc-border);
      padding: var(--sc-space-5);
      margin-bottom: var(--sc-space-5);
    }

    .section-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 12px;
    }

    .section-title-row h3 {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--sc-text-primary);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-title-row h3 i {
      color: var(--sc-orange);
    }

    .section-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* ── Summary Strip ── */
    .summary-strip {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: var(--sc-space-3);
      margin-bottom: var(--sc-space-5);
    }

    .summary-card {
      background: var(--sc-gray-1);
      border-radius: var(--sc-radius-md);
      padding: var(--sc-space-4);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      border-left: 3px solid var(--card-color, #4f8cff);
    }

    .summary-value {
      font-size: 1.4rem;
      font-weight: 800;
      color: var(--sc-text-primary);
    }

    .summary-label {
      font-size: 0.72rem;
      color: var(--sc-text-secondary);
      font-weight: 500;
      text-align: center;
    }

    /* ── Flagged Section ── */
    .flagged-section {
      margin-top: 16px;
    }

    .flagged-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .flagged-header h4 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--sc-text-primary);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .flagged-header h4 i {
      color: var(--sc-warning-3);
    }

    .export-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .resolved-row {
      opacity: 0.5;
    }

    .resolved-badge {
      font-size: 0.8rem;
      color: var(--sc-success-3);
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* ── Simulator ── */
    .simulator-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .sim-input-panel {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .sim-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .sim-field label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--sc-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .sim-results-panel {
      background: var(--sc-gray-1);
      border-radius: var(--sc-radius-lg);
      padding: var(--sc-space-5);
      border: 1px solid var(--sc-border);
    }

    .sim-results-panel h4 {
      margin: 0 0 16px;
      font-size: 1rem;
      font-weight: 700;
      color: var(--sc-text-primary);
    }

    .sim-results-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 20px;
    }

    .sim-result-card {
      background: var(--sc-card-bg);
      border-radius: var(--sc-radius-md);
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      border: 1px solid var(--sc-border);
    }

    .sim-result-label {
      font-size: 0.72rem;
      color: var(--sc-text-secondary);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .sim-result-value {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--sc-text-primary);
    }

    .sim-result-delta {
      font-size: 0.78rem;
      font-weight: 600;
    }

    .delta-positive {
      color: var(--sc-success-3);
    }

    .delta-negative {
      color: var(--sc-danger-3);
    }

    .sim-cashflow {
      background: var(--sc-card-bg);
      border-radius: var(--sc-radius-md);
      padding: 18px;
      text-align: center;
      border: 2px dashed var(--sc-border);
    }

    .cashflow-label {
      font-size: 0.8rem;
      color: var(--sc-text-secondary);
      font-weight: 500;
      margin-bottom: 4px;
    }

    .cashflow-value {
      font-size: 1.6rem;
      font-weight: 800;
    }

    /* ── Responsive ── */
    @media (max-width: 1024px) {
      .summary-strip {
        grid-template-columns: repeat(3, 1fr);
      }
      .simulator-layout {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .summary-strip {
        grid-template-columns: repeat(2, 1fr);
      }
      .section-title-row {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `],
})
export class PayrollPage {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // ── Pay period options ──
  payPeriodOptions = [
    { label: 'Current Period (Mar 1-15, 2026)', value: 'current' },
    { label: 'Previous Period (Feb 16-28, 2026)', value: 'previous' },
  ];
  selectedPayPeriod = 'current';

  // ── Export format ──
  exportFormatOptions = [
    { label: 'ADP', value: 'ADP' },
    { label: 'Gusto', value: 'GUSTO' },
    { label: 'QuickBooks', value: 'QUICKBOOKS' },
    { label: 'CSV', value: 'CSV' },
    { label: 'JSON', value: 'JSON' },
  ];
  selectedExportFormat = 'QUICKBOOKS';

  // ── Audit state ──
  auditLoading = signal(false);
  auditRan = signal(false);

  summaryCards = signal<{ label: string; value: string; color: string }[]>([]);

  flaggedItems = signal<FlaggedItem[]>([]);

  unresolvedCount = computed(
    () => this.flaggedItems().filter(i => !i.resolved).length
  );

  // ── Scenario state ──
  scenarioTypes: WhatIfScenario[] = [
    { label: 'Add Holiday', value: 'holiday' },
    { label: 'Change Hours', value: 'hours' },
    { label: 'Add Employee', value: 'employee' },
    { label: 'Change Pay Rate', value: 'rate' },
  ];
  selectedScenario = 'holiday';

  // Scenario inputs
  holidayMultiplier = 1.5;
  holidayEmployees = 20;
  additionalHours = 4;
  newEmployeeCount = 2;
  newEmployeeRate = 22;
  rateChangePercent = 5;

  // Base values
  private baseRegularHours = 1640;
  private baseOtHours = 160;
  private baseGrossPay = 52000;

  simulatorResults = signal<{ label: string; newValue: string; delta: string; deltaNum: number }[]>([
    { label: 'Total Regular Hours', newValue: '1,640', delta: '+0h', deltaNum: 0 },
    { label: 'Total OT Hours', newValue: '160', delta: '+0h', deltaNum: 0 },
    { label: 'Total Gross Pay', newValue: '$52,000', delta: '+$0', deltaNum: 0 },
    { label: 'Avg Cost / Employee', newValue: '$2,600', delta: '+$0', deltaNum: 0 },
  ]);

  cashFlowImpact = signal(0);

  constructor(private alerts: ManagerAlertsService) {
    this.recalculate();
  }

  private getPeriodDates(): { start: string; end: string } {
    if (this.selectedPayPeriod === 'previous') {
      return { start: '2026-02-16', end: '2026-02-28' };
    }
    return { start: '2026-03-01', end: '2026-03-15' };
  }

  runAudit(): void {
    this.auditLoading.set(true);
    const { start, end } = this.getPeriodDates();

    this.http.get<any>(`${this.apiUrl}/api/payroll/preview`, {
      params: { periodStart: start, periodEnd: end },
    }).subscribe({
      next: (res) => {
        const totals = res.totals ?? { employees: 0, totalHours: 0, regularHours: 0, overtimeHours: 0, totalPay: 0, flaggedItems: 0 };

        this.baseRegularHours = Math.round(totals.regularHours);
        this.baseOtHours = Math.round(totals.overtimeHours);
        this.baseGrossPay = Math.round(totals.totalPay);

        this.summaryCards.set([
          { label: 'Total Employees', value: totals.employees.toString(), color: '#4f8cff' },
          { label: 'Total Hours', value: Math.round(totals.totalHours).toLocaleString(), color: '#6366f1' },
          { label: 'Regular Hours', value: Math.round(totals.regularHours).toLocaleString(), color: '#10b981' },
          { label: 'OT Hours', value: Math.round(totals.overtimeHours).toLocaleString(), color: '#f59e0b' },
          { label: 'Total Gross Pay', value: '$' + Math.round(totals.totalPay).toLocaleString(), color: '#059669' },
          { label: 'Flagged Items', value: totals.flaggedItems.toString(), color: '#ef4444' },
        ]);

        // Build flagged items from preview data
        const flagged: FlaggedItem[] = [];
        let flagId = 1;
        for (const row of (res.data ?? [])) {
          for (const warning of (row.warnings ?? [])) {
            flagged.push({
              id: flagId++,
              employeeName: row.employeeName,
              issue: warning,
              severity: warning.toLowerCase().includes('cap') || warning.toLowerCase().includes('violation') ? 'HIGH' : 'MEDIUM',
              resolved: false,
            });
          }
        }
        this.flaggedItems.set(flagged);

        this.auditLoading.set(false);
        this.auditRan.set(true);
        this.recalculate();

        this.alerts.low(
          'Audit complete',
          `Pre-payroll audit finished. ${flagged.length} items flagged for review.`,
          '/payroll'
        );
      },
      error: () => {
        this.auditLoading.set(false);
        this.alerts.high('Audit failed', 'Could not connect to the payroll API.');
      },
    });
  }

  severityColor(severity: string): 'danger' | 'warn' | 'info' {
    switch (severity) {
      case 'HIGH': return 'danger';
      case 'MEDIUM': return 'warn';
      default: return 'info';
    }
  }

  resolveItem(item: FlaggedItem): void {
    this.flaggedItems.update(items =>
      items.map(i => (i.id === item.id ? { ...i, resolved: true } : i))
    );
    this.alerts.low(
      'Issue resolved',
      `Issue for ${item.employeeName} was marked as resolved.`,
      '/payroll'
    );
  }

  dismissItem(item: FlaggedItem): void {
    this.flaggedItems.update(items =>
      items.map(i => (i.id === item.id ? { ...i, resolved: true } : i))
    );
    this.alerts.low(
      'Issue dismissed',
      `Issue for ${item.employeeName} was dismissed from the audit queue.`,
      '/payroll'
    );
  }

  exportToQuickBooks(): void {
    const { start, end } = this.getPeriodDates();

    this.http.post(`${this.apiUrl}/api/payroll/export`, {
      periodStart: start,
      periodEnd: end,
      format: this.selectedExportFormat,
    }, { responseType: 'blob', observe: 'response' }).subscribe({
      next: (response) => {
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
          : `payroll-export.csv`;

        // Trigger download
        const blob = response.body;
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
        }

        this.alerts.low(
          'Export successful',
          `Payroll data exported as ${this.selectedExportFormat}.`,
          '/payroll'
        );
      },
      error: () => {
        this.alerts.high('Export failed', 'Could not export payroll data.');
      },
    });
  }

  onScenarioChange(): void {
    this.recalculate();
  }

  recalculate(): void {
    let newRegular = this.baseRegularHours;
    let newOt = this.baseOtHours;
    let newGross = this.baseGrossPay;
    const employeeCount = 20;

    switch (this.selectedScenario) {
      case 'holiday': {
        const holidayHours = this.holidayEmployees * 8;
        const extraCost = holidayHours * 28 * (this.holidayMultiplier - 1);
        newGross = this.baseGrossPay + extraCost;
        break;
      }
      case 'hours': {
        const totalExtra = this.additionalHours * employeeCount;
        if (this.additionalHours > 0) {
          newOt = this.baseOtHours + totalExtra;
          newGross = this.baseGrossPay + totalExtra * 42;
        } else {
          const reduction = Math.min(Math.abs(totalExtra), this.baseOtHours);
          newOt = this.baseOtHours - reduction;
          const remainingReduction = Math.abs(totalExtra) - reduction;
          newRegular = this.baseRegularHours - remainingReduction;
          newGross = this.baseGrossPay + totalExtra * 28;
        }
        break;
      }
      case 'employee': {
        const addedHours = this.newEmployeeCount * 80;
        newRegular = this.baseRegularHours + addedHours;
        newGross = this.baseGrossPay + addedHours * this.newEmployeeRate;
        break;
      }
      case 'rate': {
        const multiplier = 1 + this.rateChangePercent / 100;
        newGross = Math.round(this.baseGrossPay * multiplier);
        break;
      }
    }

    const deltaRegular = newRegular - this.baseRegularHours;
    const deltaOt = newOt - this.baseOtHours;
    const deltaGross = newGross - this.baseGrossPay;
    const totalEmployees = this.selectedScenario === 'employee' ? employeeCount + this.newEmployeeCount : employeeCount;
    const avgCost = Math.round(newGross / totalEmployees);
    const baseAvgCost = Math.round(this.baseGrossPay / employeeCount);
    const deltaAvg = avgCost - baseAvgCost;

    this.simulatorResults.set([
      {
        label: 'Total Regular Hours',
        newValue: newRegular.toLocaleString(),
        delta: `${deltaRegular >= 0 ? '+' : ''}${deltaRegular}h`,
        deltaNum: deltaRegular,
      },
      {
        label: 'Total OT Hours',
        newValue: newOt.toLocaleString(),
        delta: `${deltaOt >= 0 ? '+' : ''}${deltaOt}h`,
        deltaNum: deltaOt,
      },
      {
        label: 'Total Gross Pay',
        newValue: '$' + Math.round(newGross).toLocaleString(),
        delta: `${deltaGross >= 0 ? '+$' : '-$'}${Math.abs(Math.round(deltaGross)).toLocaleString()}`,
        deltaNum: deltaGross,
      },
      {
        label: 'Avg Cost / Employee',
        newValue: '$' + avgCost.toLocaleString(),
        delta: `${deltaAvg >= 0 ? '+$' : '-$'}${Math.abs(deltaAvg).toLocaleString()}`,
        deltaNum: deltaAvg,
      },
    ]);

    this.cashFlowImpact.set(Math.round(deltaGross));
  }
}
