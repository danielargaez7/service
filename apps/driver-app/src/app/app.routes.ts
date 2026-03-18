import { Route } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'kiosk-clock',
    loadComponent: () =>
      import('./features/clock/kiosk-clock.page').then((m) => m.KioskClockPage),
    canActivate: [authGuard],
  },
  {
    path: 'tabs',
    loadComponent: () =>
      import('./layout/tabs.page').then((m) => m.TabsPage),
    canActivate: [authGuard],
    children: [
      {
        path: 'today',
        loadComponent: () =>
          import('./features/today/today.page').then((m) => m.TodayPage),
      },
      {
        path: 'routes',
        loadComponent: () =>
          import('./features/routes/routes.page').then((m) => m.RoutesPage),
      },
      {
        path: 'hours',
        loadComponent: () =>
          import('./features/timesheet/my-hours.page').then(
            (m) => m.MyHoursPage
          ),
      },
      {
        path: 'pay',
        loadComponent: () =>
          import('./features/pay/pay.page').then((m) => m.PayPage),
      },
      {
        path: 'more',
        loadComponent: () =>
          import('./features/more/more.page').then((m) => m.MorePage),
      },
      {
        path: 'badges',
        loadComponent: () =>
          import('./features/badges/badges.page').then((m) => m.BadgesPage),
      },
      { path: '', redirectTo: 'today', pathMatch: 'full' },
    ],
  },
  { path: '', redirectTo: 'tabs', pathMatch: 'full' },
  { path: '**', redirectTo: 'tabs' },
];
