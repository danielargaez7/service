import { Component, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

interface ScheduleEntry {
  id: string;
  employeeName: string;
  employeeClass: string;
  date: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  routeId: string;
  routeName: string;
  jobType: string;
  hoursScheduled: number;
  hosRemaining: number | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED';
}

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    CardModule,
    TagModule,
    SelectModule,
    DialogModule,
    InputTextModule,
  ],
  selector: 'app-schedule',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="schedule-page">
      <div class="page-header">
        <h1>Route Scheduling</h1>
        <div class="header-actions">
          <button pButton label="Previous Week" icon="pi pi-chevron-left"
                  class="p-button-text" (click)="changeWeek(-1)"></button>
          <span class="week-label">{{ weekLabel() }}</span>
          <button pButton label="Next Week" icon="pi pi-chevron-right" iconPos="right"
                  class="p-button-text" (click)="changeWeek(1)"></button>
          <button pButton label="Add Shift" icon="pi pi-plus"
                  class="p-button-success" (click)="showAddDialog.set(true)" style="margin-left: 16px;"></button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-row">
        <p-card class="summary-card">
          <div class="stat-value">{{ totalShifts() }}</div>
          <div class="stat-label">Total Shifts</div>
        </p-card>
        <p-card class="summary-card">
          <div class="stat-value">{{ totalHours() }}h</div>
          <div class="stat-label">Scheduled Hours</div>
        </p-card>
        <p-card class="summary-card">
          <div class="stat-value">{{ driversScheduled() }}</div>
          <div class="stat-label">Drivers Scheduled</div>
        </p-card>
        <p-card class="summary-card">
          <div class="stat-value hos-warn">{{ hosWarnings() }}</div>
          <div class="stat-label">HOS Warnings</div>
        </p-card>
      </div>

      <!-- Schedule Grid -->
      <p-table
        [value]="scheduleData()"
        [paginator]="true"
        [rows]="15"
        [rowsPerPageOptions]="[10, 15, 25]"
        [sortField]="'date'"
        [sortOrder]="1"
        styleClass="p-datatable-striped p-datatable-gridlines"
        [globalFilterFields]="['employeeName', 'routeName', 'jobType']"
      >
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="employeeName">Driver <p-sortIcon field="employeeName" /></th>
            <th pSortableColumn="dayOfWeek">Day <p-sortIcon field="dayOfWeek" /></th>
            <th pSortableColumn="date">Date <p-sortIcon field="date" /></th>
            <th>Shift</th>
            <th>Route</th>
            <th pSortableColumn="jobType">Job Type <p-sortIcon field="jobType" /></th>
            <th>Hours</th>
            <th>HOS Remaining</th>
            <th pSortableColumn="status">Status <p-sortIcon field="status" /></th>
            <th>Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-entry>
          <tr>
            <td>
              <strong>{{ entry.employeeName }}</strong>
              <div class="class-badge">{{ entry.employeeClass }}</div>
            </td>
            <td>{{ entry.dayOfWeek }}</td>
            <td>{{ entry.date }}</td>
            <td>{{ entry.startTime }} – {{ entry.endTime }}</td>
            <td>{{ entry.routeName }}</td>
            <td>{{ entry.jobType.replace('_', ' ') }}</td>
            <td>{{ entry.hoursScheduled }}h</td>
            <td>
              @if (entry.hosRemaining !== null) {
                <span [class]="entry.hosRemaining < 2 ? 'hos-danger' : entry.hosRemaining < 4 ? 'hos-warning' : 'hos-ok'">
                  {{ entry.hosRemaining }}h
                </span>
              } @else {
                <span class="not-applicable">N/A</span>
              }
            </td>
            <td>
              <p-tag
                [value]="entry.status"
                [severity]="getStatusSeverity(entry.status)"
              />
            </td>
            <td>
              <button pButton icon="pi pi-pencil" class="p-button-text p-button-sm"
                      pTooltip="Edit Shift"></button>
              <button pButton icon="pi pi-trash" class="p-button-text p-button-danger p-button-sm"
                      pTooltip="Remove Shift"></button>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="10" style="text-align: center; padding: 40px;">
              No shifts scheduled for this week.
            </td>
          </tr>
        </ng-template>
      </p-table>

      <!-- Add Shift Dialog -->
      <p-dialog header="Add New Shift" [(visible)]="showAddDialogValue"
                [style]="{ width: '500px' }" [modal]="true">
        <div class="dialog-body">
          <div class="form-field">
            <label>Driver</label>
            <p-select [options]="driverOptions" placeholder="Select Driver"
                        styleClass="w-full"></p-select>
          </div>
          <div class="form-field">
            <label>Route</label>
            <p-select [options]="routeOptions" placeholder="Select Route"
                        styleClass="w-full"></p-select>
          </div>
          <div class="form-field">
            <label>Job Type</label>
            <p-select [options]="jobTypeOptions" placeholder="Select Job Type"
                        styleClass="w-full"></p-select>
          </div>
          <div class="form-row">
            <div class="form-field">
              <label>Start Time</label>
              <input pInputText value="06:00" />
            </div>
            <div class="form-field">
              <label>End Time</label>
              <input pInputText value="14:30" />
            </div>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <button pButton label="Cancel" class="p-button-text"
                  (click)="showAddDialog.set(false)"></button>
          <button pButton label="Create Shift" icon="pi pi-check"
                  (click)="showAddDialog.set(false)"></button>
        </ng-template>
      </p-dialog>
    </div>
  `,
  styles: [`
    .schedule-page { padding: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .page-header h1 { font-size: 24px; margin: 0; color: #1e293b; }
    .header-actions { display: flex; align-items: center; gap: 8px; }
    .week-label { font-size: 16px; font-weight: 600; min-width: 200px; text-align: center; }

    .summary-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .summary-card { text-align: center; }
    .stat-value { font-size: 28px; font-weight: 700; color: #1a237e; }
    .stat-value.hos-warn { color: #c62828; }
    .stat-label { font-size: 13px; color: #64748b; margin-top: 4px; }

    .class-badge { font-size: 11px; color: #64748b; margin-top: 2px; }
    .hos-danger { color: #c62828; font-weight: 700; }
    .hos-warning { color: #f57c00; font-weight: 600; }
    .hos-ok { color: #2e7d32; }
    .not-applicable { color: #94a3b8; font-style: italic; }

    .dialog-body { display: flex; flex-direction: column; gap: 16px; }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .form-field label { font-weight: 600; font-size: 14px; color: #334155; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    :host ::ng-deep .w-full { width: 100%; }
  `],
})
export class SchedulePage {
  readonly weekOffset = signal(0);
  readonly showAddDialog = signal(false);

  get showAddDialogValue() { return this.showAddDialog(); }
  set showAddDialogValue(v: boolean) { this.showAddDialog.set(v); }

  readonly weekLabel = computed(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - start.getDay() + 1 + this.weekOffset() * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 4);
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
  });

  readonly driverOptions = [
    { label: 'Marcus Rivera', value: 'emp-1' },
    { label: 'DeShawn Williams', value: 'emp-2' },
    { label: 'Carlos Mendoza', value: 'emp-3' },
    { label: 'Jake Thompson', value: 'emp-4' },
    { label: 'Ahmad Hassan', value: 'emp-5' },
  ];

  readonly routeOptions = [
    { label: 'Residential South', value: 'route-south-1' },
    { label: 'Roll-Off North', value: 'route-north-1' },
    { label: 'Septic East', value: 'route-east-1' },
    { label: 'Grease Trap Downtown', value: 'route-downtown-1' },
  ];

  readonly jobTypeOptions = [
    { label: 'Residential Sanitation', value: 'RESIDENTIAL_SANITATION' },
    { label: 'Roll-Off Delivery', value: 'ROLL_OFF_DELIVERY' },
    { label: 'Septic Pump', value: 'SEPTIC_PUMP' },
    { label: 'Grease Trap', value: 'GREASE_TRAP' },
    { label: 'Yard Maintenance', value: 'YARD_MAINTENANCE' },
  ];

  readonly scheduleData = computed<ScheduleEntry[]>(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1 + this.weekOffset() * 7);

    const entries: ScheduleEntry[] = [];
    const drivers = [
      { name: 'Marcus Rivera', class: 'CDL-A', route: 'Residential South', job: 'RESIDENTIAL_SANITATION', hos: 8.5 },
      { name: 'DeShawn Williams', class: 'CDL-A', route: 'Roll-Off North', job: 'ROLL_OFF_DELIVERY', hos: 6.0 },
      { name: 'Carlos Mendoza', class: 'CDL-B', route: 'Septic East', job: 'SEPTIC_PUMP', hos: 1.5 },
      { name: 'Jake Thompson', class: 'CDL-A', route: 'Residential South', job: 'RESIDENTIAL_SANITATION', hos: 9.0 },
      { name: 'Ahmad Hassan', class: 'CDL-A', route: 'Roll-Off East', job: 'ROLL_OFF_PICKUP', hos: 4.0 },
      { name: 'Tyler Nguyen', class: 'CDL-B', route: 'Grease Trap DT', job: 'GREASE_TRAP', hos: null },
      { name: 'David Kowalski', class: 'NON-CDL', route: 'Yard', job: 'YARD_MAINTENANCE', hos: null },
      { name: 'James Mitchell', class: 'CDL-A', route: 'Roll-Off South', job: 'ROLL_OFF_DELIVERY', hos: 7.0 },
    ];

    for (let d = 0; d < 5; d++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + d);
      const dateStr = date.toISOString().slice(0, 10);
      const isPast = date < now;

      for (const driver of drivers) {
        entries.push({
          id: `sched-${d}-${driver.name}`,
          employeeName: driver.name,
          employeeClass: driver.class,
          date: dateStr,
          dayOfWeek: days[d],
          startTime: driver.job === 'YARD_MAINTENANCE' ? '07:00' : '06:00',
          endTime: driver.job === 'YARD_MAINTENANCE' ? '15:00' : '14:30',
          routeId: `route-${d}`,
          routeName: driver.route,
          jobType: driver.job,
          hoursScheduled: driver.job === 'YARD_MAINTENANCE' ? 8 : 8.5,
          hosRemaining: driver.hos,
          status: isPast ? (Math.random() > 0.1 ? 'COMPLETED' : 'MISSED') : 'SCHEDULED',
        });
      }
    }
    return entries;
  });

  readonly totalShifts = computed(() => this.scheduleData().length);
  readonly totalHours = computed(() =>
    Math.round(this.scheduleData().reduce((sum, e) => sum + e.hoursScheduled, 0))
  );
  readonly driversScheduled = computed(() =>
    new Set(this.scheduleData().map((e) => e.employeeName)).size
  );
  readonly hosWarnings = computed(() =>
    this.scheduleData().filter((e) => e.hosRemaining !== null && e.hosRemaining < 3).length
  );

  changeWeek(delta: number): void {
    this.weekOffset.update((v) => v + delta);
  }

  getStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'IN_PROGRESS': return 'info';
      case 'SCHEDULED': return 'secondary';
      case 'MISSED': return 'danger';
      default: return 'secondary';
    }
  }
}
