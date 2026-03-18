import { Component } from '@angular/core';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonBadge,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  todayOutline,
  mapOutline,
  timeOutline,
  cashOutline,
  menuOutline,
} from 'ionicons/icons';

@Component({
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge],
  selector: 'app-tabs',
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="today">
          <ion-icon name="today-outline"></ion-icon>
          <ion-label>Today</ion-label>
          @if (notifications > 0) {
            <ion-badge color="warning">{{ notifications }}</ion-badge>
          }
        </ion-tab-button>

        <ion-tab-button tab="routes">
          <ion-icon name="map-outline"></ion-icon>
          <ion-label>Routes</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="hours">
          <ion-icon name="time-outline"></ion-icon>
          <ion-label>Hours</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="pay">
          <ion-icon name="cash-outline"></ion-icon>
          <ion-label>Pay</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="more">
          <ion-icon name="menu-outline"></ion-icon>
          <ion-label>More</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  styles: [
    `
      ion-tab-bar {
        --background: var(--sc-surface);
        --border: 1px solid var(--sc-border);
        padding-bottom: env(safe-area-inset-bottom);
        min-height: 72px;
      }
      ion-tab-button {
        --color: var(--sc-text-secondary);
        --color-selected: var(--sc-orange);
        font-weight: 600;
      }
    `,
  ],
})
export class TabsPage {
  notifications = 2;

  constructor() {
    addIcons({
      todayOutline,
      mapOutline,
      timeOutline,
      cashOutline,
      menuOutline,
    });
  }
}
