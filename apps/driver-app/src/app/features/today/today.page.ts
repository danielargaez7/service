import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  signal,
} from '@angular/core';
import { CameraSource } from '@capacitor/camera';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  carOutline,
  cashOutline,
  checkmarkCircle,
  chevronForwardOutline,
  cloudDownloadOutline,
  documentTextOutline,
  mapOutline,
  micOutline,
  timeOutline,
  warningOutline,
} from 'ionicons/icons';
import { GpsService, GpsPosition } from '../../core/gps.service';
import { OfflineQueueService, QueuedPunch } from '../../core/offline-queue.service';
import {
  ComplianceConfigService,
  DriverJobType,
} from '../../core/compliance-config.service';
import { DriverAttachmentsService } from '../../core/driver-attachments.service';
import { GeofenceDepartureService } from '../../core/geofence-departure.service';
import { AuthService } from '../../core/auth.service';

type TodayState = 'before' | 'during' | 'after';
type FlowMode = 'preShift' | 'endShift';
type ReasonableVolumeUnit = 'GALLONS' | 'CUBIC_YARDS' | 'TONS';

interface DriverNotification {
  title: string;
  body: string;
  read: boolean;
  icon: string;
  color: string;
}

interface JobTypeOption {
  label: string;
  value: DriverJobType;
  emoji: string;
}

interface FacilityOption {
  id: string;
  name: string;
  distance: number;
}

const JOB_TYPE_OPTIONS: JobTypeOption[] = [
  { label: 'Residential Route', value: 'RESIDENTIAL_ROUTE', emoji: '🚛' },
  { label: 'Roll-Off Delivery', value: 'ROLL_OFF_DELIVERY', emoji: '📦' },
  { label: 'Septic Pumping', value: 'SEPTIC_PUMPING', emoji: '🔧' },
  { label: 'Yard Maintenance', value: 'YARD_MAINTENANCE', emoji: '🏗️' },
  { label: 'Emergency Call', value: 'EMERGENCY_CALL', emoji: '🆘' },
  { label: 'Training / Office', value: 'TRAINING_OFFICE', emoji: '📋' },
];

const PRE_TRIP_ITEMS = [
  'Lights working',
  'Fluid levels checked',
  'Tires inspected',
  'Mirrors adjusted',
  'Load secured / body clear',
  'Phone mounted and charged',
  'Route sheet reviewed',
];

const POST_TRIP_ITEMS = [
  'Vehicle returned to designated spot',
  'Body/container secured',
  'Damage reviewed',
  'Fuel level noted in log',
];

const FACILITY_OPTIONS: FacilityOption[] = [
  { id: 'denver-septage', name: 'Denver Septage Receiving', distance: 0.4 },
  { id: 'commerce-yard', name: 'Commerce City Transfer Yard', distance: 2.1 },
  { id: 'north-metro', name: 'North Metro Disposal', distance: 4.7 },
];

