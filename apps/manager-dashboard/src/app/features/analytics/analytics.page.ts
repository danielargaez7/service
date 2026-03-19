import { Component, ChangeDetectionStrategy, OnInit, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import type { EChartsCoreOption } from 'echarts/core';
import { environment } from '../../../environments/environment';

interface AnalyticsSummary {
  totalLaborCost: number;
  totalOTCost: number;
  avgHoursPerEmployee: number;
  otEmployeeCount: number;
  totalEmployees: number;
  totalHours: number;
  totalRegularHours: number;
  totalOTHours: number;
}

interface CostByJob {
  jobType: string;
  regularPay: number;
  overtimePay: number;
  totalHours: number;
}

interface OTRanking {
  employeeId: string;
  employeeName: string;
  otHours: number;
  avgRate: number;
}

interface Insight {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  employeeName?: string;
  metric?: number;
}

@Component({
  standalone: true,
  imports: [CommonModule, CardModule, TagModule, NgxEchartsDirective],
  providers: [
    provideEchartsCore({ echarts: () => import('echarts') }),
  ],
  selector: 'app-analytics',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="analytics">
      <div class="analytics-header">
        <div>
          <h2>Labor Cost Analytics</h2>
          <p class="header-subtitle">Overtime trends, cost breakdown, and workforce insights — powered by real data</p>
        </div>
        <div class="period-selector">
          @for (period of periods; track period.value) {
            <button
              class="period-btn"
              [class.active]="selectedPeriod() === period.value"
              (click)="selectPeriod(period.value)">
              {{ period.label }}
            </button>
          }
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-strip">
        <div class="summary-card">
          <span class="summary-value">\${{ summary()?.totalLaborCost?.toLocaleString() ?? '—' }}</span>
          <span class="summary-label">Total Labor Cost</span>
        </div>
        <div class="summary-card">
          <span class="summary-value summary-warn">\${{ summary()?.totalOTCost?.toLocaleString() ?? '—' }}</span>
          <span class="summary-label">Overtime Cost</span>
        </div>
        <div class="summary-card">
          <span class="summary-value">{{ summary()?.avgHoursPerEmployee ?? '—' }}h</span>
          <span class="summary-label">Avg Hours / Employee</span>
        </div>
        <div class="summary-card">
          <span class="summary-value">{{ summary()?.totalEmployees ?? '—' }}</span>
          <span class="summary-label">Active Employees</span>
        </div>
      </div>

      <!-- AI Insights Panel -->
      @if (insights().length > 0) {
        <div class="insights-panel">
          <div class="insights-header">
            <h3><i class="pi pi-lightbulb"></i> AI Insights</h3>
            <span class="insights-badge">{{ insights().length }} insights generated from your data</span>
          </div>
          <div class="insights-list">
            @for (insight of insights(); track insight.title) {
              <div class="insight-card" [class]="'insight-' + insight.severity">
                <div class="insight-icon">
                  @if (insight.severity === 'critical') { <i class="pi pi-exclamation-triangle"></i> }
                  @else if (insight.severity === 'warning') { <i class="pi pi-exclamation-circle"></i> }
                  @else { <i class="pi pi-info-circle"></i> }
                </div>
                <div class="insight-content">
                  <strong>{{ insight.title }}</strong>
                  <p>{{ insight.message }}</p>
                </div>
                <p-tag [value]="insight.type.replace('_', ' ')" [severity]="insightSeverity(insight.severity)" />
              </div>
            }
          </div>
        </div>
      }

      <!-- Charts Grid -->
      <div class="charts-grid">
        <!-- Labor Cost by Job Type -->
        <p-card class="chart-card chart-wide" [style]="{ overflow: 'hidden' }">
          <ng-template pTemplate="header">
            <div class="chart-header">
              <h3>Labor Cost by Job Type</h3>
              <span class="chart-badge">Regular vs Overtime</span>
            </div>
          </ng-template>
          <div echarts [options]="laborCostOptions()" class="chart-container"></div>
        </p-card>

        <!-- Top OT Employees -->
        <p-card class="chart-card" [style]="{ overflow: 'hidden' }">
          <ng-template pTemplate="header">
            <div class="chart-header">
              <h3>Top Overtime Employees</h3>
              <span class="chart-badge badge-warn">Review Required</span>
            </div>
          </ng-template>
          <div echarts [options]="topOtOptions()" class="chart-container"></div>
        </p-card>

        <!-- Hours Distribution -->
        <p-card class="chart-card" [style]="{ overflow: 'hidden' }">
          <ng-template pTemplate="header">
            <div class="chart-header">
              <h3>Hours Distribution</h3>
              <span class="chart-badge">Regular vs OT</span>
            </div>
          </ng-template>
          <div echarts [options]="hoursDonutOptions()" class="chart-container"></div>
        </p-card>
      </div>
    </div>
  `,
  styles: [`
    .analytics { max-width: 1400px; margin: 0 auto; }

    .analytics-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: var(--sc-space-5); gap: 16px; flex-wrap: wrap;
    }
    .analytics-header h2 { font-size: var(--sc-text-2xl); font-weight: 700; color: var(--sc-text-primary); margin: 0 0 4px; }
    .header-subtitle { color: var(--sc-text-secondary); font-size: var(--sc-text-sm); margin: 0; }

    .period-selector { display: flex; gap: 4px; background: var(--sc-gray-1); border-radius: var(--sc-radius-md); padding: 4px; }
    .period-btn {
      padding: 8px 16px; border: none; border-radius: var(--sc-radius-sm);
      font-size: 0.8rem; font-weight: 600; cursor: pointer;
      background: transparent; color: var(--sc-text-secondary); transition: all 0.15s ease; font-family: inherit;
    }
    .period-btn:hover { color: var(--sc-text-primary); }
    .period-btn.active { background: var(--sc-card-bg); color: var(--sc-orange); box-shadow: 0 1px 4px rgba(0,0,0,0.08); }

    .summary-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sc-space-4); margin-bottom: var(--sc-space-5); }
    .summary-card {
      background: var(--sc-card-bg); border-radius: var(--sc-radius-lg); padding: 16px 20px;
      border: 1px solid var(--sc-border); display: flex; flex-direction: column; gap: 4px;
    }
    .summary-value { font-size: 1.4rem; font-weight: 800; color: var(--sc-text-primary); }
    .summary-warn { color: var(--sc-danger-4); }
    .summary-label { font-size: 0.78rem; color: var(--sc-text-secondary); font-weight: 500; }

    /* Insights Panel */
    .insights-panel {
      background: var(--sc-card-bg); border: 1px solid var(--sc-border);
      border-radius: var(--sc-radius-lg); padding: 20px 24px; margin-bottom: var(--sc-space-5);
    }
    .insights-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .insights-header h3 {
      margin: 0; font-size: 1rem; font-weight: 700; color: var(--sc-text-primary);
      display: flex; align-items: center; gap: 8px;
    }
    .insights-header h3 i { color: #f59e0b; }
    .insights-badge { font-size: 0.72rem; color: var(--sc-text-secondary); font-weight: 500; }
    .insights-list { display: flex; flex-direction: column; gap: 10px; }
    .insight-card {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 14px 16px; border-radius: 10px; border: 1px solid var(--sc-border);
    }
    .insight-critical { background: #fef2f2; border-color: #fecaca; }
    .insight-warning { background: #fffbeb; border-color: #fde68a; }
    .insight-info { background: #eff6ff; border-color: #bfdbfe; }
    .insight-icon { flex-shrink: 0; font-size: 1.1rem; margin-top: 2px; }
    .insight-critical .insight-icon { color: #dc2626; }
    .insight-warning .insight-icon { color: #d97706; }
    .insight-info .insight-icon { color: #2563eb; }
    .insight-content { flex: 1; min-width: 0; }
    .insight-content strong { display: block; font-size: 0.88rem; color: var(--sc-text-primary); margin-bottom: 4px; }
    .insight-content p { margin: 0; font-size: 0.82rem; color: var(--sc-text-secondary); line-height: 1.45; }

    /* Charts */
    .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sc-space-5); }
    .chart-wide { grid-column: 1 / -1; }
    :host ::ng-deep .chart-card .p-card-body { padding: 0 20px 20px; }
    :host ::ng-deep .chart-card .p-card-header { padding: 0; }
    .chart-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; border-bottom: 1px solid var(--sc-border);
    }
    .chart-header h3 { font-size: 0.95rem; font-weight: 700; color: var(--sc-text-primary); margin: 0; }
    .chart-badge { font-size: 0.7rem; font-weight: 600; padding: 3px 10px; border-radius: 20px; background: var(--sc-info-1); color: var(--sc-info-4); }
    .chart-badge.badge-warn { background: var(--sc-warning-1); color: var(--sc-warning-4); }
    .chart-container { height: 360px; width: 100%; }

    @media (max-width: 1024px) {
      .charts-grid { grid-template-columns: 1fr; }
      .summary-strip { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 640px) {
      .summary-strip { grid-template-columns: 1fr; }
      .analytics-header { flex-direction: column; }
      .chart-container { height: 300px; }
    }
  `],
})
export class AnalyticsPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  readonly selectedPeriod = signal('month');
  readonly summary = signal<AnalyticsSummary | null>(null);
  readonly costByJob = signal<CostByJob[]>([]);
  readonly topOT = signal<OTRanking[]>([]);
  readonly insights = signal<Insight[]>([]);

  periods = [
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'This Quarter', value: 'quarter' },
  ];

  // Reactive chart options that update when data changes
  readonly laborCostOptions = signal<EChartsCoreOption>({});
  readonly topOtOptions = signal<EChartsCoreOption>({});
  readonly hoursDonutOptions = signal<EChartsCoreOption>({});

  constructor() {
    // Update charts when data changes
    effect(() => {
      const jobs = this.costByJob();
      if (jobs.length > 0) this.buildLaborCostChart(jobs);
    });
    effect(() => {
      const ot = this.topOT();
      if (ot.length > 0) this.buildTopOTChart(ot);
    });
    effect(() => {
      const s = this.summary();
      if (s) this.buildDonutChart(s);
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  selectPeriod(period: string): void {
    this.selectedPeriod.set(period);
    this.loadData();
  }

  insightSeverity(severity: string): 'danger' | 'warn' | 'info' {
    return severity === 'critical' ? 'danger' : severity === 'warning' ? 'warn' : 'info';
  }

  private loadData(): void {
    const { start, end } = this.getPeriodDates();
    const params = { periodStart: start, periodEnd: end };

    this.http.get<AnalyticsSummary>(`${this.apiUrl}/api/analytics/summary`, { params }).subscribe({
      next: (data) => this.summary.set(data),
    });

    this.http.get<{ data: CostByJob[] }>(`${this.apiUrl}/api/analytics/cost-by-job`, { params }).subscribe({
      next: (res) => this.costByJob.set(res.data),
    });

    this.http.get<{ data: OTRanking[] }>(`${this.apiUrl}/api/analytics/top-ot`, { params }).subscribe({
      next: (res) => this.topOT.set(res.data),
    });

    this.http.get<{ data: Insight[] }>(`${this.apiUrl}/api/analytics/insights`, { params }).subscribe({
      next: (res) => this.insights.set(res.data),
    });
  }

  private getPeriodDates(): { start: string; end: string } {
    const now = new Date();
    let start: Date;
    switch (this.selectedPeriod()) {
      case 'week':
        start = new Date(now);
        start.setDate(start.getDate() - start.getDay());
        break;
      case 'quarter':
        start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      default: // month
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return { start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
  }

  private buildLaborCostChart(data: CostByJob[]): void {
    const labels = data.map((d) => d.jobType.replace(/_/g, '\n').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()));
    this.laborCostOptions.set({
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#fff', borderColor: '#e2e6ed', borderWidth: 1,
        textStyle: { color: '#1e293b', fontSize: 12 },
        formatter: (params: any) => {
          const reg = params[0]; const ot = params[1];
          return `<b>${reg.name.replace('\n', ' ')}</b><br/>Regular: <b>$${reg.value.toLocaleString()}</b><br/>Overtime: <b>$${ot.value.toLocaleString()}</b><br/>Total: <b>$${(reg.value + ot.value).toLocaleString()}</b>`;
        },
      },
      legend: { data: ['Regular Pay', 'Overtime Pay'], bottom: 0, textStyle: { color: '#64748b', fontSize: 11 } },
      grid: { left: 60, right: 20, top: 20, bottom: 40 },
      xAxis: {
        type: 'category', data: labels,
        axisLine: { lineStyle: { color: '#e2e6ed' } },
        axisLabel: { color: '#64748b', fontSize: 10, interval: 0 },
      },
      yAxis: {
        type: 'value', axisLine: { show: false },
        axisLabel: { color: '#64748b', fontSize: 11, formatter: '${value}' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      series: [
        { name: 'Regular Pay', type: 'bar', stack: 'cost', data: data.map((d) => d.regularPay), itemStyle: { color: '#4f8cff' }, barWidth: '50%' },
        { name: 'Overtime Pay', type: 'bar', stack: 'cost', data: data.map((d) => d.overtimePay), itemStyle: { color: '#ef4444', borderRadius: [4, 4, 0, 0] }, barWidth: '50%' },
      ],
    });
  }

  private buildTopOTChart(data: OTRanking[]): void {
    this.topOtOptions.set({
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: '#fff', borderColor: '#e2e6ed', borderWidth: 1,
        textStyle: { color: '#1e293b', fontSize: 12 },
        formatter: (params: any) => {
          const p = params[0]; const rate = data[p.dataIndex]?.avgRate ?? 28;
          return `<b>${p.name}</b><br/>OT Hours: <b>${p.value}h</b><br/>OT Rate: <b>$${(rate * 1.5).toFixed(0)}/hr</b><br/>OT Cost: <b>$${Math.round(p.value * rate * 1.5).toLocaleString()}</b>`;
        },
      },
      grid: { left: 140, right: 50, top: 10, bottom: 20 },
      xAxis: {
        type: 'value', axisLine: { show: false },
        axisLabel: { color: '#64748b', fontSize: 11, formatter: '{value}h' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      yAxis: {
        type: 'category', data: data.map((d) => d.employeeName).reverse(),
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: '#1e293b', fontSize: 12, fontWeight: 600 },
      },
      series: [{
        type: 'bar',
        data: data.map((d) => ({
          value: d.otHours,
          itemStyle: { color: d.otHours > 10 ? '#dc2626' : d.otHours > 5 ? '#ea580c' : '#f59e0b' },
        })).reverse(),
        barWidth: '60%',
        itemStyle: { borderRadius: [0, 6, 6, 0] },
        label: { show: true, position: 'right', formatter: '{c}h', color: '#64748b', fontSize: 11, fontWeight: 600 },
      }],
    });
  }

  private buildDonutChart(s: AnalyticsSummary): void {
    this.hoursDonutOptions.set({
      tooltip: { trigger: 'item', backgroundColor: '#fff', borderColor: '#e2e6ed', borderWidth: 1, textStyle: { color: '#1e293b', fontSize: 12 } },
      legend: { bottom: 0, textStyle: { color: '#64748b', fontSize: 11 } },
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 3 },
        label: { show: true, formatter: '{b}\n{d}%', fontSize: 11, color: '#475569' },
        data: [
          { value: Math.round(s.totalRegularHours), name: 'Regular Hours', itemStyle: { color: '#4f8cff' } },
          { value: Math.round(s.totalOTHours), name: 'Overtime Hours', itemStyle: { color: '#ef4444' } },
        ],
      }],
    });
  }
}
