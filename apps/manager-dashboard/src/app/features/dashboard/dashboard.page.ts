import { Component, ChangeDetectionStrategy, AfterViewInit, OnDestroy, OnInit, NgZone, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import * as L from 'leaflet';
import { ManagerAlertsService } from '../../core/manager-alerts.service';
import {
  LeaderboardPeriod,
  ManagerGamificationService,
} from '../../core/manager-gamification.service';
import { HttpClient } from '@angular/common/http';
import { TimesheetApiService } from '../../core/timesheet-api.service';
import { environment } from '../../../environments/environment';

interface KpiCard {
  label: string;
  value: string;
  subtext: string;
  trend: string;
  trendDirection: 'up' | 'down' | 'neutral';
  status: 'normal' | 'warning' | 'danger';
  icon: string;
}

interface DriverMarker {
  name: string;
  lat: number;
  lng: number;
  status: 'active' | 'ot-risk';
  clockedIn: string;
  jobType: string;
  hours: number;
}

interface OtAlert {
  name: string;
  hours: number;
  jobType: string;
  severity: 'amber' | 'orange' | 'red';
}

interface RiskBoardItem {
  label: string;
  count: string;
  tone: 'critical' | 'warning' | 'success';
}

@Component({
  standalone: true,
  imports: [CommonModule, CardModule],
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dashboard">
      @if (showCriticalBanner) {
        <div class="compliance-banner">
          <div class="compliance-banner-copy">
            <strong>{{ primaryCriticalAlert()?.title ?? 'Immediate compliance attention required' }}</strong>
            <span class="banner-message">
              {{ primaryCriticalAlert()?.message }}
            </span>
            @if (criticalAlerts().length > 1) {
              <span class="banner-meta">
                {{ criticalAlerts().length - 1 }} additional critical
                {{ criticalAlerts().length - 1 === 1 ? 'issue is' : 'issues are' }}
                still open.
              </span>
            }
          </div>
          <div class="banner-actions">
            <button class="banner-review-btn" type="button" (click)="reviewCriticalAlert()">
              {{ primaryCriticalActionLabel() }}
            </button>
            <button class="banner-dismiss-btn" type="button" (click)="dismissCriticalBanner()">
              Dismiss
            </button>
          </div>
        </div>
      }

      <div class="dashboard-header">
        <h2>Good Morning, Jacob</h2>
        <p class="header-subtitle">Tuesday March 17 · Denver Depot · Real-time workforce overview</p>
      </div>

      <!-- KPI Strip -->
      <div class="kpi-strip">
        @for (kpi of kpiCards(); track kpi.label) {
          <div class="kpi-card" [class.warning]="kpi.status === 'warning'" [class.danger]="kpi.status === 'danger'">
            <span class="kpi-label">{{ kpi.label }}</span>
            <span class="kpi-value kpi-number">{{ kpi.value }}</span>
            <span class="kpi-sub">{{ kpi.subtext }}</span>
            <div class="kpi-trend" [class.up]="kpi.trendDirection === 'up'" [class.down]="kpi.trendDirection === 'down'">
              <i class="pi" [class.pi-arrow-up]="kpi.trendDirection === 'up'" [class.pi-arrow-down]="kpi.trendDirection === 'down'" [class.pi-minus]="kpi.trendDirection === 'neutral'"></i>
              {{ kpi.trend }}
            </div>
          </div>
        }
      </div>

      <div class="quick-actions">
        <button type="button" class="quick-action-btn" (click)="navigateTo('/timesheets')">
          <i class="pi pi-check-circle"></i>
          Approve Timesheets
          <span class="quick-action-badge">{{ pendingTimesheetCount() }}</span>
        </button>
        <button type="button" class="quick-action-btn" (click)="navigateTo('/payroll')">
          <i class="pi pi-dollar"></i>
          Run Payroll
        </button>
        <button type="button" class="quick-action-btn" (click)="navigateTo('/schedule')">
          <i class="pi pi-calendar"></i>
          View Schedule
        </button>
        <button type="button" class="quick-action-btn" (click)="navigateTo('/analytics')">
          <i class="pi pi-chart-line"></i>
          Analytics
        </button>
      </div>

      <!-- Content Grid -->
      <div class="content-grid">
        <!-- Live Fleet Map -->
        <div class="panel panel-map">
          <div class="panel-header">
            <h3><i class="pi pi-map"></i> Live Fleet Map</h3>
            <span class="live-badge">
              <span class="live-dot"></span>
              LIVE
            </span>
          </div>
          <div class="panel-body map-body">
            <div id="fleet-map" class="fleet-map"></div>
          </div>
        </div>

        <!-- Compliance Risk Board -->
        <div class="panel panel-alerts">
          <div class="panel-header">
            <h3><i class="pi pi-shield"></i> Compliance Risk Board</h3>
            <span class="alert-count">{{ highPriorityAlerts().length }} open</span>
          </div>
          <div class="panel-body">
            <div class="risk-board-list">
              @for (item of riskBoard(); track item.label) {
                <div class="risk-board-item" [class]="'risk-' + item.tone">
                  <span class="risk-count">{{ item.count }}</span>
                  <span class="risk-label">{{ item.label }}</span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Pending Approvals -->
        <div class="panel panel-stats">
          <div class="panel-header">
            <h3><i class="pi pi-check-circle"></i> Timesheets Pending Approval</h3>
            <button class="mini-action-btn" type="button">Approve All</button>
          </div>
          <div class="panel-body">
            <div class="pending-approval-card">
              <span class="pending-count">{{ pendingTimesheetCount() }} pending</span>
              <p>{{ exceptionsData().totalFlagged }} flagged entries require manager review before payroll close.</p>
              @if (exceptionsData().totalFlagged > 0) {
                <button type="button" class="resolve-issues-btn" (click)="navigateTo('/payroll/issues')">
                  <i class="pi pi-file-check"></i> Resolve Payroll Issues
                </button>
              }
            </div>
          </div>
        </div>

        <div class="panel panel-trend">
          <div class="panel-header">
            <h3><i class="pi pi-chart-line"></i> Labor Cost Trend</h3>
            <div class="trend-header-right">
              <span class="trend-total">{{ weeklyLaborTotal() }}</span>
              <span class="trend-delta up"><i class="pi pi-arrow-up"></i> 6% vs last week</span>
            </div>
          </div>
          <div class="panel-body">
            <div class="trend-chart">
            <div class="trend-y-axis">
              <span>$5k</span>
              <span>$4k</span>
              <span>$3k</span>
              <span>$2k</span>
              <span>$1k</span>
              <span>$0</span>
            </div>
            <div class="trend-bars">
              @for (bar of laborTrend; track bar.day) {
                <div class="trend-bar-group" [class.trend-peak]="bar.peak">
                  <span class="trend-value">{{ bar.cost }}</span>
                  <div class="trend-bar-wrapper">
                    <div class="trend-bar" [style.height.%]="bar.percent"></div>
                  </div>
                  <span class="trend-day">{{ bar.day }}</span>
                </div>
              }
            </div>
            </div>
            <div class="trend-legend">
              <span class="trend-legend-item"><i class="trend-dot regular"></i> Regular</span>
              <span class="trend-legend-item"><i class="trend-dot ot"></i> Overtime</span>
            </div>
          </div>
        </div>

      </div>

      <!-- AI Insights -->
      @if (dashInsights().length > 0) {
        <div class="insights-strip">
          <div class="insights-strip-header">
            <h3><i class="pi pi-lightbulb"></i> AI Insights</h3>
            <button type="button" class="view-all-btn" (click)="navigateTo('/analytics')">View All Analytics</button>
          </div>
          @for (insight of dashInsights().slice(0, 3); track insight.title) {
            <div class="insight-item" [class]="'insight-' + insight.severity">
              <strong>{{ insight.title }}</strong>
              <span>{{ insight.message }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard {
      max-width: 1480px;
      margin: 0 auto;
    }

    .compliance-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sc-space-4);
      background: var(--sc-warning-1);
      border: 1px solid var(--sc-warning-2);
      border-radius: var(--sc-radius-md);
      padding: var(--sc-space-3) var(--sc-space-4);
      margin-bottom: var(--sc-space-4);
      color: var(--sc-warning-4);
    }

    .compliance-banner-copy {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: var(--sc-text-sm);
    }

    .banner-message {
      color: var(--sc-warning-4);
    }

    .banner-meta {
      color: var(--sc-text-secondary);
      font-size: var(--sc-text-xs);
      font-weight: 600;
    }

    .banner-dismiss-btn {
      border: 1px solid var(--sc-warning-2);
      background: #fff;
      color: var(--sc-warning-4);
      border-radius: var(--sc-radius-md);
      padding: 6px 10px;
      font-size: var(--sc-text-xs);
      font-weight: 600;
      cursor: pointer;
    }

    .banner-actions {
      display: flex;
      gap: var(--sc-space-2);
      flex-shrink: 0;
    }

    .banner-review-btn {
      border: 1px solid var(--sc-orange);
      background: var(--sc-orange);
      color: #fff;
      border-radius: var(--sc-radius-md);
      padding: 6px 10px;
      font-size: var(--sc-text-xs);
      font-weight: 700;
      cursor: pointer;
    }

    .dashboard-header {
      margin-bottom: 20px;
    }

    .dashboard-header h2 {
      font-size: 1.9rem;
      font-weight: 700;
      color: var(--sc-text-primary, #1e293b);
      margin: 0 0 6px;
      letter-spacing: -0.03em;
    }

    .header-subtitle {
      color: var(--sc-text-secondary, #64748b);
      font-size: 0.95rem;
      margin: 0;
    }

    /* -- KPI Strip -- */
    .kpi-strip {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 16px;
    }

    .quick-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sc-space-3);
      margin-bottom: var(--sc-space-5);
    }

    .quick-action-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--sc-space-2);
      border: 1px solid var(--sc-border);
      border-radius: var(--sc-radius-md);
      background: var(--sc-card-bg);
      color: var(--sc-gray-4);
      font-size: var(--sc-text-sm);
      font-weight: 600;
      padding: 10px 14px;
      cursor: pointer;
    }

    .quick-action-btn i {
      color: var(--sc-orange);
    }

    .quick-action-badge {
      margin-left: var(--sc-space-2);
      border-radius: var(--sc-radius-full);
      padding: 2px 8px;
      font-size: var(--sc-text-xs);
      color: var(--sc-warning-4);
      background: var(--sc-warning-1);
      border: 1px solid var(--sc-warning-2);
    }

    .kpi-card {
      background: var(--sc-card-bg);
      border-radius: var(--sc-radius-md);
      padding: 10px 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      border: 1px solid var(--sc-border, #e2e6ed);
      border-left: 4px solid var(--sc-success-3);
      position: relative;
      transition: box-shadow 0.15s ease, transform 0.15s ease;
    }

    .kpi-card.warning { border-left-color: var(--sc-warning-3); }
    .kpi-card.danger { border-left-color: var(--sc-danger-3); }
    .kpi-card:hover { box-shadow: var(--sc-shadow-md); transform: translateY(-1px); }
    .kpi-label {
      font-size: var(--sc-text-xs);
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--sc-gray-3);
      text-transform: uppercase;
    }
    .kpi-value {
      color: var(--sc-sidebar-bg);
      font-size: 1.3rem;
      line-height: 1;
    }
    .kpi-sub {
      font-size: var(--sc-text-xs);
      color: var(--sc-gray-3);
    }
    .kpi-trend {
      margin-top: auto;
      font-size: var(--sc-text-sm);
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .kpi-trend.up {
      background: var(--sc-success-1);
      color: var(--sc-success-4);
    }
    .kpi-trend.down {
      background: var(--sc-danger-1);
      color: var(--sc-danger-4);
    }

    /* -- Content Grid -- */
    .content-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.6fr) minmax(320px, 1fr);
      grid-template-rows: auto auto;
      gap: 20px;
      align-items: start;
    }

    .panel {
      background: var(--sc-card-bg);
      border-radius: 16px;
      border: 1px solid var(--sc-border, #e2e6ed);
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
    }

    .panel-map {
      grid-column: 1 / 2;
      grid-row: 1 / 3;
      min-height: 520px;
    }

    .panel-alerts {
      grid-column: 2 / 3;
      grid-row: 1 / 2;
    }

    .panel-stats {
      grid-column: 1 / 2;
      grid-row: 2 / 3;
    }

    .panel-trend {
      grid-column: 2 / 3;
      grid-row: 2 / 3;
    }

    .panel-gamification {
      grid-column: 2 / 3;
      grid-row: 3 / 4;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 20px;
      border-bottom: 1px solid var(--sc-border, #e2e6ed);
    }

    .panel-header h3 {
      font-size: 1rem;
      font-weight: 700;
      color: var(--sc-text-primary, #1e293b);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .panel-header h3 i {
      color: var(--sc-orange);
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
      padding: 4px 10px;
      background: var(--sc-warning-1);
      color: var(--sc-warning-4);
      border-radius: 999px;
    }

    .panel-body {
      padding: 20px;
    }

    .map-body {
      padding: 0;
    }

    /* -- Fleet Map -- */
    .fleet-map {
      width: 100%;
      height: 500px;
    }

    .risk-board-list {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .risk-board-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 18px 12px;
      border-radius: 12px;
      background: var(--sc-gray-1);
      border: 1px solid var(--sc-border, #e2e6ed);
      text-align: center;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .risk-board-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    }
    .risk-critical { border-top: 3px solid var(--sc-danger-3); }
    .risk-warning { border-top: 3px solid var(--sc-warning-3); }
    .risk-success { border-top: 3px solid var(--sc-success-3); }
    .risk-count {
      font-size: 1.6rem;
      font-weight: 800;
    }
    .risk-critical .risk-count { color: var(--sc-danger-3); }
    .risk-warning .risk-count { color: var(--sc-warning-3); }
    .risk-success .risk-count { color: var(--sc-success-3); }
    .risk-label {
      color: var(--sc-text-secondary);
      font-size: var(--sc-text-xs);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .pending-approval-card {
      border: 1px dashed var(--sc-border);
      border-radius: var(--sc-radius-lg);
      padding: var(--sc-space-5);
      background: var(--sc-gray-1);
    }
    .pending-count {
      display: block;
      font-size: var(--sc-text-2xl);
      font-weight: 800;
      color: var(--sc-text-primary);
      margin-bottom: 8px;
    }
    .pending-approval-card p {
      margin: 0;
      color: var(--sc-text-secondary);
      font-size: var(--sc-text-sm);
    }
    .resolve-issues-btn {
      margin-top: 12px;
      width: 100%;
      padding: 10px;
      border: none;
      border-radius: 8px;
      background: linear-gradient(135deg, #f97316, #ea580c);
      color: #fff;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      font-family: inherit;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.15s ease;
    }
    .resolve-issues-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
    }

    .mini-action-btn {
      border: 1px solid var(--sc-border);
      background: var(--sc-card-bg);
      color: var(--sc-blue);
      border-radius: var(--sc-radius-md);
      padding: 6px 10px;
      font-size: var(--sc-text-xs);
      font-weight: 700;
      cursor: pointer;
    }
    .trend-header-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }
    .trend-total {
      font-size: 0.88rem;
      font-weight: 800;
      color: var(--sc-text-primary);
    }
    .trend-delta {
      font-size: 0.72rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .trend-delta.up { color: #ef4444; }
    .trend-delta.down { color: #059669; }
    .trend-delta i { font-size: 0.65rem; }
    .trend-chart {
      display: flex;
      gap: 10px;
    }
    .trend-y-axis {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 120px;
      padding-bottom: 22px;
      font-size: 0.65rem;
      color: var(--sc-text-secondary);
      font-weight: 600;
      text-align: right;
      min-width: 28px;
    }
    .trend-bars {
      flex: 1;
      display: flex;
      justify-content: space-between;
      gap: 8px;
      position: relative;
    }
    .trend-bars::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 120px;
      pointer-events: none;
      background-image:
        linear-gradient(to right, rgba(0,0,0,0.08) 50%, transparent 50%);
      background-size: 8px 1px;
      background-repeat: repeat-x;
      background-position:
        0 0%,
        0 20%,
        0 40%,
        0 60%,
        0 80%,
        0 100%;
      /* Multiple dashed lines */
      background-image:
        repeating-linear-gradient(to right, var(--sc-border, #e2e6ed) 0 4px, transparent 4px 8px),
        repeating-linear-gradient(to right, var(--sc-border, #e2e6ed) 0 4px, transparent 4px 8px),
        repeating-linear-gradient(to right, var(--sc-border, #e2e6ed) 0 4px, transparent 4px 8px),
        repeating-linear-gradient(to right, var(--sc-border, #e2e6ed) 0 4px, transparent 4px 8px),
        repeating-linear-gradient(to right, var(--sc-border, #e2e6ed) 0 4px, transparent 4px 8px),
        repeating-linear-gradient(to right, var(--sc-border, #e2e6ed) 0 4px, transparent 4px 8px);
      background-size: 100% 1px;
      background-position:
        0 0%,
        0 20%,
        0 40%,
        0 60%,
        0 80%,
        0 100%;
      background-repeat: repeat-x;
    }
    .trend-bar-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      position: relative;
    }
    .trend-value {
      font-size: 0.68rem;
      font-weight: 700;
      color: var(--sc-text-secondary);
      opacity: 0;
      transition: opacity 0.15s ease;
    }
    .trend-bar-group:hover .trend-value {
      opacity: 1;
    }
    .trend-bar-wrapper {
      width: 100%;
      height: 120px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .trend-bar {
      width: 36px;
      min-height: 8px;
      border-radius: 8px 8px 4px 4px;
      background: linear-gradient(180deg, var(--sc-orange), var(--sc-orange-dark, #c2410c));
      transition: transform 0.15s ease;
      animation: barGrow 0.6s ease-out;
      transform-origin: bottom;
    }
    @keyframes barGrow {
      from { transform: scaleY(0); }
      to { transform: scaleY(1); }
    }
    .trend-bar-group:hover .trend-bar {
      transform: scaleY(1.08);
      transform-origin: bottom;
    }
    .trend-peak .trend-bar {
      background: linear-gradient(180deg, #ef4444, #dc2626);
    }
    .trend-peak .trend-value {
      opacity: 1;
      color: #ef4444;
    }
    .trend-day {
      font-size: var(--sc-text-xs);
      color: var(--sc-text-secondary);
      font-weight: 600;
    }
    .trend-peak .trend-day {
      color: #ef4444;
      font-weight: 700;
    }
    .trend-legend {
      display: flex;
      gap: 16px;
      justify-content: center;
      margin-top: 14px;
      font-size: 0.72rem;
      color: var(--sc-text-secondary);
    }
    .trend-legend-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .trend-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
    }
    .trend-dot.regular { background: var(--sc-orange); }
    .trend-dot.ot { background: #ef4444; }

    .period-switch {
      display: inline-flex;
      gap: 6px;
      padding: 4px;
      border-radius: 999px;
      background: var(--sc-gray-1);
      border: 1px solid var(--sc-border);
    }

    .period-btn {
      border: 0;
      background: transparent;
      color: var(--sc-text-secondary);
      border-radius: 999px;
      padding: 6px 10px;
      font-size: var(--sc-text-xs);
      font-weight: 700;
      cursor: pointer;
    }

    .period-btn.active {
      background: var(--sc-card-bg);
      color: var(--sc-orange);
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.08);
    }

    .leaderboard-podium {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }

    .podium-spot {
      border-radius: 16px;
      border: 1px solid var(--sc-border);
      background: linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(255, 255, 255, 1) 100%);
      padding: 16px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-height: 140px;
    }

    .podium-spot.rank-1 {
      border-color: rgba(249, 115, 22, 0.35);
      box-shadow: 0 12px 30px rgba(249, 115, 22, 0.12);
    }

    .podium-rank,
    .section-label,
    .badge-award-time {
      font-size: var(--sc-text-xs);
      font-weight: 700;
      color: var(--sc-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .podium-points {
      font-size: var(--sc-text-lg);
      font-weight: 800;
      color: var(--sc-text-primary);
    }

    .champion-badge {
      margin-top: auto;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      align-self: flex-start;
      padding: 4px 8px;
      border-radius: 999px;
      background: var(--sc-warning-1);
      color: var(--sc-warning-4);
      border: 1px solid var(--sc-warning-2);
      font-size: var(--sc-text-xs);
      font-weight: 700;
    }

    .recent-badges {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .badge-award-row {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 10px;
      align-items: center;
      border-radius: 14px;
      background: var(--sc-gray-1);
      border: 1px solid var(--sc-border);
      padding: 12px 14px;
    }

    .badge-award-icon {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      background: rgba(249, 115, 22, 0.12);
      font-size: 1.1rem;
    }

    .badge-award-copy {
      color: var(--sc-text-primary);
      font-size: var(--sc-text-sm);
    }

    /* -- AI Insights Strip -- */
    .insights-strip {
      margin-top: 20px;
      background: var(--sc-card-bg);
      border: 1px solid var(--sc-border);
      border-radius: 16px;
      padding: 20px;
    }
    .insights-strip-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 14px;
    }
    .insights-strip-header h3 {
      margin: 0; font-size: 1rem; font-weight: 700; color: var(--sc-text-primary);
      display: flex; align-items: center; gap: 8px;
    }
    .insights-strip-header h3 i { color: #f59e0b; }
    .view-all-btn {
      border: 1px solid var(--sc-border); background: var(--sc-card-bg);
      color: var(--sc-blue); border-radius: var(--sc-radius-md);
      padding: 6px 12px; font-size: 0.78rem; font-weight: 700;
      cursor: pointer; font-family: inherit;
    }
    .view-all-btn:hover { border-color: var(--sc-blue); }
    .insight-item {
      display: flex; flex-direction: column; gap: 4px;
      padding: 12px 14px; border-radius: 10px; margin-bottom: 8px;
      border: 1px solid var(--sc-border);
    }
    .insight-item strong { font-size: 0.85rem; color: var(--sc-text-primary); }
    .insight-item span { font-size: 0.8rem; color: var(--sc-text-secondary); line-height: 1.4; }
    .insight-critical { background: #fef2f2; border-color: #fecaca; }
    .insight-warning { background: #fffbeb; border-color: #fde68a; }
    .insight-info { background: #eff6ff; border-color: #bfdbfe; }

    :host-context(body.dark-mode) .kpi-card,
    :host-context(body.dark-mode) .panel,
    :host-context(body.dark-mode) .quick-action-btn {
      box-shadow: none;
      border-color: var(--sc-border);
    }

    :host-context(body.dark-mode) .kpi-value {
      color: #f8fafc;
    }

    :host-context(body.dark-mode) .kpi-label,
    :host-context(body.dark-mode) .kpi-sub,
    :host-context(body.dark-mode) .header-subtitle,
    :host-context(body.dark-mode) .risk-label {
      color: #cbd5e1;
    }

    :host-context(body.dark-mode) .risk-board-item,
    :host-context(body.dark-mode) .pending-approval-card,
    :host-context(body.dark-mode) .badge-award-row,
    :host-context(body.dark-mode) .period-switch,
    :host-context(body.dark-mode) .podium-spot {
      background: #1f2430;
    }

    :host-context(body.dark-mode) .kpi-trend.up {
      background: rgba(50, 162, 6, 0.2);
      color: #bbf7d0;
    }

    :host-context(body.dark-mode) .kpi-trend.down {
      background: rgba(228, 90, 78, 0.2);
      color: #fecaca;
    }

    /* -- Responsive -- */
    @media (max-width: 1280px) {
      .content-grid {
        grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.9fr);
      }
    }

    @media (max-width: 1024px) {
      .dashboard-header h2 {
        font-size: 1.65rem;
      }

      .kpi-strip {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .content-grid {
        grid-template-columns: 1fr;
      }

      .panel-map {
        grid-column: 1;
        grid-row: auto;
        min-height: 350px;
      }

      .panel-alerts,
      .panel-stats,
      .panel-trend,
      .panel-gamification {
        grid-column: 1;
        grid-row: auto;
      }

      .fleet-map {
        height: 360px;
      }
    }

    @media (max-width: 640px) {
      .kpi-strip {
        grid-template-columns: 1fr;
      }

      .leaderboard-podium {
        grid-template-columns: 1fr;
      }

      .kpi-trend {
        justify-self: start;
      }
    }
  `],
})
export class DashboardPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly timesheetApi = inject(TimesheetApiService);
  private readonly http = inject(HttpClient);
  private map: L.Map | null = null;
  showCriticalBanner = true;

  // Live data signals
  readonly dashInsights = signal<Array<{ type: string; severity: string; title: string; message: string }>>([]);
  readonly activeDriverCount = signal(0);
  readonly pendingTimesheetCount = signal(0);
  readonly exceptionsData = signal<{ missedClockOuts: number; hosWarnings: number; otAlerts: number; totalFlagged: number }>({
    missedClockOuts: 0, hosWarnings: 0, otAlerts: 0, totalFlagged: 0,
  });

  readonly criticalAlerts = computed(() =>
    this.alerts.alerts().filter((alert) => alert.tier === 'critical')
  );
  readonly primaryCriticalAlert = computed(() => this.criticalAlerts()[0] ?? null);
  readonly primaryCriticalActionLabel = computed(() => {
    const route = this.primaryCriticalAlert()?.route ?? '/compliance';
    if (route.includes('timesheets')) return 'Open Timesheets';
    if (route.includes('payroll')) return 'Open Payroll';
    if (route.includes('schedule')) return 'Open Schedule';
    return 'Open Compliance';
  });
  readonly highPriorityAlerts = computed(() =>
    this.alerts.alerts().filter(
      (alert) => alert.tier === 'critical' || alert.tier === 'high'
    )
  );
  readonly kpiCards = computed<KpiCard[]>(() => {
    const exc = this.exceptionsData();
    const totalAlerts = exc.otAlerts + exc.hosWarnings + exc.missedClockOuts;
    return [
      {
        label: 'Active Drivers',
        value: this.activeDriverCount().toString(),
        subtext: 'currently on clock',
        trend: 'Live count',
        trendDirection: 'up',
        status: 'normal',
        icon: 'pi-users',
      },
      {
        label: 'Pending Timesheets',
        value: this.pendingTimesheetCount().toString(),
        subtext: 'awaiting approval',
        trend: exc.totalFlagged > 0 ? `${exc.totalFlagged} flagged` : 'All clear',
        trendDirection: exc.totalFlagged > 0 ? 'down' : 'up',
        status: exc.totalFlagged > 0 ? 'warning' : 'normal',
        icon: 'pi-check-circle',
      },
      {
        label: 'Missed Clock-Outs',
        value: exc.missedClockOuts.toString(),
        subtext: 'entries without clock-out',
        trend: exc.missedClockOuts > 0 ? 'Needs attention' : 'All good',
        trendDirection: exc.missedClockOuts > 0 ? 'down' : 'up',
        status: exc.missedClockOuts > 0 ? 'danger' : 'normal',
        icon: 'pi-clock',
      },
      {
        label: 'Overtime / HOS Alerts',
        value: totalAlerts.toString(),
        subtext: `${exc.otAlerts} OT + ${exc.hosWarnings} HOS`,
        trend: totalAlerts > 0 ? 'Review required' : 'No issues',
        trendDirection: totalAlerts > 0 ? 'down' : 'neutral',
        status: totalAlerts > 0 ? 'danger' : 'warning',
        icon: 'pi-bell',
      },
    ];
  });

  drivers: DriverMarker[] = [
    // Central Denver
    { name: 'Carlos Rivera', lat: 39.7392, lng: -104.9903, status: 'active', clockedIn: '6:00 AM', jobType: 'Residential Sanitation', hours: 6.5 },
    { name: 'Marcus Johnson', lat: 39.7592, lng: -104.9703, status: 'active', clockedIn: '6:02 AM', jobType: 'Residential Pickup', hours: 6.2 },
    { name: 'Jake Hernandez', lat: 39.7450, lng: -104.9550, status: 'active', clockedIn: '5:30 AM', jobType: 'Roll-Off Delivery', hours: 7.0 },
    // North Denver / Commerce City
    { name: 'Mike Chen', lat: 39.8083, lng: -104.9344, status: 'active', clockedIn: '5:45 AM', jobType: 'Roll-Off Delivery', hours: 6.8 },
    { name: 'DeShawn Carter', lat: 39.7950, lng: -104.9100, status: 'active', clockedIn: '6:15 AM', jobType: 'Residential Pickup', hours: 5.5 },
    { name: 'Chris Patterson', lat: 39.8200, lng: -104.9600, status: 'active', clockedIn: '6:30 AM', jobType: 'Roll-Off Pickup', hours: 5.0 },
    // South Denver / Englewood
    { name: 'Tom Garcia', lat: 39.6600, lng: -104.9900, status: 'active', clockedIn: '6:00 AM', jobType: 'Septic Pump', hours: 6.5 },
    { name: 'James Wright', lat: 39.6800, lng: -105.0200, status: 'active', clockedIn: '5:50 AM', jobType: 'Residential Sanitation', hours: 6.8 },
    { name: 'Tony Ramirez', lat: 39.6500, lng: -105.0100, status: 'ot-risk', clockedIn: '5:15 AM', jobType: 'Septic Pump', hours: 9.2 },
    // West Denver / Lakewood
    { name: 'Terrell Williams', lat: 39.7285, lng: -105.0800, status: 'active', clockedIn: '5:48 AM', jobType: 'Septic Pump', hours: 6.7 },
    { name: 'Miguel Rodriguez', lat: 39.7100, lng: -105.0900, status: 'active', clockedIn: '6:20 AM', jobType: 'Yard Maintenance', hours: 5.3 },
    { name: 'Anna Kowalski', lat: 39.7400, lng: -105.1100, status: 'active', clockedIn: '7:00 AM', jobType: 'Yard Maintenance', hours: 4.5 },
    // East Denver / Aurora
    { name: 'Kevin Brooks', lat: 39.7294, lng: -104.8319, status: 'active', clockedIn: '6:10 AM', jobType: 'Residential Pickup', hours: 6.4 },
    { name: 'Luis Morales', lat: 39.7100, lng: -104.8600, status: 'active', clockedIn: '6:30 AM', jobType: 'Yard Maintenance', hours: 5.0 },
    // Thornton / Northglenn
    { name: 'Andre Davis', lat: 39.8680, lng: -104.9720, status: 'active', clockedIn: '5:55 AM', jobType: 'Commercial Dumpster', hours: 6.6 },
    { name: 'Ray Thompson', lat: 39.8850, lng: -104.9900, status: 'active', clockedIn: '6:05 AM', jobType: 'Residential Pickup', hours: 6.0 },
    // Arvada / Westminster
    { name: 'Danny Flores', lat: 39.8028, lng: -105.0875, status: 'active', clockedIn: '6:00 AM', jobType: 'Roll-Off Delivery', hours: 6.3 },
    { name: 'Sean Murphy', lat: 39.8367, lng: -105.0372, status: 'ot-risk', clockedIn: '5:00 AM', jobType: 'Commercial Dumpster', hours: 9.5 },
    // Littleton / Centennial
    { name: 'Greg Owens', lat: 39.6133, lng: -105.0166, status: 'active', clockedIn: '6:15 AM', jobType: 'Grease Trap', hours: 5.8 },
    { name: 'Ben Watts', lat: 39.5792, lng: -104.8769, status: 'active', clockedIn: '6:20 AM', jobType: 'Residential Pickup', hours: 5.5 },
    // Parker / Lone Tree
    { name: 'Nick Alvarez', lat: 39.5186, lng: -104.7614, status: 'active', clockedIn: '5:40 AM', jobType: 'Septic Pump', hours: 7.0 },
    { name: 'Tyler Ross', lat: 39.5500, lng: -104.8900, status: 'active', clockedIn: '6:10 AM', jobType: 'Roll-Off Pickup', hours: 6.1 },
  ];

  otAlerts: OtAlert[] = [
    { name: 'Miguel Rodriguez', hours: 39.5, jobType: 'Recycling Route', severity: 'red' },
    { name: 'Jake Hernandez', hours: 38.5, jobType: 'Roll-Off Delivery', severity: 'orange' },
    { name: 'Tony Ramirez', hours: 35.5, jobType: 'Roll-Off Pickup', severity: 'amber' },
    { name: 'Terrell Williams', hours: 34.0, jobType: 'Commercial Dumpster', severity: 'amber' },
    { name: 'Andre Davis', hours: 33.5, jobType: 'Commercial Dumpster', severity: 'amber' },
  ];

  riskBoard = computed<RiskBoardItem[]>(() => [
    { label: 'Critical', count: this.criticalAlerts().length.toString(), tone: 'critical' },
    { label: 'Warning', count: (this.highPriorityAlerts().length - this.criticalAlerts().length).toString(), tone: 'warning' },
    { label: 'Compliant', count: '18', tone: 'success' },
  ]);

  laborTrend = [
    { day: 'Mon', percent: 42, cost: '$2.1k', peak: false },
    { day: 'Tue', percent: 68, cost: '$3.4k', peak: false },
    { day: 'Wed', percent: 55, cost: '$2.8k', peak: false },
    { day: 'Thu', percent: 89, cost: '$4.5k', peak: false },
    { day: 'Fri', percent: 100, cost: '$5.0k', peak: true },
    { day: 'Sat', percent: 35, cost: '$1.8k', peak: false },
    { day: 'Sun', percent: 18, cost: '$0.9k', peak: false },
  ];

  weeklyLaborTotal = () => '$20.5k this week';
  readonly leaderboardPeriods: Array<{ label: string; value: LeaderboardPeriod }> = [
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: 'Quarter', value: 'quarter' },
  ];

  constructor(
    private ngZone: NgZone,
    public alerts: ManagerAlertsService,
    private readonly router: Router,
    public gamification: ManagerGamificationService
  ) {}

  ngOnInit(): void {
    this.showCriticalBanner =
      sessionStorage.getItem('sc-critical-banner-dismissed') !== '1' &&
      this.criticalAlerts().length > 0;

    // Fetch live KPI data from API
    this.timesheetApi.getActive().subscribe({
      next: (res) => {
        this.activeDriverCount.set(res.count);
        // Build real driver markers from active timesheets
        this.drivers = res.data
          .filter((entry: any) => entry.gpsClockIn)
          .map((entry: any) => {
            const gps = entry.gpsClockIn as any;
            const emp = entry.employee;
            const hoursIn = entry.clockIn
              ? (Date.now() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60)
              : 0;
            return {
              name: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
              lat: gps.lat,
              lng: gps.lng,
              status: hoursIn > 9 ? 'ot-risk' as const : 'active' as const,
              clockedIn: entry.clockIn
                ? new Date(entry.clockIn).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                : '',
              jobType: (entry.jobType ?? '').replace(/_/g, ' '),
              hours: Math.round(hoursIn * 10) / 10,
            };
          });
        // Re-init map with real data if already initialized
        if (this.map) {
          this.map.remove();
          this.map = null;
          this.ngZone.runOutsideAngular(() => this.initMap());
        }
      },
    });

    this.timesheetApi.getTimesheets({ status: 'PENDING', limit: 1 }).subscribe({
      next: (res) => this.pendingTimesheetCount.set(res.total),
    });

    this.timesheetApi.getExceptions().subscribe({
      next: (res) => this.exceptionsData.set(res.counts),
    });

    // Fetch AI insights
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    this.http.get<{ data: any[] }>(`${environment.apiUrl}/api/analytics/insights`, {
      params: { periodStart: monthStart, periodEnd: today },
    }).subscribe({
      next: (res) => this.dashInsights.set(res.data ?? []),
    });
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.initMap();
    });
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  dismissCriticalBanner(): void {
    this.showCriticalBanner = false;
    sessionStorage.setItem('sc-critical-banner-dismissed', '1');
  }

  reviewCriticalAlert(): void {
    const alert = this.criticalAlerts()[0];
    if (alert) {
      this.alerts.markRead(alert.id);
      void this.router.navigateByUrl(alert.route ?? '/compliance');
      return;
    }

    void this.router.navigateByUrl('/compliance');
  }

  navigateTo(path: string): void {
    void this.router.navigateByUrl(path);
  }

  setLeaderboardPeriod(period: LeaderboardPeriod): void {
    this.gamification.setPeriod(period);
  }

  private initMap(): void {
    this.map = L.map('fleet-map', {
      center: [39.7392, -104.9903],
      zoom: 11,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    for (const driver of this.drivers) {
      const color = driver.status === 'ot-risk' ? '#dc2626' : '#059669';
      const markerIcon = L.divIcon({
        className: 'fleet-marker',
        html: `
          <div style="
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: ${color};
            border: 3px solid #fff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.35);
          "></div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const statusLabel = driver.status === 'ot-risk' ? 'Approaching OT' : 'Active';

      L.marker([driver.lat, driver.lng], { icon: markerIcon })
        .addTo(this.map!)
        .bindPopup(`
          <div style="font-family: system-ui, sans-serif; min-width: 180px;">
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">${driver.name}</div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="
                display: inline-block;
                width: 8px; height: 8px;
                border-radius: 50%;
                background: ${color};
              "></span>
              <span style="font-size: 12px; color: #64748b;">${statusLabel} &middot; Clocked in ${driver.clockedIn}</span>
            </div>
            <div style="font-size: 12px; color: #475569; margin-bottom: 2px;">${driver.jobType}</div>
            <div style="font-size: 12px; font-weight: 600; color: ${driver.hours >= 38 ? '#dc2626' : driver.hours >= 35 ? '#ea580c' : '#059669'};">
              ${driver.hours}h this week
            </div>
          </div>
        `);
    }
  }
}
