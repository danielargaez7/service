import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../core/auth.service';
import { ManagerAlert, ManagerAlertsService } from '../core/manager-alerts.service';
import { ChatWidgetComponent } from '../shared/chat-widget.component';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: string;
}

interface NavSection {
  label: string;
  icon: string;
  items: NavItem[];
}

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule, ToastModule, ChatWidgetComponent],
  selector: 'app-shell',
  template: `
    <div class="shell" [class.sidebar-collapsed]="sidebarCollapsed()">
      <p-toast key="manager-alerts" position="top-right" />

      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <img class="sidebar-logo" src="/logo1.png" alt="ServiceCore logo" />
        </div>

        <nav class="sidebar-nav">
          <a
            class="nav-item nav-item-top"
            routerLink="dashboard"
            routerLinkActive="active"
            title="Dashboard"
          >
            <i class="pi pi-home"></i>
            <span class="nav-label" *ngIf="!sidebarCollapsed()">Dashboard</span>
          </a>

          @for (section of navSections; track section.label) {
            <section class="nav-section">
              <div class="nav-section-header" [title]="section.label">
                <div class="nav-section-title">
                  <i [class]="'pi ' + section.icon"></i>
                  <span *ngIf="!sidebarCollapsed()">{{ section.label }}</span>
                </div>
              </div>

              <div class="nav-section-items" *ngIf="!sidebarCollapsed(); else compactSection">
                @for (item of section.items; track item.label) {
                  <a
                    class="nav-subitem"
                    [routerLink]="item.route"
                    routerLinkActive="active"
                    [title]="item.label"
                  >
                    <span>{{ item.label }}</span>
                    @if (item.badge) {
                      <span class="nav-subitem-badge">{{ item.badge }}</span>
                    }
                  </a>
                }
              </div>

              <ng-template #compactSection>
                <div class="nav-section-items-collapsed">
                  @for (item of section.items; track item.label) {
                    <a
                      class="nav-item nav-item-collapsed"
                      [routerLink]="item.route"
                      routerLinkActive="active"
                      [title]="item.label"
                    >
                      <i [class]="'pi ' + item.icon"></i>
                    </a>
                  }
                </div>
              </ng-template>
            </section>
          }
        </nav>

        <div class="sidebar-footer">
          <a class="nav-item footer-link" routerLink="/settings" title="Settings">
            <i class="pi pi-cog"></i>
            <span class="nav-label" *ngIf="!sidebarCollapsed()">Settings</span>
          </a>
          <a class="nav-item footer-link" href="https://support.servicecore.com/hc/en-us" target="_blank" rel="noopener" title="Help & Support">
            <i class="pi pi-question-circle"></i>
            <span class="nav-label" *ngIf="!sidebarCollapsed()">Help</span>
          </a>
          <button class="collapse-btn" (click)="toggleSidebar()">
            <i class="pi" [class.pi-angle-left]="!sidebarCollapsed()" [class.pi-angle-right]="sidebarCollapsed()"></i>
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <div class="main-wrapper">
        <!-- Top Header -->
        <header class="top-header">
          <button class="mobile-menu-btn" (click)="toggleSidebar()">
            <i class="pi pi-bars"></i>
          </button>

          <div class="header-left">
            <h1 class="page-brand">ServiceCore <span class="brand-accent">Time</span></h1>
            <span class="location-btn" title="Current location">
              <i class="pi pi-map-marker"></i>
              <span class="location-label">Denver Depot</span>
            </span>
            <label class="search-shell">
              <i class="pi pi-search"></i>
              <input type="search" placeholder="Search employees, routes, reports..." />
            </label>
          </div>

          <div class="header-right">
            <div class="notification-anchor">
              <button
                class="notification-btn"
                type="button"
                (click)="toggleNotifications()"
                title="Notifications"
              >
                <i class="pi pi-bell"></i>
                @if (alerts.unreadCount() > 0) {
                  <span class="notification-badge">{{ alerts.unreadCount() }}</span>
                }
              </button>

              @if (notificationsOpen()) {
                <section class="notification-panel">
                  <div class="notification-panel-header">
                    <div>
                      <h3>Alerts</h3>
                      <p>{{ alerts.unreadCount() }} unread</p>
                    </div>
                    <button type="button" class="notification-link-btn" (click)="alerts.markAllRead()">
                      Mark all read
                    </button>
                  </div>

                  <div class="notification-list">
                    @for (alert of alerts.alerts(); track alert.id) {
                      <article class="notification-item" [class.unread]="!alert.read">
                        <div class="notification-icon" [class]="'tier-' + alert.tier">
                          <i [class]="alerts.tierIcon(alert.tier)"></i>
                        </div>

                        <div class="notification-copy">
                          <div class="notification-meta">
                            <span class="notification-tier">{{ alerts.tierLabel(alert.tier) }}</span>
                            <span>{{ alert.timestamp | date:'shortTime' }}</span>
                          </div>
                          <h4>{{ alert.title }}</h4>
                          <p>{{ alert.message }}</p>

                          <div class="notification-actions">
                            @if (!alert.read) {
                              <button type="button" class="notification-link-btn" (click)="alerts.markRead(alert.id)">
                                Acknowledge
                              </button>
                            }
                            @if (alert.route) {
                              <button type="button" class="notification-link-btn" (click)="openAlert(alert)">
                                Open
                              </button>
                            }
                            <button type="button" class="notification-link-btn" (click)="alerts.dismiss(alert.id)">
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </article>
                    } @empty {
                      <div class="notification-empty">
                        <i class="pi pi-check-circle"></i>
                        <p>No active alerts.</p>
                      </div>
                    }
                  </div>
                </section>
              }
            </div>

            <button class="theme-toggle-btn" (click)="toggleTheme()" [title]="isDarkMode() ? 'Switch to light mode' : 'Switch to dark mode'">
              <i class="pi" [class.pi-moon]="!isDarkMode()" [class.pi-sun]="isDarkMode()"></i>
            </button>
            <div class="user-info">
              <i class="pi pi-user"></i>
              <span class="user-name">{{ auth.getFullName() }}</span>
              <span class="user-role">{{ auth.getUserRole() }}</span>
            </div>
            <button class="logout-btn" (click)="auth.logout()" title="Sign out">
              <i class="pi pi-sign-out"></i>
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        <!-- Page Content -->
        <main class="page-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>

    <!-- AI Chat Widget -->
    @if (chatOpen()) {
      <app-chat-widget [visible]="chatOpen()" (visibleChange)="chatOpen.set($event)" />
    }

    <!-- AI Chat FAB -->
    <button class="chat-fab" [class.chat-open]="chatOpen()" (click)="openChat()" title="Ask ServiceCore AI">
      <i class="pi" [class.pi-comments]="!chatOpen()" [class.pi-times]="chatOpen()"></i>
    </button>

    <!-- Mobile overlay -->
    @if (mobileMenuOpen()) {
      <div class="mobile-overlay" (click)="toggleSidebar()"></div>
    }
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }

    .shell {
      display: flex;
      height: 100vh;
      background: var(--sc-page-bg);
    }

    /* ── Sidebar ── */
    .sidebar {
      width: 232px;
      background: var(--sc-sidebar-bg);
      color: #fff;
      display: flex;
      flex-direction: column;
      transition: width 0.25s ease;
      z-index: 100;
      flex-shrink: 0;
    }

    .sidebar-collapsed .sidebar {
      width: 60px;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 22px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .sidebar-logo {
      width: 100%;
      max-width: 42px;
      height: auto;
      object-fit: contain;
      display: block;
    }

    .sidebar-collapsed .sidebar-logo {
      max-width: 12px;
    }

    .sidebar-nav {
      flex: 1;
      padding: 16px 10px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      overflow-y: auto;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 10px;
      color: rgba(255, 255, 255, 0.65);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .nav-item-top {
      margin-bottom: 6px;
    }

    .nav-item:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #fff;
    }

    .sidebar .nav-item.active {
      background: var(--sc-orange) !important;
      color: #fff;
      box-shadow: 0 10px 24px rgba(255, 76, 0, 0.28);
    }

    .nav-item i {
      font-size: 1.15rem;
      width: 22px;
      text-align: center;
      flex-shrink: 0;
    }

    .nav-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .nav-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      color: rgba(255, 255, 255, 0.62);
      font-size: 0.82rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      padding: 4px 8px;
    }

    .nav-section-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .nav-section-items {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav-subitem {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 10px 12px 10px 18px;
      border-radius: 10px;
      color: rgba(255, 255, 255, 0.72);
      font-size: 0.86rem;
      font-weight: 500;
      text-decoration: none;
    }

    .nav-subitem:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #fff;
    }

    .nav-subitem.active {
      background: rgba(255, 76, 0, 0.18);
      color: #fff;
      box-shadow: inset 3px 0 0 var(--sc-orange);
    }

    .nav-subitem-badge {
      border-radius: var(--sc-radius-full);
      padding: 2px 8px;
      background: rgba(255, 76, 0, 0.18);
      color: #ffd7c6;
      font-size: 0.68rem;
      font-weight: 700;
    }

    .nav-section-items-collapsed {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav-item-collapsed {
      justify-content: center;
      padding: 10px 8px;
    }

    .sidebar-footer {
      padding: 14px 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .footer-link {
      color: rgba(255, 255, 255, 0.72);
    }

    .collapse-btn {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.4);
      cursor: pointer;
      padding: 8px 14px;
      border-radius: 6px;
      width: 100%;
      text-align: left;
      transition: all 0.15s ease;
    }

    .collapse-btn:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #fff;
    }

    /* ── Main Wrapper ── */
    .main-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
    }

    /* ── Top Header ── */
    .top-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      height: 64px;
      background: var(--sc-card-bg);
      border-bottom: 1px solid var(--sc-border);
      flex-shrink: 0;
      position: relative;
      z-index: 300;
    }

    .mobile-menu-btn {
      display: none;
      background: none;
      border: none;
      font-size: 1.25rem;
      color: var(--sc-text-secondary);
      cursor: pointer;
      padding: 6px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
      flex: 1;
    }

    .page-brand {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--sc-text-primary);
      margin: 0;
      white-space: nowrap;
    }

    .brand-accent {
      color: var(--sc-orange);
    }

    .location-btn {
      border: 1px solid var(--sc-border);
      background: var(--sc-card-bg);
      color: var(--sc-text-primary);
      border-radius: var(--sc-radius-full);
      min-height: 38px;
      padding: 0 12px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: var(--sc-text-sm);
      font-weight: 600;
      white-space: nowrap;
    }

    .location-label {
      color: var(--sc-text-primary);
    }

    .search-shell {
      flex: 1;
      min-width: 220px;
      max-width: 420px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 0 12px;
      min-height: 40px;
      border: 1px solid var(--sc-border);
      border-radius: 999px;
      background: var(--sc-gray-1);
      color: var(--sc-text-secondary);
    }

    .search-shell input {
      border: none;
      outline: none;
      background: transparent;
      width: 100%;
      color: var(--sc-text-primary);
      font-size: var(--sc-text-sm);
      font-family: inherit;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-shrink: 0;
    }

    .notification-anchor {
      position: relative;
    }

    .notification-btn {
      position: relative;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 1px solid var(--sc-border);
      background: var(--sc-card-bg);
      color: var(--sc-text-secondary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .notification-btn:hover {
      border-color: var(--sc-orange);
      color: var(--sc-orange);
    }

    .notification-badge {
      position: absolute;
      top: -4px;
      right: -3px;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 999px;
      background: var(--sc-danger-3);
      color: #fff;
      font-size: 0.68rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--sc-shadow-sm);
    }

    .notification-panel {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      width: min(420px, calc(100vw - 32px));
      max-height: 70vh;
      overflow: hidden;
      background: var(--sc-card-bg);
      border: 1px solid var(--sc-border);
      border-radius: var(--sc-radius-lg);
      box-shadow: var(--sc-shadow-lg);
      z-index: 500;
    }

    .notification-panel-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--sc-space-3);
      padding: var(--sc-space-4);
      border-bottom: 1px solid var(--sc-border);
    }

    .notification-panel-header h3,
    .notification-item h4 {
      margin: 0;
    }

    .notification-panel-header p {
      margin: 4px 0 0;
      color: var(--sc-text-secondary);
      font-size: var(--sc-text-xs);
    }

    .notification-list {
      max-height: calc(70vh - 72px);
      overflow-y: auto;
    }

    .notification-item {
      display: flex;
      gap: var(--sc-space-3);
      padding: var(--sc-space-4);
      border-bottom: 1px solid var(--sc-border);
    }

    .notification-item.unread {
      background: color-mix(in srgb, var(--sc-info-1) 28%, var(--sc-card-bg));
    }

    .notification-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .notification-icon.tier-critical {
      background: var(--sc-danger-1);
      color: var(--sc-danger-4);
    }

    .notification-icon.tier-high {
      background: var(--sc-warning-1);
      color: var(--sc-warning-4);
    }

    .notification-icon.tier-medium {
      background: var(--sc-info-1);
      color: var(--sc-info-4);
    }

    .notification-icon.tier-low {
      background: var(--sc-gray-1);
      color: var(--sc-gray-4);
    }

    .notification-copy {
      min-width: 0;
      flex: 1;
    }

    .notification-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sc-space-2);
      margin-bottom: 6px;
      color: var(--sc-text-secondary);
      font-size: var(--sc-text-xs);
    }

    .notification-tier {
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .notification-copy p {
      margin: 6px 0 0;
      color: var(--sc-text-secondary);
      font-size: var(--sc-text-sm);
      line-height: 1.45;
    }

    .notification-actions {
      display: flex;
      gap: var(--sc-space-3);
      margin-top: 10px;
    }

    .notification-link-btn {
      border: none;
      background: none;
      padding: 0;
      color: var(--sc-blue);
      font-size: var(--sc-text-xs);
      font-weight: 700;
      cursor: pointer;
    }

    .notification-empty {
      padding: var(--sc-space-6);
      text-align: center;
      color: var(--sc-text-secondary);
    }

    .notification-empty i {
      font-size: 1.25rem;
      color: var(--sc-success-3);
      margin-bottom: var(--sc-space-2);
    }

    .theme-toggle-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px solid var(--sc-border);
      background: var(--sc-card-bg);
      color: var(--sc-text-secondary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .theme-toggle-btn:hover {
      border-color: var(--sc-orange);
      color: var(--sc-orange);
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--sc-text-secondary);
      font-size: 0.875rem;
      padding: 8px 12px;
      border-radius: 999px;
      background: var(--sc-gray-1);
      border: 1px solid var(--sc-gray-2);
    }

    .user-info i {
      font-size: 1rem;
    }

    .user-name {
      font-weight: 600;
      color: var(--sc-text-primary);
    }

    .user-role {
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 3px 8px;
      background: var(--sc-orange-light);
      color: var(--sc-orange-dark);
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 600;
    }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--sc-card-bg);
      border: 1px solid var(--sc-border);
      padding: 8px 14px;
      border-radius: 10px;
      color: var(--sc-text-secondary);
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .logout-btn:hover {
      border-color: #ef4444;
      color: #ef4444;
      background: #fef2f2;
    }

    /* ── Page Content ── */
    .page-content {
      flex: 1;
      overflow-y: auto;
      padding: 22px 24px 28px;
      position: relative;
      z-index: 1;
    }

    /* ── Mobile ── */
    .mobile-overlay {
      display: none;
    }

    /* AI Chat FAB */
    .chat-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #f97316, #ea580c);
      color: white;
      font-size: 1.4rem;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(249, 115, 22, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      transition: all 0.2s ease;
    }
    .chat-fab:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 24px rgba(249, 115, 22, 0.5);
    }
    .chat-fab:active {
      transform: scale(0.95);
    }
    .chat-fab.chat-open {
      background: #64748b;
      box-shadow: 0 4px 16px rgba(100, 116, 139, 0.4);
    }

    @media (max-width: 1100px) {
      .search-shell {
        display: none;
      }

      .location-label {
        display: none;
      }

      .user-info .user-name,
      .user-info .user-role {
        display: none;
      }

      .logout-btn span {
        display: none;
      }
    }

    @media (max-width: 768px) {
      .sidebar {
        position: fixed;
        left: -232px;
        top: 0;
        height: 100vh;
        transition: left 0.25s ease;
      }

      .shell:not(.sidebar-collapsed) .sidebar {
        left: 0;
      }

      .sidebar-collapsed .sidebar {
        width: 232px;
        left: -232px;
      }

      .mobile-menu-btn {
        display: block;
      }

      .mobile-overlay {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        z-index: 99;
      }

      .collapse-btn {
        display: none;
      }

      .page-content {
        padding: 16px;
      }

      .top-header {
        padding: 0 16px;
      }

      .search-shell {
        display: none;
      }

      .user-role,
      .logout-btn span {
        display: none;
      }

      .notification-panel {
        right: -44px;
      }
    }
  `],
})
export class ShellComponent implements OnInit, OnDestroy {
  sidebarCollapsed = signal(false);
  mobileMenuOpen = signal(false);
  isDarkMode = signal(false);
  notificationsOpen = signal(false);
  chatOpen = signal(false);
  private mediaQuery: MediaQueryList | null = null;
  private readonly mediaChangeHandler = (event: MediaQueryListEvent): void => {
    if (localStorage.getItem('sc-theme')) return;
    this.applyTheme(event.matches, false);
  };