@Component({
  standalone: true,
  selector: 'app-today',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonBadge,
    IonButton,
    IonChip,
    IonIcon,
    IonInput,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonTextarea,
  ],
  template: `
    <ion-content class="sc-today-content">
      @if (activeFlow()) {
        <div class="wizard-shell">
          <div class="wizard-progress">
            <span>Step {{ wizardStep() }} of {{ totalWizardSteps() }}</span>
            <div class="wizard-dots">
              @for (dot of wizardDots(); track dot) {
                <span class="wizard-dot" [class.active]="dot <= wizardStep()"></span>
              }
            </div>
          </div>

          <ion-card class="wizard-card">
            <ion-card-header>
              <ion-card-subtitle>{{ flowTitle() }}</ion-card-subtitle>
              <ion-card-title>{{ flowHeading() }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              @if (activeFlow() === 'preShift') {
                @if (wizardStep() === 1) {
                  <div class="wizard-copy">
                    <p>Good morning, {{ auth.currentUser()?.firstName ?? 'Driver' }} {{ auth.currentUser()?.lastName ?? '' }}</p>
                    <p>{{ auth.currentUser()?.employeeClass?.replace('_', ' ') ?? 'Driver' }}</p>
                    <div class="wizard-summary">
                      <span>Route: Assigned Route</span>
                      <span>Vehicle: Assigned Vehicle</span>
                      <span>Estimated start: 5:30 AM</span>
                    </div>
                  </div>
                  <div class="wizard-actions">
                    <ion-button expand="block" (click)="nextWizardStep()">Yes, that's me</ion-button>
                    <ion-button expand="block" fill="outline" color="medium" (click)="cancelFlow()">Wrong person</ion-button>
                  </div>
                }

                @if (wizardStep() === 2) {
                  <div class="job-grid">
                    @for (option of jobTypeOptions; track option.value) {
                      <button type="button" class="job-option" [class.selected]="selectedJobType() === option.value"
                        (click)="selectJobType(option.value)">
                        <span>{{ option.emoji }}</span>
                        <strong>{{ option.label }}</strong>
                      </button>
                    }
                  </div>
                  <ion-button expand="block" [disabled]="!selectedJobType()" (click)="nextWizardStep()">Continue</ion-button>
                }

                @if (wizardStep() === 3) {
                  <div class="checklist">
                    @for (item of preTripItems; track item) {
                      <label class="check-item">
                        <input type="checkbox" [checked]="isPreTripChecked(item)"
                          (change)="togglePreTripItem(item, $any($event.target).checked)" />
                        <span>{{ item }}</span>
                      </label>
                    }
                  </div>
                  <ion-button expand="block" [disabled]="preTripCompletedCount() !== preTripItems.length" (click)="nextWizardStep()">
                    Complete Inspection
                  </ion-button>
                }

                @if (wizardStep() === 4) {
                  <div class="selfie-step">
                    <div class="camera-placeholder" [class.captured]="selfieCaptured()">
                      {{ selfieCaptured() ? 'Selfie captured' : 'Camera viewfinder area' }}
                    </div>
                    <ion-button expand="block" (click)="captureSelfie()">
                      {{ selfieCaptured() ? 'Retake Photo' : 'Take Photo' }}
                    </ion-button>
                    <ion-button expand="block" [disabled]="!selfieCaptured()" (click)="completeClockIn()">
                      You're Clocked In
                    </ion-button>
                  </div>
                }
              }

              @if (activeFlow() === 'endShift') {
                @if (wizardStep() === 1) {
                  <div class="checklist">
                    @for (item of postTripItems; track item) {
                      <label class="check-item">
                        <input type="checkbox" [checked]="isPostTripChecked(item)"
                          (change)="togglePostTripItem(item, $any($event.target).checked)" />
                        <span>{{ item }}</span>
                      </label>
                    }
                  </div>
                  <ion-item lines="none">
                    <ion-label>Damage reported?</ion-label>
                    <input type="checkbox" [checked]="damageReported()" (change)="damageReported.set($any($event.target).checked)" />
                  </ion-item>
                  @if (damageReported()) {
                    <ion-item>
                      <ion-label position="stacked">Incident details</ion-label>
                      <ion-textarea [(ngModel)]="incidentNotes"></ion-textarea>
                    </ion-item>
                  }
                  <ion-button expand="block" [disabled]="postTripCompletedCount() !== postTripItems.length" (click)="nextWizardStep()">
                    Complete Inspection
                  </ion-button>
                }

                @if (manifestRequired() && wizardStep() === 2) {
                  <div class="manifest-shell">
                    <ion-chip color="warning">
                      <ion-icon name="document-text-outline"></ion-icon>
                      <ion-label>Waste Manifest Required</ion-label>
                    </ion-chip>
                    <ion-item>
                      <ion-label position="stacked">Disposal Facility</ion-label>
                      <ion-select [(ngModel)]="disposalFacilityId" placeholder="Select facility">
                        @for (facility of nearbyFacilities; track facility.id) {
                          <ion-select-option [value]="facility.id">
                            {{ facility.name }} ({{ facility.distance }} mi)
                          </ion-select-option>
                        }
                      </ion-select>
                    </ion-item>
                    <div class="manifest-volume-row">
                      <ion-item>
                        <ion-label position="stacked">Volume Disposed</ion-label>
                        <ion-input type="number" [(ngModel)]="wasteVolume"></ion-input>
                      </ion-item>
                      <ion-item>
                        <ion-label position="stacked">Unit</ion-label>
                        <ion-select [(ngModel)]="volumeUnit">
                          <ion-select-option value="GALLONS">Gallons</ion-select-option>
                          <ion-select-option value="CUBIC_YARDS">Cubic Yards</ion-select-option>
                          <ion-select-option value="TONS">Tons</ion-select-option>
                        </ion-select>
                      </ion-item>
                    </div>
                    <ion-item>
                      <ion-label position="stacked">Manifest # (if applicable)</ion-label>
                      <ion-input [(ngModel)]="manifestNumber"></ion-input>
                    </ion-item>
                    <div class="signature-area">
                      <p>Facility acceptance signature</p>
                      <button type="button" class="signature-box" [class.captured]="signatureCaptured()" (click)="captureSignature()">
                        {{ signatureCaptured() ? 'Signature captured' : 'Tap to capture signature' }}
                      </button>
                    </div>
                    <div class="wizard-actions">
                      <ion-button expand="block" [disabled]="!isManifestComplete()" (click)="nextWizardStep()">Submit Disposal Record</ion-button>
                      <ion-button expand="block" fill="clear" color="medium" (click)="skipManifest()">Skip (paper manifest used)</ion-button>
                    </div>
                  </div>
                }

                @if (isRouteSummaryStep()) {
                  <div class="wizard-summary">
                    <span>You completed 8 of 8 stops.</span>
                    <span>Total drive time: 7h 12m</span>
                    <span>DOT hours used today: 7h 45m (on-duty)</span>
                  </div>
                  <ion-item>
                    <ion-label position="stacked">Any incidents or notes to report?</ion-label>
                    <ion-textarea [(ngModel)]="routeNotes"></ion-textarea>
                  </ion-item>
                  <ion-button expand="block" (click)="nextWizardStep()">Continue</ion-button>
                }

                @if (isConfirmHoursStep()) {
                  <div class="wizard-summary">
                    <span>Clock In: 5:16 AM</span>
                    <span>Clock Out: 2:11 PM</span>
                    <span>Break: 30 min</span>
                    <span>Worked: 4h 22m</span>
                  </div>
                  <div class="wizard-actions">
                    <ion-button expand="block" (click)="completeClockOut()">Yes, Submit</ion-button>
                    <ion-button expand="block" fill="outline" color="medium" (click)="goBackOneStep()">No, I need to correct something</ion-button>
                  </div>
                }
              }
            </ion-card-content>
          </ion-card>
        </div>
      } @else {
        @if (todayState() === 'before') {
          <ion-card class="sc-shift-card">
            <ion-card-header>
              <ion-card-subtitle>NEXT SHIFT</ion-card-subtitle>
              <ion-card-title>{{ selectedJobType().replace(/_/g, ' ') || 'Active Shift' }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="shift-detail-row"><ion-icon name="time-outline"></ion-icon><span>5:30 AM - 2:30 PM</span></div>
              <div class="shift-detail-row"><ion-icon name="car-outline"></ion-icon><span>{{ auth.currentUser()?.employeeClass?.replace('_', ' ') ?? 'Vehicle' }}</span></div>
              <div class="shift-detail-row"><ion-icon name="map-outline"></ion-icon><span>8 stops · Est. 4.5 hours</span></div>
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
            <button class="sc-clock-in-btn" (click)="beginPreShiftWizard()">CLOCK IN</button>
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
          @if (geofenceDeparture.departed()) {
            <ion-card class="sc-departure-alert">
              <ion-card-content>
                <div class="departure-alert-row">
                  <ion-icon name="warning-outline" color="warning"></ion-icon>
                  <div class="departure-alert-copy">
                    <strong>Looks like you left the site</strong>
                    <span>Has the job been completed?</span>
                  </div>
                </div>
                <div class="departure-alert-actions">
                  <ion-button expand="block" color="success" (click)="confirmJobComplete()">Yes, mark complete</ion-button>
                  <ion-button expand="block" fill="outline" color="medium" (click)="dismissDepartureAlert()">Still working</ion-button>
                </div>
              </ion-card-content>
            </ion-card>
          }
          @if (loadingRoutes()) {
            <ion-card class="sc-route-sync-card">
              <ion-card-content>
                <div class="route-sync-header">
                  <ion-icon name="cloud-download-outline"></ion-icon>
                  <strong>Syncing routes for offline use...</strong>
                </div>
                <div class="route-sync-bar">
                  <div class="route-sync-fill" [style.width.%]="routeLoadProgress()"></div>
                </div>
                <span class="route-sync-pct">{{ routeLoadProgress() }}%</span>
              </ion-card-content>
            </ion-card>
          }

          <ion-card class="sc-shift-card sc-shift-active">
            <ion-card-header>
              <ion-badge color="success">CLOCKED IN</ion-badge>
              <ion-card-title>{{ selectedJobType().replace(/_/g, ' ') || 'Active Shift' }}</ion-card-title>
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
            <button class="sc-clock-out-btn" (click)="beginEndShiftWizard()">CLOCK OUT</button>
            <button class="sc-break-btn" [style.background]="onBreak() ? '#fbbf24' : '#f3f4f6'" (click)="startBreak()">{{ onBreak() ? 'End Break' : 'Take Break' }}</button>
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

          <ion-card class="upload-card">
            <ion-card-header>
              <ion-card-subtitle>JOB FILE UPLOADS</ion-card-subtitle>
              <ion-card-title>Site photos & document photos</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="upload-actions">
                <ion-button expand="block" fill="outline" (click)="captureJobAttachment('PHOTO', 'Job site photo', cameraSource.Camera)">
                  Take Job Photo
                </ion-button>
                <ion-button expand="block" fill="outline" (click)="captureJobAttachment('DOCUMENT', 'Job document', cameraSource.Photos)">
                  Upload Doc Photo
                </ion-button>
              </div>

              @if (currentShiftAttachments().length > 0) {
                <div class="attachment-list">
                  @for (attachment of currentShiftAttachments(); track attachment.id) {
                    <div class="attachment-item">
                      <img [src]="attachment.previewUrl" [alt]="attachment.filename" />
                      <div class="attachment-copy">
                        <strong>{{ attachment.category === 'PHOTO' ? 'Job photo' : 'Document photo' }}</strong>
                        <span>{{ attachment.syncStatus }}</span>
                      </div>
                    </div>
                  }
                </div>
              }
            </ion-card-content>
          </ion-card>
        }

        @if (todayState() === 'after') {
          <ion-card class="sc-shift-complete">
            <ion-card-content>
              <ion-icon name="checkmark-circle" color="success"></ion-icon>
              <h2>Great work today!</h2>
              <p>4h 22m · 8 stops completed</p>
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

          @if (currentShiftAttachments().length > 0) {
            <ion-card class="upload-card">
              <ion-card-header>
                <ion-card-subtitle>SHIFT FILE</ion-card-subtitle>
                <ion-card-title>Uploaded job photos</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <div class="attachment-list">
                  @for (attachment of currentShiftAttachments(); track attachment.id) {
                    <div class="attachment-item">
                      <img [src]="attachment.previewUrl" [alt]="attachment.filename" />
                      <div class="attachment-copy">
                        <strong>{{ attachment.category === 'PHOTO' ? 'Job photo' : 'Document photo' }}</strong>
                        <span>{{ attachment.syncStatus }}</span>
                      </div>
                    </div>
                  }
                </div>
              </ion-card-content>
            </ion-card>
          }
        }
      }
    </ion-content>
  `,
  styles: [`
    .sc-today-content { --padding-start: 16px; --padding-end: 16px; --padding-top: 16px; }
    .sc-route-sync-card {
      margin-bottom: 12px;
      margin-inline: 0;
      width: 100%;
      --background: #eff6ff;
      border: 1px solid #bfdbfe;
    }
    .route-sync-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
      color: #1e40af;
      font-size: 0.88rem;
    }
    .route-sync-header ion-icon { font-size: 1.2rem; }
    .route-sync-bar {
      height: 6px;
      border-radius: 999px;
      background: #dbeafe;
      overflow: hidden;
    }
    .route-sync-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #3b82f6, #2563eb);
      transition: width 0.2s ease;
    }
    .route-sync-pct {
      display: block;
      text-align: right;
      font-size: 0.72rem;
      color: #3b82f6;
      font-weight: 700;
      margin-top: 4px;
    }
    .sc-shift-card { margin-bottom: 16px; margin-inline: 0; width: 100%; }
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
    }
    .sc-clock-in-btn:active { transform: scale(0.95); }
    .sc-clock-in-hint { color: var(--sc-text-secondary); font-size: 0.9rem; margin-top: 12px; }
    .sc-shift-active { border-left: 4px solid var(--sc-success); }
    .shift-timer { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
    .timer-label { font-size: 0.75rem; color: var(--sc-text-secondary); }
    .timer-value { font-size: 1.8rem; font-weight: 800; }
    .sc-clock-out-area { display: flex; flex-direction: row; gap: 8px; margin: 12px 0 20px; }
    .sc-clock-out-area .sc-clock-out-btn,
    .sc-clock-out-area .sc-break-btn { flex: 1; }
    .sc-departure-alert {
      --background: #fff7ed;
      border: 2px solid #f97316;
      border-radius: 16px;
      animation: pulseAlert 2s infinite;
    }
    @keyframes pulseAlert {
      0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.3); }
      50% { box-shadow: 0 0 0 8px rgba(249, 115, 22, 0); }
    }
    .departure-alert-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 16px;
    }
    .departure-alert-row ion-icon { font-size: 28px; flex-shrink: 0; margin-top: 2px; }
    .departure-alert-copy { display: flex; flex-direction: column; gap: 2px; }
    .departure-alert-copy strong { font-size: 1.05rem; color: #1e293b; }
    .departure-alert-copy span { font-size: 0.9rem; color: #64748b; }
    .departure-alert-actions { display: flex; flex-direction: column; gap: 8px; }

    .sc-clock-out-btn, .sc-break-btn { min-height: 56px; border-radius: 12px; border: none; font-weight: 700; }
    .sc-clock-out-btn { background: var(--sc-danger); color: white; }
    .sc-break-btn { background: #f3f4f6; color: #374151; }
    .sc-voice-card { cursor: pointer; }
    .voice-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .voice-row span { flex: 1; font-weight: 600; color: var(--sc-text); }
    .upload-card { margin-top: 14px; }
    .upload-actions { display: flex; flex-direction: column; gap: 10px; }
    .attachment-list { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
    .attachment-item {
      display: flex;
      gap: 10px;
      align-items: center;
      padding: 10px;
      border-radius: 12px;
      background: #f8fafc;
    }
    .attachment-item img {
      width: 56px;
      height: 56px;
      object-fit: cover;
      border-radius: 10px;
      border: 1px solid var(--sc-border);
    }
    .attachment-copy {
      display: flex;
      flex-direction: column;
      gap: 4px;
      color: var(--sc-text-secondary);
      font-size: 0.85rem;
    }
    .attachment-copy strong {
      color: var(--sc-text);
    }
    .sc-shift-complete ion-card-content { text-align: center; }
    .sc-shift-complete h2 { margin: 10px 0 6px; }
    .earnings { font-weight: 700; color: #166534; }
    .mood-options { display: flex; justify-content: center; gap: 16px; }
    .mood-options button { font-size: 1.7rem; border: none; background: transparent; }
    ion-item.unread { --background: #fff7ed; }

    .wizard-shell {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-bottom: 24px;
    }
    .wizard-progress {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: var(--sc-text-secondary);
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .wizard-dots {
      display: flex;
      gap: 6px;
    }
    .wizard-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #d1d5db;
    }
    .wizard-dot.active {
      background: var(--sc-orange);
    }
    .wizard-card {
      margin: 0;
    }
    .wizard-copy p {
      margin: 0 0 6px;
      color: var(--sc-text);
    }
    .wizard-summary {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 14px 0;
      color: var(--sc-text-secondary);
      font-size: 0.95rem;
    }
    .wizard-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 12px;
    }
    .job-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 14px;
    }
    .job-option {
      min-height: 92px;
      border-radius: 14px;
      border: 1px solid var(--sc-border);
      background: #fff;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      gap: 6px;
      padding: 12px;
      font: inherit;
      color: var(--sc-text);
    }
    .job-option.selected {
      border-color: var(--sc-orange);
      background: #fff7ed;
    }
    .checklist {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .check-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 12px;
      background: #f8fafc;
      color: var(--sc-text);
    }
    .selfie-step, .manifest-shell {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .camera-placeholder,
    .signature-box {
      min-height: 160px;
      border-radius: 14px;
      border: 2px dashed var(--sc-border);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--sc-text-secondary);
      background: #f8fafc;
    }
    .camera-placeholder.captured,
    .signature-box.captured {
      border-color: var(--sc-success);
      color: var(--sc-success);
      background: #f0fdf4;
    }
    .manifest-volume-row {
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 10px;
    }
    .signature-area p {
      margin: 0 0 6px;
      color: var(--sc-text);
      font-weight: 600;
    }
  `],
})
export class TodayPage implements OnInit, OnDestroy {
  readonly todayState = signal<TodayState>('before');
  readonly shiftSeconds = signal(0);
  readonly showMoodSurvey = signal(false);
  readonly hosHoursRemaining = signal(24);
  readonly notifications = signal<DriverNotification[]>([
    { title: 'Route update', body: 'Stop #12 moved due to traffic.', read: false, icon: 'map-outline', color: 'warning' },
    { title: 'Truck assignment', body: 'Assigned vehicle passed pre-trip inspection.', read: false, icon: 'car-outline', color: 'success' },
    { title: 'Timesheet synced', body: 'Yesterday clock-out approved.', read: true, icon: 'cash-outline', color: 'primary' },
  ]);
  readonly selectedJobType = signal<DriverJobType>('RESIDENTIAL_ROUTE');
  readonly activeFlow = signal<FlowMode | null>(null);
  readonly wizardStep = signal(1);
  readonly preTripChecked = signal<string[]>([]);
  readonly postTripChecked = signal<string[]>([]);
  readonly selfieCaptured = signal(false);
  readonly damageReported = signal(false);
  readonly signatureCaptured = signal(false);
  readonly skippedManifest = signal(false);
  readonly disposalFacilityId = signal('');
  readonly wasteVolume = signal('');
  readonly volumeUnit = signal<ReasonableVolumeUnit>('GALLONS');
  readonly manifestNumber = signal('');
  readonly routeNotes = signal('');
  readonly onBreak = signal(false);
  readonly incidentNotes = signal('');
  readonly stateCode = signal('CO');
  readonly currentShiftId = signal<string | null>(null);
  readonly cameraSource = CameraSource;

