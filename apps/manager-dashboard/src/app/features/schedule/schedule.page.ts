import { Component, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ManagerAlertsService } from '../../core/manager-alerts.service';

type ShiftTone = 'residential' | 'roll-off' | 'septic' | 'yard' | 'emergency';
type ShiftStatus = 'SCHEDULED' | 'WORKED' | 'NO_SHOW' | 'SICK' | 'PARTIAL';

interface ShiftBlock {
  id: string;
  label: string;
  routeName: string;
  startTime: string;
  endTime: string;
  hours: number;
  tone: ShiftTone;
  status: ShiftStatus;
  note?: string;
  splits?: ShiftSplit[];
}

interface ShiftSplit {
  startTime: string;
  endTime: string;
  status: ShiftStatus;
  note?: string;
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
    TooltipModule,
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
          <button pButton type="button" class="p-button-outlined" label="Templates" icon="pi pi-angle-down" (click)="showTemplates.set(true)"></button>
          <button pButton type="button" [label]="published() ? 'Published ✓' : 'Publish'" [icon]="published() ? 'pi pi-check' : 'pi pi-send'" [class.p-button-success]="published()" (click)="publishSchedule()"></button>
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
        <div class="grid-header">HRS</div>

        @for (row of scheduleRows(); track row.id) {
          <div class="driver-label" [class.driver-blocked]="!!row.blockedReason">
            <div class="driver-name">{{ row.name }}</div>
            <div class="driver-meta">
              <span>{{ row.employeeClass }}</span>
              @if (row.blockedReason) {
                <span class="driver-warning" [pTooltip]="row.blockedReason" tooltipPosition="right">{{ row.blockedReason }}</span>
              } @else if ((getConflicts(row).length > 0)) {
                <span class="driver-warning" [pTooltip]="getConflictSummary(row)" tooltipPosition="right">⚠ {{ getConflicts(row).length }} issue(s)</span>
              }
            </div>
          </div>

          @for (day of DAYS; track day) {
            <div class="grid-cell" [class.driver-blocked]="!!row.blockedReason">
              @if (row.shifts[day]) {
                <button type="button" class="shift-block"
                  [class.no-show]="row.shifts[day]!.status === 'NO_SHOW'"
                  [class.sick]="row.shifts[day]!.status === 'SICK'"
                  [class.partial]="row.shifts[day]!.status === 'PARTIAL'"
                  (click)="editShift(row, day, row.shifts[day]!)">
                  <span class="shift-label">{{ row.shifts[day]!.label }}</span>
                  <span class="shift-time">{{ row.shifts[day]!.startTime }}–{{ row.shifts[day]!.endTime }}</span>
                  @if (row.shifts[day]!.status !== 'SCHEDULED') {
                    <span class="shift-status-tag">{{ row.shifts[day]!.status }}</span>
                  }
                </button>
              } @else if (!row.blockedReason) {
                <button type="button" class="add-shift-btn" (click)="addShift(row, day)" title="Add shift">
                  <i class="pi pi-plus"></i>
                </button>
              }
              @if (!row.blockedReason && hasConflictForDay(row, day)) {
                <span class="cell-conflict" [pTooltip]="getConflictSummary(row)" tooltipPosition="top">⚠</span>
              }
            </div>
          }
          <div class="grid-cell hours-total" [class.ot-warning]="rowHours(row) > 40">
            <span>{{ rowHours(row) | number:'1.0-1' }}h</span>
          </div>
        }
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
        <button pButton type="button" [label]="published() ? 'Published ✓' : 'Publish Schedule'" [icon]="published() ? 'pi pi-check' : 'pi pi-send'" [class.p-button-success]="published()" (click)="publishSchedule()"></button>
      </div>

      <!-- Edit Shift Dialog -->
      <p-dialog header="Edit Shift" [(visible)]="editShiftDialogVisible" [modal]="true" [style]="{ width: '30rem' }">
        <div class="dialog-body">
          <div class="edit-shift-info">
            <strong>{{ editShiftEmployee }}</strong>
            <span>{{ editShiftDay }} · {{ editShiftData?.label }}</span>
          </div>

          <div class="form-field">
            <label>Status</label>
            <p-select [options]="shiftStatusOptions" [(ngModel)]="editShiftStatus" (ngModelChange)="onEditStatusChange()"></p-select>
          </div>

