import { Route } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then(
            (m) => m.DashboardPage
          ),
      },
      {
        path: 'employees',
        loadComponent: () =>
          import('./features/employees/employees.page').then(
            (m) => m.EmployeesPage
          ),
      },
      {
        path: 'employees/:id',
        loadComponent: () =>
          import('./features/employees/employee-detail.page').then(
            (m) => m.EmployeeDetailPage
          ),
      },
      {
        path: 'timesheets',
        loadComponent: () =>
          import('./features/timesheets/timesheets.page').then(
            (m) => m.TimesheetsPage
          ),
      },
      {
        path: 'payroll',
        loadComponent: () =>
          import('./features/payroll/payroll.page').then(
            (m) => m.PayrollPage
          ),
      },
      {
        path: 'payroll/issues',
        loadComponent: () =>
          import('./features/payroll/payroll-issues.page').then(
            (m) => m.PayrollIssuesPage
          ),
      },
      {
        path: 'compliance',
        loadComponent: () =>
          import('./features/compliance/compliance.page').then(
            (m) => m.CompliancePage
          ),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./features/analytics/analytics.page').then(
            (m) => m.AnalyticsPage
          ),
      },
      {
        path: 'schedule',
        loadComponent: () =>
          import('./features/schedule/schedule.page').then(
            (m) => m.SchedulePage
          ),
      },
      {
        path: 'nlq',
        loadComponent: () =>
          import('./features/nlq/nlq.page').then((m) => m.NlqPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
