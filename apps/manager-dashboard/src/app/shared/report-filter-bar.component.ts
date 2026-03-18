import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface FilterOption {
  label: string;
  value: string;
}

@Component({
  standalone: true,
  selector: 'app-report-filter-bar',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sc-filter-bar">
      <div class="sc-filter-primary">
        @if (presetOptions.length > 0) {
          <label class="sr-only" for="sc-filter-preset">Preset</label>
          <select
            id="sc-filter-preset"
            class="sc-filter-select sc-filter-preset"
            [ngModel]="preset"
            (ngModelChange)="presetChange.emit($event)"
          >
            @for (option of presetOptions; track option.value) {
              <option [ngValue]="option.value">{{ option.label }}</option>
            }
          </select>
        }

        <label class="sr-only" for="sc-filter-search">Search</label>
        <input
          id="sc-filter-search"
          type="text"
          class="sc-filter-input"
          [placeholder]="searchPlaceholder"
          [ngModel]="searchTerm"
          (ngModelChange)="searchTermChange.emit($event)"
        />

        <label class="sr-only" for="sc-filter-status">Status</label>
        <select
          id="sc-filter-status"
          class="sc-filter-select"
          [ngModel]="status"
          (ngModelChange)="statusChange.emit($event)"
        >
          <option [ngValue]="null">All Statuses</option>
          @for (option of statusOptions; track option.value) {
            <option [ngValue]="option.value">{{ option.label }}</option>
          }
        </select>

        <div class="sc-filter-date-range">
          <label for="sc-filter-from">From</label>
          <input
            id="sc-filter-from"
            type="date"
            class="sc-filter-date"
            [ngModel]="dateFrom"
            (ngModelChange)="dateFromChange.emit($event)"
          />

          <label for="sc-filter-to">To</label>
          <input
            id="sc-filter-to"
            type="date"
            class="sc-filter-date"
            [ngModel]="dateTo"
            (ngModelChange)="dateToChange.emit($event)"
          />
        </div>
      </div>

      <div class="sc-filter-actions">
        @if (tertiaryActionLabel) {
          <button type="button" class="sc-filter-action-btn secondary" (click)="tertiaryAction.emit()">
            {{ tertiaryActionLabel }}
          </button>
        }
        <button type="button" class="sc-filter-action-btn" (click)="primaryAction.emit()">
          {{ primaryActionLabel }}
        </button>
        <button type="button" class="sc-filter-action-btn" (click)="secondaryAction.emit()">
          {{ secondaryActionLabel }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .sc-filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--sc-space-3);
      flex-wrap: wrap;
      margin-bottom: var(--sc-space-4);
      background: var(--sc-card-bg);
      border: 1px solid var(--sc-border);
      border-radius: var(--sc-radius-lg);
      padding: var(--sc-space-4);
    }

    .sc-filter-primary {
      display: flex;
      align-items: center;
      gap: var(--sc-space-3);
      flex-wrap: wrap;
      flex: 1;
      min-width: 320px;
    }

    .sc-filter-input,
    .sc-filter-select,
    .sc-filter-date {
      border: 1px solid var(--sc-border);
      border-radius: var(--sc-radius-md);
      background: var(--sc-input-bg);
      color: var(--sc-text-primary);
      font-size: var(--sc-text-sm);
      padding: 8px 12px;
      min-height: 38px;
    }

    .sc-filter-input {
      min-width: 220px;
      flex: 1;
    }

    .sc-filter-select {
      min-width: 170px;
    }

    .sc-filter-preset {
      min-width: 140px;
    }

    .sc-filter-date-range {
      display: flex;
      align-items: center;
      gap: var(--sc-space-2);
      color: var(--sc-text-secondary);
      font-size: var(--sc-text-xs);
      font-weight: 600;
    }

    .sc-filter-actions {
      display: flex;
      gap: var(--sc-space-2);
    }

    .sc-filter-action-btn {
      border: 1px solid var(--sc-border);
      border-radius: var(--sc-radius-md);
      padding: 8px 12px;
      background: var(--sc-card-bg);
      color: var(--sc-text-secondary);
      font-size: var(--sc-text-sm);
      font-weight: 600;
      cursor: pointer;
    }

    .sc-filter-action-btn:hover {
      border-color: var(--sc-orange);
      color: var(--sc-orange);
    }

    .sc-filter-action-btn.secondary {
      background: var(--sc-gray-1);
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `],
})
export class ReportFilterBarComponent {
  @Input() preset = '';
  @Input() presetOptions: FilterOption[] = [];
  @Input() searchTerm = '';
  @Input() searchPlaceholder = 'Search employee...';
  @Input() status: string | null = null;
  @Input() dateFrom = '';
  @Input() dateTo = '';
  @Input() statusOptions: FilterOption[] = [];
  @Input() primaryActionLabel = 'Export';
  @Input() secondaryActionLabel = 'Columns';
  @Input() tertiaryActionLabel: string | null = null;

  @Output() readonly presetChange = new EventEmitter<string>();
  @Output() readonly searchTermChange = new EventEmitter<string>();
  @Output() readonly statusChange = new EventEmitter<string | null>();
  @Output() readonly dateFromChange = new EventEmitter<string>();
  @Output() readonly dateToChange = new EventEmitter<string>();
  @Output() readonly primaryAction = new EventEmitter<void>();
  @Output() readonly secondaryAction = new EventEmitter<void>();
  @Output() readonly tertiaryAction = new EventEmitter<void>();
}
