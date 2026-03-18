import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  signal,
} from '@angular/core';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  carOutline,
  cashOutline,
  checkmarkCircle,
  chevronForwardOutline,
  mapOutline,
  micOutline,
  timeOutline,
  warningOutline,
} from 'ionicons/icons';
import { GpsService, GpsPosition } from '../../core/gps.service';
import { OfflineQueueService, QueuedPunch } from '../../core/offline-queue.service';

type TodayState = 'before' | 'during' | 'after';

interface DriverNotification {
  title: string;
  body: string;
  read: boolean;
  icon: string;
  color: string;
}

@Component({
  standalone: true,
  selector: 'app-today',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonBadge,
    IonIcon,
    IonButton,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
  ],
  template: `
    <ion-content class="sc-today-content">
      @if (todayState() === 'before') {
        <ion-card class="sc-shift-card">
          <ion-card-header>
            <ion-card-subtitle>NEXT SHIFT</ion-card-subtitle>
            <ion-card-title>South Residential Route</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="shift-detail-row"><ion-icon name="time-outline"></ion-icon><span>5:30 AM - 2:30 PM</span></div>
            <div class="shift-detail-row"><ion-icon name="car-outline"></ion-icon><span>Truck #114 - CDL-A</span></div>
            <div class="shift-detail-row"><ion-icon name="map-outline"></ion-icon><span>42 stops · Est. 8.5 hours</span></div>
          </ion-card-content>
        </ion-card>

        <div class="sc-hos-mini">
          <span>DOT Hours Available</span>
          <div class="hos-bar-container">
            <div class="hos-bar" [style.width.%]="hosPercentRemaining()" [class]="hosStatusClass()"></div>
          </div>
          <span>{{ hosHoursRemaining() }}h remaining this week</span>
        </div>

        <div class="sc-clock-in-hero">
          <button class="sc-clock-in-btn" (click)="startClockIn()">CLOCK IN</button>
          <p class="sc-clock-in-hint">Tap to begin your pre-shift checklist</p>
        </div>

        <ion-list *ngIf="notifications().length > 0">
          <ion-list-header>
            <ion-label>Notifications</ion-label>
          </ion-list-header>
          @for (notif of notifications(); track notif.title) {
            <ion-item [class.unread]="!notif.read">
              <ion-icon [name]="notif.icon" slot="start" [color]="notif.color"></ion-icon>
              <ion-label>
                <h3>{{ notif.title }}</h3>
                <p>{{ notif.body }}</p>
              </ion-label>
              <ion-badge *ngIf="!notif.read" color="warning" slot="end">New</ion-badge>
            </ion-item>
          }
        </ion-list>
      }

      @if (todayState() === 'during') {
        <ion-card class="sc-shift-card sc-shift-active">
          <ion-card-header>
            <ion-badge color="success">CLOCKED IN</ion-badge>
            <ion-card-title>South Residential Route</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="shift-timer">
              <span class="timer-label">TIME WORKED</span>
              <span class="timer-value">{{ shiftDuration() }}</span>
            </div>
            <div class="shift-detail-row"><ion-icon name="cash-outline"></ion-icon><span>Estimated earnings: \${{ estimatedPay().toFixed(2) }}</span></div>
            <div class="shift-detail-row" *ngIf="hoursUntilOT() > 0">
              <ion-icon name="warning-outline" color="warning"></ion-icon>
              <span>{{ hoursUntilOT().toFixed(1) }}h until overtime</span>
            </div>
          </ion-card-content>
        </ion-card>

        <div class="sc-clock-out-area">
          <button class="sc-clock-out-btn" (click)="startClockOut()">CLOCK OUT</button>
          <button class="sc-break-btn" (click)="startBreak()">Take Break</button>
        </div>

        <ion-card class="sc-voice-card sc-advanced-feature" (click)="openVoiceFastFill()">
          <ion-card-content>
            <div class="voice-row">
              <ion-icon name="mic-outline" color="primary"></ion-icon>
              <span>Log job notes with your voice</span>
              <ion-icon name="chevron-forward-outline"></ion-icon>
            </div>
          </ion-card-content>
        </ion-card>
      }

      @if (todayState() === 'after') {
        <ion-card class="sc-shift-complete">
          <ion-card-content>
            <ion-icon name="checkmark-circle" color="success"></ion-icon>
            <h2>Great work today!</h2>
            <p>8h 25m · 42 stops completed</p>
            <p class="earnings">Estimated pay: \${{ todayEarnings().toFixed(2) }}</p>
          </ion-card-content>
        </ion-card>

        <ion-card class="sc-mood-card" *ngIf="showMoodSurvey()">
          <ion-card-content>
            <p>How was your shift?</p>
            <div class="mood-options">
              <button (click)="submitMood('great')">😀</button>
              <button (click)="submitMood('ok')">😐</button>
              <button (click)="submitMood('tough')">😩</button>
            </div>
          </ion-card-content>
        </ion-card>

        <ion-list>
          @for (notification of notifications(); track notification.title) {
            <ion-item>
              <ion-label>
                <h3>{{ notification.title }}</h3>
                <p>{{ notification.body }}</p>
              </ion-label>
              <ion-badge *ngIf="!notification.read" color="warning" slot="end">New</ion-badge>
            </ion-item>
          }
        </ion-list>
      }
    </ion-content>
  `,
  styles: [`
    .sc-today-content { --padding-start: 16px; --padding-end: 16px; --padding-top: 16px; }
    .sc-shift-card { margin-bottom: 16px; }
    .shift-detail-row { display: flex; align-items: center; gap: 8px; margin: 8px 0; color: var(--sc-text-secondary); }
    .sc-hos-mini { background: var(--sc-surface); border: 1px solid var(--sc-border); border-radius: 12px; padding: 12px; margin-bottom: 16px; }
    .hos-bar-container { height: 8px; border-radius: 999px; background: #e5e7eb; overflow: hidden; margin: 8px 0; }
    .hos-bar { height: 8px; background: var(--sc-success); }
    .hos-bar.warn { background: var(--sc-warning); }
    .hos-bar.danger { background: var(--sc-danger); }
    .sc-clock-in-hero { display: flex; flex-direction: column; align-items: center; padding: 48px 24px; }
    .sc-clock-in-btn {
      width: 200px;
      height: 200px;
      border-radius: 50%;
      background: var(--sc-orange);
      color: white;
      font-size: 1.5rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      border: none;
      box-shadow: 0 8px 32px rgba(255, 76, 0, 0.4);
      cursor: pointer;
      transition: transform 0.1s ease, box-shadow 0.1s ease;
    }
    .sc-clock-in-btn:active { transform: scale(0.95); box-shadow: 0 4px 16px rgba(255, 76, 0, 0.3); }
    .sc-clock-in-hint { color: var(--sc-text-secondary); font-size: 0.9rem; margin-top: 12px; }
    .sc-shift-active { border-left: 4px solid var(--sc-success); }
    .shift-timer { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
    .timer-label { font-size: 0.75rem; color: var(--sc-text-secondary); }
    .timer-value { font-size: 1.8rem; font-weight: 800; }
    .sc-clock-out-area { display: flex; flex-direction: column; gap: 12px; margin: 12px 0 20px; }
    .sc-clock-out-btn, .sc-break-btn { min-height: 56px; border-radius: 12px; border: none; font-weight: 700; }
    .sc-clock-out-btn { background: var(--sc-danger); color: white; }
    .sc-break-btn { background: #f3f4f6; color: #374151; }
    .sc-voice-card { cursor: pointer; }
    .voice-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .voice-row span { flex: 1; font-weight: 600; color: var(--sc-text-primary); }
    .sc-shift-complete ion-card-content { text-align: center; }
    .sc-shift-complete h2 { margin: 10px 0 6px; }
    .earnings { font-weight: 700; color: #166534; }
    .mood-options { display: flex; justify-content: center; gap: 16px; }
    .mood-options button { font-size: 1.7rem; border: none; background: transparent; }
    ion-item.unread { --background: #fff7ed; }
  `],
})
export class TodayPage implements OnInit, OnDestroy {
  readonly todayState = signal<TodayState>('before');
  readonly shiftSeconds = signal(0);
  readonly showMoodSurvey = signal(false);
  readonly hosHoursRemaining = signal(24);
  readonly notifications = signal<DriverNotification[]>([
    { title: 'Route update', body: 'Stop #12 moved due to traffic.', read: false, icon: 'map-outline', color: 'warning' },
    { title: 'Truck assignment', body: 'Truck #114 passed pre-trip inspection.', read: false, icon: 'car-outline', color: 'success' },
    { title: 'Timesheet synced', body: 'Yesterday clock-out approved.', read: true, icon: 'cash-outline', color: 'primary' },
  ]);

