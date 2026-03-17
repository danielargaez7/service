import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';

interface KpiCard {
  label: string;
  value: string;
  icon: string;
  trend: string;
  trendUp: boolean;
  color: string;
}

@Component({
  standalone: true,
  imports: [CommonModule, CardModule],
  selector: 'app-dashboard',
  template: `
    <div class="dashboard">
      <div class="dashboard-header">
        <h2>Operations Dashboard</h2>
        <p class="header-subtitle">Real-time workforce overview</p>
      </div>

      <!-- KPI Strip -->
      <div class="kpi-strip">
        @for (kpi of kpiCards; track kpi.label) {
          <div class="kpi-card" [style.--kpi-color]="kpi.color">
            <div class="kpi-icon-wrapper">
              <i [class]="'pi ' + kpi.icon"></i>
            </div>
            <div class="kpi-content">
              <span class="kpi-value">{{ kpi.value }}</span>
              <span class="kpi-label">{{ kpi.label }}</span>
            </div>
            <div class="kpi-trend" [class.trend-up]="kpi.trendUp" [class.trend-down]="!kpi.trendUp">
              <i class="pi" [class.pi-arrow-up]="kpi.trendUp" [class.pi-arrow-down]="!kpi.trendUp"></i>
              {{ kpi.trend }}
            </div>
          </div>
        }
      </div>

      <!-- Content Grid -->
      <div class="content-grid">
        <!-- Live Fleet Map Placeholder -->
        <div class="panel panel-map">
          <div class="panel-header">
            <h3><i class="pi pi-map"></i> Live Fleet Map</h3>
            <span class="live-badge">
              <span class="live-dot"></span>
              LIVE
            </span>
          </div>
          <div class="panel-body placeholder-area">
            <i class="pi pi-map-marker placeholder-icon"></i>
            <p>Live Fleet Map will go here</p>
            <span class="placeholder-sub">Real-time GPS tracking of all active field workers</span>
          </div>
        </div>

        <!-- OT Alert Bar Placeholder -->
        <div class="panel panel-alerts">
          <div class="panel-header">
            <h3><i class="pi pi-exclamation-triangle"></i> Overtime Alerts</h3>
            <span class="alert-count">3 active</span>
          </div>
          <div class="panel-body placeholder-area">
            <i class="pi pi-bell placeholder-icon"></i>
            <p>OT Alert Bar will go here</p>
            <span class="placeholder-sub">Workers approaching or exceeding overtime thresholds</span>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="panel panel-stats">
          <div class="panel-header">
            <h3><i class="pi pi-chart-line"></i> Today at a Glance</h3>
          </div>
          <div class="panel-body">
            <div class="stat-row">
              <span class="stat-label">Clocked In</span>
              <span class="stat-value">42 / 48</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Late Arrivals</span>
              <span class="stat-value stat-warn">3</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">No Shows</span>
              <span class="stat-value stat-danger">1</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">On Break</span>
              <span class="stat-value">7</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Avg. Hours Today</span>
              <span class="stat-value">6.4h</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Geofence Violations</span>
              <span class="stat-value stat-danger">2</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      max-width: 1400px;
      margin: 0 auto;
    }

    .dashboard-header {
      margin-bottom: 24px;
    }

    .dashboard-header h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--sc-text-primary, #1e293b);
      margin: 0 0 4px;
    }

    .header-subtitle {
      color: var(--sc-text-secondary, #64748b);
      font-size: 0.9rem;
      margin: 0;
    }

    /* ── KPI Strip ── */
    .kpi-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .kpi-card {
      background: #fff;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: flex-start;
      gap: 14px;
      border: 1px solid var(--sc-border, #e2e6ed);
      position: relative;
      overflow: hidden;
      transition: box-shadow 0.15s ease;
    }

    .kpi-card:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
    }

    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: var(--kpi-color);
    }

    .kpi-icon-wrapper {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--kpi-color) 12%, transparent);
      color: var(--kpi-color);
      font-size: 1.2rem;
      flex-shrink: 0;
    }

    .kpi-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-width: 0;
    }

    .kpi-value {
      font-size: 1.6rem;
      font-weight: 800;
      color: var(--sc-text-primary, #1e293b);
      line-height: 1.2;
    }

    .kpi-label {
      font-size: 0.8rem;
      color: var(--sc-text-secondary, #64748b);
      font-weight: 500;
    }

    .kpi-trend {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 20px;
      white-space: nowrap;
      align-self: flex-start;
    }

    .trend-up {
      background: #ecfdf5;
      color: #059669;
    }

    .trend-down {
      background: #fef2f2;
      color: #dc2626;
    }

    /* ── Content Grid ── */
    .content-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: auto auto;
      gap: 20px;
    }

    .panel {
      background: #fff;
      border-radius: 12px;
      border: 1px solid var(--sc-border, #e2e6ed);
      overflow: hidden;
    }

    .panel-map {
      grid-column: 1 / 2;
      grid-row: 1 / 3;
      min-height: 400px;
    }

    .panel-alerts {
      grid-column: 2 / 3;
      grid-row: 1 / 2;
    }

    .panel-stats {
      grid-column: 2 / 3;
      grid-row: 2 / 3;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--sc-border, #e2e6ed);
    }

    .panel-header h3 {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--sc-text-primary, #1e293b);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .panel-header h3 i {
      color: var(--sc-accent, #4f8cff);
    }

    .live-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.7rem;
      font-weight: 700;
      color: #059669;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #059669;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .alert-count {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 3px 10px;
      background: #fef3c7;
      color: #d97706;
      border-radius: 20px;
    }

    .panel-body {
      padding: 20px;
    }

    .placeholder-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 200px;
      text-align: center;
    }

    .placeholder-icon {
      font-size: 3rem;
      color: var(--sc-border, #e2e6ed);
      margin-bottom: 12px;
    }

    .placeholder-area p {
      font-size: 1rem;
      font-weight: 600;
      color: var(--sc-text-secondary, #64748b);
      margin: 0 0 4px;
    }

    .placeholder-sub {
      font-size: 0.8rem;
      color: #94a3b8;
    }

    /* ── Stats Panel ── */
    .stat-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #f1f5f9;
    }

    .stat-row:last-child {
      border-bottom: none;
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--sc-text-secondary, #64748b);
    }

    .stat-value {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--sc-text-primary, #1e293b);
    }

    .stat-warn {
      color: #d97706;
    }

    .stat-danger {
      color: #dc2626;
    }

    /* ── Responsive ── */
    @media (max-width: 1024px) {
      .kpi-strip {
        grid-template-columns: repeat(2, 1fr);
      }

      .content-grid {
        grid-template-columns: 1fr;
      }

      .panel-map {
        grid-column: 1;
        grid-row: auto;
        min-height: 300px;
      }

      .panel-alerts,
      .panel-stats {
        grid-column: 1;
        grid-row: auto;
      }
    }

    @media (max-width: 640px) {
      .kpi-strip {
        grid-template-columns: 1fr;
      }

      .kpi-trend {
        display: none;
      }
    }
  `],
})
export class DashboardPage {
  kpiCards: KpiCard[] = [
    {
      label: 'Total Active Workers',
      value: '42',
      icon: 'pi-users',
      trend: '+3 vs yesterday',
      trendUp: true,
      color: '#4f8cff',
    },
    {
      label: "Today's Labor Cost",
      value: '$18,420',
      icon: 'pi-dollar',
      trend: '+5.2%',
      trendUp: false,
      color: '#10b981',
    },
    {
      label: 'Unapproved Timesheets',
      value: '17',
      icon: 'pi-clock',
      trend: '-4 since morning',
      trendUp: true,
      color: '#f59e0b',
    },
    {
      label: 'OT Hours This Week',
      value: '86.5',
      icon: 'pi-exclamation-triangle',
      trend: '+12.3h',
      trendUp: false,
      color: '#ef4444',
    },
  ];
}
