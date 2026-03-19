import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { SelectModule } from 'primeng/select';
import { ManagerAlertsService, ManagerAlertTier } from '../../core/manager-alerts.service';
import { ReportFilterBarComponent } from '../../shared/report-filter-bar.component';

type RiskSeverity = 'HIGH' | 'MEDIUM' | 'LOW';
type RiskType = 'CDL_EXPIRED' | 'CDL_EXPIRING' | 'DOT_PHYSICAL_EXPIRED' | 'DOT_PHYSICAL_EXPIRING' | 'HOS_WARNING';
type ManifestSeverity = 'OVERDUE' | 'PENDING' | 'ACCEPTED';

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

interface ManifestRecord {
  id: number;
  employeeName: string;
  routeLabel: string;
  wasteVolume: string;
  status: ManifestSeverity;
  uploadedAt: string;
  summary: string;
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

const MOCK_MANIFESTS: ManifestRecord[] = [
  {
    id: 101,
    employeeName: 'Marcus Rivera',
    routeLabel: 'Mar 15 Septic Route',
    wasteVolume: '750 gal',
    status: 'OVERDUE',
    uploadedAt: '2026-03-15',
    summary: 'Pending submission to the state portal for domestic septage disposal.',
  },
  {
    id: 102,
    employeeName: 'DeShawn Williams',
    routeLabel: 'Mar 16 Grease Trap',
    wasteVolume: '420 gal',
    status: 'PENDING',
    uploadedAt: '2026-03-16',
    summary: 'Captured in driver app but not yet transmitted to the receiving facility.',
  },
  {
    id: 103,
    employeeName: 'Carlos Mendoza',
    routeLabel: 'Mar 14 Septic Route',
    wasteVolume: '680 gal',
    status: 'PENDING',
    uploadedAt: '2026-03-14',
    summary: 'Signature present, waiting on batch submission.',
  },
  {
    id: 104,
    employeeName: 'James Wilson',
    routeLabel: 'Mar 13 Roll-Off',
    wasteVolume: '5.2 tons',
    status: 'ACCEPTED',
    uploadedAt: '2026-03-13',
    summary: 'Accepted by receiving facility and linked to the disposal ticket.',
  },
];

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReportFilterBarComponent,
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
        <button type="button" class="summary-card total" [class.active]="!severityFilter()" (click)="severityFilter.set(null)">
          <div class="card-icon"><i class="pi pi-shield"></i></div>
          <div class="card-body">
            <span class="card-value">{{ totalRisks() }}</span>
            <span class="card-label">Total Risks</span>
          </div>
          <div class="card-hover-detail">
            All open compliance risks across CDL, DOT, and HOS categories
          </div>
        </button>
        <button type="button" class="summary-card high" [class.active]="severityFilter() === 'HIGH'" (click)="severityFilter.set(severityFilter() === 'HIGH' ? null : 'HIGH')">
          <div class="card-icon"><i class="pi pi-exclamation-triangle"></i></div>
          <div class="card-body">
            <span class="card-value">{{ highCount() }}</span>
            <span class="card-label">High Severity</span>
          </div>
          <div class="card-hover-detail">
            Expired CDLs, exceeded HOS limits, drivers that must be pulled off route immediately
          </div>
        </button>
        <button type="button" class="summary-card medium" [class.active]="severityFilter() === 'MEDIUM'" (click)="severityFilter.set(severityFilter() === 'MEDIUM' ? null : 'MEDIUM')">
          <div class="card-icon"><i class="pi pi-exclamation-circle"></i></div>
          <div class="card-body">
            <span class="card-value">{{ mediumCount() }}</span>
            <span class="card-label">Medium Severity</span>
          </div>
          <div class="card-hover-detail">
            Expiring certifications and approaching HOS limits — action needed within 30 days
          </div>
        </button>
        <button type="button" class="summary-card low" [class.active]="severityFilter() === 'LOW'" (click)="severityFilter.set(severityFilter() === 'LOW' ? null : 'LOW')">
          <div class="card-icon"><i class="pi pi-info-circle"></i></div>
          <div class="card-body">
            <span class="card-value">{{ lowCount() }}</span>
            <span class="card-label">Low Severity</span>
          </div>
          <div class="card-hover-detail">
            Upcoming renewals with plenty of lead time — no immediate action required
          </div>
        </button>
      </div>

