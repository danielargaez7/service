import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cashOutline,
  chevronBack,
  chevronForward,
  documentTextOutline,
  refreshOutline,
  timeOutline,
  warningOutline,
} from 'ionicons/icons';

type EntryStatus = 'PENDING' | 'APPROVED' | 'FLAGGED' | 'SYNCED';

interface TimeEntry {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  regularHours: number;
  overtimeHours: number;
  estimatedGross: number;
  jobType: string;
  status: EntryStatus;
  correctionNote?: string;
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
    <ion-header translucent="true">
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

    <ion-content class="hours-content">
      <ion-refresher slot="fixed" (ionRefresh)="onRefresh($event)">
        <ion-refresher-content pullingIcon="refresh-outline"></ion-refresher-content>
      </ion-refresher>

      <section class="hours-hero">
        <div>
          <p class="eyebrow">Week Snapshot</p>
          <h1>{{ weeklyTotal().toFixed(1) }} hrs</h1>
          <p>{{ approvedHours().toFixed(1) }} approved · {{ pendingHours().toFixed(1) }} pending review</p>
        </div>
        @if (overtimeHours() > 0) {
          <div class="hero-pill overtime">{{ overtimeHours().toFixed(1) }} OT</div>
        } @else {
          <div class="hero-pill clean">No OT risk</div>
        }
      </section>

      <div class="summary-strip">
        <div class="summary-card">
          <ion-icon name="cash-outline"></ion-icon>
          <strong>{{ '$' + estimatedGross().toFixed(0) }}</strong>
          <span>Est. gross</span>
        </div>
        <div class="summary-card">
          <ion-icon name="document-text-outline"></ion-icon>
          <strong>{{ approvedCount() }}/{{ entries().length }}</strong>
          <span>Entries approved</span>
        </div>
        <div class="summary-card warning" [class.active]="flaggedEntries().length > 0">
          <ion-icon name="warning-outline"></ion-icon>
          <strong>{{ flaggedEntries().length }}</strong>
          <span>Need correction</span>
        </div>
      </div>

      @if (flaggedEntries().length > 0) {
        <section class="correction-banner">
          <strong>Manager follow-up needed</strong>
          <p>{{ flaggedEntries()[0].correctionNote }}</p>
        </section>
      }

      @for (group of dailyGroups(); track group.date) {
        <section class="day-group">
          <div class="day-header">
            <div>
              <strong>{{ group.dayLabel }}</strong>
              <span>{{ group.entries.length }} shift {{ group.entries.length === 1 ? 'entry' : 'entries' }}</span>
            </div>
            <div class="day-totals">
              <span>{{ group.totalHours.toFixed(1) }} hrs</span>
              <span>{{ '$' + group.totalPay.toFixed(0) }}</span>
            </div>
          </div>

          <ion-list lines="none">
            @for (entry of group.entries; track entry.id) {
              <ion-item class="entry-card">
                <ion-label>
                  <div class="entry-header">
                    <h3>{{ entry.jobType }}</h3>
                    <ion-badge [color]="statusColor(entry.status)">{{ entry.status }}</ion-badge>
                  </div>
                  <p>{{ entry.clockIn }}{{ entry.clockOut ? ' - ' + entry.clockOut : ' - Active' }}</p>
                  <div class="entry-meta">
                    <span><ion-icon name="time-outline"></ion-icon> {{ (entry.regularHours + entry.overtimeHours).toFixed(1) }} hrs</span>
                    <span>Regular {{ entry.regularHours.toFixed(1) }}</span>
                    @if (entry.overtimeHours > 0) {
                      <span class="meta-overtime">OT {{ entry.overtimeHours.toFixed(1) }}</span>
                    }
                    <span>{{ '$' + entry.estimatedGross.toFixed(0) }}</span>
                  </div>
                  @if (entry.correctionNote) {
                    <p class="correction-note">{{ entry.correctionNote }}</p>
                  }
                </ion-label>
                <ion-note slot="end" class="pay-note">
                  {{ entry.status === 'APPROVED' ? 'Payroll ready' : entry.status === 'PENDING' ? 'Awaiting review' : entry.status === 'FLAGGED' ? 'Needs fix' : 'Synced' }}
                </ion-note>
              </ion-item>
            }
          </ion-list>
        </section>
      }
    </ion-content>
  `,
  styles: [
    `
      .hours-content {
        --background: linear-gradient(180deg, #f8fafc 0%, #eff6ff 100%);
      }

      .week-label {
        text-align: center;
        font-size: 0.95rem;
      }

      .hours-hero {
        padding: 20px 16px 14px;
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
      }

      .eyebrow {
        margin: 0 0 4px;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--sc-text-secondary);
      }

