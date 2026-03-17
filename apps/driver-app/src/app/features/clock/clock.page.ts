import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  IonChip,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonBadge,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircle,
  warning,
  logInOutline,
  logOutOutline,
  locationOutline,
} from 'ionicons/icons';
import { GpsService, GpsPosition } from '../../core/gps.service';
import {
  OfflineQueueService,
  QueuedPunch,
} from '../../core/offline-queue.service';

const JOB_TYPES = [
  'Residential',
  'Commercial',
  'Industrial',
  'Emergency',
  'Maintenance',
  'Inspection',
  'Installation',
  'Repair',
] as const;

@Component({
  standalone: true,
  selector: 'app-clock',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonIcon,
    IonChip,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonBadge,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>ServiceCore</ion-title>
        <ion-badge slot="end" style="margin-right: 16px" color="medium">
          HOS: {{ hosRemaining() }}
        </ion-badge>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding" [scrollY]="false">
      <div class="clock-container">
        <!-- Current Time -->
        <div class="current-time">{{ currentTime() }}</div>

        <!-- Status -->
        <div class="status-text" [class.clocked-in]="clockedIn()">
          @if (clockedIn()) {
            CLOCKED IN &mdash; {{ elapsedFormatted() }}
          } @else {
            OFF CLOCK
          }
        </div>

        <!-- GPS Indicator -->
        <ion-chip
          [color]="gpsColor()"
          [outline]="true"
          class="gps-chip"
        >
          <ion-icon
            [name]="gpsAccuracy() < 50 ? 'checkmark-circle' : 'warning'"
          ></ion-icon>
          <ion-label>
            @if (gpsAccuracy() === -1) {
              GPS: Waiting...
            } @else {
              GPS: &plusmn;{{ gpsAccuracy() | number:'1.0-0' }}m
            }
          </ion-label>
        </ion-chip>

        <!-- Job Type Selector (shown when about to clock in) -->
        @if (showJobTypeSelector()) {
          <div class="job-select-wrapper">
            <ion-select
              label="Job Type"
              labelPlacement="floating"
              interface="action-sheet"
              [value]="selectedJobType()"
              (ionChange)="onJobTypeChange($event)"
              class="job-select"
            >
              @for (jt of jobTypes; track jt) {
                <ion-select-option [value]="jt">{{ jt }}</ion-select-option>
              }
            </ion-select>
          </div>
        }

        <!-- Main Clock Button -->
        <button
          class="clock-button"
          [class.clocked-in]="clockedIn()"
          [disabled]="processing()"
          (click)="onClockTap()"
        >
          <ion-icon
            [name]="clockedIn() ? 'log-out-outline' : 'log-in-outline'"
            class="clock-icon"
          ></ion-icon>
          <span class="clock-label">
            @if (processing()) {
              PROCESSING...
            } @else if (clockedIn()) {
              CLOCK OUT
            } @else {
              CLOCK IN
            }
          </span>
        </button>

        <!-- Pending syncs indicator -->
        @if (pendingCount() > 0) {
          <ion-chip color="warning" class="pending-chip">
            <ion-label>{{ pendingCount() }} punch(es) pending sync</ion-label>
          </ion-chip>
        }
      </div>
    </ion-content>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      ion-toolbar {
        --background: var(--sc-primary, #1565c0);
        --color: #fff;
      }

      .clock-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        gap: 16px;
        padding: 24px 16px;
      }

      .current-time {
        font-size: 3rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        color: var(--sc-text-primary, #212121);
        letter-spacing: -1px;
      }

      .status-text {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--sc-text-secondary, #757575);
        text-transform: uppercase;
        letter-spacing: 1px;
        transition: color 0.3s;
      }

      .status-text.clocked-in {
        color: #2e7d32;
      }

      .gps-chip {
        margin: 4px 0;
      }

      .job-select-wrapper {
        width: 100%;
        max-width: 320px;
      }

      .job-select {
        width: 100%;
      }

      .clock-button {
        width: 220px;
        height: 220px;
        border-radius: 50%;
        border: 6px solid #e0e0e0;
        background: #fafafa;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        margin: 16px 0;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      }

      .clock-button:active {
        transform: scale(0.95);
      }

      .clock-button.clocked-in {
        border-color: #2e7d32;
        background: #e8f5e9;
        box-shadow: 0 4px 24px rgba(46, 125, 50, 0.2);
      }

      .clock-button:disabled {
        opacity: 0.6;
        cursor: default;
      }

      .clock-icon {
        font-size: 56px;
        color: #616161;
      }

      .clock-button.clocked-in .clock-icon {
        color: #2e7d32;
      }

      .clock-label {
        font-size: 1rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: #424242;
      }

      .clock-button.clocked-in .clock-label {
        color: #2e7d32;
      }

      .pending-chip {
        margin-top: 8px;
      }
    `,
  ],
})
export class ClockPage implements OnInit, OnDestroy {
  readonly clockedIn = signal(false);
  readonly currentTime = signal(this.formatTime(new Date()));
  readonly elapsedSeconds = signal(0);
  readonly gpsAccuracy = signal(-1);
  readonly selectedJobType = signal('Residential');
  readonly showJobTypeSelector = signal(false);
  readonly processing = signal(false);
  readonly pendingCount = signal(0);

  readonly jobTypes = JOB_TYPES;

  readonly elapsedFormatted = computed(() => {
    const total = this.elapsedSeconds();
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  });

  readonly gpsColor = computed(() => {
    const acc = this.gpsAccuracy();
    if (acc === -1) return 'medium';
    return acc < 50 ? 'success' : 'warning';
  });

  readonly hosRemaining = signal('10h 00m');

  private clockTimerId: ReturnType<typeof setInterval> | null = null;
  private timeTimerId: ReturnType<typeof setInterval> | null = null;
  private clockInTimestamp: Date | null = null;
  private lastGps: GpsPosition | null = null;

  constructor(
    private gpsService: GpsService,
    private offlineQueue: OfflineQueueService
  ) {
    addIcons({
      checkmarkCircle,
      warning,
      logInOutline,
      logOutOutline,
      locationOutline,
    });
  }

  ngOnInit(): void {
    this.restoreState();
    this.startTimeClock();
    this.refreshGps();
    this.updatePendingCount();
    this.attemptSync();
  }

  ngOnDestroy(): void {
    if (this.clockTimerId) clearInterval(this.clockTimerId);
    if (this.timeTimerId) clearInterval(this.timeTimerId);
  }

  async onClockTap(): Promise<void> {
    if (this.processing()) return;

    if (!this.clockedIn()) {
      // About to clock in — show job type selector first time
      if (!this.showJobTypeSelector()) {
        this.showJobTypeSelector.set(true);
        return;
      }
      await this.performClockIn();
    } else {
      await this.performClockOut();
    }
  }

  onJobTypeChange(event: CustomEvent): void {
    this.selectedJobType.set(event.detail.value);
  }

  private async performClockIn(): Promise<void> {
    this.processing.set(true);

    const gps = await this.safeGetGps();
    const now = new Date();

    const punch: QueuedPunch = {
      id: this.generateId(),
      type: 'IN',
      timestamp: now.toISOString(),
      gps,
      jobType: this.selectedJobType(),
      syncStatus: 'PENDING',
    };

    this.offlineQueue.queuePunch(punch);

    // Update UI optimistically
    this.clockedIn.set(true);
    this.clockInTimestamp = now;
    this.elapsedSeconds.set(0);
    this.showJobTypeSelector.set(false);
    this.saveState();
    this.startElapsedTimer();
    this.updatePendingCount();
    this.processing.set(false);

    // Attempt sync in background
    this.attemptSync();
  }

  private async performClockOut(): Promise<void> {
    this.processing.set(true);

    const gps = await this.safeGetGps();
    const now = new Date();

    const punch: QueuedPunch = {
      id: this.generateId(),
      type: 'OUT',
      timestamp: now.toISOString(),
      gps,
      jobType: this.selectedJobType(),
      syncStatus: 'PENDING',
    };

    this.offlineQueue.queuePunch(punch);

    // Update UI optimistically
    this.clockedIn.set(false);
    this.clockInTimestamp = null;
    this.elapsedSeconds.set(0);
    this.stopElapsedTimer();
    this.saveState();
    this.updatePendingCount();
    this.processing.set(false);

    // Attempt sync in background
    this.attemptSync();
  }

  private async safeGetGps(): Promise<GpsPosition> {
    try {
      const pos = await this.gpsService.getCurrentPosition();
      this.lastGps = pos;
      this.gpsAccuracy.set(pos.accuracy);
      return pos;
    } catch {
      // Offline-first: use last known or zero coordinates
      return this.lastGps ?? { lat: 0, lng: 0, accuracy: 9999 };
    }
  }

  private async refreshGps(): Promise<void> {
    try {
      const pos = await this.gpsService.getCurrentPosition();
      this.lastGps = pos;
      this.gpsAccuracy.set(pos.accuracy);
    } catch {
      // Silently fail — GPS indicator will show waiting
    }
  }

  private startTimeClock(): void {
    this.timeTimerId = setInterval(() => {
      this.currentTime.set(this.formatTime(new Date()));
    }, 1000);
  }

  private startElapsedTimer(): void {
    this.stopElapsedTimer();
    this.clockTimerId = setInterval(() => {
      if (this.clockInTimestamp) {
        const diff = Math.floor(
          (Date.now() - this.clockInTimestamp.getTime()) / 1000
        );
        this.elapsedSeconds.set(diff);
      }
    }, 1000);
  }

  private stopElapsedTimer(): void {
    if (this.clockTimerId) {
      clearInterval(this.clockTimerId);
      this.clockTimerId = null;
    }
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private updatePendingCount(): void {
    this.pendingCount.set(this.offlineQueue.getPendingPunches().length);
  }

  private attemptSync(): void {
    this.offlineQueue.syncAll().then(() => this.updatePendingCount());
  }

  // Persist clock-in state across page reloads
  private saveState(): void {
    if (this.clockedIn() && this.clockInTimestamp) {
      localStorage.setItem(
        'sc_clock_state',
        JSON.stringify({
          clockedIn: true,
          clockInTimestamp: this.clockInTimestamp.toISOString(),
          jobType: this.selectedJobType(),
        })
      );
    } else {
      localStorage.removeItem('sc_clock_state');
    }
  }

  private restoreState(): void {
    try {
      const raw = localStorage.getItem('sc_clock_state');
      if (!raw) return;
      const state = JSON.parse(raw);
      if (state.clockedIn && state.clockInTimestamp) {
        this.clockedIn.set(true);
        this.clockInTimestamp = new Date(state.clockInTimestamp);
        this.selectedJobType.set(state.jobType ?? 'Residential');
        const diff = Math.floor(
          (Date.now() - this.clockInTimestamp.getTime()) / 1000
        );
        this.elapsedSeconds.set(diff);
        this.startElapsedTimer();
      }
    } catch {
      // Ignore corrupt state
    }
  }
}
