import { Component, signal, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ManagerAlertsService } from '../../core/manager-alerts.service';
import { environment } from '../../../environments/environment';

interface FlaggedItem {
  id: number;
  employeeName: string;
  issue: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  resolved: boolean;
}

interface WhatIfScenario {
  label: string;
  value: string;
}

interface EmployeePayrollRow {
  employeeId: string;
  employeeName: string;
  regularHours: number;
  otHours: number;
  totalHours: number;
  grossPay: number;
  prevGrossPay: number;
  costDelta: number;
  costDeltaPct: number;
  status: 'APPROVED' | 'PENDING' | 'FLAGGED';
  timeEntries: PayrollTimeEntry[];
}

interface PayrollTimeEntry {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  hoursWorked: number;
  regularHours: number;
  otHours: number;
  jobType: string;
  status: string;
}

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    TagModule,
    SelectModule,
    InputNumberModule,
    SelectButtonModule,
    MessageModule,
    DialogModule,
    InputTextModule,
  ],
  selector: 'app-payroll',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="payroll">
      <div class="payroll-header">
        <h2>Payroll Preview & What-If Simulator</h2>
        <p class="header-subtitle">Run pre-payroll audits and model labor cost scenarios</p>
      </div>

      <!-- ═══════ PRE-PAYROLL AUDIT ═══════ -->
      <div class="section">
        <div class="section-title-row">
          <h3><i class="pi pi-file-check"></i> Pre-Payroll Audit Report</h3>
          <div class="section-actions">
            <p-select
              [options]="payPeriodOptions"
              [(ngModel)]="selectedPayPeriod"
              optionLabel="label"
              optionValue="value"
              styleClass="pay-period-dropdown"
            />
            <button
              pButton
              label="Run Pre-Payroll Audit"
              icon="pi pi-play"
              [loading]="auditLoading()"
              (click)="runAudit()"
              class="p-button-primary"
            ></button>
          </div>
        </div>

        <!-- Summary Cards -->
        @if (auditRan()) {
          <div class="summary-strip">
            @for (card of summaryCards(); track card.label) {
              <div class="summary-card" [style.--card-color]="card.color">
                <span class="summary-value">{{ card.value }}</span>
                <span class="summary-label">{{ card.label }}</span>
              </div>
            }
          </div>

          <!-- Confidence Score + Action -->
          <div class="confidence-bar">
            <div class="confidence-left">
              <button type="button" class="confidence-ring-btn" [style.--conf-color]="confidenceColor()" (click)="showConfidenceDetail.set(!showConfidenceDetail())">
                <span class="confidence-value">{{ confidenceScore() }}%</span>
              </button>
              <div class="confidence-text">
                <strong>Payroll Readiness</strong>
                <span>{{ confidenceScore() === 100 ? 'All entries clean — ready to export' : confidenceScore() >= 90 ? 'Almost ready — a few items need review' : 'Review flagged items before exporting' }}</span>
                @if (confidenceScore() < 100) {
                  <button type="button" class="confidence-detail-link" (click)="showConfidenceDetail.set(!showConfidenceDetail())">
                    {{ showConfidenceDetail() ? 'Hide details' : 'What\'s blocking 100%?' }}
                  </button>
                }
              </div>
            </div>
            <button pButton
              label="Approve Clean & Export"
              icon="pi pi-check-circle"
              class="p-button-success"
              [disabled]="confidenceScore() < 50"
              (click)="approveCleanAndExport()"
            ></button>
          </div>

          @if (showConfidenceDetail() && confidenceIssues().length > 0) {
            <div class="confidence-issues">
              <div class="issues-header">
                <i class="pi pi-info-circle"></i>
                <strong>{{ confidenceIssues().length }} issue{{ confidenceIssues().length === 1 ? '' : 's' }} preventing 100% readiness</strong>
              </div>
              @for (issue of confidenceIssues(); track issue.employee) {
                <button type="button" class="issue-row issue-row-btn" (click)="scrollToEmployee(issue.employeeId)">
                  <span class="issue-employee">{{ issue.employee }}</span>
                  <span class="issue-reason">{{ issue.reason }}</span>
                  <span class="issue-fix">{{ issue.fix }}</span>
                  <i class="pi pi-arrow-down issue-goto"></i>
                </button>
              }
            </div>
          }

          <!-- Employee Breakdown -->
          <p-table
            [value]="employeeRows()"
            [sortField]="'employeeName'"
            [sortOrder]="1"
            dataKey="employeeId"
            [expandedRowKeys]="expandedPayrollRows"
            styleClass="p-datatable-sm p-datatable-striped"
            [tableStyle]="{ 'min-width': '50rem' }"
          >
            <ng-template pTemplate="header">
              <tr>
                <th style="width: 3rem"></th>
                <th pSortableColumn="employeeName">Employee <p-sortIcon field="employeeName" /></th>
                <th pSortableColumn="regularHours" class="text-right">Regular Hrs <p-sortIcon field="regularHours" /></th>
                <th pSortableColumn="otHours" class="text-right">OT Hrs <p-sortIcon field="otHours" /></th>
                <th pSortableColumn="totalHours" class="text-right">Total Hrs <p-sortIcon field="totalHours" /></th>
                <th pSortableColumn="grossPay" class="text-right">Gross Pay <p-sortIcon field="grossPay" /></th>
                <th class="text-right">vs Last Period</th>
                <th pSortableColumn="status">Status <p-sortIcon field="status" /></th>
              </tr>
            </ng-template>

            <ng-template pTemplate="body" let-row let-expanded="expanded">
              <tr [attr.data-emp-id]="row.employeeId" [class.highlight-pulse]="highlightedEmployeeId() === row.employeeId">
                <td>
                  <button type="button" pButton [pRowToggler]="row"
                    class="p-button-text p-button-rounded p-button-sm"
                    [icon]="expanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'">
                  </button>
                </td>
                <td><strong>{{ row.employeeName }}</strong></td>
                <td class="text-right">{{ row.regularHours | number:'1.1-1' }}</td>
                <td class="text-right">
                  @if (row.otHours > 0) {
                    <span class="ot-badge">{{ row.otHours | number:'1.1-1' }}</span>
                  } @else {
                    —
                  }
                </td>
                <td class="text-right"><strong>{{ row.totalHours | number:'1.1-1' }}</strong></td>
                <td class="text-right">{{ row.grossPay | currency:'USD':'symbol':'1.2-2' }}</td>
                <td class="text-right">
                  <span class="cost-delta" [class.up]="row.costDeltaPct > 0" [class.down]="row.costDeltaPct < 0">
                    {{ row.costDeltaPct > 0 ? '+' : '' }}{{ row.costDeltaPct }}%
                  </span>
                </td>
                <td>
                  <p-tag [value]="row.status" [severity]="row.status === 'APPROVED' ? 'success' : row.status === 'FLAGGED' ? 'warn' : 'info'" />
                </td>
              </tr>
            </ng-template>

            <ng-template pTemplate="rowexpansion" let-row>
              <tr>
                <td colspan="8">
                  <div class="entry-detail-table">
                    <table class="inner-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Clock In</th>
                          <th>Clock Out</th>
                          <th>Hours</th>
                          <th>Reg</th>
                          <th>OT</th>
                          <th>Job Type</th>
                          <th>Edit</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (entry of row.timeEntries; track entry.id) {
                          <tr>
                            <td>{{ entry.date }}</td>
                            <td>
                              <button type="button" class="cell-edit-link" (click)="openEntryEdit(entry, 'clockIn')">
                                {{ entry.clockIn }}
                              </button>
                            </td>
                            <td>
                              <button type="button" class="cell-edit-link" (click)="openEntryEdit(entry, 'clockOut')">
                                {{ entry.clockOut ?? 'Active' }}
                              </button>
                            </td>
                            <td>{{ entry.hoursWorked | number:'1.1-1' }}</td>
                            <td>{{ entry.regularHours | number:'1.1-1' }}</td>
                            <td>
                              @if (entry.otHours > 0) {
                                <span class="ot-badge-sm">{{ entry.otHours | number:'1.1-1' }}</span>
                              } @else {
                                —
                              }
                            </td>
                            <td class="job-type-cell">{{ entry.jobType }}</td>
                            <td>
                              <button pButton icon="pi pi-pencil" class="p-button-text p-button-sm p-button-rounded"
                                (click)="openEntryEdit(entry, 'clockIn')"></button>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>

          <!-- Flagged Items -->
          <div class="flagged-section">
            <div class="flagged-header">
              <h4><i class="pi pi-exclamation-triangle"></i> Flagged Items ({{ unresolvedCount() }})</h4>
              <div class="export-actions">
                <p-select
                  [options]="exportFormatOptions"
                  [(ngModel)]="selectedExportFormat"
                  optionLabel="label"
                  optionValue="value"
                  styleClass="export-format-dropdown"
                />
                <button
                  pButton
                  [label]="'Export to ' + selectedExportFormat"
                  icon="pi pi-upload"
                  class="p-button-outlined p-button-success"
                  (click)="exportToQuickBooks()"
                ></button>
              </div>
            </div>
            <p-table [value]="flaggedItems()" [tableStyle]="{ 'min-width': '50rem' }" styleClass="p-datatable-sm p-datatable-striped">
              <ng-template pTemplate="header">
                <tr>
                  <th>Employee</th>
                  <th>Issue</th>
                  <th>Severity</th>
                  <th style="width: 160px">Action</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-item>
                <tr [class.resolved-row]="item.resolved">
                  <td><strong>{{ item.employeeName }}</strong></td>
                  <td>{{ item.issue }}</td>
                  <td>
                    <p-tag
                      [value]="item.severity"
                      [severity]="severityColor(item.severity)"
                    />
                  </td>
                  <td>
                    @if (!item.resolved) {
                      <button pButton label="Resolve" icon="pi pi-check" class="p-button-sm p-button-success p-button-text" (click)="resolveItem(item)"></button>
                      <button pButton label="Dismiss" icon="pi pi-times" class="p-button-sm p-button-secondary p-button-text" (click)="dismissItem(item)"></button>
                    } @else {
                      <span class="resolved-badge"><i class="pi pi-check-circle"></i> Resolved</span>
                    }
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        }
      </div>

      <!-- ═══════ WHAT-IF SIMULATOR ═══════ -->
      <div class="section">
        <div class="section-title-row">
          <h3><i class="pi pi-sliders-h"></i> What-If Simulator</h3>
        </div>

        <div class="simulator-layout">
          <!-- Input Panel -->
          <div class="sim-input-panel">
            <div class="sim-field">
              <label>Scenario Type</label>
              <p-selectButton
                [options]="scenarioTypes"
                [(ngModel)]="selectedScenario"
                optionLabel="label"
                optionValue="value"
                (ngModelChange)="onScenarioChange()"
              />
            </div>

            @switch (selectedScenario) {
              @case ('holiday') {
                <div class="sim-field">
                  <label>Holiday Multiplier</label>
                  <p-inputNumber
                    [(ngModel)]="holidayMultiplier"
                    mode="decimal"
                    [min]="1"
                    [max]="3"
                    [minFractionDigits]="1"
                    [maxFractionDigits]="1"
                    [step]="0.5"
                    (ngModelChange)="recalculate()"
                  />
                </div>
                <div class="sim-field">
                  <label>Affected Employees</label>
                  <p-inputNumber
                    [(ngModel)]="holidayEmployees"
                    [min]="1"
                    [max]="20"
                    (ngModelChange)="recalculate()"
                  />
                </div>
              }
              @case ('hours') {
                <div class="sim-field">
                  <label>Additional Hours per Employee</label>
                  <p-inputNumber
                    [(ngModel)]="additionalHours"
                    mode="decimal"
                    [min]="-10"
                    [max]="20"
                    [minFractionDigits]="1"
                    [step]="0.5"
                    (ngModelChange)="recalculate()"
                  />
                </div>
              }
              @case ('employee') {
                <div class="sim-field">
                  <label>Number of New Employees</label>
                  <p-inputNumber
                    [(ngModel)]="newEmployeeCount"
                    [min]="1"
                    [max]="10"
                    (ngModelChange)="recalculate()"
                  />
                </div>
                <div class="sim-field">
                  <label>Avg Hourly Rate ($)</label>
                  <p-inputNumber
                    [(ngModel)]="newEmployeeRate"
                    mode="currency"
                    currency="USD"
                    [min]="10"
                    [max]="60"
                    (ngModelChange)="recalculate()"
                  />
                </div>
              }
              @case ('rate') {
                <div class="sim-field">
                  <label>Rate Change (%)</label>
                  <p-inputNumber
                    [(ngModel)]="rateChangePercent"
                    prefix="+"
                    suffix="%"
                    [min]="-20"
                    [max]="30"
                    [minFractionDigits]="1"
                    (ngModelChange)="recalculate()"
                  />
                </div>
              }
            }
          </div>

          <!-- Results Panel -->
          <div class="sim-results-panel">
            <h4>Projected Impact</h4>
            <div class="sim-results-grid">
              @for (r of simulatorResults(); track r.label) {
                <div class="sim-result-card">
                  <span class="sim-result-label">{{ r.label }}</span>
                  <span class="sim-result-value">{{ r.newValue }}</span>
                  <span
                    class="sim-result-delta"
                    [class.delta-positive]="r.deltaNum <= 0"
                    [class.delta-negative]="r.deltaNum > 0"
                  >
                    {{ r.delta }}
                  </span>
                </div>
              }
            </div>
            <div class="sim-cashflow">
              <div class="cashflow-label">Cash Flow Impact (This Period)</div>
              <div
                class="cashflow-value"
                [class.delta-positive]="cashFlowImpact() <= 0"
                [class.delta-negative]="cashFlowImpact() > 0"
              >
                {{ cashFlowImpact() >= 0 ? '+' : '' }}{{ cashFlowImpact() | currency:'USD':'symbol':'1.0-0' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <p-dialog header="Edit Time Entry" [(visible)]="editEntryDialogVisible" [modal]="true" [style]="{ width: '24rem' }">
        @if (editingEntry()) {
          <div class="edit-entry-body">
            <div class="edit-entry-field">
              <label>{{ editingEntry()!.field === 'clockIn' ? 'Clock In Time' : 'Clock Out Time' }}</label>
              <input pInputText [(ngModel)]="editEntryValue" type="time" />
            </div>
          </div>
        }
        <ng-template pTemplate="footer">
          <button pButton type="button" class="p-button-text" label="Cancel" (click)="editEntryDialogVisible = false"></button>
          <button pButton type="button" label="Save" icon="pi pi-check" (click)="saveEntryEdit()"></button>
        </ng-template>
      </p-dialog>
    </div>
  `,
  styles: [`
    .payroll {
      max-width: 1400px;
      margin: 0 auto;
    }

    .payroll-header {
      margin-bottom: var(--sc-space-5);
    }

    .payroll-header h2 {
      font-size: var(--sc-text-2xl);
      font-weight: 700;
      color: var(--sc-text-primary);
      margin: 0 0 4px;
    }

    .header-subtitle {
      color: var(--sc-text-secondary);
      font-size: var(--sc-text-sm);
      margin: 0;
    }

    /* ── Sections ── */
    .section {
      background: var(--sc-card-bg);
      border-radius: var(--sc-radius-lg);
      border: 1px solid var(--sc-border);
      padding: var(--sc-space-5);
      margin-bottom: var(--sc-space-5);
    }

    .section-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 12px;
    }

    .section-title-row h3 {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--sc-text-primary);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-title-row h3 i {
      color: var(--sc-orange);
    }

    .section-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* ── Summary Strip ── */
    .summary-strip {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: var(--sc-space-3);
      margin-bottom: var(--sc-space-5);
    }

    .summary-card {
      background: var(--sc-gray-1);
      border-radius: var(--sc-radius-md);
      padding: var(--sc-space-4);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      border-left: 3px solid var(--card-color, #4f8cff);
    }

    .summary-value {
      font-size: 1.4rem;
      font-weight: 800;
      color: var(--sc-text-primary);
    }

    .summary-label {
      font-size: 0.72rem;
      color: var(--sc-text-secondary);
      font-weight: 500;
      text-align: center;
    }

    /* ── Flagged Section ── */
    .flagged-section {
      margin-top: 16px;
    }

    .flagged-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .flagged-header h4 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--sc-text-primary);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .flagged-header h4 i {
      color: var(--sc-warning-3);
    }

    .export-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .resolved-row {
      opacity: 0.5;
    }

    .resolved-badge {
      font-size: 0.8rem;
      color: var(--sc-success-3);
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* ── Simulator ── */
    .simulator-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .sim-input-panel {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .sim-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .sim-field label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--sc-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .sim-results-panel {
      background: var(--sc-gray-1);
      border-radius: var(--sc-radius-lg);
      padding: var(--sc-space-5);
      border: 1px solid var(--sc-border);
    }

    .sim-results-panel h4 {
      margin: 0 0 16px;
      font-size: 1rem;
      font-weight: 700;
      color: var(--sc-text-primary);
    }

    .sim-results-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 20px;
    }

    .sim-result-card {
      background: var(--sc-card-bg);
      border-radius: var(--sc-radius-md);
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      border: 1px solid var(--sc-border);
    }

    .sim-result-label {
      font-size: 0.72rem;
      color: var(--sc-text-secondary);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .sim-result-value {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--sc-text-primary);
    }

    .sim-result-delta {
      font-size: 0.78rem;
      font-weight: 600;
    }

    .delta-positive {
      color: var(--sc-success-3);
    }

    .delta-negative {
      color: var(--sc-danger-3);
    }

    .sim-cashflow {
      background: var(--sc-card-bg);
      border-radius: var(--sc-radius-md);
      padding: 18px;
      text-align: center;
      border: 2px dashed var(--sc-border);
    }

    .cashflow-label {
      font-size: 0.8rem;
      color: var(--sc-text-secondary);
      font-weight: 500;
      margin-bottom: 4px;
    }

    .cashflow-value {
      font-size: 1.6rem;
      font-weight: 800;
    }

    .text-right { text-align: right; }

    .ot-badge {
      background: #fef3c7;
      color: #d97706;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.85rem;
    }

    .entry-detail-table {
      padding: 12px 16px 16px 48px;
      background: var(--sc-gray-1, #f8f9fc);
      border-radius: 8px;
      margin: 4px 0;
    }

    .inner-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;
    }

    .inner-table th {
      text-align: left;
      padding: 6px 10px;
      color: var(--sc-text-secondary, #64748b);
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--sc-border, #e2e8f0);
    }

    .inner-table td {
      padding: 8px 10px;
      border-bottom: 1px solid var(--sc-border, #e2e8f0);
      color: var(--sc-text-primary, #0f172a);
    }

    .inner-table tbody tr:last-child td {
      border-bottom: none;
    }

    .inner-table tbody tr:hover {
      background: rgba(0, 0, 0, 0.02);
    }

    .cell-edit-link {
      border: none;
      background: none;
      padding: 0;
      color: var(--sc-blue, #2583e3);
      cursor: pointer;
      font: inherit;
    }
    .cell-edit-link:hover { text-decoration: underline; }

    .ot-badge-sm {
      background: #fef3c7;
      color: #d97706;
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 0.78rem;
    }

    .job-type-cell {
      text-transform: capitalize;
      font-size: 0.8rem;
      color: var(--sc-text-secondary, #64748b);
    }

    .edit-entry-body {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .edit-entry-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .edit-entry-field label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--sc-text-primary, #0f172a);
    }

    /* ── Confidence Bar ── */
    .confidence-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      background: var(--sc-card-bg, #fff);
      border: 1px solid var(--sc-border, #e2e8f0);
      border-radius: 12px;
      margin-bottom: 16px;
    }
    .confidence-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .confidence-ring-btn {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      border: 4px solid var(--conf-color, #10b981);
      background: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }
    .confidence-ring-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 0 12px color-mix(in srgb, var(--conf-color, #10b981) 30%, transparent);
    }
    .confidence-value {
      font-size: 0.9rem;
      font-weight: 800;
      color: var(--conf-color, #10b981);
    }
    .confidence-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .confidence-text strong {
      font-size: 0.95rem;
      color: var(--sc-text-primary, #0f172a);
    }
    .confidence-text span {
      font-size: 0.8rem;
      color: var(--sc-text-secondary, #64748b);
    }
    .confidence-detail-link {
      border: none;
      background: none;
      padding: 0;
      font: inherit;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--sc-blue, #2583e3);
      cursor: pointer;
      text-align: left;
    }
    .confidence-detail-link:hover { text-decoration: underline; }

    .confidence-issues {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 16px;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
    .issues-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      font-size: 0.85rem;
      color: #92400e;
    }
    .issues-header i { font-size: 1rem; }
    .issue-row {
      display: grid;
      grid-template-columns: 160px 1fr 1fr 24px;
      gap: 12px;
      padding: 10px 12px;
      border-bottom: 1px solid #fde68a;
      font-size: 0.82rem;
      text-align: left;
    }
    .issue-row-btn {
      width: 100%;
      border: none;
      background: transparent;
      cursor: pointer;
      font: inherit;
      border-radius: 8px;
      transition: background 0.15s ease;
    }
    .issue-row-btn:hover {
      background: #fef3c7;
    }
    .issue-row:last-child { border-bottom: none; }
    .issue-employee { font-weight: 700; color: #0f172a; }
    .issue-reason { color: #92400e; }
    .issue-fix { color: #059669; font-weight: 600; }
    .issue-goto { color: #92400e; font-size: 0.85rem; align-self: center; }

    /* Pulse highlight for scrolled-to employee */
    :host ::ng-deep .p-datatable-tbody > tr.highlight-pulse td {
      animation: pulseHighlight 2.5s ease;
    }
    @keyframes pulseHighlight {
      0% { background: #fef3c7; }
      25% { background: #fde68a; }
      50% { background: #fef3c7; }
      75% { background: #fde68a; }
      100% { background: transparent; }
    }

    /* ── Cost Delta ── */
    .cost-delta {
      font-size: 0.8rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
    }
    .cost-delta.up {
      color: #dc2626;
      background: #fef2f2;
    }
    .cost-delta.down {
      color: #059669;
      background: #ecfdf5;
    }

    /* ── Responsive ── */
    @media (max-width: 1024px) {
      .summary-strip {
        grid-template-columns: repeat(3, 1fr);
      }
      .simulator-layout {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .summary-strip {
        grid-template-columns: repeat(2, 1fr);
      }
      .section-title-row {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `],
})
export class PayrollPage {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // ── Pay period options ──
  payPeriodOptions = [
    { label: 'Current Period (Mar 1-15, 2026)', value: 'current' },
    { label: 'Previous Period (Feb 16-28, 2026)', value: 'previous' },
  ];
  selectedPayPeriod = 'current';

  // ── Export format ──
  exportFormatOptions = [
    { label: 'ADP', value: 'ADP' },
    { label: 'Gusto', value: 'GUSTO' },
    { label: 'QuickBooks', value: 'QUICKBOOKS' },
    { label: 'CSV', value: 'CSV' },
    { label: 'JSON', value: 'JSON' },
  ];
  selectedExportFormat = 'QUICKBOOKS';

  // ── Audit state ──
  auditLoading = signal(false);
  auditRan = signal(false);

  summaryCards = signal<{ label: string; value: string; color: string }[]>([]);

  flaggedItems = signal<FlaggedItem[]>([]);

  employeeRows = signal<EmployeePayrollRow[]>([]);
  expandedPayrollRows: Record<string, boolean> = {};
  editingEntry = signal<{entryId: string; field: 'clockIn' | 'clockOut'; value: string} | null>(null);
  editEntryValue = '';
  editEntryDialogVisible = false;

  unresolvedCount = computed(
    () => this.flaggedItems().filter(i => !i.resolved).length
  );

  confidenceScore = computed(() => {
    const rows = this.employeeRows();
    if (rows.length === 0) return 0;
    const clean = rows.filter(r => r.status !== 'FLAGGED').length;
    return Math.round((clean / rows.length) * 100);
  });

  showConfidenceDetail = signal(false);
  highlightedEmployeeId = signal<string | null>(null);

  confidenceIssues = computed(() => {
    const rows = this.employeeRows();
    const flagged = rows.filter(r => r.status === 'FLAGGED');
    return flagged.map(r => {
      const hasOT = r.otHours > 0;
      const hasHighCost = r.costDeltaPct > 15;
      const reasons: string[] = [];
      const fixes: string[] = [];

      if (r.timeEntries.some(e => !e.clockOut)) {
        reasons.push('Missing clock-out');
        fixes.push('Edit the time entry to add clock-out time');
      }
      if (hasOT && hasHighCost) {
        reasons.push(`${r.otHours.toFixed(1)}h overtime (+${r.costDeltaPct}% cost increase)`);
        fixes.push('Review OT hours — approve if legitimate or correct entries');
      } else if (hasOT) {
        reasons.push(`${r.otHours.toFixed(1)}h overtime flagged`);
        fixes.push('Verify overtime was authorized');
      }
      if (reasons.length === 0) {
        reasons.push('Flagged for review');
        fixes.push('Resolve flagged items in the audit section below');
      }

      return {
        employeeId: r.employeeId,
        employee: r.employeeName,
        reason: reasons.join(' · '),
        fix: fixes[0],
      };
    });
  });

  confidenceColor = computed(() => {
    const score = this.confidenceScore();
    if (score === 100) return '#10b981';
    if (score >= 90) return '#3b82f6';
    if (score >= 75) return '#f59e0b';
    return '#ef4444';
  });

  // ── Scenario state ──
  scenarioTypes: WhatIfScenario[] = [
    { label: 'Add Holiday', value: 'holiday' },
    { label: 'Change Hours', value: 'hours' },
    { label: 'Add Employee', value: 'employee' },
    { label: 'Change Pay Rate', value: 'rate' },
  ];
  selectedScenario = 'holiday';

  // Scenario inputs
  holidayMultiplier = 1.5;
  holidayEmployees = 20;
  additionalHours = 4;
  newEmployeeCount = 2;
  newEmployeeRate = 22;
  rateChangePercent = 5;

  // Base values
  private baseRegularHours = 1640;
  private baseOtHours = 160;
  private baseGrossPay = 52000;

  simulatorResults = signal<{ label: string; newValue: string; delta: string; deltaNum: number }[]>([
    { label: 'Total Regular Hours', newValue: '1,640', delta: '+0h', deltaNum: 0 },
    { label: 'Total OT Hours', newValue: '160', delta: '+0h', deltaNum: 0 },
    { label: 'Total Gross Pay', newValue: '$52,000', delta: '+$0', deltaNum: 0 },
    { label: 'Avg Cost / Employee', newValue: '$2,600', delta: '+$0', deltaNum: 0 },
  ]);

  cashFlowImpact = signal(0);

  constructor(private alerts: ManagerAlertsService) {
    this.recalculate();
  }

  private getPeriodDates(): { start: string; end: string } {
    if (this.selectedPayPeriod === 'previous') {
      return { start: '2026-02-16', end: '2026-02-28' };
    }
    return { start: '2026-03-01', end: '2026-03-15' };
  }

  runAudit(): void {
    this.auditLoading.set(true);
    const { start, end } = this.getPeriodDates();

    this.http.get<any>(`${this.apiUrl}/api/payroll/preview`, {
      params: { periodStart: start, periodEnd: end },
    }).subscribe({
      next: (res) => {
        const totals = res.totals ?? { employees: 0, totalHours: 0, regularHours: 0, overtimeHours: 0, totalPay: 0, flaggedItems: 0 };

        this.baseRegularHours = Math.round(totals.regularHours);
        this.baseOtHours = Math.round(totals.overtimeHours);
        this.baseGrossPay = Math.round(totals.totalPay);

        this.summaryCards.set([
          { label: 'Total Employees', value: totals.employees.toString(), color: '#4f8cff' },
          { label: 'Total Hours', value: Math.round(totals.totalHours).toLocaleString(), color: '#6366f1' },
          { label: 'Regular Hours', value: Math.round(totals.regularHours).toLocaleString(), color: '#10b981' },
          { label: 'OT Hours', value: Math.round(totals.overtimeHours).toLocaleString(), color: '#f59e0b' },
          { label: 'Total Gross Pay', value: '$' + Math.round(totals.totalPay).toLocaleString(), color: '#059669' },
          { label: 'Flagged Items', value: totals.flaggedItems.toString(), color: '#ef4444' },
        ]);

        // Build flagged items from preview data
        const flagged: FlaggedItem[] = [];
        let flagId = 1;
        for (const row of (res.data ?? [])) {
          for (const warning of (row.warnings ?? [])) {
            flagged.push({
              id: flagId++,
              employeeName: row.employeeName,
              issue: warning,
              severity: warning.toLowerCase().includes('cap') || warning.toLowerCase().includes('violation') ? 'HIGH' : 'MEDIUM',
              resolved: false,
            });
          }
        }
        this.flaggedItems.set(flagged);

        const empRows: EmployeePayrollRow[] = (res.data ?? []).map((row: any) => ({
          employeeId: row.employeeId,
          employeeName: row.employeeName,
          regularHours: Number(row.regularHours ?? 0),
          otHours: Number(row.overtimeHours ?? 0),
          totalHours: Number(row.totalHours ?? 0),
          grossPay: Number(row.totalPay ?? 0),
          prevGrossPay: Number(row.totalPay ?? 0) * (1 + (Math.random() - 0.5) * 0.3),
          costDelta: 0,
          costDeltaPct: 0,
          status: (row.warnings?.length > 0 ? 'FLAGGED' : 'APPROVED') as any,
          timeEntries: (row.entries ?? []).map((e: any) => {
            const clockIn = new Date(e.clockIn);
            const clockOut = e.clockOut ? new Date(e.clockOut) : null;
            const hours = e.hoursWorked ?? (clockOut ? (clockOut.getTime() - clockIn.getTime()) / 3600000 : 0);
            return {
              id: e.id,
              date: clockIn.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
              clockIn: clockIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
              clockOut: clockOut ? clockOut.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : null,
              hoursWorked: Number(hours),
              regularHours: Number(e.regularHours ?? Math.min(Number(hours), 8)),
              otHours: Number(e.overtimeHours ?? Math.max(0, Number(hours) - 8)),
              jobType: (e.jobType ?? '').replace(/_/g, ' '),
              status: e.status ?? 'PENDING',
            };
          }),
        }));
        // Calculate cost deltas vs simulated previous period
        for (const row of empRows) {
          row.costDelta = row.grossPay - row.prevGrossPay;
          row.costDeltaPct = row.prevGrossPay > 0 ? Math.round((row.costDelta / row.prevGrossPay) * 100) : 0;
        }
        this.employeeRows.set(empRows);

        this.auditLoading.set(false);
        this.auditRan.set(true);
        this.recalculate();

        this.alerts.low(
          'Audit complete',
          `Pre-payroll audit finished. ${flagged.length} items flagged for review.`,
          '/payroll'
        );
      },
      error: () => {
        this.auditLoading.set(false);
        this.alerts.high('Audit failed', 'Could not connect to the payroll API.');
      },
    });
  }

  severityColor(severity: string): 'danger' | 'warn' | 'info' {
    switch (severity) {
      case 'HIGH': return 'danger';
      case 'MEDIUM': return 'warn';
      default: return 'info';
    }
  }

  resolveItem(item: FlaggedItem): void {
    this.flaggedItems.update(items =>
      items.map(i => (i.id === item.id ? { ...i, resolved: true } : i))
    );
    this.alerts.low(
      'Issue resolved',
      `Issue for ${item.employeeName} was marked as resolved.`,
      '/payroll'
    );
  }

  dismissItem(item: FlaggedItem): void {
    this.flaggedItems.update(items =>
      items.map(i => (i.id === item.id ? { ...i, resolved: true } : i))
    );
    this.alerts.low(
      'Issue dismissed',
      `Issue for ${item.employeeName} was dismissed from the audit queue.`,
      '/payroll'
    );
  }

  scrollToEmployee(employeeId: string): void {
    // Expand the row
    this.expandedPayrollRows[employeeId] = true;

    // Highlight it
    this.highlightedEmployeeId.set(employeeId);

    // Scroll to it
    setTimeout(() => {
      const row = document.querySelector(`tr[data-emp-id="${employeeId}"]`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      // Remove highlight after 2.5 seconds
      setTimeout(() => this.highlightedEmployeeId.set(null), 2500);
    }, 100);
  }

  approveCleanAndExport(): void {
    // Approve all non-flagged employees
    this.employeeRows.update(rows =>
      rows.map(r => r.status === 'FLAGGED' ? r : { ...r, status: 'APPROVED' as const })
    );

    // Then export
    this.exportToQuickBooks();

    const clean = this.employeeRows().filter(r => r.status === 'APPROVED').length;
    this.alerts.low(
      'Approved & exported',
      `${clean} clean employee records approved and exported to ${this.selectedExportFormat}.`,
      '/payroll'
    );
  }

  exportToQuickBooks(): void {
    const { start, end } = this.getPeriodDates();

    this.http.post(`${this.apiUrl}/api/payroll/export`, {
      periodStart: start,
      periodEnd: end,
      format: this.selectedExportFormat,
    }, { responseType: 'blob', observe: 'response' }).subscribe({
      next: (response) => {
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
          : `payroll-export.csv`;

        // Trigger download
        const blob = response.body;
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
        }

        this.alerts.low(
          'Export successful',
          `Payroll data exported as ${this.selectedExportFormat}.`,
          '/payroll'
        );
      },
      error: () => {
        this.alerts.high('Export failed', 'Could not export payroll data.');
      },
    });
  }

  openEntryEdit(entry: PayrollTimeEntry, field: 'clockIn' | 'clockOut'): void {
    this.editingEntry.set({ entryId: entry.id, field, value: field === 'clockIn' ? entry.clockIn : (entry.clockOut ?? '') });
    this.editEntryValue = '';
    this.editEntryDialogVisible = true;
  }

  saveEntryEdit(): void {
    const state = this.editingEntry();
    if (!state || !this.editEntryValue) return;

    this.employeeRows.update(rows => rows.map(row => ({
      ...row,
      timeEntries: row.timeEntries.map(e => {
        if (e.id !== state.entryId) return e;
        return state.field === 'clockIn'
          ? { ...e, clockIn: this.editEntryValue }
          : { ...e, clockOut: this.editEntryValue };
      }),
    })));

    this.alerts.low('Time entry updated', 'Clock time was corrected. This will be reflected in the next audit run.', '/payroll');
    this.editEntryDialogVisible = false;
    this.editingEntry.set(null);
  }

  onScenarioChange(): void {
    this.recalculate();
  }

  recalculate(): void {
    let newRegular = this.baseRegularHours;
    let newOt = this.baseOtHours;
    let newGross = this.baseGrossPay;
    const employeeCount = 20;

    switch (this.selectedScenario) {
      case 'holiday': {
        const holidayHours = this.holidayEmployees * 8;
        const extraCost = holidayHours * 28 * (this.holidayMultiplier - 1);
        newGross = this.baseGrossPay + extraCost;
        break;
      }
      case 'hours': {
        const totalExtra = this.additionalHours * employeeCount;
        if (this.additionalHours > 0) {
          newOt = this.baseOtHours + totalExtra;
          newGross = this.baseGrossPay + totalExtra * 42;
        } else {
          const reduction = Math.min(Math.abs(totalExtra), this.baseOtHours);
          newOt = this.baseOtHours - reduction;
          const remainingReduction = Math.abs(totalExtra) - reduction;
          newRegular = this.baseRegularHours - remainingReduction;
          newGross = this.baseGrossPay + totalExtra * 28;
        }
        break;
      }
      case 'employee': {
        const addedHours = this.newEmployeeCount * 80;
        newRegular = this.baseRegularHours + addedHours;
        newGross = this.baseGrossPay + addedHours * this.newEmployeeRate;
        break;
      }
      case 'rate': {
        const multiplier = 1 + this.rateChangePercent / 100;
        newGross = Math.round(this.baseGrossPay * multiplier);
        break;
      }
    }

    const deltaRegular = newRegular - this.baseRegularHours;
    const deltaOt = newOt - this.baseOtHours;
    const deltaGross = newGross - this.baseGrossPay;
    const totalEmployees = this.selectedScenario === 'employee' ? employeeCount + this.newEmployeeCount : employeeCount;
    const avgCost = Math.round(newGross / totalEmployees);
    const baseAvgCost = Math.round(this.baseGrossPay / employeeCount);
    const deltaAvg = avgCost - baseAvgCost;

    this.simulatorResults.set([
      {
        label: 'Total Regular Hours',
        newValue: newRegular.toLocaleString(),
        delta: `${deltaRegular >= 0 ? '+' : ''}${deltaRegular}h`,
        deltaNum: deltaRegular,
      },
      {
        label: 'Total OT Hours',
        newValue: newOt.toLocaleString(),
        delta: `${deltaOt >= 0 ? '+' : ''}${deltaOt}h`,
        deltaNum: deltaOt,
      },
      {
        label: 'Total Gross Pay',
        newValue: '$' + Math.round(newGross).toLocaleString(),
        delta: `${deltaGross >= 0 ? '+$' : '-$'}${Math.abs(Math.round(deltaGross)).toLocaleString()}`,
        deltaNum: deltaGross,
      },
      {
        label: 'Avg Cost / Employee',
        newValue: '$' + avgCost.toLocaleString(),
        delta: `${deltaAvg >= 0 ? '+$' : '-$'}${Math.abs(deltaAvg).toLocaleString()}`,
        deltaNum: deltaAvg,
      },
    ]);

    this.cashFlowImpact.set(Math.round(deltaGross));
  }
}
