import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { SelectModule } from 'primeng/select';
import { ManagerAlertsService, ManagerAlertTier } from '../../core/manager-alerts.service';

type RiskSeverity = 'HIGH' | 'MEDIUM' | 'LOW';
type RiskType = 'CDL_EXPIRED' | 'CDL_EXPIRING' | 'DOT_PHYSICAL_EXPIRED' | 'DOT_PHYSICAL_EXPIRING' | 'HOS_WARNING';

interface ComplianceRisk {
  id: number;
  employeeName: string;
  employeeId: string;
  riskType: RiskType;
  severity: RiskSeverity;
  details: string;
  expiryDate: string | null;
  hoursRemaining: number | null;
  dateIdentified: string;
}

const RISK_TYPE_LABELS: Record<RiskType, string> = {
  CDL_EXPIRED: 'CDL Expired',
  CDL_EXPIRING: 'CDL Expiring Soon',
  DOT_PHYSICAL_EXPIRED: 'DOT Physical Expired',
  DOT_PHYSICAL_EXPIRING: 'DOT Physical Expiring',
  HOS_WARNING: 'HOS Violation Warning',
};

const RISK_TYPE_ICONS: Record<RiskType, string> = {
  CDL_EXPIRED: 'pi pi-id-card',
  CDL_EXPIRING: 'pi pi-id-card',
  DOT_PHYSICAL_EXPIRED: 'pi pi-heart',
  DOT_PHYSICAL_EXPIRING: 'pi pi-heart',
  HOS_WARNING: 'pi pi-clock',
};

