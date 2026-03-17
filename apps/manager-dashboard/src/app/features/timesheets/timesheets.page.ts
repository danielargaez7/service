import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';

type TimesheetStatus = 'PENDING' | 'APPROVED' | 'FLAGGED' | 'REJECTED' | 'EXPORTED';

interface TimesheetEntry {
  id: number;
  employeeName: string;
  employeeId: string;
  date: string;
  clockIn: string;
  clockOut: string;
  hours: number;
  jobType: string;
  status: TimesheetStatus;
  anomalyScore: number;
  gpsLat: number;
  gpsLng: number;
  photoUrl: string;
  anomalyFlags: string[];
}

const MOCK_TIMESHEETS: TimesheetEntry[] = [
  { id: 1, employeeName: 'Carlos Mendoza', employeeId: 'EMP-001', date: '2026-03-14', clockIn: '06:00', clockOut: '14:30', hours: 8.5, jobType: 'Residential Route', status: 'PENDING', anomalyScore: 0.12, gpsLat: 29.7604, gpsLng: -95.3698, photoUrl: '/assets/photos/emp001-20260314.jpg', anomalyFlags: [] },
  { id: 2, employeeName: 'Carlos Mendoza', employeeId: 'EMP-001', date: '2026-03-13', clockIn: '05:45', clockOut: '14:15', hours: 8.5, jobType: 'Residential Route', status: 'APPROVED', anomalyScore: 0.08, gpsLat: 29.7604, gpsLng: -95.3698, photoUrl: '/assets/photos/emp001-20260313.jpg', anomalyFlags: [] },
  { id: 3, employeeName: 'Ahmad Hassan', employeeId: 'EMP-002', date: '2026-03-14', clockIn: '07:00', clockOut: '17:30', hours: 10.5, jobType: 'Commercial Pickup', status: 'FLAGGED', anomalyScore: 0.78, gpsLat: 29.7515, gpsLng: -95.3580, photoUrl: '/assets/photos/emp002-20260314.jpg', anomalyFlags: ['Overtime exceeds 10h', 'GPS mismatch at 14:22', 'Late clock-in vs scheduled'] },
  { id: 4, employeeName: 'Ahmad Hassan', employeeId: 'EMP-002', date: '2026-03-13', clockIn: '06:30', clockOut: '15:00', hours: 8.5, jobType: 'Commercial Pickup', status: 'APPROVED', anomalyScore: 0.15, gpsLat: 29.7515, gpsLng: -95.3580, photoUrl: '/assets/photos/emp002-20260313.jpg', anomalyFlags: [] },
  { id: 5, employeeName: 'Maria Santos', employeeId: 'EMP-003', date: '2026-03-14', clockIn: '06:15', clockOut: '14:45', hours: 8.5, jobType: 'Residential Route', status: 'PENDING', anomalyScore: 0.22, gpsLat: 29.7850, gpsLng: -95.3450, photoUrl: '/assets/photos/emp003-20260314.jpg', anomalyFlags: [] },
  { id: 6, employeeName: 'Maria Santos', employeeId: 'EMP-003', date: '2026-03-13', clockIn: '06:00', clockOut: '14:30', hours: 8.5, jobType: 'Residential Route', status: 'EXPORTED', anomalyScore: 0.05, gpsLat: 29.7850, gpsLng: -95.3450, photoUrl: '/assets/photos/emp003-20260313.jpg', anomalyFlags: [] },
  { id: 7, employeeName: 'James Wilson', employeeId: 'EMP-004', date: '2026-03-14', clockIn: '05:30', clockOut: '16:45', hours: 11.25, jobType: 'Roll-Off Delivery', status: 'FLAGGED', anomalyScore: 0.85, gpsLat: 29.7200, gpsLng: -95.4000, photoUrl: '/assets/photos/emp004-20260314.jpg', anomalyFlags: ['Overtime exceeds 11h', 'No break logged in 6h window', 'Speed anomaly at 10:15'] },
  { id: 8, employeeName: 'James Wilson', employeeId: 'EMP-004', date: '2026-03-13', clockIn: '06:00', clockOut: '14:00', hours: 8.0, jobType: 'Roll-Off Delivery', status: 'APPROVED', anomalyScore: 0.10, gpsLat: 29.7200, gpsLng: -95.4000, photoUrl: '/assets/photos/emp004-20260313.jpg', anomalyFlags: [] },
  { id: 9, employeeName: 'Dwayne Thompson', employeeId: 'EMP-005', date: '2026-03-14', clockIn: '06:00', clockOut: '14:30', hours: 8.5, jobType: 'Recycling Route', status: 'PENDING', anomalyScore: 0.18, gpsLat: 29.7400, gpsLng: -95.3900, photoUrl: '/assets/photos/emp005-20260314.jpg', anomalyFlags: [] },
  { id: 10, employeeName: 'Dwayne Thompson', employeeId: 'EMP-005', date: '2026-03-13', clockIn: '06:15', clockOut: '14:45', hours: 8.5, jobType: 'Recycling Route', status: 'PENDING', anomalyScore: 0.20, gpsLat: 29.7400, gpsLng: -95.3900, photoUrl: '/assets/photos/emp005-20260313.jpg', anomalyFlags: [] },
  { id: 11, employeeName: 'Roberto Garcia', employeeId: 'EMP-006', date: '2026-03-14', clockIn: '07:00', clockOut: '15:30', hours: 8.5, jobType: 'Commercial Pickup', status: 'PENDING', anomalyScore: 0.28, gpsLat: 29.7650, gpsLng: -95.3550, photoUrl: '/assets/photos/emp006-20260314.jpg', anomalyFlags: [] },
  { id: 12, employeeName: 'Roberto Garcia', employeeId: 'EMP-006', date: '2026-03-13', clockIn: '06:45', clockOut: '15:15', hours: 8.5, jobType: 'Commercial Pickup', status: 'REJECTED', anomalyScore: 0.55, gpsLat: 29.7650, gpsLng: -95.3550, photoUrl: '/assets/photos/emp006-20260313.jpg', anomalyFlags: ['Clock-in location 2.3mi from job site'] },
  { id: 13, employeeName: 'Tyrone Jackson', employeeId: 'EMP-007', date: '2026-03-14', clockIn: '06:30', clockOut: '15:00', hours: 8.5, jobType: 'Residential Route', status: 'PENDING', anomalyScore: 0.14, gpsLat: 29.7300, gpsLng: -95.3700, photoUrl: '/assets/photos/emp007-20260314.jpg', anomalyFlags: [] },
  { id: 14, employeeName: 'Lisa Chen', employeeId: 'EMP-008', date: '2026-03-14', clockIn: '08:00', clockOut: '16:30', hours: 8.5, jobType: 'Admin / Dispatch', status: 'PENDING', anomalyScore: 0.04, gpsLat: 29.7604, gpsLng: -95.3698, photoUrl: '/assets/photos/emp008-20260314.jpg', anomalyFlags: [] },
  { id: 15, employeeName: 'Lisa Chen', employeeId: 'EMP-008', date: '2026-03-13', clockIn: '08:00', clockOut: '16:30', hours: 8.5, jobType: 'Admin / Dispatch', status: 'APPROVED', anomalyScore: 0.02, gpsLat: 29.7604, gpsLng: -95.3698, photoUrl: '/assets/photos/emp008-20260313.jpg', anomalyFlags: [] },
  { id: 16, employeeName: 'Marcus Brown', employeeId: 'EMP-009', date: '2026-03-14', clockIn: '05:00', clockOut: '17:00', hours: 12.0, jobType: 'Roll-Off Delivery', status: 'FLAGGED', anomalyScore: 0.92, gpsLat: 29.7100, gpsLng: -95.4100, photoUrl: '/assets/photos/emp009-20260314.jpg', anomalyFlags: ['Overtime exceeds 12h', 'No break logged', 'HOS daily limit warning'] },
  { id: 17, employeeName: 'Marcus Brown', employeeId: 'EMP-009', date: '2026-03-13', clockIn: '06:00', clockOut: '14:30', hours: 8.5, jobType: 'Roll-Off Delivery', status: 'PENDING', anomalyScore: 0.25, gpsLat: 29.7100, gpsLng: -95.4100, photoUrl: '/assets/photos/emp009-20260313.jpg', anomalyFlags: [] },
  { id: 18, employeeName: 'Priya Patel', employeeId: 'EMP-010', date: '2026-03-14', clockIn: '07:30', clockOut: '16:00', hours: 8.5, jobType: 'Recycling Route', status: 'APPROVED', anomalyScore: 0.06, gpsLat: 29.7550, gpsLng: -95.3800, photoUrl: '/assets/photos/emp010-20260314.jpg', anomalyFlags: [] },
];

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    DropdownModule,
    InputTextModule,
    DialogModule,
    TooltipModule,
  ],
  selector: 'app-timesheets',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="timesheets-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-title">
          <h2>Timesheet Approval Queue</h2>
          <span class="subtitle">Review and approve employee timesheets</span>
        </div>
        <div class="header-actions">
          <p-button
            label="Approve All Pending"
            icon="pi pi-check-circle"
            severity="success"
            [badge]="pendingCount().toString()"
            badgeClass="p-badge-warning"
            (onClick)="approveAllPending()"
          />
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <span class="p-input-icon-left filter-search">
          <i class="pi pi-search"></i>
          <input
            type="text"
            pInputText
            placeholder="Search employee..."
            [ngModel]="searchTerm()"
            (ngModelChange)="searchTerm.set($event)"
          />
        </span>

        <p-dropdown
          [options]="statusOptions"
          [ngModel]="statusFilter()"
          (ngModelChange)="statusFilter.set($event)"
          placeholder="All Statuses"
          [showClear]="true"
          styleClass="filter-dropdown"
        />

        <div class="date-range">
          <label>From</label>
          <input
            type="date"
            class="date-input"
            [ngModel]="dateFrom()"
            (ngModelChange)="dateFrom.set($event)"
          />
          <label>To</label>
          <input
            type="date"
            class="date-input"
            [ngModel]="dateTo()"
            (ngModelChange)="dateTo.set($event)"
          />
        </div>
      </div>

      <!-- Data Table -->
      <p-table
        [value]="filteredEntries()"
        [paginator]="true"
        [rows]="20"
        [rowsPerPageOptions]="[10, 20, 50]"
        [sortField]="'date'"
        [sortOrder]="-1"
        dataKey="id"
        [expandedRowKeys]="expandedRows"
        styleClass="p-datatable-sm p-datatable-striped"
        [tableStyle]="{ 'min-width': '80rem' }"
      >
        <ng-template pTemplate="header">
          <tr>
            <th style="width: 3rem"></th>
            <th pSortableColumn="employeeName">Employee <p-sortIcon field="employeeName" /></th>
            <th pSortableColumn="date">Date <p-sortIcon field="date" /></th>
            <th pSortableColumn="clockIn">Clock In <p-sortIcon field="clockIn" /></th>
            <th pSortableColumn="clockOut">Clock Out <p-sortIcon field="clockOut" /></th>
            <th pSortableColumn="hours">Hours <p-sortIcon field="hours" /></th>
            <th pSortableColumn="jobType">Job Type <p-sortIcon field="jobType" /></th>
            <th pSortableColumn="status">Status <p-sortIcon field="status" /></th>
            <th pSortableColumn="anomalyScore">Anomaly <p-sortIcon field="anomalyScore" /></th>
            <th style="width: 12rem">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-entry let-expanded="expanded">
          <tr>
            <td>
              <button
                type="button"
                pButton
                pRipple
                [pRowToggler]="entry"
                class="p-button-text p-button-rounded p-button-sm"
                [icon]="expanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
              ></button>
            </td>
            <td>
              <div class="employee-cell">
                <strong>{{ entry.employeeName }}</strong>
                <small>{{ entry.employeeId }}</small>
              </div>
            </td>
            <td>{{ entry.date }}</td>
            <td>{{ entry.clockIn }}</td>
            <td>{{ entry.clockOut }}</td>
            <td>
              <strong [class.overtime]="entry.hours > 8">{{ entry.hours }}h</strong>
            </td>
            <td>{{ entry.jobType }}</td>
            <td>
              <p-tag
                [value]="entry.status"
                [severity]="getStatusSeverity(entry.status)"
                [rounded]="true"
              />
            </td>
            <td>
              <div class="anomaly-cell">
                <div class="anomaly-bar-track">
                  <div
                    class="anomaly-bar-fill"
                    [style.width.%]="entry.anomalyScore * 100"
                    [class.low]="entry.anomalyScore < 0.3"
                    [class.medium]="entry.anomalyScore >= 0.3 && entry.anomalyScore <= 0.6"
                    [class.high]="entry.anomalyScore > 0.6"
                  ></div>
                </div>
                <span class="anomaly-value">{{ (entry.anomalyScore * 100).toFixed(0) }}%</span>
              </div>
            </td>
            <td>
              <div class="action-buttons">
                <button
                  pButton
                  pRipple
                  icon="pi pi-check"
                  class="p-button-success p-button-sm p-button-rounded p-button-text"
                  pTooltip="Approve"
                  tooltipPosition="top"
                  [disabled]="entry.status === 'APPROVED' || entry.status === 'EXPORTED'"
                  (click)="approveEntry(entry)"
                ></button>
                <button
                  pButton
                  pRipple
                  icon="pi pi-times"
                  class="p-button-danger p-button-sm p-button-rounded p-button-text"
                  pTooltip="Reject"
                  tooltipPosition="top"
                  [disabled]="entry.status === 'REJECTED' || entry.status === 'EXPORTED'"
                  (click)="rejectEntry(entry)"
                ></button>
                <button
                  pButton
                  pRipple
                  icon="pi pi-flag"
                  class="p-button-warning p-button-sm p-button-rounded p-button-text"
                  pTooltip="Flag for Review"
                  tooltipPosition="top"
                  [disabled]="entry.status === 'FLAGGED' || entry.status === 'EXPORTED'"
                  (click)="flagEntry(entry)"
                ></button>
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="rowexpansion" let-entry>
          <tr>
            <td colspan="10">
              <div class="expanded-detail">
                <div class="detail-section">
                  <h4><i class="pi pi-map-marker"></i> GPS Coordinates</h4>
                  <p>{{ entry.gpsLat.toFixed(4) }}, {{ entry.gpsLng.toFixed(4) }}</p>
                </div>
                <div class="detail-section">
                  <h4><i class="pi pi-image"></i> Photo</h4>
                  <p><a [href]="entry.photoUrl" class="photo-link">{{ entry.photoUrl }}</a></p>
                </div>
                <div class="detail-section" *ngIf="entry.anomalyFlags.length > 0">
                  <h4><i class="pi pi-exclamation-triangle"></i> Anomaly Flags</h4>
                  <ul class="anomaly-flags-list">
                    <li *ngFor="let flag of entry.anomalyFlags">
                      <i class="pi pi-exclamation-circle flag-icon"></i>
                      {{ flag }}
                    </li>
                  </ul>
                </div>
                <div class="detail-section" *ngIf="entry.anomalyFlags.length === 0">
                  <h4><i class="pi pi-check-circle" style="color: #22c55e;"></i> No Anomalies</h4>
                  <p>This entry has no flagged anomalies.</p>
                </div>
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="10" class="empty-message">
              <i class="pi pi-inbox"></i>
              <p>No timesheet entries match your filters.</p>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `,
  styles: [`
    .timesheets-page {
      animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }
    .header-title h2 {
      margin: 0 0 4px;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--sc-text-primary, #1e293b);
    }
    .subtitle {
      color: var(--sc-text-secondary, #64748b);
      font-size: 0.9rem;
    }

    .filter-bar {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
      background: #fff;
      padding: 16px 20px;
      border-radius: 10px;
      border: 1px solid var(--sc-border, #e2e6ed);
    }
    .filter-search {
      flex: 1;
      min-width: 200px;
    }
    .filter-search input {
      width: 100%;
      padding-left: 2.5rem;
    }
    :host ::ng-deep .filter-dropdown {
      min-width: 180px;
    }
    .date-range {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .date-range label {
      font-size: 0.85rem;
      color: var(--sc-text-secondary, #64748b);
      font-weight: 500;
    }
    .date-input {
      padding: 8px 12px;
      border: 1px solid var(--sc-border, #e2e6ed);
      border-radius: 6px;
      font-size: 0.875rem;
      color: var(--sc-text-primary, #1e293b);
      background: #fff;
    }
    .date-input:focus {
      outline: none;
      border-color: var(--sc-accent, #4f8cff);
      box-shadow: 0 0 0 2px rgba(79, 140, 255, 0.15);
    }

    .employee-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .employee-cell small {
      color: var(--sc-text-secondary, #64748b);
      font-size: 0.75rem;
    }

    .overtime {
      color: #f59e0b;
    }

    /* Anomaly bar */
    .anomaly-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .anomaly-bar-track {
      flex: 1;
      height: 8px;
      background: #f1f5f9;
      border-radius: 4px;
      overflow: hidden;
      min-width: 60px;
    }
    .anomaly-bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    .anomaly-bar-fill.low { background: #22c55e; }
    .anomaly-bar-fill.medium { background: #f59e0b; }
    .anomaly-bar-fill.high { background: #ef4444; }
    .anomaly-value {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--sc-text-secondary, #64748b);
      min-width: 32px;
      text-align: right;
    }

    /* Action buttons */
    .action-buttons {
      display: flex;
      gap: 4px;
    }

    /* Expanded row detail */
    .expanded-detail {
      display: flex;
      gap: 32px;
      padding: 16px 20px;
      background: #f8fafc;
      border-radius: 8px;
      margin: 4px 0;
      flex-wrap: wrap;
    }
    .detail-section {
      min-width: 200px;
    }
    .detail-section h4 {
      margin: 0 0 8px;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--sc-text-secondary, #64748b);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .detail-section p {
      margin: 0;
      font-size: 0.9rem;
      color: var(--sc-text-primary, #1e293b);
    }
    .photo-link {
      color: var(--sc-accent, #4f8cff);
      text-decoration: none;
    }
    .photo-link:hover {
      text-decoration: underline;
    }
    .anomaly-flags-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .anomaly-flags-list li {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.875rem;
      color: #dc2626;
    }
    .flag-icon {
      color: #ef4444;
      font-size: 0.85rem;
    }

    .empty-message {
      text-align: center;
      padding: 48px 20px;
      color: var(--sc-text-secondary, #64748b);
    }
    .empty-message i {
      font-size: 2rem;
      margin-bottom: 8px;
      display: block;
    }

    @media (max-width: 768px) {
      .page-header { flex-direction: column; gap: 12px; }
      .filter-bar { flex-direction: column; }
      .filter-search { min-width: unset; width: 100%; }
      .date-range { flex-wrap: wrap; }
    }
  `],
})
export class TimesheetsPage {
  // State
  entries = signal<TimesheetEntry[]>([...MOCK_TIMESHEETS]);
  searchTerm = signal('');
  statusFilter = signal<string | null>(null);
  dateFrom = signal('');
  dateTo = signal('');
  expandedRows: { [key: number]: boolean } = {};

  statusOptions = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Flagged', value: 'FLAGGED' },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'Exported', value: 'EXPORTED' },
  ];

  filteredEntries = computed(() => {
    let result = this.entries();
    const search = this.searchTerm().toLowerCase().trim();
    const status = this.statusFilter();
    const from = this.dateFrom();
    const to = this.dateTo();

    if (search) {
      result = result.filter(
        (e) =>
          e.employeeName.toLowerCase().includes(search) ||
          e.employeeId.toLowerCase().includes(search)
      );
    }
    if (status) {
      result = result.filter((e) => e.status === status);
    }
    if (from) {
      result = result.filter((e) => e.date >= from);
    }
    if (to) {
      result = result.filter((e) => e.date <= to);
    }
    return result;
  });

  pendingCount = computed(() => this.entries().filter((e) => e.status === 'PENDING').length);

  getStatusSeverity(status: TimesheetStatus): 'success' | 'warning' | 'danger' | 'info' | 'secondary' | undefined {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'PENDING': return 'warning';
      case 'FLAGGED': return 'danger';
      case 'REJECTED': return 'secondary';
      case 'EXPORTED': return 'info';
      default: return undefined;
    }
  }

  approveEntry(entry: TimesheetEntry): void {
    this.updateStatus(entry.id, 'APPROVED');
  }

  rejectEntry(entry: TimesheetEntry): void {
    this.updateStatus(entry.id, 'REJECTED');
  }

  flagEntry(entry: TimesheetEntry): void {
    this.updateStatus(entry.id, 'FLAGGED');
  }

  approveAllPending(): void {
    this.entries.update((list) =>
      list.map((e) => (e.status === 'PENDING' ? { ...e, status: 'APPROVED' as TimesheetStatus } : e))
    );
  }

  private updateStatus(id: number, status: TimesheetStatus): void {
    this.entries.update((list) =>
      list.map((e) => (e.id === id ? { ...e, status } : e))
    );
  }
}
