import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { OfflineBannerComponent } from './shared/offline-banner.component';

@Component({
  standalone: true,
  imports: [IonApp, IonRouterOutlet, OfflineBannerComponent],
  selector: 'app-root',
  template: `
    <app-offline-banner />
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
  `,
})
export class App {}
