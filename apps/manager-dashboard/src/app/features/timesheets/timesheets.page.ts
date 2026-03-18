import { Component, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ReportFilterBarComponent } from '../../shared/report-filter-bar.component';
import { ManagerAlertsService } from '../../core/manager-alerts.service';

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
  id: number;
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
  entryId: number;
  field: EditField;
  value: string;
  reason: ReasonCode;
}

const REASON_CODES: ReasonCode[] = [
  'Manager Correction',
  'Employee Request',
  'System Error',
  'GPS Issue',
  'Other',
];

const MOCK_TIMESHEETS: TimesheetEntry[] = [
  {
    id: 1,
    employeeName: 'Carlos Mendoza',
    employeeId: 'EMP-001',
    date: '2026-03-14',
    jobType: 'Residential Route',
    status: 'PENDING',
    clockIn: '06:00',
    clockOut: '14:30',
    breakDuration: 30,
    regularHours: 8,
    otHours: 0,
    totalPay: 224,
    anomalyScore: 0.12,
    gpsMatch: true,
    routeMatch: true,
    anomalyFlags: [],
    gpsLat: 29.7604,
    gpsLng: -95.3698,
    photoUrl: '/assets/photos/emp001-20260314.jpg',
    routeName: 'South Residential',
    routeCode: 'R-447',
    activityLog: [
      { time: '06:00 AM', label: 'Clock In (GPS: Yard confirmed, Photo: Verified)' },
      { time: '06:12 AM', label: 'Route started: South Residential (ServiceCore Route #R-447)' },
      { time: '10:15 AM', label: 'Break started (30 min unpaid)' },
      { time: '10:45 AM', label: 'Break ended' },
      { time: '02:12 PM', label: 'Route completed (41 stops / 41 scheduled)' },
      { time: '02:30 PM', label: 'Clock Out (GPS: Yard confirmed)' },
    ],
    auditTrail: [],
  },
  {
    id: 3,
    employeeName: 'Ahmad Hassan',
    employeeId: 'EMP-002',
    date: '2026-03-14',
    jobType: 'Commercial Pickup',
    status: 'FLAGGED',
    clockIn: '07:00',
    clockOut: '17:30',
    breakDuration: 15,
    regularHours: 8,
    otHours: 2.25,
    totalPay: 313.5,
    anomalyScore: 0.78,
    gpsMatch: false,
    routeMatch: false,
    anomalyFlags: ['Overtime exceeds 10h', 'GPS mismatch at 14:22', 'Late clock-in vs scheduled'],
    gpsLat: 29.7515,
    gpsLng: -95.358,
    photoUrl: '/assets/photos/emp002-20260314.jpg',
    routeName: 'Downtown Commercial',
    routeCode: 'C-114',
    activityLog: [
      { time: '07:00 AM', label: 'Clock In (GPS: Outside assigned geofence)' },
      { time: '07:14 AM', label: 'Route started: Downtown Commercial (ServiceCore Route #C-114)' },
      { time: '02:22 PM', label: 'GPS mismatch detected during route handoff' },
      { time: '05:30 PM', label: 'Clock Out (GPS: Yard mismatch)' },
    ],
    auditTrail: [],
  },
  {
    id: 7,
    employeeName: 'James Wilson',
    employeeId: 'EMP-004',
    date: '2026-03-14',
    jobType: 'Roll-Off Delivery',
    status: 'FLAGGED',
    clockIn: '05:30',
    clockOut: '16:45',
    breakDuration: 0,
    regularHours: 8,
    otHours: 3.25,
    totalPay: 348.25,
    anomalyScore: 0.85,
    gpsMatch: true,
    routeMatch: true,
    anomalyFlags: ['Overtime exceeds 11h', 'No break logged in 6h window', 'Speed anomaly at 10:15'],
    gpsLat: 29.72,
    gpsLng: -95.4,
    photoUrl: '/assets/photos/emp004-20260314.jpg',
    routeName: 'North Roll-Off',
    routeCode: 'RO-51',
    activityLog: [
      { time: '05:30 AM', label: 'Clock In (GPS: Yard confirmed, Photo: Verified)' },
      { time: '05:42 AM', label: 'Route started: North Roll-Off (ServiceCore Route #RO-51)' },
      { time: '10:15 AM', label: 'Speed anomaly recorded on outbound segment' },
      { time: '04:45 PM', label: 'Clock Out (GPS: Yard confirmed)' },
    ],
    auditTrail: [],
  },
  {
    id: 9,
    employeeName: 'Dwayne Thompson',
    employeeId: 'EMP-005',
    date: '2026-03-14',
    jobType: 'Recycling Route',
    status: 'PENDING',
    clockIn: '06:00',
    clockOut: '14:30',
    breakDuration: 30,
    regularHours: 8,
    otHours: 0,
    totalPay: 216,
    anomalyScore: 0.18,
    gpsMatch: true,
    routeMatch: true,
    anomalyFlags: [],
    gpsLat: 29.74,
    gpsLng: -95.39,
    photoUrl: '/assets/photos/emp005-20260314.jpg',
    routeName: 'East Recycling',
    routeCode: 'RC-31',
    activityLog: [
      { time: '06:00 AM', label: 'Clock In (GPS: Yard confirmed)' },
      { time: '06:11 AM', label: 'Route started: East Recycling (ServiceCore Route #RC-31)' },
      { time: '10:30 AM', label: 'Break started (30 min unpaid)' },
      { time: '11:00 AM', label: 'Break ended' },
      { time: '02:30 PM', label: 'Clock Out (GPS: Yard confirmed)' },
    ],
    auditTrail: [],
  },
  {
    id: 11,
    employeeName: 'Roberto Garcia',
    employeeId: 'EMP-006',
    date: '2026-03-14',
    jobType: 'Commercial Pickup',
    status: 'PENDING',
    clockIn: '07:00',
    clockOut: '15:30',
    breakDuration: 30,
    regularHours: 8,
    otHours: 0,
    totalPay: 232,
    anomalyScore: 0.28,
    gpsMatch: true,
    routeMatch: true,
    anomalyFlags: [],
    gpsLat: 29.765,
    gpsLng: -95.355,
    photoUrl: '/assets/photos/emp006-20260314.jpg',
    routeName: 'Northgate Commercial',
    routeCode: 'C-330',
    activityLog: [
      { time: '07:00 AM', label: 'Clock In (GPS: Yard confirmed)' },
      { time: '07:08 AM', label: 'Route started: Northgate Commercial (ServiceCore Route #C-330)' },
      { time: '11:45 AM', label: 'Break started (30 min unpaid)' },
      { time: '12:15 PM', label: 'Break ended' },
      { time: '03:30 PM', label: 'Clock Out (GPS: Yard confirmed)' },
    ],
    auditTrail: [],
  },
  {
    id: 14,
    employeeName: 'Lisa Chen',
    employeeId: 'EMP-008',
    date: '2026-03-14',
    jobType: 'Admin / Dispatch',
    status: 'APPROVED',
    clockIn: '08:00',
    clockOut: '16:30',
    breakDuration: 30,
    regularHours: 8,
    otHours: 0,
    totalPay: 248,
    anomalyScore: 0.04,
    gpsMatch: true,
    routeMatch: true,
    anomalyFlags: [],
    gpsLat: 29.7604,
    gpsLng: -95.3698,
    photoUrl: '/assets/photos/emp008-20260314.jpg',
    routeName: 'Dispatch HQ',
    routeCode: 'HQ-01',
    activityLog: [
      { time: '08:00 AM', label: 'Clock In (HQ confirmed)' },
      { time: '12:00 PM', label: 'Break started (30 min unpaid)' },
      { time: '12:30 PM', label: 'Break ended' },
      { time: '04:30 PM', label: 'Clock Out (HQ confirmed)' },
    ],
    auditTrail: [],
  },
  {
    id: 16,
    employeeName: 'Marcus Brown',
    employeeId: 'EMP-009',
    date: '2026-03-14',
    jobType: 'Roll-Off Delivery',
    status: 'FLAGGED',
    clockIn: '05:00',
    clockOut: null,
    breakDuration: 0,
    regularHours: 8,
    otHours: 4,
    totalPay: 392,
    anomalyScore: 0.92,
    gpsMatch: true,
    routeMatch: false,
    anomalyFlags: ['Overtime exceeds 12h', 'No break logged', 'HOS daily limit warning'],
    gpsLat: 29.71,
    gpsLng: -95.41,
    photoUrl: '/assets/photos/emp009-20260314.jpg',
    routeName: 'West Roll-Off',
    routeCode: 'RO-77',
    activityLog: [
      { time: '05:00 AM', label: 'Clock In (GPS: Yard confirmed)' },
      { time: '05:14 AM', label: 'Route started: West Roll-Off (ServiceCore Route #RO-77)' },
      { time: '03:45 PM', label: 'HOS daily limit warning raised' },
      { time: 'Active', label: 'Still active — no clock-out captured yet' },
    ],
    auditTrail: [],
  },
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
            <button pButton type="button" icon="pi pi-check-circle" label="Approve All Pending"
              [badge]="pendingCount().toString()" badgeClass="p-badge-warning" (click)="approveAllPending()"></button>
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
                <p-tag value="ANOMALY" severity="danger" [pTooltip]="entry.anomalyFlags.join(' • ')"></p-tag>
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
        @if (editState() as edit) {
          <div class="edit-dialog-body">
            <div class="form-field">
              <label>{{ edit.field === 'breakDuration' ? 'Break Duration (minutes)' : (edit.field === 'clockIn' ? 'Clock In Time' : 'Clock Out Time') }}</label>
              <input pInputText [(ngModel)]="editValue" [type]="edit.field === 'breakDuration' ? 'number' : 'time'" />
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
export class TimesheetsPage {
  readonly entries = signal<TimesheetEntry[]>(MOCK_TIMESHEETS);
  readonly searchTerm = signal('');
  readonly statusFilter = signal<string | null>(null);
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly approveMode = signal(false);
  readonly selectedIds = signal<number[]>([]);
  readonly editState = signal<EditState | null>(null);
  readonly statusOptions = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Flagged', value: 'FLAGGED' },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'Exported', value: 'EXPORTED' },
  ];
  readonly reasonOptions = REASON_CODES.map((reason) => ({ label: reason, value: reason }));

  expandedRows: Record<number, boolean> = {};
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

  constructor(private readonly alerts: ManagerAlertsService) {}

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

  isSelected(id: number): boolean {
    return this.selectedIds().includes(id);
  }

  toggleSelection(id: number, checked: boolean): void {
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
    const ids = new Set(this.selectedIds());
    this.entries.update((entries) =>
      entries.map((entry) => ids.has(entry.id) ? { ...entry, status: 'APPROVED' } : entry)
    );
    this.alerts.medium('Batch approval complete', `${ids.size} clean timesheets were approved in one batch.`, '/timesheets');
    this.selectedIds.set([]);
  }

  approveAllPending(): void {
    const count = this.pendingCount();
    this.entries.update((entries) =>
      entries.map((entry) => entry.status === 'PENDING' ? { ...entry, status: 'APPROVED' } : entry)
    );
    this.alerts.medium('Bulk approval complete', `${count} pending timesheets were approved.`, '/timesheets');
  }

  approveEntry(entry: TimesheetEntry): void {
    this.updateStatus(entry.id, 'APPROVED');
    this.alerts.low('Timesheet approved', `${entry.employeeName}'s timesheet for ${entry.date} was approved.`, '/timesheets');
  }

  flagEntry(entry: TimesheetEntry): void {
    this.updateStatus(entry.id, 'FLAGGED');
    if (entry.anomalyFlags.length > 1 || entry.anomalyScore > 0.6) {
      this.alerts.high('High-risk timesheet flagged', `${entry.employeeName}'s entry has multiple anomalies and needs review.`, '/timesheets');
      return;
    }
    this.alerts.medium('Timesheet flagged for review', `${entry.employeeName}'s entry was flagged for manager review.`, '/timesheets');
  }

  updateStatus(id: number, status: TimesheetStatus): void {
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
    this.alerts.low('Export queued', 'Timesheet export was queued for payroll reporting.', '/timesheets');
  }

  toggleColumns(): void {
    this.alerts.low('Column chooser coming next', 'Dynamic table column controls are not implemented yet.', '/timesheets');
  }
}