  readonly hosPercentRemaining = computed(() => Math.max(0, Math.min(100, (this.hosHoursRemaining() / 60) * 100)));
  readonly hosStatusClass = computed(() => this.hosHoursRemaining() <= 8 ? 'danger' : this.hosHoursRemaining() <= 16 ? 'warn' : '');
  readonly shiftDuration = computed(() => {
    const total = this.shiftSeconds();
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  });
  readonly estimatedPay = computed(() => (this.shiftSeconds() / 3600) * 28);
  readonly hoursUntilOT = computed(() => Math.max(0, 40 - (32 + this.shiftSeconds() / 3600)));
  readonly todayEarnings = computed(() => 235 + this.estimatedPay());

  private shiftTimer: ReturnType<typeof setInterval> | null = null;
  private clockInAt: Date | null = null;
  private lastGps: GpsPosition | null = null;

  constructor(
    private gpsService: GpsService,
    private offlineQueue: OfflineQueueService
  ) {
    addIcons({
      timeOutline,
      carOutline,
      mapOutline,
      cashOutline,
      warningOutline,
      checkmarkCircle,
      micOutline,
      chevronForwardOutline,
    });
  }

  ngOnInit(): void {
    const raw = localStorage.getItem('sc_today_clock');
    if (!raw) return;
    try {
      const state = JSON.parse(raw) as { clockedInAt?: string; state?: TodayState };
      if (state.state === 'during' && state.clockedInAt) {
        this.todayState.set('during');
        this.clockInAt = new Date(state.clockedInAt);
        this.startShiftTimer();
      } else if (state.state === 'after') {
        this.todayState.set('after');
        this.showMoodSurvey.set(true);
      }
    } catch {
      // ignore bad local state
    }
  }