      .hours-hero h1 {
        margin: 0 0 6px;
        font-size: 2rem;
        color: var(--sc-text);
      }

      .hours-hero p {
        margin: 0;
        color: var(--sc-text-secondary);
      }

      .hero-pill {
        padding: 10px 14px;
        border-radius: 999px;
        font-size: 0.78rem;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .hero-pill.overtime {
        background: rgba(245, 158, 11, 0.15);
        color: #b45309;
      }

      .hero-pill.clean {
        background: rgba(34, 197, 94, 0.12);
        color: #15803d;
      }

      .summary-strip {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        padding: 0 16px 16px;
      }

      .summary-card {
        background: rgba(255, 255, 255, 0.92);
        border-radius: 22px;
        border: 1px solid rgba(226, 232, 240, 0.9);
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        box-shadow: 0 12px 34px rgba(15, 23, 42, 0.05);
      }

      .summary-card ion-icon {
        color: var(--sc-orange);
        font-size: 1.1rem;
      }

      .summary-card.warning.active {
        border-color: rgba(239, 68, 68, 0.25);
      }

      .summary-card strong,
      .day-header strong,
      .entry-header h3 {
        color: var(--sc-text);
      }

      .summary-card span,
      .day-header span {
        color: var(--sc-text-secondary);
      }

      .correction-banner {
        margin: 0 16px 16px;
        padding: 14px 16px;
        border-radius: 18px;
        background: rgba(254, 242, 242, 0.95);
        border: 1px solid rgba(239, 68, 68, 0.18);
      }

      .correction-banner strong {
        display: block;
        color: #b91c1c;
      }

      .correction-banner p,
      .correction-note {
        margin: 6px 0 0;
        color: #7f1d1d;
      }

      .day-group {
        padding: 0 16px 16px;
      }

      .day-header {
        display: flex;
        justify-content: space-between;
        align-items: end;
        margin-bottom: 10px;
      }

      .day-header div {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .day-totals {
        text-align: right;
      }

      .entry-card {
        --background: rgba(255, 255, 255, 0.96);
        --border-radius: 20px;
        margin-bottom: 10px;
        border: 1px solid rgba(226, 232, 240, 0.9);
      }

      .entry-header {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: center;
      }

      .entry-meta {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 8px;
        color: var(--sc-text-secondary);
        font-size: 0.82rem;
      }

      .entry-meta span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .meta-overtime {
        color: #b45309;
        font-weight: 700;
      }

      .pay-note {
        font-size: 0.78rem;
        font-weight: 700;
        color: var(--sc-text-secondary);
      }

      @media (max-width: 640px) {
        .summary-strip {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class MyHoursPage {
  readonly weekOffset = signal(0);
  readonly entries = signal<TimeEntry[]>(this.buildMockEntries());

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
    const fmt = (d: Date) =>
      d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${fmt(this.weekStart())} - ${fmt(this.weekEnd())}`;
  });

  readonly dailyGroups = computed(() => {
    const grouped = new Map<string, TimeEntry[]>();
    for (const entry of this.entries()) {
      grouped.set(entry.date, [...(grouped.get(entry.date) ?? []), entry]);
    }

    return Array.from(grouped.entries()).map(([date, entries]) => {
      const totalHours = entries.reduce(
        (sum, entry) => sum + entry.regularHours + entry.overtimeHours,
        0
      );
      const totalPay = entries.reduce((sum, entry) => sum + entry.estimatedGross, 0);
      return {
        date,
        dayLabel: new Date(`${date}T00:00:00`).toLocaleDateString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        entries,
        totalHours,
        totalPay,
      };
    });
  });

  readonly weeklyTotal = computed(() =>
    this.entries().reduce(
      (sum, entry) => sum + entry.regularHours + entry.overtimeHours,
      0
    )
  );
  readonly overtimeHours = computed(() =>
    this.entries().reduce((sum, entry) => sum + entry.overtimeHours, 0)
  );
  readonly estimatedGross = computed(() =>
    this.entries().reduce((sum, entry) => sum + entry.estimatedGross, 0)
  );
  readonly approvedHours = computed(() =>
    this.entries()
      .filter((entry) => entry.status === 'APPROVED')
      .reduce((sum, entry) => sum + entry.regularHours + entry.overtimeHours, 0)
  );
  readonly pendingHours = computed(() =>
    this.entries()
      .filter((entry) => entry.status === 'PENDING')
      .reduce((sum, entry) => sum + entry.regularHours + entry.overtimeHours, 0)
  );
  readonly approvedCount = computed(
    () => this.entries().filter((entry) => entry.status === 'APPROVED').length
  );
  readonly flaggedEntries = computed(() =>
    this.entries().filter((entry) => entry.status === 'FLAGGED')
  );

  constructor() {
    addIcons({
      cashOutline,
      chevronBack,
      chevronForward,
      documentTextOutline,
      refreshOutline,
      timeOutline,
      warningOutline,
    });
  }

  prevWeek(): void {
    this.weekOffset.update((value) => value - 1);
    this.entries.set(this.buildMockEntries());
  }

  nextWeek(): void {
    this.weekOffset.update((value) => value + 1);
    this.entries.set(this.buildMockEntries());
  }

  onRefresh(event: CustomEvent): void {
    this.entries.set(this.buildMockEntries());
    setTimeout(() => {
      (event.target as HTMLIonRefresherElement).complete();
    }, 500);
  }

  statusColor(status: EntryStatus): string {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'FLAGGED':
        return 'danger';
      case 'PENDING':
        return 'warning';
      case 'SYNCED':
        return 'medium';
    }
  }

  private buildMockEntries(): TimeEntry[] {
    const start = this.weekStart();
    const toDateStr = (date: Date) => date.toISOString().split('T')[0];
    const mon = new Date(start);
    const tue = new Date(start);
    tue.setDate(start.getDate() + 1);
    const wed = new Date(start);
    wed.setDate(start.getDate() + 2);
    const thu = new Date(start);
    thu.setDate(start.getDate() + 3);
    const fri = new Date(start);
    fri.setDate(start.getDate() + 4);

    return [
      {
        id: '1',
        date: toDateStr(mon),
        clockIn: '6:00 AM',
        clockOut: '2:35 PM',
        regularHours: 8,
        overtimeHours: 0.4,
        estimatedGross: 252,
        jobType: 'Residential pickup',
        status: 'APPROVED',
      },
      {
        id: '2',
        date: toDateStr(tue),
        clockIn: '5:42 AM',
        clockOut: '3:08 PM',
        regularHours: 8,
        overtimeHours: 1.4,
        estimatedGross: 297,
        jobType: 'Septic route',
        status: 'APPROVED',
      },
      {
        id: '3',
        date: toDateStr(wed),
        clockIn: '6:11 AM',
        clockOut: '2:59 PM',
        regularHours: 8,
        overtimeHours: 0.7,
        estimatedGross: 261,
        jobType: 'Commercial pickup',
        status: 'PENDING',
      },
      {
        id: '4',
        date: toDateStr(thu),
        clockIn: '6:00 AM',
        clockOut: '4:18 PM',
        regularHours: 8,
        overtimeHours: 2.0,
        estimatedGross: 324,
        jobType: 'Roll-off swap',
        status: 'FLAGGED',
        correctionNote: 'Manager flagged this shift: missing 30-minute lunch confirmation between Stop 14 and Stop 15.',
      },
      {
        id: '5',
        date: toDateStr(fri),
        clockIn: '6:03 AM',
        clockOut: null,
        regularHours: 6.2,
        overtimeHours: 0,
        estimatedGross: 186,
        jobType: 'Residential pickup',
        status: 'PENDING',
      },
    ];
  }
}
