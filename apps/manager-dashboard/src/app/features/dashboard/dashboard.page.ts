import { Component, ChangeDetectionStrategy, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import * as L from 'leaflet';

interface KpiCard {
  label: string;
  value: string;
  icon: string;
  trend: string;
  trendUp: boolean;
  color: string;
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

@Component({
  standalone: true,
  imports: [CommonModule, CardModule],
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
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

        <!-- OT Alert Bar -->
        <div class="panel panel-alerts">
          <div class="panel-header">
            <h3><i class="pi pi-exclamation-triangle"></i> Overtime Alerts</h3>
            <span class="alert-count">{{ otAlerts.length }} active</span>
          </div>
          <div class="panel-body">
            <div class="ot-alert-list">
              @for (alert of otAlerts; track alert.name) {
                <div class="ot-alert-item" [class]="'severity-' + alert.severity">
                  <div class="ot-alert-indicator"></div>
                  <div class="ot-alert-info">
                    <span class="ot-alert-name">{{ alert.name }}</span>
                    <span class="ot-alert-job">{{ alert.jobType }}</span>
                  </div>
                  <div class="ot-alert-hours">
                    <span class="ot-hours-value">{{ alert.hours }}h</span>
                    <span class="ot-hours-label">this week</span>
                  </div>
                </div>
              }
            </div>
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

    /* -- KPI Strip -- */
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

    /* -- Content Grid -- */
    .content-grid {
      display: grid;
      grid-template-columns: 3fr 2fr;
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
      min-height: 520px;
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

    .map-body {
      padding: 0;
    }

    /* -- Fleet Map -- */
    .fleet-map {
      width: 100%;
      height: 460px;
    }

    /* -- OT Alert List -- */
    .ot-alert-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .ot-alert-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 10px;
      background: #fafbfc;
      border: 1px solid var(--sc-border, #e2e6ed);
      transition: box-shadow 0.15s ease;
    }

    .ot-alert-item:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .ot-alert-indicator {
      width: 6px;
      height: 36px;
      border-radius: 3px;
      flex-shrink: 0;
    }

    .severity-amber .ot-alert-indicator { background: #f59e0b; }
    .severity-orange .ot-alert-indicator { background: #ea580c; }
    .severity-red .ot-alert-indicator { background: #dc2626; }

    .severity-amber { border-left: 3px solid #f59e0b; }
    .severity-orange { border-left: 3px solid #ea580c; }
    .severity-red { border-left: 3px solid #dc2626; }

    .ot-alert-info {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }

    .ot-alert-name {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--sc-text-primary, #1e293b);
    }

    .ot-alert-job {
      font-size: 0.75rem;
      color: var(--sc-text-secondary, #64748b);
    }

    .ot-alert-hours {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      flex-shrink: 0;
    }

    .ot-hours-value {
      font-size: 1rem;
      font-weight: 800;
      color: var(--sc-text-primary, #1e293b);
    }

    .severity-amber .ot-hours-value { color: #f59e0b; }
    .severity-orange .ot-hours-value { color: #ea580c; }
    .severity-red .ot-hours-value { color: #dc2626; }

    .ot-hours-label {
      font-size: 0.65rem;
      color: var(--sc-text-secondary, #64748b);
    }

    /* -- Stats Panel -- */
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

    /* -- Responsive -- */
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
        min-height: 350px;
      }

      .panel-alerts,
      .panel-stats {
        grid-column: 1;
        grid-row: auto;
      }

      .fleet-map {
        height: 320px;
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
export class DashboardPage implements AfterViewInit, OnDestroy {
  private map: L.Map | null = null;

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

  drivers: DriverMarker[] = [
    { name: 'Marcus Johnson', lat: 39.7592, lng: -104.9703, status: 'active', clockedIn: '6:02 AM', jobType: 'Residential Pickup', hours: 32.5 },
    { name: 'Terrell Williams', lat: 39.7285, lng: -105.0153, status: 'active', clockedIn: '5:48 AM', jobType: 'Commercial Dumpster', hours: 34.0 },
    { name: 'Jake Hernandez', lat: 39.7450, lng: -104.9550, status: 'ot-risk', clockedIn: '5:30 AM', jobType: 'Roll-Off Delivery', hours: 38.5 },
    { name: 'DeShawn Carter', lat: 39.7100, lng: -104.9800, status: 'active', clockedIn: '6:15 AM', jobType: 'Residential Pickup', hours: 29.0 },
    { name: 'Miguel Rodriguez', lat: 39.7700, lng: -105.0300, status: 'ot-risk', clockedIn: '5:15 AM', jobType: 'Recycling Route', hours: 39.5 },
    { name: 'Chris Patterson', lat: 39.7350, lng: -104.9400, status: 'active', clockedIn: '6:30 AM', jobType: 'Bulk Waste', hours: 28.0 },
    { name: 'Andre Davis', lat: 39.7550, lng: -105.0050, status: 'active', clockedIn: '6:00 AM', jobType: 'Commercial Dumpster', hours: 33.5 },
    { name: 'Tony Ramirez', lat: 39.7200, lng: -105.0500, status: 'ot-risk', clockedIn: '5:45 AM', jobType: 'Roll-Off Pickup', hours: 35.5 },
    { name: 'Kevin Brooks', lat: 39.7650, lng: -104.9250, status: 'active', clockedIn: '6:10 AM', jobType: 'Residential Pickup', hours: 31.0 },
    { name: 'Luis Morales', lat: 39.7000, lng: -105.0100, status: 'active', clockedIn: '6:20 AM', jobType: 'Recycling Route', hours: 27.5 },
  ];

  otAlerts: OtAlert[] = [
    { name: 'Miguel Rodriguez', hours: 39.5, jobType: 'Recycling Route', severity: 'red' },
    { name: 'Jake Hernandez', hours: 38.5, jobType: 'Roll-Off Delivery', severity: 'orange' },
    { name: 'Tony Ramirez', hours: 35.5, jobType: 'Roll-Off Pickup', severity: 'amber' },
    { name: 'Terrell Williams', hours: 34.0, jobType: 'Commercial Dumpster', severity: 'amber' },
    { name: 'Andre Davis', hours: 33.5, jobType: 'Commercial Dumpster', severity: 'amber' },
  ];

  constructor(private ngZone: NgZone) {}

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
