import { Component, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ManagerAlertsService } from '../../core/manager-alerts.service';

type ShiftTone = 'residential' | 'roll-off' | 'septic' | 'yard' | 'emergency';

interface ShiftBlock {
  id: string;
  label: string;
  routeName: string;
  startTime: string;
  endTime: string;
  hours: number;
  tone: ShiftTone;
}

interface DriverRow {
  id: string;
  name: string;
  employeeClass: string;
  blockedReason?: string;
  hosRemaining: number | null;
  weeklyHours: number;
  shifts: Record<string, ShiftBlock | null>;
}

interface Conflict {
  severity: 'CRITICAL' | 'WARNING';
  message: string;
}

interface UnassignedRoute {
  day: string;
  label: string;
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    SelectModule,
    InputTextModule,
    CurrencyPipe,
  ],
  selector: 'app-schedule',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="schedule-page">
      <div class="page-header">
        <div>
          <h1>Weekly Schedule</h1>
          <p>{{ weekLabel() }}</p>
        </div>
        <div class="header-actions">
          <button pButton type="button" class="p-button-text" icon="pi pi-chevron-left" (click)="changeWeek(-1)"></button>
          <button pButton type="button" class="p-button-text" icon="pi pi-chevron-right" (click)="changeWeek(1)"></button>
          <button pButton type="button" class="p-button-outlined" label="Templates" icon="pi pi-angle-down"></button>
          <button pButton type="button" label="Publish" icon="pi pi-send" [disabled]="hasCriticalConflicts()" (click)="publishSchedule()"></button>
        </div>
      </div>

      <div class="schedule-summary">
        <span>Labor: {{ projectedLaborCost() | currency:'USD':'symbol':'1.0-0' }} projected</span>
        <span>·</span>
        <span>{{ budgetUsedHours() }}h budget used / {{ availableBudgetHours() }}h available</span>
      </div>

      <div class="schedule-grid">
        <div class="grid-header driver-col">Driver</div>
        @for (day of DAYS; track day) {
          <div class="grid-header">{{ day }}</div>
        }

        <div class="driver-label unassigned-row">Unassigned Routes</div>
        @for (day of DAYS; track day) {
          <div class="grid-cell unassigned-row">
            @for (route of unassignedRoutesByDay(day); track route.label) {
              <button type="button" class="unassigned-block">{{ route.label }}</button>
            }
          </div>
        }

        @for (row of scheduleRows(); track row.id) {
          <div class="driver-label" [class.driver-blocked]="!!row.blockedReason">
            <div class="driver-name">{{ row.name }}</div>
            <div class="driver-meta">
              <span>{{ row.employeeClass }}</span>
              @if (row.blockedReason) {
                <span class="driver-warning">{{ row.blockedReason }}</span>
              } @else if ((getConflicts(row).length > 0)) {
                <span class="driver-warning">⚠ {{ getConflicts(row).length }} issue(s)</span>
              }
            </div>
          </div>

          @for (day of DAYS; track day) {
            <div class="grid-cell" [class.driver-blocked]="!!row.blockedReason">
              @if (row.shifts[day]; as shift) {
                <div class="shift-block" [class]="shift.tone">
                  <span>{{ shift.label }}</span>
                </div>
              }
              @if (!row.blockedReason && hasConflictForDay(row, day)) {
                <span class="cell-conflict">⚠</span>
              }
            </div>
          }
        }
      </div>

      <div class="conflict-panel" *ngIf="hasCriticalConflicts() || projectedOTHours() > 0">
        <h3>Schedule Validation</h3>
        <div class="conflict-list">
          @for (row of scheduleRows(); track row.id) {
            @for (conflict of getConflicts(row); track conflict.message + $index) {
              <div class="conflict-item" [class.critical]="conflict.severity === 'CRITICAL'">
                <strong>{{ row.name }}</strong>
                <span>{{ conflict.message }}</span>
              </div>
            }
          }
        </div>
      </div>

      <div class="schedule-footer">
        <div class="labor-projection">
          <span class="footer-label">Projected Labor Cost</span>
          <span class="footer-value">{{ projectedLaborCost() | currency:'USD':'symbol':'1.0-0' }}</span>
          <span class="footer-delta" [class.over]="budgetDelta() > 0">
            {{ budgetDelta() > 0 ? '▲' : '▼' }}
            {{ absBudgetDelta() | currency:'USD':'symbol':'1.0-0' }} vs budget
          </span>
        </div>
        <div class="hours-summary">
          <span>{{ totalScheduledHours() }}h scheduled</span>
          <span class="separator">·</span>
          <span class="ot-projection" *ngIf="projectedOTHours() > 0">
            {{ projectedOTHours() | number:'1.0-1' }}h overtime
          </span>
        </div>
        <button pButton type="button" label="Publish Schedule" icon="pi pi-send"
          [disabled]="hasCriticalConflicts()" (click)="publishSchedule()"></button>
      </div>

      <p-dialog header="Schedule Templates" [(visible)]="showTemplatesValue" [modal]="true" [style]="{ width: '28rem' }">
        <div class="dialog-body">
          <div class="form-field">
            <label>Template</label>
            <p-select [options]="templateOptions" [(ngModel)]="selectedTemplate" placeholder="Select template"></p-select>
          </div>
          <div class="form-field">
            <label>Notes</label>
            <input pInputText [(ngModel)]="templateNotes" placeholder="Optional manager note" />
          </div>
        </div>
        <ng-template pTemplate="footer">
          <button pButton type="button" class="p-button-text" label="Cancel" (click)="showTemplates.set(false)"></button>
          <button pButton type="button" label="Apply Template" icon="pi pi-check" (click)="applyTemplate()"></button>
        </ng-template>
      </p-dialog>
    </div>
  `,
  styles: [`
    .schedule-page {
      display: flex;
      flex-direction: column;
      gap: var(--sc-space-4);
      min-height: 100%;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--sc-space-4);
    }
    .page-header h1 {
      margin: 0;
      font-size: var(--sc-text-2xl);
      color: var(--sc-text-primary);
    }
    .page-header p {
      margin: 6px 0 0;
      color: var(--sc-text-secondary);
      font-size: var(--sc-text-sm);
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .schedule-summary {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: var(--sc-space-3) var(--sc-space-4);
      border-radius: var(--sc-radius-lg);
      background: var(--sc-card-bg);
      border: 1px solid var(--sc-border);
      color: var(--sc-text-secondary);
      font-size: var(--sc-text-sm);
    }

    .schedule-grid {
      display: grid;
      grid-template-columns: minmax(220px, 1.1fr) repeat(7, minmax(96px, 1fr));
      gap: 1px;
      padding: 1px;
      background: var(--sc-border);
      border-radius: var(--sc-radius-lg);
      overflow: hidden;
    }
    .grid-header,
    .driver-label,
    .grid-cell {
      background: var(--sc-card-bg);
      min-height: 64px;
      padding: 10px 12px;
    }
    .grid-header {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--sc-text-xs);
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--sc-text-secondary);
    }
    .driver-col {
      justify-content: flex-start;
    }
    .driver-label {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 6px;
    }
    .driver-name {
      font-size: var(--sc-text-sm);
      font-weight: 700;
      color: var(--sc-text-primary);
    }
    .driver-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      color: var(--sc-text-secondary);
      font-size: var(--sc-text-xs);
    }
    .driver-warning {
      color: var(--sc-warning-4);
      font-weight: 700;
    }
    .grid-cell {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .shift-block {
      border-radius: var(--sc-radius-sm);
      height: 36px;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 8px;
      font-size: var(--sc-text-xs);
      font-weight: 600;
      text-align: center;
    }
    .shift-block.residential { background: var(--sc-info-2); color: var(--sc-info-4); }
    .shift-block.roll-off { background: var(--sc-success-2); color: var(--sc-success-4); }
    .shift-block.septic { background: var(--sc-accent-2); color: var(--sc-accent-4); }
    .shift-block.yard { background: var(--sc-caution-2); color: var(--sc-caution-4); }
    .shift-block.emergency { background: var(--sc-danger-2); color: var(--sc-danger-4); }

    .driver-blocked {
      background: repeating-linear-gradient(
        45deg,
        var(--sc-gray-1),
        var(--sc-gray-1) 10px,
        var(--sc-gray-2) 10px,
        var(--sc-gray-2) 20px
      );
      color: var(--sc-gray-3);
      pointer-events: none;
    }

    .unassigned-row {
      background: var(--sc-info-1);
    }
    .unassigned-block {
      border: none;
      background: var(--sc-blue);
      color: #fff;
      border-radius: var(--sc-radius-sm);
      min-height: 36px;
      padding: 0 10px;
      font-size: var(--sc-text-xs);
      font-weight: 700;
      cursor: pointer;
    }
    .unassigned-block:hover {
      background: var(--sc-blue-dark);
    }

    .cell-conflict {
      position: absolute;
      top: 6px;
      right: 8px;
      font-size: var(--sc-text-sm);
      color: var(--sc-warning-4);
    }

    .conflict-panel {
      background: var(--sc-card-bg);
      border: 1px solid var(--sc-border);
      border-radius: var(--sc-radius-lg);
      padding: var(--sc-space-4);
    }
    .conflict-panel h3 {
      margin: 0 0 10px;
      color: var(--sc-text-primary);
      font-size: var(--sc-text-base);
    }
    .conflict-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .conflict-item {
      display: flex;
      gap: 8px;
      padding: 10px 12px;
      border-radius: var(--sc-radius-md);
      background: var(--sc-warning-1);
      color: var(--sc-warning-4);
      font-size: var(--sc-text-sm);
    }
    .conflict-item.critical {
      background: var(--sc-danger-1);
      color: var(--sc-danger-4);
    }

    .schedule-footer {
      position: sticky;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sc-space-4);
      padding: var(--sc-space-4) var(--sc-space-5);
      border: 1px solid var(--sc-border);
      border-radius: var(--sc-radius-lg);
      background: color-mix(in srgb, var(--sc-card-bg) 92%, white);
      box-shadow: var(--sc-shadow-md);
    }
    .labor-projection {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .footer-label {
      color: var(--sc-text-secondary);
      font-size: var(--sc-text-xs);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
    }
    .footer-value {
      font-size: var(--sc-text-2xl);
      font-weight: 800;
      color: var(--sc-text-primary);
    }
    .footer-delta {
      color: var(--sc-success-4);
      font-size: var(--sc-text-sm);
      font-weight: 600;
    }
    .footer-delta.over {
      color: var(--sc-danger-4);
    }
    .hours-summary {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--sc-text-secondary);
      font-size: var(--sc-text-sm);
    }
    .separator {
      color: var(--sc-gray-3);
    }
    .ot-projection {
      color: var(--sc-warning-4);
      font-weight: 700;
    }

    .dialog-body {
      display: flex;
      flex-direction: column;
      gap: var(--sc-space-4);
    }
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-field label {
      font-size: var(--sc-text-sm);
      font-weight: 600;
      color: var(--sc-text-primary);
    }

    @media (max-width: 1100px) {
      .schedule-grid {
        overflow-x: auto;
        display: block;
      }
      .schedule-footer {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `],
})
export class SchedulePage {
  readonly DAYS = DAYS;
  readonly weekOffset = signal(0);
  readonly showTemplates = signal(false);
  readonly templateOptions = [
    { label: 'Standard Residential Week', value: 'residential' },
    { label: 'Heavy Roll-Off Coverage', value: 'rolloff' },
    { label: 'Storm Response', value: 'emergency' },
  ];
  selectedTemplate = 'residential';
  templateNotes = '';

  readonly weekLabel = computed(() => {
    const start = new Date(2026, 2, 17 + this.weekOffset() * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const fmt = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(start)}–${fmt(end)}`;
  });

  readonly scheduleRows = computed<DriverRow[]>(() => [
    {
      id: 'emp-rivera',
      name: 'Rivera, Marcus',
      employeeClass: 'CDL-A',
      hosRemaining: 12,
      weeklyHours: 42.5,
      shifts: {
        MON: this.shift('residential', 'South Res', '06:00', '14:30', 8.5),
        TUE: this.shift('residential', 'South Res', '06:00', '14:30', 8.5),
        WED: this.shift('residential', 'South Res', '06:00', '14:30', 8.5),
        THU: this.shift('residential', 'South Res', '06:00', '14:30', 8.5),
        FRI: this.shift('residential', 'South Res', '06:00', '14:30', 8.5),
        SAT: null,
        SUN: null,
      },
    },
    {
      id: 'emp-williams',
      name: 'Williams, DeShawn',
      employeeClass: 'CDL-A',
      hosRemaining: 3,
      weeklyHours: 39,
      shifts: {
        MON: this.shift('roll-off', 'North Roll', '05:30', '14:00', 8.5),
        TUE: null,
        WED: this.shift('roll-off', 'North Roll', '05:30', '14:00', 8.5),
        THU: this.shift('roll-off', 'North Roll', '05:30', '14:00', 8.5),
        FRI: this.shift('roll-off', 'North Roll', '05:30', '14:00', 8.5),
        SAT: null,
        SUN: null,
      },
    },
    {
      id: 'emp-mendoza',
      name: 'Mendoza, Carlos',
      employeeClass: 'CDL-B',
      hosRemaining: 8,
      weeklyHours: 34,
      shifts: {
        MON: this.shift('septic', 'Septic East', '06:00', '14:30', 8.5),
        TUE: this.shift('septic', 'Septic East', '06:00', '14:30', 8.5),
        WED: null,
        THU: this.shift('septic', 'Septic East', '06:00', '14:30', 8.5),
        FRI: this.shift('septic', 'Septic East', '06:00', '14:30', 8.5),
        SAT: null,
        SUN: null,
      },
    },
    {
      id: 'emp-okafor',
      name: 'Okafor, James',
      employeeClass: 'CDL-A',
      blockedReason: 'CDL expired — blocked',
      hosRemaining: null,
      weeklyHours: 0,
      shifts: { MON: null, TUE: null, WED: null, THU: null, FRI: null, SAT: null, SUN: null },
    },
    {
      id: 'emp-chen',
      name: 'Chen, Lisa',
      employeeClass: 'Dispatch',
      hosRemaining: null,
      weeklyHours: 40,
      shifts: {
        MON: this.shift('yard', 'Dispatch HQ', '08:00', '16:00', 8),
        TUE: this.shift('yard', 'Dispatch HQ', '08:00', '16:00', 8),
        WED: this.shift('yard', 'Dispatch HQ', '08:00', '16:00', 8),
        THU: this.shift('yard', 'Dispatch HQ', '08:00', '16:00', 8),
        FRI: this.shift('yard', 'Dispatch HQ', '08:00', '16:00', 8),
        SAT: null,
        SUN: null,
      },
    },
  ]);

  readonly unassignedRoutes = signal<UnassignedRoute[]>([
    { day: 'MON', label: 'Route A' },
    { day: 'TUE', label: 'Route B' },
    { day: 'WED', label: 'Route C' },
  ]);

  readonly totalScheduledHours = computed(() =>
    this.scheduleRows().reduce((sum, row) => sum + this.rowHours(row), 0)
  );
  readonly projectedOTHours = computed(() =>
    this.scheduleRows().reduce((sum, row) => sum + Math.max(0, this.rowHours(row) - 40), 0)
  );
  readonly projectedLaborCost = computed(() =>
    this.scheduleRows().reduce((sum, row) => {
      const hours = this.rowHours(row);
      const regularHours = Math.min(hours, 40);
      const overtimeHours = Math.max(0, hours - 40);
      return sum + regularHours * 28 + overtimeHours * 42;
    }, 0)
  );
  readonly budgetUsedHours = computed(() => Math.round(this.totalScheduledHours()));
  readonly availableBudgetHours = computed(() => 80);
  readonly budgetDelta = computed(() => this.projectedLaborCost() - 12400);
  readonly absBudgetDelta = computed(() => Math.abs(this.budgetDelta()));
  readonly hasCriticalConflicts = computed(() =>
    this.scheduleRows().some((row) =>
      this.getConflicts(row).some((conflict) => conflict.severity === 'CRITICAL')
    )
  );

  get showTemplatesValue(): boolean {
    return this.showTemplates();
  }

  set showTemplatesValue(value: boolean) {
    this.showTemplates.set(value);
  }

  constructor(private readonly alerts: ManagerAlertsService) {}

  changeWeek(delta: number): void {
    this.weekOffset.update((value) => value + delta);
  }

  shift(tone: ShiftTone, routeName: string, startTime: string, endTime: string, hours: number): ShiftBlock {
    return {
      id: `${routeName}-${startTime}`,
      label: routeName,
      routeName,
      startTime,
      endTime,
      hours,
      tone,
    };
  }

  rowHours(row: DriverRow): number {
    return Object.values(row.shifts).reduce((sum, shift) => sum + (shift?.hours ?? 0), 0);
  }

  getConflicts(row: DriverRow): Conflict[] {
    const conflicts: Conflict[] = [];
    const weeklyHours = this.rowHours(row);

    if (row.blockedReason) {
      conflicts.push({
        severity: 'CRITICAL',
        message: `${row.blockedReason}. This driver cannot be published on the schedule.`,
      });
    }

    if (row.hosRemaining !== null && row.hosRemaining < 4) {
      conflicts.push({
        severity: 'CRITICAL',
        message: `This schedule would exceed ${row.name}'s remaining DOT driving window.`,
      });
    }

    if (weeklyHours > 40) {
      conflicts.push({
        severity: 'WARNING',
        message: `This schedule projects ${(weeklyHours - 40).toFixed(1)}h overtime for ${row.name}.`,
      });
    }

    return conflicts;
  }

  hasConflictForDay(row: DriverRow, day: string): boolean {
    return this.getConflicts(row).length > 0 && !!row.shifts[day];
  }

  unassignedRoutesByDay(day: string): UnassignedRoute[] {
    return this.unassignedRoutes().filter((route) => route.day === day);
  }

  publishSchedule(): void {
    if (this.hasCriticalConflicts()) {
      this.alerts.critical(
        'Schedule blocked',
        'Resolve CDL and HOS conflicts before publishing the weekly schedule.',
        '/schedule'
      );
      return;
    }

    this.alerts.high(
      'Schedule published',
      `Weekly schedule published at ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.`,
      '/schedule'
    );
  }

  applyTemplate(): void {
    this.alerts.low(
      'Template applied',
      `${this.selectedTemplate} template applied to the current scheduling week.`,
      '/schedule'
    );
    this.showTemplates.set(false);
  }
}
