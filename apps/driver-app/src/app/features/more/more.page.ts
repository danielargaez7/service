import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonToggle,
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/auth.service';

@Component({
  standalone: true,
  selector: 'app-more',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonToggle,
    IonButton,
    IonNote,
    RouterLink,
  ],
  template: `
    <ion-content class="ion-padding">
      <ion-list>
        <ion-item lines="full">
          <ion-label>
            <h3>Field Mode</h3>
            <p>Larger touch targets and high-contrast UI for on-route use.</p>
          </ion-label>
          <ion-toggle
            [checked]="fieldMode()"
            (ionChange)="onFieldModeChange($event.detail.checked)"
            slot="end"
          ></ion-toggle>
        </ion-item>

        <ion-item lines="full" class="sc-field-essential">
          <ion-label>
            <h3>Field Mode Effect</h3>
            <p>Bigger buttons, larger text, and simplified navigation for on-route use.</p>
          </ion-label>
        </ion-item>

        <ion-item lines="full">
          <ion-label>
            <h3>Current User</h3>
            <p>{{ auth.currentUser()?.firstName }} {{ auth.currentUser()?.lastName }}</p>
          </ion-label>
          <ion-note slot="end">{{ auth.currentUser()?.role ?? 'DRIVER' }}</ion-note>
        </ion-item>

        <ion-item lines="full" routerLink="/tabs/badges" detail="true">
          <ion-label>
            <h3>My Badges</h3>
            <p>See earned badges, locked goals, and how close you are to the next rank.</p>
          </ion-label>
        </ion-item>

        <ion-item lines="full" routerLink="/kiosk-clock" detail="true">
          <ion-label>
            <h3>Kiosk Clock</h3>
            <p>Open the shared tablet-style clock station for yard or office handoff use.</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <ion-button expand="block" fill="outline" color="danger" (click)="auth.logout()">
        Sign Out
      </ion-button>
    </ion-content>
  `,
})
export class MorePage {
  readonly fieldMode = signal(localStorage.getItem('sc-field-mode') === 'true');

  constructor(public auth: AuthService) {
    document.documentElement.classList.toggle('field-mode', this.fieldMode());
  }

  onFieldModeChange(enabled: boolean): void {
    this.fieldMode.set(enabled);
    localStorage.setItem('sc-field-mode', String(enabled));
    document.documentElement.classList.toggle('field-mode', enabled);
  }
}