const MOCK_RISKS: ComplianceRisk[] = [
  {
    id: 1,
    employeeName: 'Carlos Mendoza',
    employeeId: 'EMP-001',
    riskType: 'CDL_EXPIRED',
    severity: 'HIGH',
    details: 'CDL Class A license expired on 2026-02-28. Driver is currently operating with an expired license and must be taken off route immediately.',
    expiryDate: '2026-02-28',
    hoursRemaining: null,
    dateIdentified: '2026-03-01',
  },
  {
    id: 2,
    employeeName: 'Ahmad Hassan',
    employeeId: 'EMP-002',
    riskType: 'DOT_PHYSICAL_EXPIRING',
    severity: 'MEDIUM',
    details: 'DOT physical examination certificate expires on 2026-04-10. Schedule renewal appointment within the next 25 days.',
    expiryDate: '2026-04-10',
    hoursRemaining: null,
    dateIdentified: '2026-03-10',
  },
  {
    id: 3,
    employeeName: 'James Wilson',
    employeeId: 'EMP-004',
    riskType: 'HOS_WARNING',
    severity: 'HIGH',
    details: 'Approaching 60-hour / 7-day HOS limit. Currently at 56.5 hours with 3.5 hours remaining this cycle. Logged 11.25 hours on 03/14.',
    expiryDate: null,
    hoursRemaining: 3.5,
    dateIdentified: '2026-03-14',
  },
  {
    id: 4,
    employeeName: 'Marcus Brown',
    employeeId: 'EMP-009',
    riskType: 'HOS_WARNING',
    severity: 'HIGH',
    details: 'Exceeded 11-hour daily driving limit on 03/14 with 12.0 hours logged. Also approaching 60-hour / 7-day limit at 58 hours. Mandatory 34-hour restart required.',
    expiryDate: null,
    hoursRemaining: 2.0,
    dateIdentified: '2026-03-14',
  },
  {
    id: 5,
    employeeName: 'Roberto Garcia',
    employeeId: 'EMP-006',
    riskType: 'CDL_EXPIRING',
    severity: 'MEDIUM',
    details: 'CDL Class B license expires on 2026-05-15. Renewal should be scheduled within the next 60 days.',
    expiryDate: '2026-05-15',
    hoursRemaining: null,
    dateIdentified: '2026-03-12',
  },
  {
    id: 6,
    employeeName: 'Dwayne Thompson',
    employeeId: 'EMP-005',
    riskType: 'HOS_WARNING',
    severity: 'MEDIUM',
    details: 'Approaching 60-hour / 7-day HOS limit at 52 hours. 8 hours remaining this cycle. Monitor closely for the rest of the week.',
    expiryDate: null,
    hoursRemaining: 8.0,
    dateIdentified: '2026-03-14',
  },
  {
    id: 7,
    employeeName: 'Maria Santos',
    employeeId: 'EMP-003',
    riskType: 'DOT_PHYSICAL_EXPIRING',
    severity: 'LOW',
    details: 'DOT physical examination certificate expires on 2026-06-20. Plenty of time to schedule renewal.',
    expiryDate: '2026-06-20',
    hoursRemaining: null,
    dateIdentified: '2026-03-14',
  },
  {
    id: 8,
    employeeName: 'Tyrone Jackson',
    employeeId: 'EMP-007',
    riskType: 'CDL_EXPIRING',
    severity: 'LOW',
    details: 'CDL Class A license expires on 2026-07-01. No action required yet.',
    expiryDate: '2026-07-01',
    hoursRemaining: null,
    dateIdentified: '2026-03-14',
  },
];

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    TagModule,
    ButtonModule,
    BadgeModule,
    SelectModule,
  ],
  selector: 'app-compliance',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="compliance-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-title">
          <h2>Compliance Risk Dashboard</h2>
          <span class="subtitle">Monitor compliance risks and take action before violations occur</span>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="summary-card total">
          <div class="card-icon"><i class="pi pi-shield"></i></div>
          <div class="card-body">
            <span class="card-value">{{ totalRisks() }}</span>
            <span class="card-label">Total Risks</span>
          </div>
        </div>
        <div class="summary-card high">
          <div class="card-icon"><i class="pi pi-exclamation-triangle"></i></div>
          <div class="card-body">
            <span class="card-value">{{ highCount() }}</span>
            <span class="card-label">High Severity</span>
          </div>
        </div>
        <div class="summary-card medium">
          <div class="card-icon"><i class="pi pi-exclamation-circle"></i></div>
          <div class="card-body">
            <span class="card-value">{{ mediumCount() }}</span>
            <span class="card-label">Medium Severity</span>
          </div>
        </div>
        <div class="summary-card low">
          <div class="card-icon"><i class="pi pi-info-circle"></i></div>
          <div class="card-body">
            <span class="card-value">{{ lowCount() }}</span>
            <span class="card-label">Low Severity</span>
          </div>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <p-select
          [options]="riskTypeOptions"
          [ngModel]="riskTypeFilter()"
          (ngModelChange)="riskTypeFilter.set($event)"
          placeholder="All Risk Types"
          [showClear]="true"
          styleClass="filter-dropdown"
        />
        <p-select
          [options]="severityOptions"
          [ngModel]="severityFilter()"
          (ngModelChange)="severityFilter.set($event)"
          placeholder="All Severities"
          [showClear]="true"
          styleClass="filter-dropdown"
        />
      </div>

      <!-- Risk Table -->
      <p-table
        [value]="filteredRisks()"
        [sortField]="'severityOrder'"
        [sortOrder]="1"
        styleClass="p-datatable-sm"
        [tableStyle]="{ 'min-width': '60rem' }"
      >
        <ng-template pTemplate="header">
          <tr>
            <th style="width: 3rem"></th>
            <th pSortableColumn="employeeName">Employee <p-sortIcon field="employeeName" /></th>
            <th pSortableColumn="riskType">Risk Type <p-sortIcon field="riskType" /></th>
            <th pSortableColumn="severityOrder">Severity <p-sortIcon field="severityOrder" /></th>
            <th>Details</th>
            <th pSortableColumn="expiryDate">Expiry / Hours Left <p-sortIcon field="expiryDate" /></th>
            <th pSortableColumn="dateIdentified">Identified <p-sortIcon field="dateIdentified" /></th>
            <th style="width: 10rem">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-risk>
          <tr>
            <td>
              <i [class]="getRiskIcon(risk.riskType)" [style.color]="getSeverityColor(risk.severity)"></i>
            </td>
            <td>
              <div class="employee-cell">
                <strong>{{ risk.employeeName }}</strong>
                <small>{{ risk.employeeId }}</small>
              </div>
            </td>
            <td>
              <span class="risk-type-label">{{ getRiskTypeLabel(risk.riskType) }}</span>
            </td>
            <td>
              <p-tag
                [value]="risk.severity"
                [severity]="getSeveritySeverity(risk.severity)"
                [rounded]="true"
              />
            </td>
            <td>
              <span class="details-text">{{ risk.details }}</span>
            </td>
            <td>
              <span *ngIf="risk.expiryDate" class="expiry-info">
                <i class="pi pi-calendar"></i> {{ risk.expiryDate }}
              </span>
              <span *ngIf="risk.hoursRemaining !== null" class="hours-info" [class.critical]="risk.hoursRemaining <= 4">
                <i class="pi pi-clock"></i> {{ risk.hoursRemaining }}h remaining
              </span>
            </td>
            <td>{{ risk.dateIdentified }}</td>
            <td>
              <div class="action-buttons">
                <button
                  pButton
                  pRipple
                  icon="pi pi-bell"
                  class="p-button-warning p-button-sm p-button-rounded p-button-text"
                  label="Alert"
                  (click)="sendAlert(risk)"
                ></button>
                <button
                  pButton
                  pRipple
                  icon="pi pi-user"
                  class="p-button-info p-button-sm p-button-rounded p-button-text"
                  (click)="viewEmployee(risk)"
                ></button>
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="8" class="empty-message">
              <i class="pi pi-check-circle"></i>
              <p>No compliance risks match your filters.</p>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `,
  styles: [`
    .compliance-page {
      animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

    .page-header {
      margin-bottom: var(--sc-space-5);
    }
    .header-title h2 {
      margin: 0 0 4px;
      font-size: var(--sc-text-2xl);
      font-weight: 700;
      color: var(--sc-text-primary);
    }
    .subtitle {
      color: var(--sc-text-secondary);
      font-size: var(--sc-text-sm);
    }

    /* Summary Cards */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--sc-space-4);
      margin-bottom: var(--sc-space-5);
    }
    .summary-card {
      display: flex;
      align-items: center;
      gap: var(--sc-space-4);
      padding: var(--sc-space-5);
      border-radius: var(--sc-radius-lg);
      background: var(--sc-card-bg);
      border: 1px solid var(--sc-border);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .summary-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    }
    .card-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      flex-shrink: 0;
    }
    .card-body {
      display: flex;
      flex-direction: column;
    }
    .card-value {
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1;
      color: var(--sc-text-primary);
    }
    .card-label {
      font-size: 0.85rem;
      color: var(--sc-text-secondary);
      margin-top: 4px;
    }

    .summary-card.total .card-icon { background: var(--sc-info-1); color: var(--sc-info-3); }
    .summary-card.high .card-icon { background: var(--sc-danger-1); color: var(--sc-danger-3); }
    .summary-card.high .card-value { color: var(--sc-danger-4); }
    .summary-card.medium .card-icon { background: var(--sc-warning-1); color: var(--sc-warning-3); }
    .summary-card.medium .card-value { color: var(--sc-warning-4); }
    .summary-card.low .card-icon { background: var(--sc-success-1); color: var(--sc-success-3); }
    .summary-card.low .card-value { color: var(--sc-success-4); }

    /* Filter Bar */
    .filter-bar {
      display: flex;
      gap: var(--sc-space-4);
      margin-bottom: var(--sc-space-4);
      flex-wrap: wrap;
      background: var(--sc-card-bg);
      padding: var(--sc-space-4) var(--sc-space-5);
      border-radius: var(--sc-radius-md);
      border: 1px solid var(--sc-border);
    }
    :host ::ng-deep .filter-dropdown {
      min-width: 200px;
    }

    /* Employee cell */
    .employee-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .employee-cell small {
      color: var(--sc-text-secondary);
      font-size: 0.75rem;
    }

    .risk-type-label {
      font-weight: 500;
      font-size: 0.875rem;
    }

    .details-text {
      font-size: 0.85rem;
      color: var(--sc-text-secondary);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.4;
    }

    .expiry-info, .hours-info {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .expiry-info i, .hours-info i {
      font-size: 0.8rem;
    }
    .hours-info.critical {
      color: var(--sc-danger-4);
      font-weight: 700;
    }

    .action-buttons {
      display: flex;
      gap: 4px;
    }

    .empty-message {
      text-align: center;
      padding: 48px 20px;
      color: var(--sc-text-secondary);
    }
    .empty-message i {
      font-size: 2rem;
      margin-bottom: 8px;
      display: block;
      color: var(--sc-success-3);
    }

    @media (max-width: 1024px) {
      .summary-cards { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 640px) {
      .summary-cards { grid-template-columns: 1fr; }
      .filter-bar { flex-direction: column; }
    }
  `],
})
export class CompliancePage {
  // State
  risks = signal<(ComplianceRisk & { severityOrder: number })[]>(
    MOCK_RISKS.map((r) => ({ ...r, severityOrder: this.severityToOrder(r.severity) }))
  );
  riskTypeFilter = signal<string | null>(null);
  severityFilter = signal<string | null>(null);

  riskTypeOptions = [
    { label: 'CDL Expired', value: 'CDL_EXPIRED' },
    { label: 'CDL Expiring', value: 'CDL_EXPIRING' },
    { label: 'DOT Physical Expired', value: 'DOT_PHYSICAL_EXPIRED' },
    { label: 'DOT Physical Expiring', value: 'DOT_PHYSICAL_EXPIRING' },
    { label: 'HOS Warning', value: 'HOS_WARNING' },
  ];

  severityOptions = [
    { label: 'High', value: 'HIGH' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'Low', value: 'LOW' },
  ];

  filteredRisks = computed(() => {
    let result = this.risks();
    const type = this.riskTypeFilter();
    const severity = this.severityFilter();
    if (type) result = result.filter((r) => r.riskType === type);
    if (severity) result = result.filter((r) => r.severity === severity);
    return result;
  });

  totalRisks = computed(() => this.risks().length);
  highCount = computed(() => this.risks().filter((r) => r.severity === 'HIGH').length);
  mediumCount = computed(() => this.risks().filter((r) => r.severity === 'MEDIUM').length);
  lowCount = computed(() => this.risks().filter((r) => r.severity === 'LOW').length);

  constructor(private readonly alerts: ManagerAlertsService) {}

  severityToOrder(severity: RiskSeverity): number {
    switch (severity) {
      case 'HIGH': return 1;
      case 'MEDIUM': return 2;
      case 'LOW': return 3;
    }
  }

  getRiskTypeLabel(type: RiskType): string {
    return RISK_TYPE_LABELS[type];
  }

  getRiskIcon(type: RiskType): string {
    return RISK_TYPE_ICONS[type];
  }

  getSeverityColor(severity: RiskSeverity): string {
    switch (severity) {
      case 'HIGH': return '#ef4444';
      case 'MEDIUM': return '#f59e0b';
      case 'LOW': return '#22c55e';
    }
  }

  getSeveritySeverity(severity: RiskSeverity): 'danger' | 'warn' | 'success' {
    switch (severity) {
      case 'HIGH': return 'danger';
      case 'MEDIUM': return 'warn';
      case 'LOW': return 'success';
    }
  }

  sendAlert(risk: ComplianceRisk): void {
    const tier = this.getAlertTier(risk);
    const title = this.getAlertTitle(risk);
    const message = this.getAlertMessage(risk);

    switch (tier) {
      case 'critical':
        this.alerts.critical(title, message, '/compliance');
        break;
      case 'high':
        this.alerts.high(title, message, '/compliance');
        break;
      case 'medium':
        this.alerts.medium(title, message, '/compliance');
        break;
      case 'low':
        this.alerts.low(title, message, '/compliance');
        break;
    }
  }

  viewEmployee(risk: ComplianceRisk): void {
    this.alerts.low(
      'Employee detail view coming next',
      `${risk.employeeName} (${risk.employeeId}) was selected from the compliance board.`,
      '/compliance'
    );
  }

  private getAlertTier(risk: ComplianceRisk): ManagerAlertTier {
    if (risk.riskType === 'CDL_EXPIRED' || risk.riskType === 'DOT_PHYSICAL_EXPIRED') {
      return 'critical';
    }

    if (risk.riskType === 'HOS_WARNING' && risk.hoursRemaining !== null && risk.hoursRemaining <= 4) {
      return 'critical';
    }

    if (risk.severity === 'HIGH') {
      return 'high';
    }

    if (risk.severity === 'MEDIUM') {
      return 'medium';
    }

    return 'low';
  }

  private getAlertTitle(risk: ComplianceRisk): string {
    switch (risk.riskType) {
      case 'CDL_EXPIRED':
        return 'Immediate compliance removal required';
      case 'CDL_EXPIRING':
        return 'CDL renewal window is approaching';
      case 'DOT_PHYSICAL_EXPIRED':
        return 'DOT physical expired';
      case 'DOT_PHYSICAL_EXPIRING':
        return 'DOT physical renewal due soon';
      case 'HOS_WARNING':
        return risk.hoursRemaining !== null && risk.hoursRemaining <= 4
          ? 'HOS threshold nearly exhausted'
          : 'HOS warning requires review';
    }
  }

  private getAlertMessage(risk: ComplianceRisk): string {
    const riskLabel = this.getRiskTypeLabel(risk.riskType);
    const timing = risk.expiryDate
      ? `Deadline ${risk.expiryDate}.`
      : risk.hoursRemaining !== null
        ? `${risk.hoursRemaining} hours remain in the current cycle.`
        : '';

    return `${risk.employeeName} has a ${riskLabel.toLowerCase()} issue. ${timing} Review compliance status now.`;
  }
}
