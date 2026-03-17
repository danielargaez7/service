import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonButton,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonNote,
  IonButtons,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward, refreshOutline } from 'ionicons/icons';

type EntryStatus = 'PENDING' | 'APPROVED' | 'FLAGGED';

interface TimeEntry {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  hoursWorked: number | null;
  jobType: string;
  status: EntryStatus;
}

@Component({
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonButton,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    IonNote,
    IonButtons,
  ],
  selector: 'app-my-hours',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>My Hours</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="prevWeek()">
            <ion-icon slot="icon-only" name="chevron-back"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title size="small" class="week-label">{{ weekLabel() }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="nextWeek()">
            <ion-icon slot="icon-only" name="chevron-forward"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="onRefresh($event)">
        <ion-refresher-content pullingIcon="refresh-outline"></ion-refresher-content>
      </ion-refresher>

      <!-- Weekly Total -->
      <div class="weekly-total">
        <span class="total-label">Weekly Total</span>
        <span class="total-hours" [class.overtime]="weeklyTotal() > 40">
          {{ weeklyTotal().toFixed(1) }} hrs
        </span>
        @if (overtimeHours() > 0) {
          <span class="ot-badge">{{ overtimeHours().toFixed(1) }} OT</span>
        }
      </div>

      <!-- Daily Groups -->
      @for (group of dailyGroups(); track group.date) {
        <div class="day-group">
          <div class="day-header">
            <span class="day-name">{{ group.dayLabel }}</span>
            <span class="day-total">{{ group.totalHours.toFixed(1) }} hrs</span>
          </div>
          <ion-list lines="full">
            @for (entry of group.entries; track entry.id) {
              <ion-item>
                <ion-label>
                  <h3>{{ entry.clockIn }}{{ entry.clockOut ? ' – ' + entry.clockOut : '' }}</h3>
                  <p>{{ entry.jobType }}</p>
                </ion-label>
                <ion-note slot="end" class="entry-hours">
                  @if (entry.clockOut) {
                    {{ entry.hoursWorked?.toFixed(1) }} hrs
                  } @else {
                    <ion-badge color="primary">Active</ion-badge>
                  }
                </ion-note>
                <ion-badge
                  slot="end"
                  [color]="statusColor(entry.status)"
                  class="status-badge"
                >
                  {{ entry.status }}
                </ion-badge>
              </ion-item>
            }
          </ion-list>
        </div>
      }
    </ion-content>
  `,
  styles: [
    `
      .week-label {
        text-align: center;
        font-size: 0.95rem;
      }

      .weekly-total {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 16px;
        background: var(--sc-surface, #ffffff);
        border-bottom: 1px solid #e0e0e0;
      }

      .total-label {
        font-weight: 500;
        color: var(--sc-text-secondary, #666);
      }

      .total-hours {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--sc-text-primary, #222);
      }

      .total-hours.overtime {
        color: #f59e0b;
      }

      .ot-badge {
        background: #f59e0b;
        color: #fff;
        font-size: 0.75rem;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 12px;
      }

      .day-group {
        margin-bottom: 4px;
      }

      .day-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 16px 4px;
        background: var(--ion-color-light, #f4f5f8);
      }

      .day-name {
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--sc-text-primary, #222);
      }

      .day-total {
        font-weight: 500;
        font-size: 0.85rem;
        color: var(--sc-text-secondary, #666);
      }

      .entry-hours {
        font-weight: 500;
        margin-right: 8px;
      }

      .status-badge {
        font-size: 0.65rem;
        text-transform: uppercase;
      }
    `,
  ],
})
export class MyHoursPage {
  readonly weekOffset = signal(0);

  readonly weekStart = computed(() => {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7) + this.weekOffset() * 7);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  readonly weekEnd = computed(() => {
    const end = new Date(this.weekStart());
    end.setDate(end.getDate() + 6);
    return end;
  });

  readonly weekLabel = computed(() => {
    const fmt = (d: Date) => {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${months[d.getMonth()]} ${d.getDate()}`;
    };
    const start = this.weekStart();
    const end = this.weekEnd();
    return `${fmt(start)} \u2013 ${fmt(end)}, ${end.getFullYear()}`;
  });

  readonly entries = signal<TimeEntry[]>(this.buildMockEntries());

  readonly dailyGroups = computed(() => {
    const grouped = new Map<string, TimeEntry[]>();
    for (const entry of this.entries()) {
      const existing = grouped.get(entry.date) ?? [];
      existing.push(entry);
      grouped.set(entry.date, existing);
    }

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    return Array.from(grouped.entries()).map(([dateStr, entries]) => {
      const d = new Date(dateStr + 'T00:00:00');
      const totalHours = entries.reduce((sum, e) => sum + (e.hoursWorked ?? 0), 0);
      return {
        date: dateStr,
        dayLabel: `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`,
        entries,
        totalHours,
      };
    });
  });

  readonly weeklyTotal = computed(() =>
    this.entries().reduce((sum, e) => sum + (e.hoursWorked ?? 0), 0)
  );

  readonly overtimeHours = computed(() =>
    Math.max(0, this.weeklyTotal() - 40)
  );

  constructor() {
    addIcons({ chevronBack, chevronForward, refreshOutline });
  }

  prevWeek(): void {
    this.weekOffset.update((v) => v - 1);
    this.entries.set(this.buildMockEntries());
  }

  nextWeek(): void {
    this.weekOffset.update((v) => v + 1);
    this.entries.set(this.buildMockEntries());
  }

  onRefresh(event: CustomEvent): void {
    this.entries.set(this.buildMockEntries());
    setTimeout(() => {
      (event.target as HTMLIonRefresherElement).complete();
    }, 600);
  }

  statusColor(status: EntryStatus): string {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'FLAGGED': return 'danger';
      case 'PENDING': return 'medium';
    }
  }

  private buildMockEntries(): TimeEntry[] {
    const start = this.weekStart();
    const toDateStr = (d: Date) => d.toISOString().split('T')[0];

    const mon = new Date(start);
    const tue = new Date(start); tue.setDate(start.getDate() + 1);
    const wed = new Date(start); wed.setDate(start.getDate() + 2);
    const thu = new Date(start); thu.setDate(start.getDate() + 3);
    const fri = new Date(start); fri.setDate(start.getDate() + 4);

    return [
      {
        id: '1',
        date: toDateStr(mon),
        clockIn: '6:00 AM',
        clockOut: '2:30 PM',
        hoursWorked: 8.5,
        jobType: 'Route Delivery',
        status: 'APPROVED',
      },
      {
        id: '2',
        date: toDateStr(tue),
        clockIn: '5:45 AM',
        clockOut: '3:00 PM',
        hoursWorked: 9.25,
        jobType: 'Long Haul',
        status: 'APPROVED',
      },
      {
        id: '3',
        date: toDateStr(wed),
        clockIn: '6:15 AM',
        clockOut: '2:45 PM',
        hoursWorked: 8.5,
        jobType: 'Route Delivery',
        status: 'PENDING',
      },
      {
        id: '4',
        date: toDateStr(thu),
        clockIn: '6:00 AM',
        clockOut: '4:00 PM',
        hoursWorked: 10.0,
        jobType: 'Yard Work',
        status: 'FLAGGED',
      },
      {
        id: '5',
        date: toDateStr(fri),
        clockIn: '6:00 AM',
        clockOut: null,
        hoursWorked: null,
        jobType: 'Route Delivery',
        status: 'PENDING',
      },
    ];
  }
}
