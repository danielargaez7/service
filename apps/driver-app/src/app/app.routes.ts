import { Route } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'tabs',
    loadComponent: () =>
      import('./layout/tabs.page').then((m) => m.TabsPage),
    canActivate: [authGuard],
    children: [
      {
        path: 'clock',
        loadComponent: () =>
          import('./features/clock/clock.page').then((m) => m.ClockPage),
      },
      {
        path: 'hours',
        loadComponent: () =>
          import('./features/timesheet/my-hours.page').then(
            (m) => m.MyHoursPage
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.page').then(
            (m) => m.ProfilePage
          ),
      },
      { path: '', redirectTo: 'clock', pathMatch: 'full' },
    ],
  },
  { path: '', redirectTo: 'tabs', pathMatch: 'full' },
  { path: '**', redirectTo: 'tabs' },
];
