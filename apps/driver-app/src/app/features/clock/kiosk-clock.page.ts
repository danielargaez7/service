import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { fingerPrintOutline, logInOutline, logOutOutline, peopleOutline } from 'ionicons/icons';

type KioskStep = 'IDENTIFY' | 'ACTION' | 'DONE';

const KIOSK_JOB_TYPES = ['Residential', 'Commercial', 'Septic', 'Roll-Off', 'Yard'] as const;

@Component({
  standalone: true,
  selector: 'app-kiosk-clock',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonCard,
    IonCardContent,
    IonButton,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonSelect,
    IonSelectOption,
  ],
  template: `
    <ion-content class="kiosk-content">
      <div class="kiosk-shell">
        <section class="kiosk-hero">
          <p class="eyebrow">Shared Clock Station</p>
          <h1>Driver Kiosk</h1>
          <p>Fast badge lookup, large buttons, and a clean handoff for yard tablets or office clock stations.</p>
        </section>

        <ion-card class="kiosk-card">
          <ion-card-content>
            @if (step() === 'IDENTIFY') {
              <div class="step-block">
                <div class="step-title">
                  <ion-icon name="people-outline"></ion-icon>
                  <div>
                    <strong>Identify driver</strong>
                    <span>Use employee ID or last name.</span>
                  </div>
                </div>

                <ion-item lines="none">
                  <ion-label position="stacked">Employee ID / Name</ion-label>
                  <ion-input
                    [ngModel]="driverLookup()"
                    (ngModelChange)="driverLookup.set($event)"
                    placeholder="EMP-002 or Mendoza"
                  ></ion-input>
                </ion-item>

                <ion-button expand="block" size="large" (click)="continueToAction()">
                  Continue
                </ion-button>
              </div>
            }

            @if (step() === 'ACTION') {
              <div class="step-block">
                <div class="step-title">
                  <ion-icon name="fingerprint-outline"></ion-icon>
                  <div>
                    <strong>{{ activeDriver() }}</strong>
                    <span>Select clock action and job type.</span>
                  </div>
                </div>

                <ion-list lines="none" class="kiosk-grid">
                  <ion-button expand="block" size="large" fill="solid" (click)="setAction('IN')">
                    <ion-icon slot="start" name="log-in-outline"></ion-icon>
                    Clock In
                  </ion-button>
                  <ion-button expand="block" size="large" fill="outline" color="danger" (click)="setAction('OUT')">
                    <ion-icon slot="start" name="log-out-outline"></ion-icon>
                    Clock Out
                  </ion-button>
                </ion-list>

                <ion-item lines="none">
                  <ion-label position="stacked">Job Type</ion-label>
                  <ion-select
                    [ngModel]="selectedJobType()"
                    (ngModelChange)="selectedJobType.set($event)"
                    interface="popover"
                  >
                    @for (jobType of jobTypes; track jobType) {
                      <ion-select-option [value]="jobType">{{ jobType }}</ion-select-option>
                    }
                  </ion-select>
                </ion-item>

                <div class="kiosk-actions">
                  <ion-button fill="outline" size="large" (click)="reset()">Back</ion-button>
                  <ion-button size="large" [disabled]="!selectedAction()" (click)="submitPunch()">
                    Submit Punch
                  </ion-button>
                </div>
              </div>
            }

            @if (step() === 'DONE') {
              <div class="step-block success">
                <strong>{{ activeDriver() }}</strong>
                <h2>{{ selectedAction() === 'IN' ? 'Clocked in' : 'Clocked out' }}</h2>
                <p>{{ selectedJobType() }} punch captured. Ready for the next driver.</p>
                <ion-button size="large" expand="block" (click)="reset()">Next Driver</ion-button>
              </div>
            }
          </ion-card-content>
        </ion-card>

        <div class="kiosk-footer">
          <span>Recommended for tablets in yard, break room, or office dispatch counter.</span>
          <span>{{ queueHint() }}</span>
        </div>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .kiosk-content {
        --background: radial-gradient(circle at top, #fff7ed 0%, #f8fafc 46%, #e2e8f0 100%);
      }

      .kiosk-shell {
        min-height: 100%;
        max-width: 980px;
        margin: 0 auto;
        padding: 40px 24px;
      }

      .kiosk-hero {
        text-align: center;
        margin-bottom: 24px;
      }

      .eyebrow {
        margin: 0 0 6px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 800;
        color: var(--sc-text-secondary);
      }

      .kiosk-hero h1 {
        margin: 0 0 8px;
        font-size: 2.4rem;
        color: var(--sc-text);
      }

      .kiosk-card {
        border-radius: 32px;
        box-shadow: 0 24px 80px rgba(15, 23, 42, 0.12);
      }

      .step-block {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }

      .step-title {
        display: flex;
        gap: 14px;
        align-items: center;
      }

      .step-title ion-icon {
        font-size: 1.6rem;
        color: var(--sc-orange);
      }

      .step-title div {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .step-title strong,
      .success strong,
      .success h2 {
        color: var(--sc-text);
      }

      .step-title span,
      .success p,
      .kiosk-footer {
        color: var(--sc-text-secondary);
      }

      .kiosk-grid,
      .kiosk-actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      .success {
        text-align: center;
        align-items: center;
        padding: 18px 0;
      }

      .kiosk-footer {
        margin-top: 18px;
        display: flex;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        font-size: 0.9rem;
      }

      @media (max-width: 640px) {
        .kiosk-shell {
          padding: 20px 14px;
        }

        .kiosk-grid,
        .kiosk-actions {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class KioskClockPage {
  readonly step = signal<KioskStep>('IDENTIFY');
  readonly driverLookup = signal('');
  readonly selectedAction = signal<'IN' | 'OUT' | null>(null);
  readonly selectedJobType = signal<(typeof KIOSK_JOB_TYPES)[number]>('Residential');
  readonly jobTypes = KIOSK_JOB_TYPES;
  readonly activeDriver = computed(() =>
    this.driverLookup().trim() || 'Unknown Driver'
  );
  readonly queueHint = computed(() =>
    this.step() === 'DONE' ? 'Punch stored and ready to sync.' : 'Offline-safe queue enabled.'
  );

  constructor() {
    addIcons({ fingerPrintOutline, logInOutline, logOutOutline, peopleOutline });
  }

  continueToAction(): void {
    if (!this.driverLookup().trim()) {
      return;
    }
    this.step.set('ACTION');
  }

  setAction(action: 'IN' | 'OUT'): void {
    this.selectedAction.set(action);
  }

  submitPunch(): void {
    if (!this.selectedAction()) {
      return;
    }
    this.step.set('DONE');
  }

  reset(): void {
    this.step.set('IDENTIFY');
    this.driverLookup.set('');
    this.selectedAction.set(null);
    this.selectedJobType.set('Residential');
  }
}
