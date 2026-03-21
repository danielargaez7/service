import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mailOutline } from 'ionicons/icons';

interface Paycheck {
  periodLabel: string;
  hours: number;
  paidDate: string;
  netPay: number;
}

@Component({
  standalone: true,
  selector: 'app-pay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    DatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonNote,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>My Pay</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-card class="sc-pay-current">
        <ion-card-header>
          <ion-card-subtitle>CURRENT PAY PERIOD</ion-card-subtitle>
          <ion-card-title>Mar 1 - Mar 15</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="pay-earned">
            <span class="pay-label">Earned so far</span>
            <span class="pay-amount">\${{ currentEarnings.toFixed(2) }}</span>
          </div>
          <div class="pay-breakdown">
            <div class="pay-row"><span>Regular ({{ regularHours }}h)</span><span>\${{ regularPay.toFixed(2) }}</span></div>
            @if (overtimeHours > 0) {
              <div class="pay-row"><span class="ot-label">Overtime ({{ overtimeHours }}h)</span><span class="ot-amount">\${{ overtimePay.toFixed(2) }}</span></div>
            }
          </div>
          @if (ewaAvailable) {
            <ion-button expand="block" color="primary" class="ewa-btn" (click)="openEWA()">
              Access Earned Wages Early
            </ion-button>
          }
        </ion-card-content>
      </ion-card>

      <ion-list-header>
        <ion-label>Past Paychecks</ion-label>
      </ion-list-header>
      <ion-list>
        @for (check of pastPaychecks; track check.periodLabel) {
          <ion-item detail="true" (click)="openPaystub(check)">
            <ion-label>
              <h3>{{ check.periodLabel }}</h3>
              <p>{{ check.hours }}h · {{ check.paidDate | date:'MMM d' }}</p>
            </ion-label>
            <ion-note slot="end" class="pay-tile-amount">\${{ check.netPay.toFixed(2) }}</ion-note>
          </ion-item>
        }
      </ion-list>
    </ion-content>
  `,
  styles: [`
    ion-header {
      background: linear-gradient(135deg, #1e3a8a, #2563eb) !important;
    }
    ion-toolbar {
      --background: transparent !important;
      --color: #fff !important;
    }
    .pay-earned { display: flex; flex-direction: column; margin-bottom: 12px; }
    .pay-label { color: var(--sc-text-secondary); font-size: 0.8rem; }
    .pay-amount { font-size: 2rem; font-weight: 800; color: var(--sc-text); }
    .pay-breakdown { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .pay-row { display: flex; justify-content: space-between; font-size: 0.9rem; color: var(--sc-text); }
    .ot-label, .ot-amount { color: #b45309; font-weight: 700; }
    .pay-tile-amount { font-weight: 800; color: var(--sc-text); }
  `],
})
export class PayPage {
  constructor(private toastCtrl: ToastController) {
    addIcons({ mailOutline });
  }

  currentEarnings = 2184.25;
  regularHours = 74;
  regularPay = 2072;
  overtimeHours = 2.5;
  overtimePay = 112.25;
  ewaAvailable = true;

  pastPaychecks: Paycheck[] = [
    { periodLabel: 'Feb 16 - Feb 29', hours: 78.5, paidDate: '2026-03-05', netPay: 2288.42 },
    { periodLabel: 'Feb 1 - Feb 15', hours: 76.0, paidDate: '2026-02-20', netPay: 2180.14 },
    { periodLabel: 'Jan 16 - Jan 31', hours: 81.2, paidDate: '2026-02-05', netPay: 2375.63 },
  ];

  async openEWA(): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: 'Request submitted! A confirmation email has been sent to your inbox.',
      duration: 3000,
      position: 'top',
      color: 'success',
      icon: 'mail-outline',
    });
    await toast.present();
  }

  openPaystub(_check: Paycheck): void {
    // Placeholder for paystub detail flow
  }
}
