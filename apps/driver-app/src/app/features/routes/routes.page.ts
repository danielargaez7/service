import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  IonBadge,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { locationOutline, navigateOutline } from 'ionicons/icons';

@Component({
  standalone: true,
  selector: 'app-routes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonIcon,
  ],
  template: `
    <ion-content class="ion-padding">
      <ion-card>
        <ion-card-header>
          <ion-card-title>Today's Route</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="row"><ion-icon name="location-outline"></ion-icon><span>South Residential #R-447</span></div>
          <div class="row"><ion-icon name="navigate-outline"></ion-icon><span>42 planned stops</span></div>
          <ion-badge color="warning">Traffic delay near Stop 19</ion-badge>
        </ion-card-content>
      </ion-card>

      <ion-list>
        <ion-item>
          <ion-label>
            <h3>Stop 18 · 1057 Linden Ave</h3>
            <p>ETA 10:20 AM</p>
          </ion-label>
          <ion-badge color="success" slot="end">Done</ion-badge>
        </ion-item>
        <ion-item>
          <ion-label>
            <h3>Stop 19 · 220 Clayton St</h3>
            <p>ETA 10:45 AM</p>
          </ion-label>
          <ion-badge color="warning" slot="end">Next</ion-badge>
        </ion-item>
        <ion-item>
          <ion-label>
            <h3>Stop 20 · 918 York St</h3>
            <p>ETA 11:05 AM</p>
          </ion-label>
          <ion-badge color="medium" slot="end">Queued</ion-badge>
        </ion-item>
      </ion-list>
    </ion-content>
  `,
  styles: [`
    .row { display: flex; align-items: center; gap: 8px; margin: 8px 0; color: var(--sc-text-secondary, #666); }
  `],
})
export class RoutesPage {
  constructor() {
    addIcons({ locationOutline, navigateOutline });
  }
}