          @if (editShiftStatus === 'PARTIAL') {
            <div class="split-section">
              <h4>Split Shift</h4>
              <div class="split-row">
                <div class="form-field">
                  <label>Part 1: Start</label>
                  <input pInputText type="time" [(ngModel)]="splitStart1" />
                </div>
                <div class="form-field">
                  <label>End</label>
                  <input pInputText type="time" [(ngModel)]="splitEnd1" />
                </div>
                <div class="form-field">
                  <label>Status</label>
                  <p-select [options]="splitStatusOptions" [(ngModel)]="splitStatus1"></p-select>
                </div>
              </div>
              <div class="split-row">
                <div class="form-field">
                  <label>Part 2: Start</label>
                  <input pInputText type="time" [(ngModel)]="splitStart2" />
                </div>
                <div class="form-field">
                  <label>End</label>
                  <input pInputText type="time" [(ngModel)]="splitEnd2" />
                </div>
                <div class="form-field">
                  <label>Status</label>
                  <p-select [options]="splitStatusOptions" [(ngModel)]="splitStatus2"></p-select>
                </div>
              </div>
            </div>
          } @else {
            <div class="form-row">
              <div class="form-field">
                <label>Start Time</label>
                <input pInputText type="time" [(ngModel)]="editShiftStart" />
              </div>
              <div class="form-field">
                <label>End Time</label>
                <input pInputText type="time" [(ngModel)]="editShiftEnd" />
              </div>
            </div>
          }

          <div class="form-field">
            <label>Note (goes to employee log)</label>
            <input pInputText [(ngModel)]="editShiftNote" placeholder="e.g. Called in sick at 6am, no doctor note" />
          </div>
        </div>

        <ng-template pTemplate="footer">
          <button pButton type="button" class="p-button-danger p-button-text" label="Delete Shift" icon="pi pi-trash" (click)="deleteShift()"></button>
          <div style="flex:1"></div>
          <button pButton type="button" class="p-button-text" label="Cancel" (click)="editShiftDialogVisible = false"></button>
          <button pButton type="button" label="Save Changes" icon="pi pi-check" (click)="saveShiftEdit()"></button>
        </ng-template>
      </p-dialog>