  navSections: NavSection[] = [
    {
      label: 'Workforce',
      icon: 'pi-users',
      items: [
        { label: 'Employees', icon: 'pi-users', route: 'employees' },
        { label: 'Timesheets', icon: 'pi-check-circle', route: 'timesheets' },
        { label: 'Schedule', icon: 'pi-calendar', route: 'schedule' },
        { label: 'Compliance', icon: 'pi-shield', route: 'compliance' },
      ],
    },
    {
      label: 'Finance',
      icon: 'pi-dollar',
      items: [
        { label: 'Payroll', icon: 'pi-dollar', route: 'payroll' },
        { label: 'Analytics', icon: 'pi-chart-line', route: 'analytics' },
      ],
    },
    {
      label: 'Tools',
      icon: 'pi-wrench',
      items: [
        { label: 'NLQ Assistant', icon: 'pi-comments', route: 'nlq' },
      ],
    },
  ];

  constructor(
    public auth: AuthService,
    public alerts: ManagerAlertsService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const savedTheme = localStorage.getItem('sc-theme');
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    if (savedTheme === 'dark') {
      this.applyTheme(true, false);
    } else if (savedTheme === 'light') {
      this.applyTheme(false, false);
    } else {
      this.applyTheme(this.mediaQuery.matches, false);
    }

    this.mediaQuery.addEventListener('change', this.mediaChangeHandler);
  }

  ngOnDestroy(): void {
    this.mediaQuery?.removeEventListener('change', this.mediaChangeHandler);
  }

  toggleSidebar(): void {
    if (window.innerWidth <= 768) {
      this.mobileMenuOpen.update((v) => !v);
      this.sidebarCollapsed.update((v) => !v);
    } else {
      this.sidebarCollapsed.update((v) => !v);
    }
  }

  toggleTheme(): void {
    this.applyTheme(!this.isDarkMode(), true);
  }

  toggleNotifications(): void {
    this.notificationsOpen.update((isOpen) => !isOpen);
  }

  openChat(): void {
    this.chatOpen.update(v => !v);
  }

  openAlert(alert: ManagerAlert): void {
    this.alerts.markRead(alert.id);
    this.notificationsOpen.set(false);
    if (alert.route) {
      void this.router.navigateByUrl(alert.route);
    }
  }

  private applyTheme(isDark: boolean, persist: boolean): void {
    this.isDarkMode.set(isDark);
    document.body.classList.toggle('dark-mode', isDark);
    if (persist) {
      localStorage.setItem('sc-theme', isDark ? 'dark' : 'light');
    }
  }
}
