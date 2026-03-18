import { Component, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { PanelModule } from 'primeng/panel';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';

interface QueryResult {
  sql: string;
  explanation: string;
  chartType: 'bar' | 'table' | 'number';
  chartOptions?: Record<string, unknown>;
  tableData?: Record<string, unknown>[];
  tableCols?: { field: string; header: string }[];
  kpiValue?: string;
  kpiLabel?: string;
}

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TableModule,
    PanelModule,
    NgxEchartsDirective,
  ],
  providers: [provideEchartsCore({ echarts: () => import('echarts') })],
  selector: 'app-nlq',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="nlq">
      <div class="nlq-header">
        <h2>Natural Language Query</h2>
        <p class="header-subtitle">Ask questions about your workforce in plain English</p>
      </div>

      <!-- ═══════ INPUT AREA ═══════ -->
      <div class="query-section">
        <div class="query-input-row">
          <input
            type="text"
            pInputText
            class="query-input"
            [(ngModel)]="queryText"
            placeholder="Ask about your workforce... e.g., 'Which routes cost us the most in overtime?'"
            (keydown.enter)="submitQuery()"
          />
          <button
            pButton
            label="Ask"
            icon="pi pi-send"
            [loading]="loading()"
            (click)="submitQuery()"
            class="p-button-primary ask-btn"
          ></button>
        </div>

        <!-- Suggested Queries -->
        <div class="suggestions">
          <span class="suggestions-label">Try asking:</span>
          <div class="suggestion-chips">
            @for (q of suggestedQueries; track q) {
              <button
                pButton
                class="p-button-outlined p-button-sm p-button-secondary suggestion-chip"
                [label]="q"
                (click)="selectSuggestion(q)"
              ></button>
            }
          </div>
        </div>
      </div>

      <!-- ═══════ RESULTS ═══════ -->
      @if (loading()) {
        <div class="thinking-state">
          <div class="thinking-dots">
            <span></span><span></span><span></span>
          </div>
          <p>Analyzing your question...</p>
        </div>
      }

      @if (result() && !loading()) {
        <div class="results-section">
          <!-- SQL Display -->
          <p-panel header="Generated SQL" [toggleable]="true" [collapsed]="true" styleClass="sql-panel">
            <pre class="sql-block">{{ result()!.sql }}</pre>
          </p-panel>

          <!-- Explanation -->
          <div class="explanation">
            <i class="pi pi-info-circle"></i>
            <p>{{ result()!.explanation }}</p>
          </div>

          <!-- Chart / Table / KPI -->
          @switch (result()!.chartType) {
            @case ('bar') {
              <div class="chart-container">
                <div echarts [options]="chartOptions()" style="height: 350px;"></div>
              </div>
            }
            @case ('table') {
              <div class="table-container">
                <p-table
                  [value]="result()!.tableData ?? []"
                  [tableStyle]="{ 'min-width': '40rem' }"
                  styleClass="p-datatable-sm p-datatable-striped p-datatable-gridlines"
                >
                  <ng-template pTemplate="header">
                    <tr>
                      @for (col of result()!.tableCols ?? []; track col.field) {
                        <th>{{ col.header }}</th>
                      }
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-row>
                    <tr>
                      @for (col of result()!.tableCols ?? []; track col.field) {
                        <td>{{ row[col.field] }}</td>
                      }
                    </tr>
                  </ng-template>
                </p-table>
              </div>
            }
            @case ('number') {
              <div class="kpi-display">
                <span class="kpi-big-value">{{ result()!.kpiValue }}</span>
                <span class="kpi-big-label">{{ result()!.kpiLabel }}</span>
              </div>
            }
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .nlq {
      max-width: 1200px;
      margin: 0 auto;
    }

    .nlq-header {
      margin-bottom: var(--sc-space-5);
    }

    .nlq-header h2 {
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

    /* ── Query Input ── */
    .query-section {
      background: var(--sc-card-bg);
      border-radius: var(--sc-radius-lg);
      border: 1px solid var(--sc-border);
      padding: var(--sc-space-5);
      margin-bottom: var(--sc-space-5);
    }

    .query-input-row {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }

    .query-input {
      flex: 1;
      font-size: 1rem;
      padding: 12px 16px;
    }

    .ask-btn {
      flex-shrink: 0;
      padding-left: 24px;
      padding-right: 24px;
    }

    .suggestions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .suggestions-label {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--sc-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .suggestion-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .suggestion-chip {
      font-size: 0.8rem !important;
      white-space: nowrap;
    }

    /* ── Thinking State ── */
    .thinking-state {
      text-align: center;
      padding: 48px 20px;
      background: var(--sc-card-bg);
      border-radius: var(--sc-radius-lg);
      border: 1px solid var(--sc-border);
      margin-bottom: var(--sc-space-5);
    }

    .thinking-state p {
      color: var(--sc-text-secondary);
      font-size: 0.95rem;
      margin: 12px 0 0;
    }

    .thinking-dots {
      display: flex;
      justify-content: center;
      gap: 6px;
    }

    .thinking-dots span {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--sc-orange);
      animation: dotPulse 1.4s ease-in-out infinite;
    }

    .thinking-dots span:nth-child(2) {
      animation-delay: 0.2s;
    }

    .thinking-dots span:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes dotPulse {
      0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
      40% { opacity: 1; transform: scale(1); }
    }

    /* ── Results ── */
    .results-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .sql-block {
      background: #1e293b;
      color: #e2e8f0;
      padding: 16px;
      border-radius: 8px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 0.82rem;
      line-height: 1.6;
      overflow-x: auto;
      white-space: pre-wrap;
      margin: 0;
    }

    .explanation {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: var(--sc-info-1);
      border-radius: 10px;
      padding: 14px 18px;
      border: 1px solid var(--sc-info-2);
    }

    .explanation i {
      color: var(--sc-info-3);
      font-size: 1.1rem;
      margin-top: 2px;
      flex-shrink: 0;
    }

    .explanation p {
      margin: 0;
      font-size: 0.9rem;
      color: var(--sc-info-4);
      line-height: 1.5;
    }

    .chart-container, .table-container {
      background: var(--sc-card-bg);
      border-radius: var(--sc-radius-lg);
      border: 1px solid var(--sc-border);
      padding: var(--sc-space-5);
    }

    .kpi-display {
      background: var(--sc-card-bg);
      border-radius: var(--sc-radius-lg);
      border: 1px solid var(--sc-border);
      padding: 48px 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .kpi-big-value {
      font-size: 3.5rem;
      font-weight: 800;
      color: var(--sc-text-primary);
      line-height: 1.1;
    }

    .kpi-big-label {
      font-size: 1rem;
      color: var(--sc-text-secondary);
      font-weight: 500;
    }

    :host-context(body.dark-mode) .sql-block {
      background: #0f172a;
      color: #e5e7eb;
      border: 1px solid var(--sc-border);
    }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .query-input-row {
        flex-direction: column;
      }

      .suggestion-chips {
        flex-direction: column;
      }
    }
  `],
})
export class NlqPage {
  queryText = '';
  loading = signal(false);
  result = signal<QueryResult | null>(null);

  chartOptions = computed(() => {
    const r = this.result();
    if (r?.chartType === 'bar' && r.chartOptions) {
      return r.chartOptions;
    }
    return {};
  });

  suggestedQueries = [
    'Which drivers are approaching overtime this week?',
    "What's our labor cost per route this month?",
    'Show me clock-in times for the past 2 weeks',
    'Who has the most overtime hours this quarter?',
    'Flag anyone who clocked in before 4 AM this week',
  ];

  private hardcodedResults: Record<string, QueryResult> = {
    "What's our labor cost per route this month?": {
      sql: `SELECT r.route_name,
       COUNT(DISTINCT e.id) AS drivers,
       ROUND(SUM(ts.regular_hours), 1) AS reg_hours,
       ROUND(SUM(ts.ot_hours), 1) AS ot_hours,
       ROUND(SUM(ts.regular_hours * e.hourly_rate)
           + SUM(ts.ot_hours * e.hourly_rate * 1.5), 2) AS total_cost
FROM timesheets ts
JOIN employees e ON ts.employee_id = e.id
JOIN routes r ON ts.route_id = r.id
WHERE ts.period_start >= '2026-03-01'
GROUP BY r.route_name
ORDER BY total_cost DESC;`,
      explanation:
        'This breaks down your total labor cost by route for March 2026, including both regular and overtime pay. The Northgate Industrial route is your most expensive at $14,200, driven largely by overtime hours.',
      chartType: 'bar',
      chartOptions: {
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: ['Northgate Industrial', 'Westside Residential', 'Downtown Core', 'Eastpark Commercial', 'Southbay Mixed'],
          axisLabel: { rotate: 20, fontSize: 11 },
        },
        yAxis: {
          type: 'value',
          axisLabel: { formatter: '${value}' },
        },
        series: [
          {
            name: 'Regular Pay',
            type: 'bar',
            stack: 'cost',
            data: [9800, 8400, 7200, 6800, 5900],
            itemStyle: { color: '#4f8cff' },
          },
          {
            name: 'OT Pay',
            type: 'bar',
            stack: 'cost',
            data: [4400, 2100, 1800, 2600, 1100],
            itemStyle: { color: '#f59e0b' },
          },
        ],
        legend: { data: ['Regular Pay', 'OT Pay'], bottom: 0 },
        grid: { left: 60, right: 20, bottom: 60, top: 20 },
      },
    },
    'Who has the most overtime hours this quarter?': {
      sql: `SELECT e.full_name,
       e.department,
       ROUND(SUM(ts.ot_hours), 1) AS total_ot_hours,
       ROUND(SUM(ts.ot_hours * e.hourly_rate * 1.5), 2) AS ot_cost
FROM timesheets ts
JOIN employees e ON ts.employee_id = e.id
WHERE ts.period_start >= '2026-01-01'
GROUP BY e.id, e.full_name, e.department
ORDER BY total_ot_hours DESC
LIMIT 10;`,
      explanation:
        'James Okafor leads overtime this quarter with 62.5 hours, costing $2,812 in OT pay alone. The top 5 drivers account for 68% of all overtime hours. Consider rebalancing route assignments.',
      chartType: 'table',
      tableData: [
        { name: 'James Okafor', dept: 'Field Ops', otHours: '62.5', otCost: '$2,812' },
        { name: 'Marcus Rivera', dept: 'Field Ops', otHours: '48.2', otCost: '$2,169' },
        { name: 'Lisa Tran', dept: 'Field Ops', otHours: '41.0', otCost: '$1,722' },
        { name: 'Derek Washington', dept: 'Field Ops', otHours: '38.7', otCost: '$1,548' },
        { name: 'Ahmed Hassan', dept: 'Field Ops', otHours: '35.1', otCost: '$1,404' },
        { name: 'Sarah Chen', dept: 'Field Ops', otHours: '28.4', otCost: '$1,136' },
        { name: 'Tom Bradley', dept: 'Logistics', otHours: '22.8', otCost: '$912' },
        { name: 'Maria Gonzalez', dept: 'Field Ops', otHours: '19.5', otCost: '$780' },
        { name: 'Kevin Park', dept: 'Field Ops', otHours: '15.2', otCost: '$608' },
        { name: 'Rachel Adams', dept: 'Logistics', otHours: '12.0', otCost: '$480' },
      ],
      tableCols: [
        { field: 'name', header: 'Employee' },
        { field: 'dept', header: 'Department' },
        { field: 'otHours', header: 'OT Hours' },
        { field: 'otCost', header: 'OT Cost' },
      ],
    },
    'Which drivers are approaching overtime this week?': {
      sql: `SELECT e.full_name,
       ROUND(SUM(ts.total_hours), 1) AS hours_this_week,
       COUNT(DISTINCT ts.work_date) AS shifts_this_week,
       ROUND(40.0 - SUM(ts.total_hours), 1) AS hours_until_ot
FROM timesheets ts
JOIN employees e ON ts.employee_id = e.id
WHERE ts.work_date >= DATE_TRUNC('week', CURRENT_DATE)
GROUP BY e.id, e.full_name
HAVING SUM(ts.total_hours) >= 36
ORDER BY hours_this_week DESC;`,
      explanation:
        '4 drivers are approaching overtime this week. The table shows each driver, total weekly hours, number of shifts worked, hours remaining until overtime, and whether the next shift is likely to push them over 40 hours.',
      chartType: 'table',
      tableData: [
        {
          name: 'James Okafor',
          weeklyHours: '39.2',
          shifts: '5',
          avgShift: '7.8',
          hoursUntilOt: '0.8',
          nextShiftRisk: 'Will hit OT next shift',
        },
        {
          name: 'Marcus Rivera',
          weeklyHours: '38.1',
          shifts: '5',
          avgShift: '7.6',
          hoursUntilOt: '1.9',
          nextShiftRisk: 'High risk',
        },
        {
          name: 'Lisa Tran',
          weeklyHours: '37.4',
          shifts: '5',
          avgShift: '7.5',
          hoursUntilOt: '2.6',
          nextShiftRisk: 'High risk',
        },
        {
          name: 'Derek Washington',
          weeklyHours: '36.6',
          shifts: '4',
          avgShift: '9.2',
          hoursUntilOt: '3.4',
          nextShiftRisk: 'Monitor next assignment',
        },
      ],
      tableCols: [
        { field: 'name', header: 'Driver' },
        { field: 'weeklyHours', header: 'Hours This Week' },
        { field: 'shifts', header: 'Shifts' },
        { field: 'avgShift', header: 'Avg Shift Hours' },
        { field: 'hoursUntilOt', header: 'Hours Until OT' },
        { field: 'nextShiftRisk', header: 'Next Shift Risk' },
      ],
    },
  };

  selectSuggestion(query: string): void {
    this.queryText = query;
    this.submitQuery();
  }

  submitQuery(): void {
    const q = this.queryText.trim();
    if (!q || this.loading()) return;

    this.loading.set(true);
    this.result.set(null);

    const matched = this.hardcodedResults[q];
    const delay = matched ? 1200 : 2000;

    setTimeout(() => {
      if (matched) {
        this.result.set(matched);
      } else {
        this.result.set(this.buildGenericResult(q));
      }
      this.loading.set(false);
    }, delay);
  }

  private buildGenericResult(query: string): QueryResult {
    return {
      sql: `-- AI-generated query for: "${query}"
SELECT e.full_name,
       e.department,
       COUNT(*) AS record_count,
       ROUND(SUM(ts.total_hours), 1) AS total_hours,
       ROUND(AVG(ts.total_hours), 1) AS avg_hours
FROM timesheets ts
JOIN employees e ON ts.employee_id = e.id
WHERE ts.period_start >= '2026-03-01'
GROUP BY e.id, e.full_name, e.department
ORDER BY total_hours DESC
LIMIT 10;`,
      explanation:
        'Here are the top 10 employees by total hours for the current period. You can refine your question to get more specific results.',
      chartType: 'table',
      tableData: [
        { name: 'James Okafor', dept: 'Field Ops', records: '12', totalHrs: '98.5', avgHrs: '8.2' },
        { name: 'Marcus Rivera', dept: 'Field Ops', records: '11', totalHrs: '92.0', avgHrs: '8.4' },
        { name: 'Lisa Tran', dept: 'Field Ops', records: '12', totalHrs: '89.5', avgHrs: '7.5' },
        { name: 'Derek Washington', dept: 'Field Ops', records: '10', totalHrs: '86.2', avgHrs: '8.6' },
        { name: 'Sarah Chen', dept: 'Field Ops', records: '11', totalHrs: '84.0', avgHrs: '7.6' },
        { name: 'Ahmed Hassan', dept: 'Field Ops', records: '12', totalHrs: '82.8', avgHrs: '6.9' },
        { name: 'Tom Bradley', dept: 'Logistics', records: '10', totalHrs: '78.4', avgHrs: '7.8' },
        { name: 'Maria Gonzalez', dept: 'Field Ops', records: '11', totalHrs: '76.0', avgHrs: '6.9' },
        { name: 'Kevin Park', dept: 'Field Ops', records: '10', totalHrs: '74.5', avgHrs: '7.5' },
        { name: 'Rachel Adams', dept: 'Logistics', records: '9', totalHrs: '71.2', avgHrs: '7.9' },
      ],
      tableCols: [
        { field: 'name', header: 'Employee' },
        { field: 'dept', header: 'Department' },
        { field: 'records', header: 'Records' },
        { field: 'totalHrs', header: 'Total Hours' },
        { field: 'avgHrs', header: 'Avg Hours' },
      ],
    };
  }
}