      <app-report-filter-bar
        [preset]="datePreset()"
        [presetOptions]="presetOptions"
        [searchTerm]="searchTerm()"
        searchPlaceholder="Search driver or employee ID..."
        [status]="severityFilter()"
        [statusOptions]="severityOptions"
        [dateFrom]="dateFrom()"
        [dateTo]="dateTo()"
        primaryActionLabel="Export"
        secondaryActionLabel="View Queue"
        tertiaryActionLabel="Reset"
        (presetChange)="datePreset.set($event)"
        (searchTermChange)="searchTerm.set($event)"
        (statusChange)="severityFilter.set($event)"
        (dateFromChange)="dateFrom.set($event)"
        (dateToChange)="dateTo.set($event)"
        (primaryAction)="exportManifestCsv()"
        (secondaryAction)="submitPendingManifests()"
        (tertiaryAction)="resetFilters()"
      />

      <section class="hos-board">
        @for (risk of hosRisks(); track risk.id) {
          <article class="hos-card" [class.critical]="(risk.hoursRemaining ?? 0) <= 4">
            <div class="hos-header">
              <div>
                <strong>{{ risk.employeeName }}</strong>
                <span>{{ risk.employeeId }} · {{ risk.hoursRemaining }}h remaining</span>
              </div>
              <span class="hos-status">{{ (risk.hoursRemaining ?? 0) <= 4 ? 'Critical window' : 'Watchlist' }}</span>
            </div>
            <div class="hos-track">
              <div class="hos-fill" [style.width.%]="hosUsagePercent(risk)"></div>
            </div>
            <p>{{ risk.details }}</p>
          </article>
        }
      </section>

      <section class="manifest-panel">
        <div class="manifest-panel-header">
          <div>
            <h3>Manifest Compliance</h3>
            <p>Monitor disposal records captured from the driver end-of-shift flow.</p>
          </div>
          <div class="manifest-actions">
            <button pButton type="button" icon="pi pi-download" label="Export CSV" class="p-button-outlined p-button-sm"
              (click)="exportManifestCsv()"></button>
            <button pButton type="button" icon="pi pi-send" label="Submit to EPA" class="p-button-sm"
              (click)="submitPendingManifests()"></button>
          </div>
        </div>

        <div class="manifest-groups">
          <div class="manifest-group">
            <div class="manifest-group-title overdue">
              <span>Overdue (&gt;48 hours)</span>
              <strong>{{ overdueManifests().length }} records</strong>
            </div>
            @for (record of overdueManifests(); track record.id) {
              <article class="manifest-record overdue">
                <div class="manifest-record-copy">
                  <strong>{{ record.employeeName }} — {{ record.routeLabel }} — {{ record.wasteVolume }}</strong>
                  <p>{{ record.summary }}</p>
                </div>
                <div class="manifest-record-actions">
                  <button pButton type="button" label="Submit Now" class="p-button-sm" (click)="submitManifest(record)"></button>
                  <button pButton type="button" label="View Record" class="p-button-outlined p-button-sm" (click)="viewManifest(record)"></button>
                </div>
              </article>
            } @empty {
              <div class="manifest-empty">No overdue manifest records.</div>
            }
          </div>