  readonly jobTypeOptions = JOB_TYPE_OPTIONS;
  readonly preTripItems = PRE_TRIP_ITEMS;
  readonly postTripItems = POST_TRIP_ITEMS;
  readonly nearbyFacilities = FACILITY_OPTIONS;

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
  readonly preTripCompletedCount = computed(() => this.preTripChecked().length);
  readonly postTripCompletedCount = computed(() => this.postTripChecked().length);
  readonly manifestRequired = computed(() =>
    this.complianceConfig.requiresManifest(this.stateCode(), this.selectedJobType())
  );
  readonly totalWizardSteps = computed(() => {
    if (this.activeFlow() === 'preShift') return 4;
    return this.manifestRequired() ? 4 : 3;
  });
  readonly wizardDots = computed(() =>
    Array.from({ length: this.totalWizardSteps() }, (_, index) => index + 1)
  );
  readonly flowTitle = computed(() => this.activeFlow() === 'preShift' ? 'Pre-Shift Wizard' : 'End-of-Shift Wizard');
  readonly flowHeading = computed(() => {
    if (this.activeFlow() === 'preShift') {
      switch (this.wizardStep()) {
        case 1: return 'Confirm your details';
        case 2: return 'Select job type';
        case 3: return 'Pre-trip inspection';
        default: return 'Take your selfie';
      }
    }

    if (this.wizardStep() === 1) return 'Post-trip inspection';
    if (this.manifestRequired() && this.wizardStep() === 2) return 'Disposal record';
    if (this.isRouteSummaryStep()) return 'Route summary';
    return 'Confirm hours';
  });
  readonly currentShiftAttachments = computed(() =>
    this.attachments.attachmentsForShift(this.currentShiftId())
  );

