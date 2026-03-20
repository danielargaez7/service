import {
  Component,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  standalone: true,
  selector: 'app-settings',
  imports: [
    CommonModule,
    FormsModule,
    InputNumberModule,
    SelectModule,
    ButtonModule,
    TagModule,
    InputTextModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-page">
      <div class="page-header">
        <h2>Settings</h2>
        <span class="subtitle"
          >Configure notifications, payroll defaults, and integrations</span
        >
      </div>

      <!-- Notifications Section -->
      <div class="settings-section">
        <div class="section-header">
          <i class="pi pi-bell"></i>
          <h3>Notifications</h3>
        </div>
        <div class="settings-grid">
          <div class="setting-row">
            <div class="setting-info">
              <strong>SMS Alerts — HOS Warnings</strong>
              <span
                >Text drivers and dispatchers when approaching driving hour
                limits</span
              >
            </div>
            <label class="toggle">
              <input type="checkbox" [(ngModel)]="smsHosAlerts" />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <strong>Email — Payroll Exports</strong>
              <span
                >Send confirmation email when payroll is exported to
                QuickBooks/ADP</span
              >
            </div>
            <label class="toggle">
              <input type="checkbox" [(ngModel)]="emailPayrollExports" />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <strong>Push Notifications</strong>
              <span
                >Browser notifications for timesheet approvals, compliance
                alerts, and shift changes</span
              >
            </div>
            <label class="toggle">
              <input type="checkbox" [(ngModel)]="pushNotifications" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- Payroll Section -->
      <div class="settings-section">
        <div class="section-header">
          <i class="pi pi-dollar"></i>
          <h3>Payroll Defaults</h3>
        </div>
        <div class="settings-grid">
          <div class="setting-row">
            <div class="setting-info">
              <strong>Default Export Format</strong>
              <span>Used when exporting from the Pre-Payroll Audit page</span>
            </div>
            <p-select
              [options]="exportFormats"
              [(ngModel)]="defaultExportFormat"
              optionLabel="label"
              optionValue="value"
              styleClass="setting-select"
            />
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <strong>Pay Period Type</strong>
              <span>Determines how payroll periods are calculated</span>
            </div>
            <p-select
              [options]="payPeriodTypes"
              [(ngModel)]="payPeriodType"
              optionLabel="label"
              optionValue="value"
              styleClass="setting-select"
            />
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <strong>Weekly OT Threshold</strong>
              <span
                >Hours per week before overtime kicks in (FLSA default:
                40)</span
              >
            </div>
            <p-inputNumber
              [(ngModel)]="otThreshold"
              [min]="0"
              [max]="80"
              suffix=" hrs"
              styleClass="setting-number"
            />
          </div>
        </div>
      </div>

      <!-- Integrations Section -->
      <div class="settings-section">
        <div class="section-header">
          <i class="pi pi-link"></i>
          <h3>Integrations</h3>
        </div>
        <div class="settings-grid">
          <div class="setting-row">
            <div class="setting-info">
              <strong>Kimai — Time Capture</strong>
              <span>REST API bridge for time entry storage</span>
            </div>
            <p-tag
              [value]="kimaiStatus"
              [severity]="kimaiStatus === 'Connected' ? 'success' : 'danger'"
            />
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <strong>TimeTrex — Payroll Engine</strong>
              <span>Payroll calculation and tax withholding</span>
            </div>
            <p-tag
              [value]="timetrexStatus"
              [severity]="
                timetrexStatus === 'Connected' ? 'success' : 'warn'
              "
            />
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <strong>QuickBooks — Accounting</strong>
              <span>Payroll export and financial sync</span>
            </div>
            <p-tag
              [value]="quickbooksStatus"
              [severity]="
                quickbooksStatus === 'Connected' ? 'success' : 'danger'
              "
            />
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <strong>API Key</strong>
              <span>Used for server-to-server authentication</span>
            </div>
            <div class="api-key-display">
              <code>{{
                showApiKey ? apiKey : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'
              }}</code>
              <button
                pButton
                icon="pi pi-eye"
                class="p-button-text p-button-sm p-button-rounded"
                (click)="showApiKey = !showApiKey"
              ></button>
              <button
                pButton
                icon="pi pi-copy"
                class="p-button-text p-button-sm p-button-rounded"
                (click)="copyApiKey()"
                pTooltip="Copy to clipboard"
              ></button>
            </div>
          </div>
        </div>
      </div>

      <!-- Save Button -->
      <div class="settings-footer">
        <button
          pButton
          label="Save Changes"
          icon="pi pi-check"
          class="p-button-primary"
          (click)="saveSettings()"
        ></button>
        <span class="save-hint" *ngIf="saved">Settings saved</span>
      </div>
    </div>
  `,
  styles: [
    `
      .settings-page {
        animation: fadeIn 0.25s ease;
        max-width: 800px;
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(6px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .page-header {
        margin-bottom: 24px;
      }
      .page-header h2 {
        margin: 0 0 4px;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--sc-text-primary);
      }
      .subtitle {
        color: var(--sc-text-secondary);
        font-size: 0.88rem;
      }

      .settings-section {
        background: var(--sc-card-bg, #fff);
        border: 1px solid var(--sc-border, #e2e8f0);
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 20px;
      }

      .section-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 20px;
      }
      .section-header i {
        font-size: 1.2rem;
        color: var(--sc-orange, #f97316);
      }
      .section-header h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--sc-text-primary);
      }

      .settings-grid {
        display: flex;
        flex-direction: column;
        gap: 0;
      }

      .setting-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 0;
        border-bottom: 1px solid var(--sc-border, #e2e8f0);
        gap: 24px;
      }
      .setting-row:last-child {
        border-bottom: none;
      }

      .setting-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
      }
      .setting-info strong {
        font-size: 0.9rem;
        color: var(--sc-text-primary, #0f172a);
      }
      .setting-info span {
        font-size: 0.8rem;
        color: var(--sc-text-secondary, #64748b);
      }

      /* Toggle switch */
      .toggle {
        position: relative;
        display: inline-block;
        width: 48px;
        height: 26px;
        flex-shrink: 0;
      }
      .toggle input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .toggle-slider {
        position: absolute;
        cursor: pointer;
        inset: 0;
        background: #cbd5e1;
        border-radius: 26px;
        transition: 0.2s;
      }
      .toggle-slider::before {
        content: '';
        position: absolute;
        height: 20px;
        width: 20px;
        left: 3px;
        bottom: 3px;
        background: white;
        border-radius: 50%;
        transition: 0.2s;
      }
      .toggle input:checked + .toggle-slider {
        background: #f97316;
      }
      .toggle input:checked + .toggle-slider::before {
        transform: translateX(22px);
      }

      .api-key-display {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }
      .api-key-display code {
        font-size: 0.82rem;
        background: var(--sc-gray-1, #f8f9fc);
        padding: 4px 10px;
        border-radius: 6px;
        font-family: var(--sc-font-mono, monospace);
        color: var(--sc-text-primary);
      }

      .settings-footer {
        display: flex;
        align-items: center;
        gap: 16px;
        padding-top: 8px;
      }
      .save-hint {
        font-size: 0.85rem;
        color: var(--sc-success-3, #10b981);
        font-weight: 600;
        animation: fadeIn 0.2s ease;
      }

      :host ::ng-deep .setting-select {
        min-width: 180px;
      }
      :host ::ng-deep .setting-number {
        width: 120px;
      }

      @media (max-width: 640px) {
        .setting-row {
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
        }
      }
    `,
  ],
})
export class SettingsPage {
  // Notifications
  smsHosAlerts = true;
  emailPayrollExports = true;
  pushNotifications = false;

  // Payroll
  exportFormats = [
    { label: 'QuickBooks', value: 'QUICKBOOKS' },
    { label: 'ADP', value: 'ADP' },
    { label: 'Gusto', value: 'GUSTO' },
    { label: 'CSV', value: 'CSV' },
  ];
  defaultExportFormat = 'QUICKBOOKS';

  payPeriodTypes = [
    { label: 'Weekly', value: 'weekly' },
    { label: 'Biweekly', value: 'biweekly' },
    { label: 'Semi-Monthly', value: 'semi-monthly' },
  ];
  payPeriodType = 'semi-monthly';

  otThreshold = 40;

  // Integrations
  kimaiStatus = 'Connected';
  timetrexStatus = 'Mock Mode';
  quickbooksStatus = 'Not Connected';

  // API Key
  apiKey = 'sk-sc-demo-2026-xK9mP2vL8nQ4';
  showApiKey = false;

  saved = false;

  copyApiKey(): void {
    navigator.clipboard.writeText(this.apiKey);
  }

  saveSettings(): void {
    this.saved = true;
    setTimeout(() => (this.saved = false), 2000);
  }
}