          <div class="manifest-group">
            <div class="manifest-group-title pending">
              <span>Pending Submission</span>
              <strong>{{ pendingManifests().length }} records</strong>
            </div>
            @for (record of pendingManifests(); track record.id) {
              <article class="manifest-record pending">
                <div class="manifest-record-copy">
                  <strong>{{ record.employeeName }} — {{ record.routeLabel }} — {{ record.wasteVolume }}</strong>
                  <p>{{ record.summary }}</p>
                </div>
                <div class="manifest-record-actions">
                  <button pButton type="button" label="Submit Batch" class="p-button-sm p-button-outlined" (click)="submitManifest(record)"></button>
                </div>
              </article>
            } @empty {
              <div class="manifest-empty">No pending manifests waiting for submission.</div>
            }
          </div>

          <div class="manifest-group">
            <div class="manifest-group-title accepted">
              <span>Submitted & Accepted</span>
              <strong>{{ acceptedManifests().length }} records</strong>
            </div>
            @for (record of acceptedManifests(); track record.id) {
              <article class="manifest-record accepted">
                <div class="manifest-record-copy">
                  <strong>{{ record.employeeName }} — {{ record.routeLabel }} — {{ record.wasteVolume }}</strong>
                  <p>{{ record.summary }}</p>
                </div>
              </article>
            } @empty {
              <div class="manifest-empty">No accepted manifests yet this month.</div>
            }
          </div>
        </div>

