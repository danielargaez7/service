import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../core/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  selector: 'app-shell',
  template: `
    <div class="shell" [class.sidebar-collapsed]="sidebarCollapsed()">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <span class="logo-icon pi pi-bolt"></span>
          <span class="logo-text" *ngIf="!sidebarCollapsed()">ServiceCore</span>
        </div>

        <nav class="sidebar-nav">
          @for (item of navItems; track item.route) {
            <a
              class="nav-item"
              [routerLink]="item.route"
              routerLinkActive="active"
              [title]="item.label"
            >
              <i [class]="'pi ' + item.icon"></i>
              <span class="nav-label" *ngIf="!sidebarCollapsed()">{{ item.label }}</span>
            </a>
          }
        </nav>

        <div class="sidebar-footer">
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
          </div>

          <div class="header-right">
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
      background: var(--sc-bg-primary, #f4f6f9);
    }

    /* ── Sidebar ── */
    .sidebar {
      width: 260px;
      background: var(--sc-sidebar-bg, #1a1f36);
      color: #fff;
      display: flex;
      flex-direction: column;
      transition: width 0.25s ease;
      z-index: 100;
      flex-shrink: 0;
    }

    .sidebar-collapsed .sidebar {
      width: 68px;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .logo-icon {
      font-size: 1.5rem;
      color: var(--sc-accent, #4f8cff);
    }

    .logo-text {
      font-size: 1.2rem;
      font-weight: 700;
      letter-spacing: -0.3px;
      white-space: nowrap;
    }

    .sidebar-nav {
      flex: 1;
      padding: 12px 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 14px;
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.65);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .nav-item:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #fff;
    }

    .nav-item.active {
      background: var(--sc-accent, #4f8cff);
      color: #fff;
      box-shadow: 0 2px 8px rgba(79, 140, 255, 0.3);
    }

    .nav-item i {
      font-size: 1.15rem;
      width: 22px;
      text-align: center;
      flex-shrink: 0;
    }

    .sidebar-footer {
      padding: 12px 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
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
      padding: 0 28px;
      height: 60px;
      background: #fff;
      border-bottom: 1px solid var(--sc-border, #e2e6ed);
      flex-shrink: 0;
    }

    .mobile-menu-btn {
      display: none;
      background: none;
      border: none;
      font-size: 1.25rem;
      color: var(--sc-text-secondary, #64748b);
      cursor: pointer;
      padding: 6px;
    }

    .page-brand {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--sc-text-primary, #1e293b);
      margin: 0;
    }

    .brand-accent {
      color: var(--sc-accent, #4f8cff);
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--sc-text-secondary, #64748b);
      font-size: 0.875rem;
    }

    .user-info i {
      font-size: 1rem;
    }

    .user-name {
      font-weight: 600;
      color: var(--sc-text-primary, #1e293b);
    }

    .user-role {
      text-transform: capitalize;
      padding: 2px 8px;
      background: var(--sc-accent-light, #eef4ff);
      color: var(--sc-accent, #4f8cff);
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      background: none;
      border: 1px solid var(--sc-border, #e2e6ed);
      padding: 7px 14px;
      border-radius: 6px;
      color: var(--sc-text-secondary, #64748b);
      font-size: 0.85rem;
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
      padding: 24px 28px;
    }

    /* ── Mobile ── */
    .mobile-overlay {
      display: none;
    }

    @media (max-width: 768px) {
      .sidebar {
        position: fixed;
        left: -260px;
        top: 0;
        height: 100vh;
        transition: left 0.25s ease;
      }

      .shell:not(.sidebar-collapsed) .sidebar {
        left: 0;
      }

      .sidebar-collapsed .sidebar {
        width: 260px;
        left: -260px;
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

      .user-role,
      .logout-btn span {
        display: none;
      }
    }
  `],
})
export class ShellComponent {
  sidebarCollapsed = signal(false);
  mobileMenuOpen = signal(false);

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'pi-home', route: 'dashboard' },
    { label: 'Timesheets', icon: 'pi-clock', route: 'timesheets' },
    { label: 'Payroll', icon: 'pi-dollar', route: 'payroll' },
    { label: 'Compliance', icon: 'pi-shield', route: 'compliance' },
    { label: 'Analytics', icon: 'pi-chart-bar', route: 'analytics' },
    { label: 'Schedule', icon: 'pi-calendar', route: 'schedule' },
    { label: 'NLQ', icon: 'pi-comments', route: 'nlq' },
  ];

  constructor(public auth: AuthService) {}

  toggleSidebar(): void {
    if (window.innerWidth <= 768) {
      this.mobileMenuOpen.update((v) => !v);
      this.sidebarCollapsed.update((v) => !v);
    } else {
      this.sidebarCollapsed.update((v) => !v);
    }
  }
}
