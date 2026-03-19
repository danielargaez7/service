import { Component, ChangeDetectionStrategy, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { BadgeModule } from 'primeng/badge';
import { ReportFilterBarComponent } from '../../shared/report-filter-bar.component';
import { ManagerAlertsService } from '../../core/manager-alerts.service';
import { Router } from '@angular/router';
import { TimesheetApiService, type TimesheetEntry as ApiTimesheetEntry } from '../../core/timesheet-api.service';

type TimesheetStatus = 'PENDING' | 'APPROVED' | 'FLAGGED' | 'REJECTED' | 'EXPORTED';
type EditField = 'clockIn' | 'clockOut' | 'breakDuration';
type ReasonCode =
  | 'Manager Correction'
  | 'Employee Request'
  | 'System Error'
  | 'GPS Issue'
  | 'Other';

interface ActivityEvent {
  time: string;
  label: string;
}

interface AuditEntry {
  field: string;
  oldValue: string;
  newValue: string;
  reason: ReasonCode;
  editor: string;
  timestamp: string;
}

interface TimesheetEntry {
  id: string;
  employeeName: string;
  employeeId: string;
  date: string;
  jobType: string;
  status: TimesheetStatus;
  clockIn: string;
  clockOut: string | null;
  breakDuration: number;
  regularHours: number;
  otHours: number;
  totalPay: number;
  anomalyScore: number;
  gpsMatch: boolean;
  routeMatch: boolean;
  anomalyFlags: string[];
  gpsLat: number;
  gpsLng: number;
  photoUrl: string;
  routeName: string;
  routeCode: string;
  activityLog: ActivityEvent[];
  auditTrail: AuditEntry[];
}

interface EditState {
  entryId: string;
  field: EditField;
  value: string;
  reason: ReasonCode;
}

function mapApiEntry(entry: ApiTimesheetEntry): TimesheetEntry {
  const clockInDate = new Date(entry.clockIn);
  const clockOutDate = entry.clockOut ? new Date(entry.clockOut) : null;
  const hours = entry.hoursWorked ?? (clockOutDate
    ? (clockOutDate.getTime() - clockInDate.getTime()) / (1000 * 60 * 60)
    : 0);
  const regularHours = entry.regularHours ?? Math.min(hours, 8);
  const otHours = entry.overtimeHours ?? Math.max(0, hours - 8);
  const gps = entry.gpsClockIn;
  const hasGpsMismatch = (entry.anomalyFlags ?? []).includes('gps-mismatch');

  return {
    id: entry.id,
    employeeName: entry.employee ? `${entry.employee.firstName} ${entry.employee.lastName}` : entry.employeeId,
    employeeId: entry.employeeId,
    date: clockInDate.toISOString().split('T')[0],
    jobType: (entry.jobType ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    status: entry.status as TimesheetStatus,
    clockIn: clockInDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    clockOut: clockOutDate ? clockOutDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : null,
    breakDuration: hours >= 8 ? 30 : hours >= 6 ? 15 : 0,
    regularHours: Number(regularHours),
    otHours: Number(otHours),
    totalPay: 0,
    anomalyScore: entry.anomalyScore ?? 0,
    gpsMatch: !hasGpsMismatch,
    routeMatch: !(entry.anomalyFlags ?? []).includes('route-mismatch'),
    anomalyFlags: entry.anomalyFlags ?? [],
    gpsLat: gps?.lat ?? 0,
    gpsLng: gps?.lng ?? 0,
    photoUrl: '',
    routeName: entry.routeId ?? '',
    routeCode: entry.routeId ?? '',
    activityLog: buildActivityLog(entry),
    auditTrail: [],
  };
}

function buildActivityLog(entry: ApiTimesheetEntry): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  const clockIn = new Date(entry.clockIn);
  events.push({
    time: clockIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    label: `Clock In${entry.gpsClockIn ? ' (GPS: verified)' : ''}`,
  });
  if (entry.routeId) {
    events.push({
      time: new Date(clockIn.getTime() + 10 * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      label: `Route started: ${entry.routeId}`,
    });
  }
  if (entry.anomalyFlags?.length) {
    events.push({
      time: '--',
      label: `Flags: ${entry.anomalyFlags.join(', ')}`,
    });
  }
  if (entry.clockOut) {
    const clockOut = new Date(entry.clockOut);
    events.push({
      time: clockOut.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      label: `Clock Out${entry.gpsClockOut ? ' (GPS: verified)' : ''}`,
    });
  } else {
    events.push({ time: 'Active', label: 'Still active — no clock-out captured yet' });
  }
  return events;
}

const REASON_CODES: ReasonCode[] = [
  'Manager Correction',
  'Employee Request',
  'System Error',
  'GPS Issue',
  'Other',
];


@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    DialogModule,
    TooltipModule,
    SelectModule,
    InputTextModule,
    BadgeModule,
    ReportFilterBarComponent,
    CurrencyPipe,
    DatePipe,
  ],
  selector: 'app-timesheets',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="timesheets-page">
      <div class="page-header">
        <div class="header-title">
          <h2>Timesheet Approval Queue</h2>
          <span class="subtitle">Review, correct, and approve worked time with full audit history</span>
        </div>
        <div class="header-actions">
          <button pButton type="button" class="p-button-outlined" icon="pi pi-check-square"
            [label]="approveMode() ? 'Exit Approve Mode' : 'Approve Mode'" (click)="toggleApproveMode()"></button>
          @if (approveMode()) {
            <button pButton type="button" class="p-button-outlined" icon="pi pi-filter"
              label="Select All Clean" (click)="selectAllClean()"></button>
            <button pButton type="button" icon="pi pi-check-circle" label="Approve Selected"
              [disabled]="selectedIds().length === 0" (click)="approveSelected()"></button>
          } @else {
            <button pButton type="button" icon="pi pi-check-circle"
              [label]="'Approve All Pending (' + pendingCount() + ')'" (click)="approveAllPending()"></button>
          }
        </div>
      </div>

      <app-report-filter-bar
        [searchTerm]="searchTerm()"
        [status]="statusFilter()"
        [dateFrom]="dateFrom()"
        [dateTo]="dateTo()"
        [statusOptions]="statusOptions"
        primaryActionLabel="Export"
        secondaryActionLabel="Columns"
        (searchTermChange)="searchTerm.set($event)"
        (statusChange)="statusFilter.set($event)"
        (dateFromChange)="dateFrom.set($event)"
        (dateToChange)="dateTo.set($event)"
        (primaryAction)="exportData()"
        (secondaryAction)="toggleColumns()"
      />

      <p-table
        [value]="filteredEntries()"
        [paginator]="true"
        [rows]="20"
        [rowsPerPageOptions]="[10, 20, 50]"
        [sortField]="'date'"
        [sortOrder]="-1"
        dataKey="id"
        [expandedRowKeys]="expandedRows"
        styleClass="p-datatable-sm p-datatable-striped sc-timesheet-table"
        [tableStyle]="{ 'min-width': '108rem' }"
      >
        <ng-template pTemplate="header">
          <tr>
            <th style="width: 3rem"></th>
            @if (approveMode()) {
              <th style="width: 3rem"></th>
            }
            <th style="width: 4rem">Status</th>
            <th pFrozenColumn pSortableColumn="employeeName">Employee Name <p-sortIcon field="employeeName" /></th>
            <th pSortableColumn="jobType">Job Role / Type <p-sortIcon field="jobType" /></th>
            <th pSortableColumn="clockIn">Clock In <p-sortIcon field="clockIn" /></th>
            <th pSortableColumn="clockOut">Clock Out <p-sortIcon field="clockOut" /></th>
            <th pSortableColumn="breakDuration">Break Duration <p-sortIcon field="breakDuration" /></th>
            <th pSortableColumn="regularHours" class="table-numeric">Regular Hours <p-sortIcon field="regularHours" /></th>
            <th pSortableColumn="otHours" class="table-numeric">OT Hours <p-sortIcon field="otHours" /></th>
            <th pSortableColumn="totalPay" class="table-numeric">Total Pay <p-sortIcon field="totalPay" /></th>
            <th pSortableColumn="gpsMatch">GPS Match <p-sortIcon field="gpsMatch" /></th>
            <th pSortableColumn="routeMatch">Route Match <p-sortIcon field="routeMatch" /></th>
            <th pSortableColumn="anomalyScore">Anomaly <p-sortIcon field="anomalyScore" /></th>
            <th style="width: 12rem">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-entry let-expanded="expanded">
          <tr [class.anomaly-row]="entry.anomalyFlags.length > 0">
            <td>
              <button
                type="button"
                pButton
                [pRowToggler]="entry"
                class="p-button-text p-button-rounded p-button-sm"
                [icon]="expanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
              ></button>
            </td>
            @if (approveMode()) {
              <td>
                <input type="checkbox" [checked]="isSelected(entry.id)" [disabled]="!isClean(entry)"
                  (change)="toggleSelection(entry.id, $any($event.target).checked)" />
              </td>
            }
            <td>
              <span class="status-dot" [class]="'status-' + entry.status.toLowerCase()"></span>
            </td>
            <td pFrozenColumn>
              <div class="employee-cell">
                <strong>{{ entry.employeeName }}</strong>
                <small>{{ entry.employeeId }}</small>
              </div>
            </td>
            <td>
              <p-tag [value]="entry.jobType" [severity]="getJobTypeSeverity(entry.jobType)"></p-tag>
            </td>
            <td>
              <button type="button" class="cell-link" (click)="openEditDialog(entry, 'clockIn')">
                {{ entry.date }} {{ entry.clockIn }}
              </button>
            </td>
            <td>
              <button type="button" class="cell-link" (click)="openEditDialog(entry, 'clockOut')">
                @if (entry.clockOut) {
                  {{ entry.date }} {{ entry.clockOut }}
                } @else {
                  Still active
                }
              </button>
            </td>
            <td>
              <button type="button" class="cell-link" (click)="openEditDialog(entry, 'breakDuration')">
                {{ entry.breakDuration }} min
              </button>
            </td>
            <td class="table-numeric">{{ entry.regularHours | number:'1.2-2' }}</td>
            <td class="table-numeric">
              <span class="ot-hours-cell" *ngIf="entry.otHours > 0; else noOt">
                {{ entry.otHours | number:'1.2-2' }}
              </span>
              <ng-template #noOt>0.00</ng-template>
            </td>
            <td class="table-numeric">{{ entry.totalPay | currency:'USD':'symbol':'1.2-2' }}</td>
            <td>
              <span class="match-indicator" [class.match-good]="entry.gpsMatch" [class.match-warn]="!entry.gpsMatch">
                {{ entry.gpsMatch ? '✓' : '⚠' }}
              </span>
            </td>
            <td>
              <span class="match-indicator" [class.match-good]="entry.routeMatch" [class.match-warn]="!entry.routeMatch">
                {{ entry.routeMatch ? '✓' : '⚠' }}
              </span>
            </td>
            <td>
              @if (entry.anomalyFlags.length > 0) {
                <i class="pi pi-exclamation-circle anomaly-icon" [pTooltip]="entry.anomalyFlags.join(' • ')" tooltipPosition="left"></i>
              }
            </td>
            <td>
              <div class="action-buttons">
                <button pButton icon="pi pi-check" class="p-button-success p-button-sm p-button-rounded p-button-text"
                  pTooltip="Approve" [disabled]="entry.status === 'APPROVED' || entry.status === 'EXPORTED'"
                  (click)="approveEntry(entry)"></button>
                <button pButton icon="pi pi-flag" class="p-button-warning p-button-sm p-button-rounded p-button-text"
                  pTooltip="Flag" [disabled]="entry.status === 'FLAGGED' || entry.status === 'EXPORTED'"
                  (click)="flagEntry(entry)"></button>
                <button pButton icon="pi pi-pencil" class="p-button-info p-button-sm p-button-rounded p-button-text"
                  pTooltip="Edit" (click)="openEditDialog(entry, 'clockIn')"></button>
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="rowexpansion" let-entry>
          <tr>
            <td [attr.colspan]="approveMode() ? 15 : 14">
              <div class="expanded-detail">
                <div class="detail-section detail-section-wide">
                  <h4>{{ entry.employeeName }} — {{ entry.date | date:'EEEE MMMM d' }}</h4>
                  <ul class="activity-list">
                    @for (event of entry.activityLog; track event.time + event.label) {
                      <li>
                        <span class="activity-time">{{ event.time }}</span>
                        <span>{{ event.label }}</span>
                      </li>
                    }
                  </ul>
                </div>
                <div class="detail-section">
                  <h4>Audit Trail</h4>
                  @if (entry.auditTrail.length > 0) {
                    <ul class="audit-list">
                      @for (audit of entry.auditTrail; track audit.timestamp + audit.field) {
                        <li>
                          <strong>{{ audit.field }}</strong>: {{ audit.oldValue }} → {{ audit.newValue }}
                          <span>{{ audit.reason }} · {{ audit.editor }} · {{ audit.timestamp }}</span>
                        </li>
                      }
                    </ul>
                  } @else {
                    <p>No edits on this entry.</p>
                  }
                </div>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <p-dialog header="Manager Correction" [(visible)]="editDialogVisible" [modal]="true" [style]="{ width: '30rem' }">
        @if (editState()) {
          <div class="edit-dialog-body">
            <div class="form-field">
              <label>{{ editState()!.field === 'breakDuration' ? 'Break Duration (minutes)' : (editState()!.field === 'clockIn' ? 'Clock In Time' : 'Clock Out Time') }}</label>
              <input pInputText [(ngModel)]="editValue" [type]="editState()!.field === 'breakDuration' ? 'number' : 'time'" />
            </div>
            <div class="form-field">
              <label>Reason Code</label>
              <p-select [options]="reasonOptions" [(ngModel)]="editReason"></p-select>
            </div>
          </div>
        }
        <ng-template pTemplate="footer">
          <button pButton type="button" class="p-button-text" label="Cancel" (click)="cancelEdit()"></button>
          <button pButton type="button" label="Save" icon="pi pi-check" (click)="saveEdit()"></button>
        </ng-template>
      </p-dialog>
    </div>
  `,
  styles: [`
    .timesheets-page { animation: fadeIn 0.25s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--sc-space-5);
      gap: var(--sc-space-4);
    }
    .header-title h2 { margin: 0 0 4px; font-size: var(--sc-text-2xl); color: var(--sc-text-primary); }
    .subtitle { color: var(--sc-text-secondary); font-size: var(--sc-text-sm); }
    .header-actions { display: flex; gap: var(--sc-space-3); flex-wrap: wrap; }

    .employee-cell { display: flex; flex-direction: column; gap: 2px; min-width: 180px; }
    .employee-cell small { color: var(--sc-text-secondary); font-size: var(--sc-text-xs); }

    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      display: inline-block;
    }
    .status-pending { background: var(--sc-warning-3); }
    .status-approved { background: var(--sc-success-3); }
    .status-flagged, .status-rejected { background: var(--sc-danger-3); }
    .status-exported { background: var(--sc-info-3); }

    .cell-link {
      border: none;
      background: none;
      padding: 0;
      color: var(--sc-blue);
      cursor: pointer;
      font: inherit;
      text-align: left;
    }
    .cell-link:hover { text-decoration: underline; }

    .ot-hours-cell {
      color: var(--sc-warning-4);
      font-weight: 600;
      background: var(--sc-warning-1);
      padding: 2px 6px;
      border-radius: var(--sc-radius-sm);
    }

    .match-indicator {
      font-size: 1rem;
      font-weight: 700;
    }
    .match-good { color: var(--sc-success-4); }
    .match-warn { color: var(--sc-warning-4); }

    .anomaly-icon { color: var(--sc-danger-3); font-size: 1.1rem; cursor: help; }

    .action-buttons { display: flex; gap: 4px; opacity: 0.3; transition: opacity 0.15s ease; }
    :host ::ng-deep .sc-timesheet-table .p-datatable-tbody > tr:hover .action-buttons { opacity: 1; }

    .anomaly-row td { background: var(--sc-danger-1) !important; }
    .anomaly-row td:first-child { border-left: 3px solid var(--sc-danger-3); }

    .expanded-detail {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: var(--sc-space-5);
      padding: var(--sc-space-4) var(--sc-space-5);
      background: var(--sc-gray-1);
      border-radius: var(--sc-radius-md);
      margin: 6px 0;
    }
    .detail-section h4 { margin: 0 0 10px; font-size: var(--sc-text-sm); color: var(--sc-text-primary); }
    .detail-section p { margin: 0; color: var(--sc-text-secondary); font-size: var(--sc-text-sm); }
    .detail-section-wide { min-width: 0; }

    .activity-list, .audit-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .activity-list li, .audit-list li {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: var(--sc-text-sm);
      color: var(--sc-text-primary);
    }
    .activity-time { font-family: var(--sc-font-mono); color: var(--sc-text-secondary); }
    .audit-list span { color: var(--sc-text-secondary); font-size: var(--sc-text-xs); }

    .edit-dialog-body { display: flex; flex-direction: column; gap: var(--sc-space-4); }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .form-field label { font-size: var(--sc-text-sm); font-weight: 600; color: var(--sc-text-primary); }

    @media (max-width: 900px) {
      .page-header { flex-direction: column; }
      .expanded-detail { grid-template-columns: 1fr; }
    }
  `],
})
export class TimesheetsPage implements OnInit {
  private readonly api = inject(TimesheetApiService);
  private readonly alerts = inject(ManagerAlertsService);

  readonly entries = signal<TimesheetEntry[]>([]);
  readonly loading = signal(false);
  readonly searchTerm = signal('');
  readonly statusFilter = signal<string | null>(null);
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly approveMode = signal(false);
  readonly selectedIds = signal<string[]>([]);
  readonly editState = signal<EditState | null>(null);
  readonly statusOptions = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Flagged', value: 'FLAGGED' },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'Exported', value: 'EXPORTED' },
  ];
  readonly reasonOptions = REASON_CODES.map((reason) => ({ label: reason, value: reason }));

  expandedRows: Record<string, boolean> = {};
  editDialogVisible = false;
  editValue = '';
  editReason: ReasonCode = 'Manager Correction';

  readonly filteredEntries = computed(() => {
    let result = this.entries();
    const search = this.searchTerm().toLowerCase().trim();
    const status = this.statusFilter();
    const from = this.dateFrom();
    const to = this.dateTo();

    if (search) {
      result = result.filter((entry) =>
        [entry.employeeName, entry.employeeId, entry.jobType, entry.routeName]
          .some((value) => value.toLowerCase().includes(search))
      );
    }
    if (status) result = result.filter((entry) => entry.status === status);
    if (from) result = result.filter((entry) => entry.date >= from);
    if (to) result = result.filter((entry) => entry.date <= to);
    return result;
  });

  readonly pendingCount = computed(() =>
    this.entries().filter((entry) => entry.status === 'PENDING').length
  );

  ngOnInit(): void {
    this.loadTimesheets();
  }

  loadTimesheets(): void {
    this.loading.set(true);
    this.api.getTimesheets({ limit: 100 }).subscribe({
      next: (res) => {
        this.entries.set(res.data.map(mapApiEntry));
        this.loading.set(false);
      },
      error: () => {
        this.alerts.high('Failed to load timesheets', 'Could not connect to the API. Please try again.');
        this.loading.set(false);
      },
    });
  }

  getJobTypeSeverity(jobType: string): 'success' | 'info' | 'warn' | 'secondary' {
    if (jobType.includes('Residential')) return 'success';
    if (jobType.includes('Commercial')) return 'info';
    if (jobType.includes('Roll-Off')) return 'warn';
    return 'secondary';
  }

  toggleApproveMode(): void {
    this.approveMode.update((value) => !value);
    this.selectedIds.set([]);
  }

  isSelected(id: string): boolean {
    return this.selectedIds().includes(id);
  }

  toggleSelection(id: string, checked: boolean): void {
    this.selectedIds.update((ids) =>
      checked ? [...ids, id] : ids.filter((item) => item !== id)
    );
  }

  isClean(entry: TimesheetEntry): boolean {
    return entry.anomalyFlags.length === 0 && entry.status !== 'FLAGGED' && entry.status !== 'REJECTED';
  }

  selectAllClean(): void {
    this.selectedIds.set(
      this.filteredEntries().filter((entry) => this.isClean(entry)).map((entry) => entry.id)
    );
  }

  approveSelected(): void {
    const ids = [...this.selectedIds()];
    this.api.bulkApprove(ids).subscribe({
      next: () => {
        this.entries.update((entries) =>
          entries.map((entry) => ids.includes(entry.id) ? { ...entry, status: 'APPROVED' } : entry)
        );
        this.alerts.medium('Batch approval complete', `${ids.length} clean timesheets were approved in one batch.`, '/timesheets');
        this.selectedIds.set([]);
      },
      error: () => this.alerts.high('Approval failed', 'Could not approve the selected timesheets.'),
    });
  }

  approveAllPending(): void {
    const pendingIds = this.entries()
      .filter((e) => e.status === 'PENDING')
      .map((e) => e.id);

    if (pendingIds.length === 0) return;

    this.api.bulkApprove(pendingIds).subscribe({
      next: () => {
        this.entries.update((entries) =>
          entries.map((entry) => entry.status === 'PENDING' ? { ...entry, status: 'APPROVED' } : entry)
        );
        this.alerts.medium('Bulk approval complete', `${pendingIds.length} pending timesheets were approved.`, '/timesheets');
      },
      error: () => this.alerts.high('Approval failed', 'Could not approve pending timesheets.'),
    });
  }

  approveEntry(entry: TimesheetEntry): void {
    this.api.approve(entry.id).subscribe({
      next: () => {
        this.updateStatus(entry.id, 'APPROVED');
        this.alerts.low('Timesheet approved', `${entry.employeeName}'s timesheet for ${entry.date} was approved.`, '/timesheets');
      },
      error: () => this.alerts.high('Approval failed', `Could not approve ${entry.employeeName}'s timesheet.`),
    });
  }

  flagEntry(entry: TimesheetEntry): void {
    this.api.reject(entry.id, 'Flagged for review by manager').subscribe({
      next: () => {
        this.updateStatus(entry.id, 'FLAGGED');
        if (entry.anomalyFlags.length > 1 || entry.anomalyScore > 0.6) {
          this.alerts.high('High-risk timesheet flagged', `${entry.employeeName}'s entry has multiple anomalies and needs review.`, '/timesheets');
          return;
        }
        this.alerts.medium('Timesheet flagged for review', `${entry.employeeName}'s entry was flagged for manager review.`, '/timesheets');
      },
      error: () => this.alerts.high('Flag failed', `Could not flag ${entry.employeeName}'s timesheet.`),
    });
  }

  updateStatus(id: string, status: TimesheetStatus): void {
    this.entries.update((entries) =>
      entries.map((entry) => entry.id === id ? { ...entry, status } : entry)
    );
  }

  openEditDialog(entry: TimesheetEntry, field: EditField): void {
    this.editState.set({
      entryId: entry.id,
      field,
      value: field === 'breakDuration'
        ? String(entry.breakDuration)
        : (field === 'clockOut' ? entry.clockOut ?? '' : entry.clockIn),
      reason: 'Manager Correction',
    });
    this.editValue = field === 'breakDuration'
      ? String(entry.breakDuration)
      : (field === 'clockOut' ? entry.clockOut ?? '' : entry.clockIn);
    this.editReason = 'Manager Correction';
    this.editDialogVisible = true;
  }

  cancelEdit(): void {
    this.editDialogVisible = false;
    this.editState.set(null);
  }

  saveEdit(): void {
    const state = this.editState();
    if (!state) return;

    const newValue = this.editValue.trim();
    this.entries.update((entries) =>
      entries.map((entry) => {
        if (entry.id !== state.entryId) return entry;

        const auditEntry: AuditEntry = {
          field: state.field === 'breakDuration' ? 'Break Duration' : state.field === 'clockIn' ? 'Clock In' : 'Clock Out',
          oldValue: state.value || 'Still active',
          newValue: newValue || 'Still active',
          reason: this.editReason,
          editor: 'HR Manager',
          timestamp: new Date().toLocaleString('en-US'),
        };

        if (state.field === 'breakDuration') {
          const breakDuration = Number(newValue || 0);
          return { ...entry, breakDuration, auditTrail: [auditEntry, ...entry.auditTrail] };
        }

        if (state.field === 'clockIn') {
          return { ...entry, clockIn: newValue, auditTrail: [auditEntry, ...entry.auditTrail] };
        }

        return { ...entry, clockOut: newValue || null, auditTrail: [auditEntry, ...entry.auditTrail] };
      })
    );

    this.alerts.medium('Timesheet edited', 'An audit log entry was created for a manager correction.', '/timesheets');
    this.cancelEdit();
  }

  exportData(): void {
    this.router.navigateByUrl('/payroll');
  }

  toggleColumns(): void {
    // No-op for MVP
  }

  private readonly router = inject(Router);
}