        <div class="manifest-metrics">
          <span>This Month: {{ manifestRecords().length }} manifests</span>
          <span>· {{ acceptedManifests().length }} accepted</span>
          <span>· {{ pendingManifests().length }} pending</span>
          <span>· {{ overdueManifests().length }} overdue</span>
        </div>
      </section>

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
      gap: 10px;
      padding: 10px 14px;
      border-radius: var(--sc-radius-md);
      background: var(--sc-card-bg);
      border: 1px solid var(--sc-border);
      cursor: pointer;
      transition: all 0.15s ease;
      position: relative;
      font-family: inherit;
      text-align: left;
      width: 100%;
    }
    .summary-card:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
    .summary-card.active {
      outline: 2px solid var(--sc-orange);
      outline-offset: -1px;
    }
    .card-hover-detail {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      right: 0;
      padding: 10px 12px;
      background: var(--sc-sidebar-bg, #1a1f36);
      color: rgba(255, 255, 255, 0.9);
      font-size: 0.75rem;
      line-height: 1.4;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.15s ease, visibility 0.15s ease;
      z-index: 10;
      pointer-events: none;
    }
    .summary-card:hover .card-hover-detail {
      opacity: 1;
      visibility: visible;
    }
    .card-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
      flex-shrink: 0;
    }
    .card-body {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .card-value {
      font-size: 1.25rem;
      font-weight: 700;
      line-height: 1;
      color: var(--sc-text-primary);
    }
    .card-label {
      font-size: 0.78rem;
      color: var(--sc-text-secondary);
    }

    .summary-card.total .card-icon { background: var(--sc-info-1); color: var(--sc-info-3); }
    .summary-card.high .card-icon { background: var(--sc-danger-1); color: var(--sc-danger-3); }
    .summary-card.high .card-value { color: var(--sc-danger-4); }
    .summary-card.medium .card-icon { background: var(--sc-warning-1); color: var(--sc-warning-3); }
    .summary-card.medium .card-value { color: var(--sc-warning-4); }
    .summary-card.low .card-icon { background: var(--sc-success-1); color: var(--sc-success-3); }
    .summary-card.low .card-value { color: var(--sc-success-4); }

    .hos-board {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--sc-space-4);
      margin-bottom: var(--sc-space-5);
    }
    .hos-card {
      background: var(--sc-card-bg);
      border: 1px solid var(--sc-border);
      border-radius: var(--sc-radius-lg);
      padding: var(--sc-space-4);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .hos-card.critical {
      border-color: rgba(228, 90, 78, 0.3);
      box-shadow: 0 12px 32px rgba(228, 90, 78, 0.08);
    }
    .hos-header {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
    }
    .hos-header div {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .hos-header strong {
      color: var(--sc-text-primary);
    }
    .hos-header span,
    .hos-card p {
      color: var(--sc-text-secondary);
      font-size: var(--sc-text-sm);
      margin: 0;
    }
    .hos-status {
      font-size: var(--sc-text-xs);
      font-weight: 700;
      color: var(--sc-warning-4);
      background: var(--sc-warning-1);
      border: 1px solid var(--sc-warning-2);
      border-radius: var(--sc-radius-full);
      padding: 4px 8px;
      white-space: nowrap;
    }
    .hos-card.critical .hos-status {
      color: var(--sc-danger-4);
      background: var(--sc-danger-1);
      border-color: rgba(228, 90, 78, 0.2);
    }
    .hos-track {
      height: 10px;
      border-radius: var(--sc-radius-full);
      background: var(--sc-gray-1);
      overflow: hidden;
    }
    .hos-fill {
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--sc-success-3) 0%, var(--sc-warning-3) 70%, var(--sc-danger-3) 100%);
    }

    .manifest-panel {
      background: var(--sc-card-bg);
      border: 1px solid var(--sc-border);
      border-radius: var(--sc-radius-lg);
      padding: var(--sc-space-5);
      margin-bottom: var(--sc-space-5);
    }
    .manifest-panel-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--sc-space-4);
      margin-bottom: var(--sc-space-4);
    }
    .manifest-panel-header h3 {
      margin: 0 0 4px;
      font-size: var(--sc-text-lg);
      color: var(--sc-text-primary);
    }
    .manifest-panel-header p {
      margin: 0;
      color: var(--sc-text-secondary);
      font-size: var(--sc-text-sm);
    }
    .manifest-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .manifest-groups {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--sc-space-4);
    }
    .manifest-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .manifest-group-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: var(--sc-text-sm);
      font-weight: 700;
      padding: 10px 12px;
      border-radius: var(--sc-radius-md);
    }
    .manifest-group-title.overdue {
      background: var(--sc-danger-1);
      color: var(--sc-danger-4);
    }
    .manifest-group-title.pending {
      background: var(--sc-warning-1);
      color: var(--sc-warning-4);
    }
    .manifest-group-title.accepted {
      background: var(--sc-success-1);
      color: var(--sc-success-4);
    }
    .manifest-record {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--sc-space-4);
      border-radius: var(--sc-radius-md);
      padding: 12px 14px;
      border: 1px solid var(--sc-border);
      background: var(--sc-gray-1);
    }
    .manifest-record.overdue {
      border-left: 4px solid var(--sc-danger-3);
    }
    .manifest-record.pending {
      border-left: 4px solid var(--sc-warning-3);
    }
    .manifest-record.accepted {
      border-left: 4px solid var(--sc-success-3);
    }
    .manifest-record-copy strong {
      display: block;
      color: var(--sc-text-primary);
      font-size: var(--sc-text-sm);
      margin-bottom: 4px;
    }
    .manifest-record-copy p {
      margin: 0;
      color: var(--sc-text-secondary);
      font-size: var(--sc-text-sm);
      line-height: 1.4;
    }
    .manifest-record-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      flex-shrink: 0;
    }
    .manifest-metrics {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: var(--sc-space-4);
      color: var(--sc-text-secondary);
      font-size: var(--sc-text-sm);
      font-weight: 600;
    }
    .manifest-empty {
      color: var(--sc-text-secondary);
      font-size: var(--sc-text-sm);
      padding: 6px 0;
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
      .hos-board { grid-template-columns: 1fr; }
    }
    @media (max-width: 640px) {
      .summary-cards { grid-template-columns: 1fr; }
    }
  `],
})
export class CompliancePage {
  // State
  risks = signal<(ComplianceRisk & { severityOrder: number })[]>(
    MOCK_RISKS.map((r) => ({ ...r, severityOrder: this.severityToOrder(r.severity) }))
  );
  manifestRecords = signal<ManifestRecord[]>(MOCK_MANIFESTS);
  searchTerm = signal('');
  riskTypeFilter = signal<string | null>(null);
  severityFilter = signal<string | null>(null);
  datePreset = signal('7d');
  dateFrom = signal('');
  dateTo = signal('');

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
  presetOptions = [
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'This Quarter', value: 'quarter' },
  ];

  filteredRisks = computed(() => {
    let result = this.risks();
    const search = this.searchTerm().trim().toLowerCase();
    const type = this.riskTypeFilter();
    const severity = this.severityFilter();
    if (search) {
      result = result.filter(
        (risk) =>
          risk.employeeName.toLowerCase().includes(search) ||
          risk.employeeId.toLowerCase().includes(search)
      );
    }
    if (type) result = result.filter((r) => r.riskType === type);
    if (severity) result = result.filter((r) => r.severity === severity);
    return result;
  });

  totalRisks = computed(() => this.risks().length);
  highCount = computed(() => this.risks().filter((r) => r.severity === 'HIGH').length);
  mediumCount = computed(() => this.risks().filter((r) => r.severity === 'MEDIUM').length);
  lowCount = computed(() => this.risks().filter((r) => r.severity === 'LOW').length);
  overdueManifests = computed(() =>
    this.manifestRecords().filter((record) => record.status === 'OVERDUE')
  );
  pendingManifests = computed(() =>
    this.manifestRecords().filter((record) => record.status === 'PENDING')
  );
  acceptedManifests = computed(() =>
    this.manifestRecords().filter((record) => record.status === 'ACCEPTED')
  );
  hosRisks = computed(() =>
    this.filteredRisks()
      .filter((risk) => risk.riskType === 'HOS_WARNING')
      .sort((left, right) => (left.hoursRemaining ?? 999) - (right.hoursRemaining ?? 999))
      .slice(0, 3)
  );

  private readonly router = inject(Router);

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

  hosUsagePercent(risk: ComplianceRisk): number {
    const hoursRemaining = risk.hoursRemaining ?? 10;
    return Math.max(8, Math.min(100, ((10 - hoursRemaining) / 10) * 100));
  }

  getSeverityColor(severity: RiskSeverity): string {
    switch (severity) {
      case 'HIGH': return '#ef4444';
      case 'MEDIUM': return '#f59e0b';
      case 'LOW': return '#22c55e';
    }
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.riskTypeFilter.set(null);
    this.severityFilter.set(null);
    this.datePreset.set('7d');
    this.dateFrom.set('');
    this.dateTo.set('');
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
    void this.router.navigateByUrl(`/employees`);
  }

  exportManifestCsv(): void {
    this.alerts.low(
      'Manifest export queued',
      'Manifest compliance export was queued as a CSV download.',
      '/compliance'
    );
  }

  submitPendingManifests(): void {
    const pendingCount = this.pendingManifests().length + this.overdueManifests().length;
    this.manifestRecords.update((records) =>
      records.map((record) =>
        record.status === 'PENDING' || record.status === 'OVERDUE'
          ? { ...record, status: 'ACCEPTED' as ManifestSeverity, summary: 'Submitted electronically and accepted by receiving system.' }
          : record
      )
    );
    this.alerts.high(
      'Manifest batch submitted',
      `${pendingCount} manifest record${pendingCount === 1 ? '' : 's'} were submitted electronically.`,
      '/compliance'
    );
  }

  submitManifest(record: ManifestRecord): void {
    this.manifestRecords.update((records) =>
      records.map((item) =>
        item.id === record.id
          ? { ...item, status: 'ACCEPTED' as ManifestSeverity, summary: 'Submitted electronically and accepted by receiving system.' }
          : item
      )
    );
    this.alerts.high(
      'Manifest submitted',
      `${record.employeeName}'s disposal record for ${record.routeLabel} was submitted successfully.`,
      '/compliance'
    );
  }

  viewManifest(record: ManifestRecord): void {
    this.alerts.low(
      'Manifest record',
      `${record.employeeName} — ${record.routeLabel} — ${record.wasteVolume}. ${record.summary}`,
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
