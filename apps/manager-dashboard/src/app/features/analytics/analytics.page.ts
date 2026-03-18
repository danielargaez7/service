import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import type { EChartsCoreOption } from 'echarts/core';

@Component({
  standalone: true,
  imports: [CommonModule, CardModule, NgxEchartsDirective],
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
          <p class="header-subtitle">Overtime trends, cost breakdown, and workforce insights</p>
        </div>
        <div class="period-selector">
          @for (period of periods; track period.value) {
            <button
              class="period-btn"
              [class.active]="selectedPeriod === period.value"
              (click)="selectPeriod(period.value)">
              {{ period.label }}
            </button>
          }
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-strip">
        @for (stat of summaryStats; track stat.label) {
          <div class="summary-card">
            <span class="summary-value">{{ stat.value }}</span>
            <span class="summary-label">{{ stat.label }}</span>
            <span class="summary-change" [class.positive]="stat.positive" [class.negative]="!stat.positive">
              {{ stat.change }}
            </span>
          </div>
        }
      </div>

      <!-- Charts Grid -->
      <div class="charts-grid">
        <!-- OT Trend Chart -->
        <p-card class="chart-card chart-wide" [style]="{ overflow: 'hidden' }">
          <ng-template pTemplate="header">
            <div class="chart-header">
              <h3>Weekly Overtime Trend</h3>
              <span class="chart-badge">Last 8 Weeks</span>
            </div>
          </ng-template>
          <div echarts [options]="otTrendOptions" class="chart-container"></div>
        </p-card>

        <!-- Labor Cost by Job Type -->
        <p-card class="chart-card" [style]="{ overflow: 'hidden' }">
          <ng-template pTemplate="header">
            <div class="chart-header">
              <h3>Labor Cost by Job Type</h3>
              <span class="chart-badge">This Month</span>
            </div>
          </ng-template>
          <div echarts [options]="laborCostOptions" class="chart-container"></div>
        </p-card>

        <!-- Top 5 OT Employees -->
        <p-card class="chart-card" [style]="{ overflow: 'hidden' }">
          <ng-template pTemplate="header">
            <div class="chart-header">
              <h3>Top 5 OT Employees</h3>
              <span class="chart-badge badge-warn">Action Needed</span>
            </div>
          </ng-template>
          <div echarts [options]="topOtOptions" class="chart-container"></div>
        </p-card>
      </div>
    </div>
  `,
  styles: [`
    .analytics {
      max-width: 1400px;
      margin: 0 auto;
    }

    .analytics-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: var(--sc-space-5);
      gap: 16px;
      flex-wrap: wrap;
    }

    .analytics-header h2 {
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

    .period-selector {
      display: flex;
      gap: 4px;
      background: var(--sc-gray-1);
      border-radius: var(--sc-radius-md);
      padding: 4px;
    }

    .period-btn {
      padding: 8px 16px;
      border: none;
      border-radius: var(--sc-radius-sm);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      background: transparent;
      color: var(--sc-text-secondary);
      transition: all 0.15s ease;
    }

    .period-btn:hover {
      color: var(--sc-text-primary);
    }

    .period-btn.active {
      background: var(--sc-card-bg);
      color: var(--sc-orange);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }

    /* -- Summary Strip -- */
    .summary-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--sc-space-4);
      margin-bottom: var(--sc-space-5);
    }

    .summary-card {
      background: var(--sc-card-bg);
      border-radius: var(--sc-radius-lg);
      padding: 18px 20px;
      border: 1px solid var(--sc-border);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .summary-value {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--sc-text-primary);
    }

    .summary-label {
      font-size: 0.8rem;
      color: var(--sc-text-secondary);
      font-weight: 500;
    }

    .summary-change {
      font-size: 0.75rem;
      font-weight: 600;
    }

    .summary-change.positive {
      color: var(--sc-success-3);
    }

    .summary-change.negative {
      color: var(--sc-danger-3);
    }

    /* -- Charts Grid -- */
    .charts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--sc-space-5);
    }

    .chart-wide {
      grid-column: 1 / -1;
    }

    :host ::ng-deep .chart-card .p-card-body {
      padding: 0 20px 20px;
    }

    :host ::ng-deep .chart-card .p-card-header {
      padding: 0;
    }

    .chart-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--sc-border);
    }

    .chart-header h3 {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--sc-text-primary);
      margin: 0;
    }

    .chart-badge {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 20px;
      background: var(--sc-info-1);
      color: var(--sc-info-4);
    }

    .chart-badge.badge-warn {
      background: var(--sc-warning-1);
      color: var(--sc-warning-4);
    }

    .chart-container {
      height: 380px;
      width: 100%;
    }

    /* -- Responsive -- */
    @media (max-width: 1024px) {
      .charts-grid {
        grid-template-columns: 1fr;
      }

      .summary-strip {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 640px) {
      .summary-strip {
        grid-template-columns: 1fr;
      }

      .analytics-header {
        flex-direction: column;
      }

      .chart-container {
        height: 300px;
      }
    }
  `],
})
export class AnalyticsPage {
  selectedPeriod = 'month';

  periods = [
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'This Quarter', value: 'quarter' },
  ];

  summaryStats = [
    { label: 'Total Labor Cost', value: '$142,680', change: '+3.2% vs last month', positive: false },
    { label: 'Total OT Cost', value: '$18,940', change: '+8.5% vs last month', positive: false },
    { label: 'Avg. Hours/Employee', value: '41.2h', change: '-0.8h vs last month', positive: true },
    { label: 'OT Employees', value: '12', change: '-2 vs last month', positive: true },
  ];

  otTrendOptions: EChartsCoreOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#e2e6ed',
      borderWidth: 1,
      textStyle: { color: '#1e293b', fontSize: 12 },
      formatter: (params: any) => {
        const p = params[0];
        return `<b>${p.name}</b><br/>OT Hours: <b>${p.value}h</b><br/>Estimated Cost: <b>$${(p.value * 34).toLocaleString()}</b>`;
      },
    },
    grid: { left: 50, right: 20, top: 30, bottom: 40 },
    xAxis: {
      type: 'category',
      data: ['Jan 20', 'Jan 27', 'Feb 3', 'Feb 10', 'Feb 17', 'Feb 24', 'Mar 2', 'Mar 9'],
      axisLine: { lineStyle: { color: '#e2e6ed' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: 'OT Hours',
      nameTextStyle: { color: '#94a3b8', fontSize: 11, padding: [0, 0, 0, -20] },
      axisLine: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [
      {
        type: 'line',
        data: [72, 85, 68, 94, 78, 91, 86, 82],
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: '#4f8cff', width: 3 },
        itemStyle: { color: '#4f8cff', borderColor: '#fff', borderWidth: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(79, 140, 255, 0.25)' },
              { offset: 1, color: 'rgba(79, 140, 255, 0.02)' },
            ],
          },
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#ef4444', type: 'dashed', width: 1.5 },
          data: [{ yAxis: 80, label: { formatter: 'OT Budget Target', color: '#ef4444', fontSize: 10 } }],
        },
      },
    ],
  };

  laborCostOptions: EChartsCoreOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#e2e6ed',
      borderWidth: 1,
      textStyle: { color: '#1e293b', fontSize: 12 },
      formatter: (params: any) => {
        const p = params[0];
        const ot = params[1];
        return `<b>${p.name}</b><br/>Regular: <b>$${p.value.toLocaleString()}</b><br/>Overtime: <b>$${ot.value.toLocaleString()}</b><br/>Total: <b>$${(p.value + ot.value).toLocaleString()}</b>`;
      },
    },
    legend: {
      data: ['Regular Pay', 'Overtime Pay'],
      bottom: 0,
      textStyle: { color: '#64748b', fontSize: 11 },
    },
    grid: { left: 60, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: 'category',
      data: ['Residential\nPickup', 'Commercial\nDumpster', 'Roll-Off', 'Recycling\nRoute', 'Bulk Waste', 'Special\nHaul'],
      axisLine: { lineStyle: { color: '#e2e6ed' } },
      axisLabel: { color: '#64748b', fontSize: 10, interval: 0 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11, formatter: '${value}' },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [
      {
        name: 'Regular Pay',
        type: 'bar',
        stack: 'cost',
        data: [38400, 28200, 22800, 19600, 12400, 8200],
        itemStyle: { color: '#4f8cff', borderRadius: [0, 0, 0, 0] },
        barWidth: '50%',
      },
      {
        name: 'Overtime Pay',
        type: 'bar',
        stack: 'cost',
        data: [5400, 4200, 3800, 2100, 1600, 1100],
        itemStyle: { color: '#ef4444', borderRadius: [4, 4, 0, 0] },
        barWidth: '50%',
      },
    ],
  };

  topOtOptions: EChartsCoreOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#fff',
      borderColor: '#e2e6ed',
      borderWidth: 1,
      textStyle: { color: '#1e293b', fontSize: 12 },
      formatter: (params: any) => {
        const p = params[0];
        const rate = [42, 39, 36, 33, 27][p.dataIndex] || 30;
        return `<b>${p.name}</b><br/>OT Hours: <b>${p.value}h</b><br/>OT Rate: <b>$${rate}/hr</b><br/>OT Cost: <b>$${(p.value * rate).toLocaleString()}</b>`;
      },
    },
    grid: { left: 130, right: 40, top: 10, bottom: 20 },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11, formatter: '{value}h' },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    yAxis: {
      type: 'category',
      data: ['Luis Morales', 'Andre Davis', 'Terrell Williams', 'Jake Hernandez', 'Miguel Rodriguez'],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#1e293b', fontSize: 12, fontWeight: 600 },
    },
    series: [
      {
        type: 'bar',
        data: [
          { value: 6.5, itemStyle: { color: '#f59e0b' } },
          { value: 8.0, itemStyle: { color: '#ea580c' } },
          { value: 9.5, itemStyle: { color: '#ea580c' } },
          { value: 11.0, itemStyle: { color: '#dc2626' } },
          { value: 12.5, itemStyle: { color: '#dc2626' } },
        ],
        barWidth: '60%',
        itemStyle: { borderRadius: [0, 6, 6, 0] },
        label: {
          show: true,
          position: 'right',
          formatter: '{c}h',
          color: '#64748b',
          fontSize: 11,
          fontWeight: 600,
        },
      },
    ],
  };

  selectPeriod(period: string): void {
    this.selectedPeriod = period;
  }
}
