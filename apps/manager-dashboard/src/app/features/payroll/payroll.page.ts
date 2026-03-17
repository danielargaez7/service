import { Component, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';

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
    ToastModule,
    MessageModule,
  ],
  providers: [MessageService],
  selector: 'app-payroll',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-toast />
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
              <button
                pButton
                label="Export to QuickBooks"
                icon="pi pi-upload"
                class="p-button-outlined p-button-success"
                (click)="exportToQuickBooks()"
              ></button>
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
      margin-bottom: 24px;
    }

    .payroll-header h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--sc-text-primary, #1e293b);
      margin: 0 0 4px;
    }

    .header-subtitle {
      color: var(--sc-text-secondary, #64748b);
      font-size: 0.9rem;
      margin: 0;
    }

    /* ── Sections ── */
    .section {
      background: #fff;
      border-radius: 12px;
      border: 1px solid var(--sc-border, #e2e6ed);
      padding: 24px;
      margin-bottom: 24px;
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
      color: var(--sc-text-primary, #1e293b);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-title-row h3 i {
      color: var(--sc-accent, #4f8cff);
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
      gap: 12px;
      margin-bottom: 24px;
    }

    .summary-card {
      background: #f8fafc;
      border-radius: 10px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      border-left: 3px solid var(--card-color, #4f8cff);
    }

    .summary-value {
      font-size: 1.4rem;
      font-weight: 800;
      color: var(--sc-text-primary, #1e293b);
    }

    .summary-label {
      font-size: 0.72rem;
      color: var(--sc-text-secondary, #64748b);
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
      color: var(--sc-text-primary, #1e293b);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .flagged-header h4 i {
      color: #f59e0b;
    }

    .resolved-row {
      opacity: 0.5;
    }

    .resolved-badge {
      font-size: 0.8rem;
      color: #059669;
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
      color: var(--sc-text-secondary, #64748b);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .sim-results-panel {
      background: #f8fafc;
      border-radius: 12px;
      padding: 24px;
      border: 1px solid var(--sc-border, #e2e6ed);
    }

    .sim-results-panel h4 {
      margin: 0 0 16px;
      font-size: 1rem;
      font-weight: 700;
      color: var(--sc-text-primary, #1e293b);
    }

    .sim-results-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 20px;
    }

    .sim-result-card {
      background: #fff;
      border-radius: 8px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      border: 1px solid var(--sc-border, #e2e6ed);
    }

    .sim-result-label {
      font-size: 0.72rem;
      color: var(--sc-text-secondary, #64748b);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .sim-result-value {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--sc-text-primary, #1e293b);
    }

    .sim-result-delta {
      font-size: 0.78rem;
      font-weight: 600;
    }

    .delta-positive {
      color: #059669;
    }

    .delta-negative {
      color: #dc2626;
    }

    .sim-cashflow {
      background: #fff;
      border-radius: 10px;
      padding: 18px;
      text-align: center;
      border: 2px dashed var(--sc-border, #e2e6ed);
    }

    .cashflow-label {
      font-size: 0.8rem;
      color: var(--sc-text-secondary, #64748b);
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
  // ── Pay period options ──
  payPeriodOptions = [
    { label: 'Current Period (Mar 1-15, 2026)', value: 'current' },
    { label: 'Previous Period (Feb 16-28, 2026)', value: 'previous' },
  ];
  selectedPayPeriod = 'current';

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

  constructor(private messageService: MessageService) {
    this.recalculate();
  }

  runAudit(): void {
    this.auditLoading.set(true);
    setTimeout(() => {
      this.summaryCards.set([
        { label: 'Total Employees', value: '20', color: '#4f8cff' },
        { label: 'Total Hours', value: '1,800', color: '#6366f1' },
        { label: 'Regular Hours', value: '1,640', color: '#10b981' },
        { label: 'OT Hours', value: '160', color: '#f59e0b' },
        { label: 'Total Gross Pay', value: '$52,000', color: '#059669' },
        { label: 'Flagged Items', value: '3', color: '#ef4444' },
      ]);

      this.flaggedItems.set([
        {
          id: 1,
          employeeName: 'Marcus Rivera',
          issue: 'Missing clock-out punch on 03/10 — shift shows 14.2 hours (likely forgot to clock out)',
          severity: 'HIGH',
          resolved: false,
        },
        {
          id: 2,
          employeeName: 'James Okafor',
          issue: 'OT anomaly — 18.5 OT hours this period, 2.4x team average. Verify route assignment.',
          severity: 'MEDIUM',
          resolved: false,
        },
        {
          id: 3,
          employeeName: 'Sarah Chen',
          issue: 'Route mismatch — clocked in at Westside depot but assigned to Northgate route on 03/12',
          severity: 'LOW',
          resolved: false,
        },
      ]);

      this.auditLoading.set(false);
      this.auditRan.set(true);

      this.messageService.add({
        severity: 'success',
        summary: 'Audit Complete',
        detail: 'Pre-payroll audit finished. 3 items flagged for review.',
      });
    }, 1500);
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
    this.messageService.add({
      severity: 'success',
      summary: 'Resolved',
      detail: `Issue for ${item.employeeName} marked as resolved.`,
    });
  }

  dismissItem(item: FlaggedItem): void {
    this.flaggedItems.update(items =>
      items.map(i => (i.id === item.id ? { ...i, resolved: true } : i))
    );
    this.messageService.add({
      severity: 'info',
      summary: 'Dismissed',
      detail: `Issue for ${item.employeeName} dismissed.`,
    });
  }

  exportToQuickBooks(): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Export Successful',
      detail: 'Payroll data exported to QuickBooks. 20 employee records sent.',
      life: 4000,
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
