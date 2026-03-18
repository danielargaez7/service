import { computed, Injectable, signal } from '@angular/core';
import { MessageService } from 'primeng/api';

export type ManagerAlertTier = 'critical' | 'high' | 'medium' | 'low';

export interface ManagerAlert {
  id: string;
  tier: ManagerAlertTier;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  route?: string;
}

interface NotifyOptions {
  tier: ManagerAlertTier;
  title: string;
  message: string;
  route?: string;
}

const INITIAL_ALERTS: ManagerAlert[] = [
  {
    id: 'seed-critical-cdl',
    tier: 'critical',
    title: 'CDL expired',
    message: 'Carlos Mendoza must be taken off route until licensing is renewed.',
    timestamp: new Date('2026-03-17T07:20:00'),
    read: false,
    route: '/compliance',
  },
  {
    id: 'seed-high-payroll',
    tier: 'high',
    title: 'Payroll review needed',
    message: 'Three flagged pre-payroll items need manager review before export.',
    timestamp: new Date('2026-03-17T08:05:00'),
    read: false,
    route: '/payroll',
  },
  {
    id: 'seed-medium-route',
    tier: 'medium',
    title: 'Route mismatch detected',
    message: 'One driver clocked in from the wrong depot and should be reviewed today.',
    timestamp: new Date('2026-03-17T08:40:00'),
    read: false,
    route: '/timesheets',
  },
];

@Injectable({ providedIn: 'root' })
export class ManagerAlertsService {
  readonly alerts = signal<ManagerAlert[]>(INITIAL_ALERTS);
  readonly unreadCount = computed(() =>
    this.alerts().filter((alert) => !alert.read).length
  );

  constructor(private readonly messageService: MessageService) {}

  notify(options: NotifyOptions): void {
    const alert: ManagerAlert = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
      ...options,
    };

    this.alerts.update((alerts) => [alert, ...alerts]);

    this.messageService.add({
      key: 'manager-alerts',
      severity: this.getToastSeverity(options.tier),
      summary: options.title,
      detail: options.message,
      sticky: options.tier === 'critical',
      life: this.getToastLife(options.tier),
      styleClass: `sc-toast sc-toast-${options.tier}`,
    });
  }

  markRead(id: string): void {
    this.alerts.update((alerts) =>
      alerts.map((alert) => (alert.id === id ? { ...alert, read: true } : alert))
    );
  }

  markAllRead(): void {
    this.alerts.update((alerts) =>
      alerts.map((alert) => ({ ...alert, read: true }))
    );
  }

  dismiss(id: string): void {
    this.alerts.update((alerts) => alerts.filter((alert) => alert.id !== id));
  }

  critical(title: string, message: string, route?: string): void {
    this.notify({ tier: 'critical', title, message, route });
  }

  high(title: string, message: string, route?: string): void {
    this.notify({ tier: 'high', title, message, route });
  }

  medium(title: string, message: string, route?: string): void {
    this.notify({ tier: 'medium', title, message, route });
  }

  low(title: string, message: string, route?: string): void {
    this.notify({ tier: 'low', title, message, route });
  }

  tierLabel(tier: ManagerAlertTier): string {
    switch (tier) {
      case 'critical':
        return 'Critical';
      case 'high':
        return 'High';
      case 'medium':
        return 'Medium';
      case 'low':
        return 'Low';
    }
  }

  tierIcon(tier: ManagerAlertTier): string {
    switch (tier) {
      case 'critical':
        return 'pi pi-exclamation-circle';
      case 'high':
        return 'pi pi-exclamation-triangle';
      case 'medium':
        return 'pi pi-info-circle';
      case 'low':
        return 'pi pi-bell';
    }
  }

  private getToastSeverity(tier: ManagerAlertTier): string {
    switch (tier) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warn';
      case 'medium':
        return 'info';
      case 'low':
        return 'secondary';
    }
  }

  private getToastLife(tier: ManagerAlertTier): number {
    switch (tier) {
      case 'critical':
        return 0;
      case 'high':
        return 8000;
      case 'medium':
        return 6000;
      case 'low':
        return 4500;
    }
  }
}
