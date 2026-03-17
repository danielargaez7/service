import { Component } from '@angular/core';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { timeOutline, listOutline, personOutline } from 'ionicons/icons';

@Component({
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  selector: 'app-tabs',
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="clock">
          <ion-icon name="time-outline"></ion-icon>
          <ion-label>Clock</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="hours">
          <ion-icon name="list-outline"></ion-icon>
          <ion-label>My Hours</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="profile">
          <ion-icon name="person-outline"></ion-icon>
          <ion-label>Profile</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  styles: [
    `
      ion-tab-bar {
        --background: var(--sc-surface);
        --border: 1px solid #e0e0e0;
        padding-bottom: env(safe-area-inset-bottom);
      }
      ion-tab-button {
        --color: var(--sc-text-secondary);
        --color-selected: var(--sc-primary);
      }
    `,
  ],
})
export class TabsPage {
  constructor() {
    addIcons({ timeOutline, listOutline, personOutline });
  }
}