  ngOnDestroy(): void {
    if (this.shiftTimer) clearInterval(this.shiftTimer);
  }

  async startClockIn(): Promise<void> {
    this.todayState.set('during');
    this.clockInAt = new Date();
    this.persistTodayState();
    this.startShiftTimer();

    const gps = await this.safeGetGps();
    this.queuePunch('IN', gps);
  }

  async startClockOut(): Promise<void> {
    this.todayState.set('after');
    this.persistTodayState();
    if (this.shiftTimer) clearInterval(this.shiftTimer);
    this.showMoodSurvey.set(true);

    const gps = await this.safeGetGps();
    this.queuePunch('OUT', gps);
  }

  startBreak(): void {
    this.notifications.update((items) => [
      { title: 'Break started', body: 'Your unpaid break timer has started.', read: false, icon: 'time-outline', color: 'primary' },
      ...items,
    ]);
  }

  openVoiceFastFill(): void {
    this.notifications.update((items) => [
      { title: 'Voice FastFill', body: 'Voice note shortcut will be available in the next driver release.', read: false, icon: 'mic-outline', color: 'primary' },
      ...items,
    ]);
  }

  submitMood(_mood: 'great' | 'ok' | 'tough'): void {
    this.showMoodSurvey.set(false);
  }

  private startShiftTimer(): void {
    if (this.shiftTimer) clearInterval(this.shiftTimer);
    this.shiftTimer = setInterval(() => {
      if (!this.clockInAt) return;
      this.shiftSeconds.set(Math.floor((Date.now() - this.clockInAt.getTime()) / 1000));
    }, 1000);
  }

  private persistTodayState(): void {
    localStorage.setItem('sc_today_clock', JSON.stringify({
      state: this.todayState(),
      clockedInAt: this.clockInAt?.toISOString(),
    }));
  }

  private async safeGetGps(): Promise<GpsPosition> {
    try {
      const gps = await this.gpsService.getCurrentPosition();
      this.lastGps = gps;
      return gps;
    } catch {
      return this.lastGps ?? { lat: 0, lng: 0, accuracy: 9999 };
    }
  }

  private queuePunch(type: 'IN' | 'OUT', gps: GpsPosition): void {
    const punch: QueuedPunch = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      timestamp: new Date().toISOString(),
      gps,
      jobType: 'Residential',
      syncStatus: 'PENDING',
    };
    this.offlineQueue.queuePunch(punch);
    void this.offlineQueue.syncAll();
  }
}