  private shiftTimer: ReturnType<typeof setInterval> | null = null;
  private clockInAt: Date | null = null;
  private lastGps: GpsPosition | null = null;

  constructor(
    private gpsService: GpsService,
    private offlineQueue: OfflineQueueService,
    private complianceConfig: ComplianceConfigService,
    private attachments: DriverAttachmentsService,
    public geofenceDeparture: GeofenceDepartureService,
    public auth: AuthService,
    private toastController: ToastController
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
      cloudDownloadOutline,
      documentTextOutline,
    });
  }

  ionViewWillEnter(): void {
    // Ionic tabs keep components alive — this hook fires every time the tab
    // becomes visible.  If localStorage was cleared by logout, reset to the
    // fresh "before" state so the driver doesn't see the old shift summary.
    const raw = localStorage.getItem('sc_today_clock');
    if (!raw) {
      this.todayState.set('before');
      this.activeFlow.set(null);
      this.wizardStep.set(1);
      this.selfieCaptured.set(false);
      this.preTripChecked.set([]);
      this.postTripChecked.set([]);
      this.shiftSeconds.set(0);
    }
  }

  ngOnInit(): void {
    const raw = localStorage.getItem('sc_today_clock');
    if (!raw) return;
    try {
      const state = JSON.parse(raw) as {
        clockedInAt?: string;
        state?: TodayState;
        jobType?: DriverJobType;
        shiftId?: string;
      };
      if (state.jobType) this.selectedJobType.set(state.jobType);
      this.currentShiftId.set(state.shiftId ?? null);
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

  beginPreShiftWizard(): void {
    this.activeFlow.set('preShift');
    this.wizardStep.set(1);
    this.preTripChecked.set([]);
    this.selfieCaptured.set(false);
  }

  beginEndShiftWizard(): void {
    this.activeFlow.set('endShift');
    this.wizardStep.set(1);
    this.postTripChecked.set([]);
    this.damageReported.set(false);
    this.signatureCaptured.set(false);
    this.skippedManifest.set(false);
    this.disposalFacilityId.set('');
    this.wasteVolume.set('');
    this.volumeUnit.set('GALLONS');
    this.manifestNumber.set('');
    this.routeNotes.set('');
    this.incidentNotes.set('');
  }

  cancelFlow(): void {
    this.activeFlow.set(null);
    this.wizardStep.set(1);
  }

  selectJobType(jobType: DriverJobType): void {
    this.selectedJobType.set(jobType);
  }

  nextWizardStep(): void {
    this.wizardStep.update((step) => Math.min(this.totalWizardSteps(), step + 1));
  }

  goBackOneStep(): void {
    const target = this.manifestRequired() ? 3 : 2;
    this.wizardStep.set(target);
  }

  isPreTripChecked(item: string): boolean {
    return this.preTripChecked().includes(item);
  }

  togglePreTripItem(item: string, checked: boolean): void {
    this.preTripChecked.update((items) => checked ? [...items, item] : items.filter((value) => value !== item));
  }

  isPostTripChecked(item: string): boolean {
    return this.postTripChecked().includes(item);
  }

  togglePostTripItem(item: string, checked: boolean): void {
    this.postTripChecked.update((items) => checked ? [...items, item] : items.filter((value) => value !== item));
  }

  captureSelfie(): void {
    this.selfieCaptured.set(true);
  }

  captureSignature(): void {
    this.signatureCaptured.set(true);
  }

  isManifestComplete(): boolean {
    return !!this.disposalFacilityId() && !!this.wasteVolume() && this.signatureCaptured();
  }

  skipManifest(): void {
    this.skippedManifest.set(true);
    this.nextWizardStep();
  }

  isRouteSummaryStep(): boolean {
    return this.activeFlow() === 'endShift' && this.wizardStep() === (this.manifestRequired() ? 3 : 2);
  }

  isConfirmHoursStep(): boolean {
    return this.activeFlow() === 'endShift' && this.wizardStep() === this.totalWizardSteps();
  }

  readonly loadingRoutes = signal(false);
  readonly routeLoadProgress = signal(0);

  private simulateRouteSync(): void {
    this.loadingRoutes.set(true);
    this.routeLoadProgress.set(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress >= 100) {
        progress = 100;
        this.routeLoadProgress.set(100);
        clearInterval(interval);
        setTimeout(() => this.loadingRoutes.set(false), 400);
      } else {
        this.routeLoadProgress.set(Math.round(progress));
      }
    }, 200);
  }

  async completeClockIn(): Promise<void> {
    this.todayState.set('during');
    this.clockInAt = new Date();
    this.currentShiftId.set(`shift-${Date.now()}`);
    this.persistTodayState();
    this.startShiftTimer();
    this.activeFlow.set(null);
    this.simulateRouteSync();

    const gps = await this.safeGetGps();
    this.queuePunch('IN', gps);

    // Anchor geofence at the clock-in location for departure detection
    await this.geofenceDeparture.anchor(gps.lat, gps.lng, this.selectedJobType());
  }

  async completeClockOut(): Promise<void> {
    this.todayState.set('after');
    this.persistTodayState();
    if (this.shiftTimer) clearInterval(this.shiftTimer);
    this.showMoodSurvey.set(true);
    this.activeFlow.set(null);

    // Stop geofence monitoring — driver is clocking out properly
    await this.geofenceDeparture.stop();

    const gps = await this.safeGetGps();
    this.queuePunch('OUT', gps);
    await this.attachments.syncAll();
    if (this.manifestRequired()) {
      this.notifications.update((items) => [
        {
          title: this.skippedManifest() ? 'Manifest deferred' : 'Manifest submitted',
          body: this.skippedManifest()
            ? 'Paper manifest noted for later submission.'
            : `Disposal record saved for ${this.selectedJobType().replace(/_/g, ' ').toLowerCase()}.`,
          read: false,
          icon: 'document-text-outline',
          color: 'warning',
        },
        ...items,
      ]);
    }
  }

  async confirmJobComplete(): Promise<void> {
    // Driver confirmed the job is done — trigger clock-out flow
    await this.geofenceDeparture.stop();
    this.notifications.update((items) => [
      {
        title: 'Job marked complete',
        body: 'You confirmed the job from the departure reminder. Don\'t forget to clock out when your shift ends.',
        read: false,
        icon: 'checkmark-circle',
        color: 'success',
      },
      ...items,
    ]);
    this.beginEndShiftWizard();
  }

  dismissDepartureAlert(): void {
    // Driver says they're still working — acknowledge and keep monitoring
    this.geofenceDeparture.acknowledge();
    this.notifications.update((items) => [
      {
        title: 'Still working',
        body: 'Got it — we\'ll check again if you move further away.',
        read: false,
        icon: 'checkmark-circle',
        color: 'primary',
      },
      ...items,
    ]);
  }

  async startBreak(): Promise<void> {
    const wasOnBreak = this.onBreak();
    this.onBreak.set(!wasOnBreak);
    const message = wasOnBreak ? 'Break ended. You are back on duty.' : 'Break started. Your unpaid break timer is running.';
    this.notifications.update((items) => [
      { title: wasOnBreak ? 'Break ended' : 'Break started', body: message, read: false, icon: 'time-outline', color: 'primary' },
      ...items,
    ]);
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      position: 'top',
      color: wasOnBreak ? 'success' : 'warning',
    });
    await toast.present();
  }

  async captureJobAttachment(
    category: 'PHOTO' | 'DOCUMENT',
    note: string,
    source: CameraSource
  ): Promise<void> {
    const shiftId = this.currentShiftId();
    if (!shiftId) return;

    const attachment = await this.attachments.captureForShift(
      shiftId,
      category,
      source,
      note
    );

    if (attachment) {
      this.notifications.update((items) => [
        {
          title: category === 'PHOTO' ? 'Job photo uploaded' : 'Document photo uploaded',
          body: `${attachment.filename} was attached to the current shift file.`,
          read: false,
          icon: 'document-text-outline',
          color: 'primary',
        },
        ...items,
      ]);
    }
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
      jobType: this.selectedJobType(),
      shiftId: this.currentShiftId(),
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
      jobType: this.selectedJobType(),
      syncStatus: 'PENDING',
    };
    this.offlineQueue.queuePunch(punch);
    void this.offlineQueue.syncAll();
  }
}