      <!-- Add Shift Dialog -->
      <p-dialog header="Add Shift" [(visible)]="addShiftDialogVisible" [modal]="true" [style]="{ width: '26rem' }">
        <div class="dialog-body">
          <div class="form-field">
            <label>Employee</label>
            <input pInputText [value]="addShiftEmployee" disabled />
          </div>
          <div class="form-field">
            <label>Day</label>
            <input pInputText [value]="addShiftDay" disabled />
          </div>
          <div class="form-field">
            <label>Route / Assignment</label>
            <p-select [options]="routeOptions" [(ngModel)]="addShiftRoute" placeholder="Select route"></p-select>
          </div>
          @if (addShiftEstimate()) {
            <div class="estimate-banner">
              <i class="pi pi-lightbulb"></i>
              <span>Based on history: <strong>~{{ addShiftEstimate() }}h estimated</strong> ({{ addShiftConfidence() }} confidence)</span>
            </div>
          }
          <div class="form-field">
            <label>Start Time</label>
            <input pInputText type="time" [(ngModel)]="addShiftStart" />
          </div>
          <div class="form-field">
            <label>End Time</label>
            <input pInputText type="time" [(ngModel)]="addShiftEnd" />
          </div>
        </div>
        <ng-template pTemplate="footer">
          <button pButton type="button" class="p-button-text" label="Cancel" (click)="addShiftDialogVisible = false"></button>
          <button pButton type="button" label="Add Shift" icon="pi pi-check" (click)="confirmAddShift()"></button>
        </ng-template>
      </p-dialog>

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
      grid-template-columns: minmax(220px, 1.1fr) repeat(7, minmax(96px, 1fr)) 64px;
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
      border-radius: 6px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 6px 6px;
      gap: 2px;
      background: #fff;
      border: 1px solid #dbeafe;
      color: #2563eb;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.1s ease;
    }
    .shift-block:hover {
      border-color: #2563eb;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
    }
    .shift-label {
      font-size: 0.72rem;
      font-weight: 700;
      line-height: 1.1;
      text-align: center;
    }
    .shift-time {
      font-size: 0.65rem;
      font-weight: 500;
      color: #60a5fa;
    }
    .shift-block.no-show {
      background: #fef2f2;
      border-color: #fecaca;
      color: #dc2626;
    }
    .shift-block.no-show .shift-time { color: #f87171; }
    .shift-block.sick {
      background: #fefce8;
      border-color: #fde68a;
      color: #d97706;
    }
    .shift-block.sick .shift-time { color: #fbbf24; }
    .shift-block.partial {
      background: #fff7ed;
      border-color: #fed7aa;
      color: #ea580c;
    }
    .shift-block.partial .shift-time { color: #fb923c; }
    .shift-status-tag {
      font-size: 0.55rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 1px 4px;
      border-radius: 3px;
      background: rgba(0,0,0,0.08);
    }
    .shift-split-indicator {
      font-size: 0.55rem;
      color: #9ca3af;
    }

    .edit-shift-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--sc-border);
      margin-bottom: 4px;
    }
    .edit-shift-info strong { font-size: 1rem; color: var(--sc-text-primary); }
    .edit-shift-info span { font-size: 0.85rem; color: var(--sc-text-secondary); }

    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

    .split-section { display: flex; flex-direction: column; gap: 12px; }
    .split-section h4 { margin: 0; font-size: 0.9rem; color: var(--sc-text-primary); }
    .estimate-banner {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; border-radius: 8px;
      background: #fffbeb; border: 1px solid #fde68a;
      font-size: 0.82rem; color: #92400e;
    }
    .estimate-banner i { color: #f59e0b; }

    .split-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      padding: 10px;
      background: var(--sc-gray-1);
      border-radius: 8px;
    }

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

    .hours-total {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--sc-text-primary);
    }
    .hours-total.ot-warning {
      color: var(--sc-danger-4);
      background: var(--sc-danger-1);
    }

    .add-shift-btn {
      width: 32px; height: 32px;
      border-radius: 8px;
      border: 1px dashed var(--sc-border);
      background: transparent;
      color: var(--sc-text-secondary);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.8rem;
      opacity: 0;
      transition: all 0.15s ease;
    }
    .grid-cell:hover .add-shift-btn { opacity: 1; }
    .add-shift-btn:hover {
      border-color: var(--sc-orange);
      color: var(--sc-orange);
      background: rgba(249, 115, 22, 0.06);
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

  // Add shift dialog state
  addShiftDialogVisible = false;
  addShiftEmployee = '';
  addShiftDay = '';
  addShiftRoute = '';
  addShiftStart = '06:00';
  addShiftEnd = '14:30';
  private addShiftRowId = '';

  // Edit shift dialog state
  editShiftDialogVisible = false;
  editShiftEmployee = '';
  editShiftDay = '';
  editShiftData: ShiftBlock | null = null;
  editShiftStatus: ShiftStatus = 'SCHEDULED';
  editShiftStart = '';
  editShiftEnd = '';
  editShiftNote = '';
  private editShiftRowId = '';

  // Split fields
  splitStart1 = '';
  splitEnd1 = '';
  splitStatus1: ShiftStatus = 'NO_SHOW';
  splitStart2 = '';
  splitEnd2 = '';
  splitStatus2: ShiftStatus = 'WORKED';

  readonly shiftStatusOptions = [
    { label: 'Scheduled', value: 'SCHEDULED' },
    { label: 'Worked', value: 'WORKED' },
    { label: 'No Show', value: 'NO_SHOW' },
    { label: 'Sick', value: 'SICK' },
    { label: 'Split (Partial)', value: 'PARTIAL' },
  ];

  readonly splitStatusOptions = [
    { label: 'Worked', value: 'WORKED' },
    { label: 'No Show', value: 'NO_SHOW' },
    { label: 'Sick', value: 'SICK' },
  ];

  private readonly http = inject(HttpClient);
  readonly addShiftEstimate = signal<number | null>(null);
  readonly addShiftConfidence = signal('');

  readonly routeOptions = [
    { label: 'South Residential', value: 'South Res' },
    { label: 'North Residential', value: 'North Res' },
    { label: 'East Residential', value: 'East Res' },
    { label: 'North Roll-Off', value: 'North Roll' },
    { label: 'South Roll-Off', value: 'South Roll' },
    { label: 'Central Roll-Off', value: 'Central Roll' },
    { label: 'West Roll-Off', value: 'West Roll' },
    { label: 'Septic East', value: 'Septic East' },
    { label: 'Septic West', value: 'Septic West' },
    { label: 'Septic South', value: 'Septic South' },
    { label: 'Yard Ops', value: 'Yard Ops' },
    { label: 'On Call / Emergency', value: 'On Call' },
  ];

  readonly weekLabel = computed(() => {
    const start = new Date(2026, 2, 17 + this.weekOffset() * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const fmt = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(start)}–${fmt(end)}`;
  });

  readonly scheduleRows = signal<DriverRow[]>([]);

  private initScheduleRows(): DriverRow[] { return [
    {
      id: 'emp-rivera', name: 'Rivera, Carlos', employeeClass: 'CDL-A', hosRemaining: 12, weeklyHours: 40,
      shifts: {
        MON: this.shift('residential', 'South Res', '06:00', '14:00', 8),
        TUE: this.shift('residential', 'South Res', '06:00', '14:00', 8),
        WED: this.shift('residential', 'South Res', '06:00', '14:00', 8),
        THU: this.shift('residential', 'South Res', '06:00', '14:00', 8),
        FRI: this.shift('residential', 'South Res', '06:00', '14:00', 8),
        SAT: null, SUN: null,
      },
    },
    {
      id: 'emp-chen', name: 'Chen, Mike', employeeClass: 'CDL-B', hosRemaining: 14, weeklyHours: 34,
      shifts: {
        MON: this.shift('roll-off', 'West Roll', '05:30', '14:00', 8.5),
        TUE: this.shift('roll-off', 'West Roll', '05:30', '14:00', 8.5),
        WED: null,
        THU: this.shift('roll-off', 'West Roll', '05:30', '14:00', 8.5),
        FRI: this.shift('roll-off', 'West Roll', '05:30', '14:00', 8.5),
        SAT: null, SUN: null,
      },
    },
    {
      id: 'emp-garcia', name: 'Garcia, Tom', employeeClass: 'CDL-A', hosRemaining: 14, weeklyHours: 40,
      shifts: {
        MON: this.shift('septic', 'Septic East', '06:00', '14:00', 8),
        TUE: this.shift('septic', 'Septic East', '06:00', '14:00', 8),
        WED: this.shift('septic', 'Septic East', '06:00', '14:00', 8),
        THU: this.shift('septic', 'Septic East', '06:00', '14:00', 8),
        FRI: this.shift('septic', 'Septic East', '06:00', '14:00', 8),
        SAT: null, SUN: null,
      },
    },
    {
      id: 'emp-kowalski', name: 'Kowalski, Anna', employeeClass: 'NON-CDL', hosRemaining: null, weeklyHours: 40,
      shifts: {
        MON: this.shift('yard', 'Yard Maint', '07:00', '15:00', 8),
        TUE: this.shift('yard', 'Yard Maint', '07:00', '15:00', 8),
        WED: this.shift('yard', 'Yard Maint', '07:00', '15:00', 8),
        THU: this.shift('yard', 'Yard Maint', '07:00', '15:00', 8),
        FRI: this.shift('yard', 'Yard Maint', '07:00', '15:00', 8),
        SAT: null, SUN: null,
      },
    },
    {
      id: 'emp-wright', name: 'Wright, James', employeeClass: 'CDL-A', hosRemaining: 6, weeklyHours: 38,
      shifts: {
        MON: this.shift('roll-off', 'North Roll', '05:30', '14:00', 8.5),
        TUE: null,
        WED: this.shift('roll-off', 'North Roll', '05:30', '14:00', 8.5),
        THU: this.shift('roll-off', 'North Roll', '05:30', '14:00', 8.5),
        FRI: this.shift('residential', 'East Res', '06:00', '14:30', 8.5),
        SAT: this.shift('emergency', 'On Call', '06:00', '14:00', 8),
        SUN: null,
      },
    },
    {
      id: 'emp-johnson', name: 'Johnson, Marcus', employeeClass: 'CDL-A', hosRemaining: 15, weeklyHours: 34,
      shifts: {
        MON: this.shift('residential', 'North Res', '06:00', '14:30', 8.5),
        TUE: this.shift('residential', 'North Res', '06:00', '14:30', 8.5),
        WED: null,
        THU: this.shift('residential', 'North Res', '06:00', '14:30', 8.5),
        FRI: this.shift('residential', 'North Res', '06:00', '14:30', 8.5),
        SAT: null, SUN: null,
      },
    },
    {
      id: 'emp-williams', name: 'Williams, Terrell', employeeClass: 'CDL-B', hosRemaining: 18, weeklyHours: 39,
      shifts: {
        MON: this.shift('septic', 'Septic West', '06:00', '14:30', 8.5),
        TUE: this.shift('septic', 'Septic West', '06:00', '14:30', 8.5),
        WED: this.shift('septic', 'Septic West', '06:00', '14:30', 8.5),
        THU: null,
        FRI: this.shift('septic', 'Septic West', '06:00', '14:30', 8.5),
        SAT: this.shift('emergency', 'On Call', '07:00', '13:00', 6),
        SUN: null,
      },
    },
    {
      id: 'emp-hernandez', name: 'Hernandez, Jake', employeeClass: 'CDL-A', hosRemaining: 10, weeklyHours: 42.5,
      shifts: {
        MON: this.shift('roll-off', 'South Roll', '05:30', '14:00', 8.5),
        TUE: this.shift('roll-off', 'South Roll', '05:30', '14:00', 8.5),
        WED: this.shift('roll-off', 'South Roll', '05:30', '14:00', 8.5),
        THU: this.shift('roll-off', 'South Roll', '05:30', '14:00', 8.5),
        FRI: this.shift('roll-off', 'South Roll', '05:30', '14:00', 8.5),
        SAT: null, SUN: null,
      },
    },
    {
      id: 'emp-carter', name: 'Carter, DeShawn', employeeClass: 'CDL-A', hosRemaining: 18, weeklyHours: 25.5,
      shifts: {
        MON: this.shift('residential', 'East Res', '06:00', '14:30', 8.5),
        TUE: null,
        WED: this.shift('residential', 'East Res', '06:00', '14:30', 8.5),
        THU: null,
        FRI: this.shift('residential', 'East Res', '06:00', '14:30', 8.5),
        SAT: null, SUN: null,
      },
    },
    {
      id: 'emp-rodriguez', name: 'Rodriguez, Miguel', employeeClass: 'NON-CDL', hosRemaining: null, weeklyHours: 32,
      shifts: {
        MON: this.shift('yard', 'Yard Ops', '07:00', '15:00', 8),
        TUE: this.shift('yard', 'Yard Ops', '07:00', '15:00', 8),
        WED: this.shift('yard', 'Yard Ops', '07:00', '15:00', 8),
        THU: this.shift('yard', 'Yard Ops', '07:00', '15:00', 8),
        FRI: null, SAT: null, SUN: null,
      },
    },
    {
      id: 'emp-patterson', name: 'Patterson, Chris', employeeClass: 'CDL-B', hosRemaining: 20, weeklyHours: 34,
      shifts: {
        MON: null,
        TUE: this.shift('roll-off', 'Central Roll', '06:00', '14:30', 8.5),
        WED: this.shift('roll-off', 'Central Roll', '06:00', '14:30', 8.5),
        THU: this.shift('roll-off', 'Central Roll', '06:00', '14:30', 8.5),
        FRI: this.shift('roll-off', 'Central Roll', '06:00', '14:30', 8.5),
        SAT: null, SUN: null,
      },
    },
    {
      id: 'emp-ramirez', name: 'Ramirez, Tony', employeeClass: 'CDL-A', hosRemaining: 16, weeklyHours: 40,
      shifts: {
        MON: this.shift('septic', 'Septic South', '06:00', '14:00', 8),
        TUE: this.shift('septic', 'Septic South', '06:00', '14:00', 8),
        WED: this.shift('septic', 'Septic South', '06:00', '14:00', 8),
        THU: this.shift('septic', 'Septic South', '06:00', '14:00', 8),
        FRI: this.shift('septic', 'Septic South', '06:00', '14:00', 8),
        SAT: null, SUN: null,
      },
    },
    {
      id: 'emp-brooks', name: 'Brooks, Kevin', employeeClass: 'Dispatch', hosRemaining: null, weeklyHours: 40,
      shifts: {
        MON: this.shift('yard', 'Dispatch HQ', '09:00', '17:00', 8),
        TUE: this.shift('yard', 'Dispatch HQ', '09:00', '17:00', 8),
        WED: this.shift('yard', 'Dispatch HQ', '09:00', '17:00', 8),
        THU: this.shift('yard', 'Dispatch HQ', '09:00', '17:00', 8),
        FRI: this.shift('yard', 'Dispatch HQ', '09:00', '17:00', 8),
        SAT: null, SUN: null,
      },
    },
    {
      id: 'emp-morales', name: 'Morales, Luis', employeeClass: 'Yard', hosRemaining: null, weeklyHours: 32,
      shifts: {
        MON: this.shift('yard', 'Yard Lead', '06:00', '14:00', 8),
        TUE: this.shift('yard', 'Yard Lead', '06:00', '14:00', 8),
        WED: this.shift('yard', 'Yard Lead', '06:00', '14:00', 8),
        THU: this.shift('yard', 'Yard Lead', '06:00', '14:00', 8),
        FRI: null, SAT: null, SUN: null,
      },
    },
    {
      id: 'emp-mitchell', name: 'Mitchell, Sarah', employeeClass: 'HR', hosRemaining: null, weeklyHours: 40,
      shifts: {
        MON: this.shift('yard', 'HR Office', '09:00', '17:00', 8),
        TUE: this.shift('yard', 'HR Office', '09:00', '17:00', 8),
        WED: this.shift('yard', 'HR Office', '09:00', '17:00', 8),
        THU: this.shift('yard', 'HR Office', '09:00', '17:00', 8),
        FRI: this.shift('yard', 'HR Office', '09:00', '17:00', 8),
        SAT: null, SUN: null,
      },
    },
    {
      id: 'emp-nguyen', name: 'Nguyen, Lisa', employeeClass: 'Payroll', hosRemaining: null, weeklyHours: 40,
      shifts: {
        MON: this.shift('yard', 'Payroll', '09:00', '17:00', 8),
        TUE: this.shift('yard', 'Payroll', '09:00', '17:00', 8),
        WED: this.shift('yard', 'Payroll', '09:00', '17:00', 8),
        THU: this.shift('yard', 'Payroll', '09:00', '17:00', 8),
        FRI: this.shift('yard', 'Payroll', '09:00', '17:00', 8),
        SAT: null, SUN: null,
      },
    },
    {
      id: 'emp-adams', name: 'Adams, Rachel', employeeClass: 'Executive', hosRemaining: null, weeklyHours: 40,
      shifts: {
        MON: this.shift('yard', 'Exec Office', '09:00', '17:00', 8),
        TUE: this.shift('yard', 'Exec Office', '09:00', '17:00', 8),
        WED: this.shift('yard', 'Exec Office', '09:00', '17:00', 8),
        THU: this.shift('yard', 'Exec Office', '09:00', '17:00', 8),
        FRI: this.shift('yard', 'Exec Office', '09:00', '17:00', 8),
        SAT: null, SUN: null,
      },
    },
    {
      id: 'emp-clark', name: 'Clark, Jacob', employeeClass: 'Manager', hosRemaining: null, weeklyHours: 40,
      shifts: {
        MON: this.shift('yard', 'Route Mgmt', '09:00', '17:00', 8),
        TUE: this.shift('yard', 'Route Mgmt', '09:00', '17:00', 8),
        WED: this.shift('yard', 'Route Mgmt', '09:00', '17:00', 8),
        THU: this.shift('yard', 'Route Mgmt', '09:00', '17:00', 8),
        FRI: this.shift('yard', 'Route Mgmt', '09:00', '17:00', 8),
        SAT: null, SUN: null,
      },
    },
  ]; }

  // Force recomputation of derived values when rows change
  private rowsVersion = signal(0);

  readonly unassignedRoutes = signal<UnassignedRoute[]>([
    { day: 'MON', label: 'Grease NW' },
    { day: 'WED', label: 'Emergency' },
    { day: 'SAT', label: 'Weekend Res' },
    { day: 'SAT', label: 'Weekend Roll' },
    { day: 'SUN', label: 'Emergency' },
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
  readonly availableBudgetHours = computed(() => 720);
  readonly budgetDelta = computed(() => this.projectedLaborCost() - 42000);
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

  constructor(private readonly alerts: ManagerAlertsService) {
    this.scheduleRows.set(this.initScheduleRows());
  }

  changeWeek(delta: number): void {
    this.weekOffset.update((value) => value + delta);
  }

  shift(tone: ShiftTone, routeName: string, startTime: string, endTime: string, hours: number, status: ShiftStatus = 'SCHEDULED'): ShiftBlock {
    return {
      id: `${routeName}-${startTime}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: routeName,
      routeName,
      startTime,
      endTime,
      hours,
      tone,
      status,
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

  getConflictSummary(row: DriverRow): string {
    return this.getConflicts(row).map((c) => c.message).join(' | ');
  }

  hasConflictForDay(row: DriverRow, day: string): boolean {
    return this.getConflicts(row).length > 0 && !!row.shifts[day];
  }

  unassignedRoutesByDay(day: string): UnassignedRoute[] {
    return this.unassignedRoutes().filter((route) => route.day === day);
  }

  addShift(row: DriverRow, day: string): void {
    this.addShiftEmployee = row.name;
    this.addShiftDay = day;
    this.addShiftRowId = row.id;
    this.addShiftRoute = '';
    this.addShiftStart = '06:00';
    this.addShiftEnd = '14:30';
    this.addShiftEstimate.set(null);
    this.addShiftConfidence.set('');
    this.addShiftDialogVisible = true;

    // Fetch estimate for this employee's most common job type
    const dayIndex = this.DAYS.indexOf(day);
    const jsDayIndex = dayIndex === 6 ? 0 : dayIndex + 1; // MON=1, SUN=0
    this.http.get<{ data: any }>(`${environment.apiUrl}/api/analytics/estimate`, {
      params: { employeeId: row.id, jobType: 'RESIDENTIAL_SANITATION', dayOfWeek: jsDayIndex.toString() },
    }).subscribe({
      next: (res) => {
        if (res.data) {
          this.addShiftEstimate.set(res.data.avgHours);
          this.addShiftConfidence.set(res.data.confidence.toLowerCase());
        }
      },
    });
  }

  editShift(row: DriverRow, day: string, shift: ShiftBlock): void {
    this.editShiftEmployee = row.name;
    this.editShiftDay = day;
    this.editShiftRowId = row.id;
    this.editShiftData = shift;
    this.editShiftStatus = shift.status;
    this.editShiftStart = shift.startTime;
    this.editShiftEnd = shift.endTime;
    this.editShiftNote = shift.note ?? '';

    // Pre-fill split fields from existing shift times
    const midHour = Math.floor((parseInt(shift.startTime) + parseInt(shift.endTime)) / 2);
    const midTime = `${String(midHour).padStart(2, '0')}:00`;
    this.splitStart1 = shift.startTime;
    this.splitEnd1 = midTime;
    this.splitStatus1 = 'NO_SHOW';
    this.splitStart2 = midTime;
    this.splitEnd2 = shift.endTime;
    this.splitStatus2 = 'WORKED';

    if (shift.splits?.length) {
      this.splitStart1 = shift.startTime;
      this.splitEnd1 = shift.splits[0].startTime;
      this.splitStatus1 = shift.status;
      this.splitStart2 = shift.splits[0].startTime;
      this.splitEnd2 = shift.splits[0].endTime;
      this.splitStatus2 = shift.splits[0].status;
    }

    this.editShiftDialogVisible = true;
  }

  onEditStatusChange(): void {
    // Auto-fill split when switching to PARTIAL
  }

  saveShiftEdit(): void {
    const rowId = this.editShiftRowId;
    const day = this.editShiftDay;

    this.scheduleRows.update((rows) =>
      rows.map((row) => {
        if (row.id !== rowId) return row;
        const existingShift = row.shifts[day];
        if (!existingShift) return row;

        let updatedShift: ShiftBlock;

        if (this.editShiftStatus === 'PARTIAL') {
          updatedShift = {
            ...existingShift,
            status: 'PARTIAL',
            note: this.editShiftNote || undefined,
            splits: [{
              startTime: this.splitStart2,
              endTime: this.splitEnd2,
              status: this.splitStatus2,
              note: this.editShiftNote || undefined,
            }],
            startTime: this.splitStart1,
            endTime: this.splitEnd1,
          };
        } else {
          updatedShift = {
            ...existingShift,
            status: this.editShiftStatus,
            startTime: this.editShiftStart,
            endTime: this.editShiftEnd,
            note: this.editShiftNote || undefined,
            splits: undefined,
          };
        }

        const shifts = { ...row.shifts };
        shifts[day] = updatedShift;
        return { ...row, shifts };
      })
    );

    const statusLabel = this.shiftStatusOptions.find((o) => o.value === this.editShiftStatus)?.label ?? this.editShiftStatus;
    let message = `${this.editShiftEmployee}'s ${this.editShiftDay} shift updated to "${statusLabel}".`;

    if (this.editShiftStatus === 'PARTIAL') {
      const s1Label = this.splitStatusOptions.find((o) => o.value === this.splitStatus1)?.label ?? this.splitStatus1;
      const s2Label = this.splitStatusOptions.find((o) => o.value === this.splitStatus2)?.label ?? this.splitStatus2;
      message = `${this.editShiftEmployee}'s ${this.editShiftDay} shift split: ${this.splitStart1}–${this.splitEnd1} (${s1Label}), ${this.splitStart2}–${this.splitEnd2} (${s2Label}).`;
    }

    if (this.editShiftNote) {
      message += ` Note logged: "${this.editShiftNote}"`;
    }

    const tier = (this.editShiftStatus === 'NO_SHOW' || this.editShiftStatus === 'SICK') ? 'high' : 'low';
    if (tier === 'high') {
      this.alerts.high('Shift status updated', message, '/schedule');
    } else {
      this.alerts.low('Shift updated', message, '/schedule');
    }

    this.editShiftDialogVisible = false;
  }

  deleteShift(): void {
    const rowId = this.editShiftRowId;
    const day = this.editShiftDay;

    this.scheduleRows.update((rows) =>
      rows.map((row) => {
        if (row.id !== rowId) return row;
        const shifts = { ...row.shifts };
        shifts[day] = null;
        return { ...row, shifts };
      })
    );

    this.alerts.medium(
      'Shift deleted',
      `${this.editShiftEmployee}'s shift on ${day} was removed from the schedule.`,
      '/schedule'
    );
    this.editShiftDialogVisible = false;
  }

  confirmAddShift(): void {
    if (!this.addShiftRoute || !this.addShiftStart || !this.addShiftEnd) return;

    const rowId = this.addShiftRowId;
    const day = this.addShiftDay;
    const startH = parseInt(this.addShiftStart.split(':')[0]);
    const endH = parseInt(this.addShiftEnd.split(':')[0]);
    const hours = Math.max(0, endH - startH);

    const newShift = this.shift('residential', this.addShiftRoute, this.addShiftStart, this.addShiftEnd, hours);

    this.scheduleRows.update((rows) =>
      rows.map((row) => {
        if (row.id !== rowId) return row;
        const shifts = { ...row.shifts };
        shifts[day] = newShift;
        return { ...row, shifts };
      })
    );

    this.alerts.low(
      'Shift added',
      `${this.addShiftEmployee} assigned to ${this.addShiftRoute} on ${day} (${this.addShiftStart}–${this.addShiftEnd}).`,
      '/schedule'
    );
    this.addShiftDialogVisible = false;
  }

  readonly published = signal(false);

  publishSchedule(): void {
    const rows = this.scheduleRows();
    const totalDrivers = rows.length;
    const totalShifts = rows.reduce((sum, r) => sum + Object.values(r.shifts).filter(Boolean).length, 0);
    const totalHours = this.totalScheduledHours();
    const cost = this.projectedLaborCost();

    this.published.set(true);

    this.alerts.low(
      'Schedule published',
      `${this.weekLabel()} schedule published: ${totalDrivers} employees, ${totalShifts} shifts, ${Math.round(totalHours)}h total, $${Math.round(cost).toLocaleString()} projected labor. Notifications sent to all assigned drivers.`,
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
