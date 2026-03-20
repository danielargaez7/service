import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  AlertController,
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
  IonNote,
  IonSegment,
  IonSegmentButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  callOutline,
  checkmarkCircleOutline,
  locationOutline,
  navigateOutline,
  radioOutline,
  timeOutline,
} from 'ionicons/icons';

type StopStatus = 'DONE' | 'NEXT' | 'IN_PROGRESS' | 'QUEUED' | 'AT_RISK';
type RouteView = 'all' | 'active' | 'done';

interface RouteStop {
  id: string;
  sequence: number;
  customer: string;
  address: string;
  eta: string;
  service: string;
  notes: string;
  status: StopStatus;
  photoRequired?: boolean;
  manifestRequired?: boolean;
}

const ROUTE_STOPS: RouteStop[] = [
  {
    id: '18',
    sequence: 18,
    customer: 'Linden Apartments',
    address: '1057 Linden Ave',
    eta: '10:20 AM',
    service: 'Dumpster pickup',
    notes: 'Gate code 4481. Photo already uploaded.',
    status: 'DONE',
    photoRequired: true,
  },
  {
    id: '19',
    sequence: 19,
    customer: 'Clayton Medical',
    address: '220 Clayton St',
    eta: '10:45 AM',
    service: 'Septic service',
    notes: 'Collect signed manifest before leaving the site.',
    status: 'NEXT',
    manifestRequired: true,
  },
  {
    id: '20',
    sequence: 20,
    customer: 'York Industrial',
    address: '918 York St',
    eta: '11:05 AM',
    service: 'Grease trap service',
    notes: 'Dispatch flagged a tight alley access. Call ahead if blocked.',
    status: 'AT_RISK',
    manifestRequired: true,
  },
  {
    id: '21',
    sequence: 21,
    customer: 'Broadway Storage',
    address: '1204 S Broadway',
    eta: '11:32 AM',
    service: 'Roll-off swap',
    notes: 'Container serial 44-B. Confirm site contact before drop.',
    status: 'QUEUED',
  },
  {
    id: '22',
    sequence: 22,
    customer: 'Greenline Market',
    address: '404 Grant St',
    eta: '12:10 PM',
    service: 'Commercial pickup',
    notes: 'Dock access after 12 PM only.',
    status: 'QUEUED',
  },
];

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
    IonCardSubtitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonIcon,
    IonButton,
    IonNote,
    IonSegment,
    IonSegmentButton,
  ],
  template: `
    <ion-content class="routes-content">
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Dispatch Route</p>
          <h1>South Residential #R-447</h1>
          <p>14 planned stops · 9 complete · 1 traffic delay · next stop needs manifest capture</p>
        </div>
        <div class="hero-metrics">
          <div class="metric-pill">
            <ion-icon name="time-outline"></ion-icon>
            2h 18m left
          </div>
          <div class="metric-pill warning">
            <ion-icon name="alert-circle-outline"></ion-icon>
            Stop 20 at risk
          </div>
        </div>
      </section>

      <ion-card class="route-summary">
        <ion-card-content>
          <div class="summary-row">
            <div class="summary-item">
              <ion-icon name="location-outline"></ion-icon>
              <div>
                <strong>Current zone</strong>
                <span>South Denver corridor</span>
              </div>
            </div>
            <div class="summary-item">
              <ion-icon name="navigate-outline"></ion-icon>
              <div>
                <strong>Next ETA</strong>
                <span>10:45 AM · Clayton Medical</span>
              </div>
            </div>
            <div class="summary-item">
              <ion-icon name="radio-outline"></ion-icon>
              <div>
                <strong>Dispatch note</strong>
                <span>Traffic delay near Stop 19. Reroute approved.</span>
              </div>
            </div>
          </div>

          <div class="dispatch-actions">
            <ion-button fill="solid" color="warning" (click)="openStopDetail(nextStop())">
              Open next stop
            </ion-button>
            <ion-button fill="outline" (click)="contactDispatch()">
              Contact dispatch
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-segment [value]="view()" (ionChange)="view.set($any($event.detail.value))">
        <ion-segment-button value="all">All Stops</ion-segment-button>
        <ion-segment-button value="active">Need Action</ion-segment-button>
        <ion-segment-button value="done">Done</ion-segment-button>
      </ion-segment>

      <div class="stop-state-legend">
        <span class="legend-chip next">Next</span>
        <span class="legend-chip progress">In Progress</span>
        <span class="legend-chip risk">At Risk</span>
        <span class="legend-chip done">Done</span>
      </div>

      <ion-list lines="none" class="stop-list">
        @for (stop of filteredStops(); track stop.id) {
          <ion-item class="stop-card" [class]="'stop-' + stop.status.toLowerCase()" button detail="false" (click)="openStopDetail(stop)">
            <div class="stop-order" slot="start">{{ stop.sequence }}</div>
            <ion-label>
              <div class="stop-header">
                <h3>{{ stop.customer }}</h3>
                <ion-badge [color]="badgeColor(stop.status)">{{ badgeLabel(stop.status) }}</ion-badge>
              </div>
              <p>{{ stop.address }}</p>
              <p>{{ stop.service }} · ETA {{ stop.eta }}</p>
              <div class="stop-flags">
                @if (stop.manifestRequired) {
                  <span class="flag-chip">Manifest</span>
                }
                @if (stop.photoRequired) {
                  <span class="flag-chip">Photo</span>
                }
                @if (stop.status === 'AT_RISK') {
                  <span class="flag-chip urgent">Dispatch watching</span>
                }
              </div>
              <p class="dispatch-note">{{ stop.notes }}</p>
            </ion-label>
            <ion-note slot="end">{{ stop.eta }}</ion-note>
          </ion-item>
        }
      </ion-list>
    </ion-content>
  `,
  styles: [
    `
      .routes-content {
        --background: linear-gradient(180deg, #f8fafc 0%, #fff7ed 100%);
      }

      .hero {
        padding: 20px 16px 12px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .eyebrow {
        margin: 0 0 4px;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--sc-text-secondary);
      }

      .hero h1 {
        margin: 0 0 6px;
        font-size: 1.7rem;
        line-height: 1.05;
        color: var(--sc-text);
      }

      .hero-copy p:last-child {
        margin: 0;
        color: var(--sc-text-secondary);
      }

      .hero-metrics {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .metric-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        border-radius: 999px;
        background: rgba(14, 165, 233, 0.12);
        color: #0369a1;
        font-weight: 700;
      }

      .metric-pill.warning {
        background: rgba(245, 158, 11, 0.16);
        color: #b45309;
      }

      .route-summary {
        margin: 0 16px 16px;
        border-radius: 24px;
        box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
      }

      .summary-row {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .summary-item {
        display: flex;
        gap: 12px;
        align-items: flex-start;
      }

      .summary-item ion-icon {
        margin-top: 3px;
        color: var(--sc-orange);
      }

      .summary-item strong,
      .stop-header h3 {
        color: var(--sc-text);
      }

      .summary-item div {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .summary-item span,
      .dispatch-note {
        color: var(--sc-text-secondary);
      }

      .dispatch-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 16px;
      }

      ion-segment {
        margin: 0 16px 12px;
        --background: rgba(255, 255, 255, 0.7);
      }

      .stop-state-legend {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        padding: 0 16px 12px;
      }

      .legend-chip,
      .flag-chip {
        display: inline-flex;
        align-items: center;
        padding: 4px 8px;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .legend-chip.next,
      .flag-chip {
        background: rgba(245, 158, 11, 0.14);
        color: #b45309;
      }

      .legend-chip.progress {
        background: rgba(14, 165, 233, 0.12);
        color: #0369a1;
      }

      .legend-chip.risk,
      .flag-chip.urgent {
        background: rgba(239, 68, 68, 0.12);
        color: #b91c1c;
      }

      .legend-chip.done {
        background: rgba(34, 197, 94, 0.12);
        color: #15803d;
      }

      .stop-list {
        background: transparent;
        padding: 0 16px 24px;
      }

      .stop-card {
        --background: rgba(255, 255, 255, 0.94);
        --border-radius: 22px;
        --padding-start: 0;
        --inner-padding-end: 14px;
        margin-bottom: 12px;
        border: 1px solid rgba(226, 232, 240, 0.9);
        box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
      }

      .stop-order {
        width: 46px;
        height: 46px;
        border-radius: 16px;
        margin-left: 12px;
        display: grid;
        place-items: center;
        background: #fff7ed;
        color: var(--sc-orange);
        font-weight: 800;
      }

      .stop-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
      }

      .stop-flags {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin: 8px 0;
      }

      .stop-next {
        border-left: 4px solid #f59e0b;
      }

      .stop-in_progress {
        border-left: 4px solid #0ea5e9;
      }

      .stop-at_risk {
        border-left: 4px solid #ef4444;
      }

      .stop-done {
        border-left: 4px solid #22c55e;
      }
    `,
  ],
})
export class RoutesPage {
  readonly view = signal<RouteView>('all');
  readonly stops = signal<RouteStop[]>(this.loadInitialStops());
  readonly nextStop = computed(
    () =>
      this.stops().find((stop) => stop.status === 'NEXT' || stop.status === 'IN_PROGRESS') ??
      this.stops()[0]
  );
  readonly filteredStops = computed(() => {
    const mode = this.view();
    if (mode === 'active') {
      return this.stops().filter((stop) => stop.status !== 'DONE');
    }
    if (mode === 'done') {
      return this.stops().filter((stop) => stop.status === 'DONE');
    }
    return this.stops();
  });

  constructor(private readonly alerts: AlertController) {
    addIcons({
      alertCircleOutline,
      callOutline,
      checkmarkCircleOutline,
      locationOutline,
      navigateOutline,
      radioOutline,
      timeOutline,
    });

    // Cache route data for offline access
    localStorage.setItem('sc_cached_routes', JSON.stringify(this.stops()));
  }

  private loadInitialStops(): RouteStop[] {
    const cached = localStorage.getItem('sc_cached_routes');
    if (cached) {
      try {
        const cachedData = JSON.parse(cached) as RouteStop[];
        if (Array.isArray(cachedData) && cachedData.length > 0) {
          return cachedData;
        }
      } catch {
        // Ignore parse errors, fall through to default
      }
    }
    return ROUTE_STOPS;
  }

  badgeColor(status: StopStatus): string {
    switch (status) {
      case 'DONE':
        return 'success';
      case 'NEXT':
        return 'warning';
      case 'IN_PROGRESS':
        return 'primary';
      case 'AT_RISK':
        return 'danger';
      case 'QUEUED':
        return 'medium';
    }
  }

  badgeLabel(status: StopStatus): string {
    return status === 'AT_RISK' ? 'At Risk' : status.replace('_', ' ');
  }

  async openStopDetail(stop: RouteStop): Promise<void> {
    const alert = await this.alerts.create({
      header: `Stop ${stop.sequence} · ${stop.customer}`,
      subHeader: `${stop.service} · ETA ${stop.eta}`,
      message: `${stop.address}. ${stop.notes} ${stop.manifestRequired ? 'Manifest capture required before close-out.' : ''}`,
      buttons: [
        { text: 'Close', role: 'cancel' },
        { text: 'Mark In Progress', handler: () => this.updateStopStatus(stop.id, 'IN_PROGRESS') },
      ],
    });
    await alert.present();
  }

  async contactDispatch(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Dispatch Handoff',
      message: 'Traffic reroute approved. Call dispatch if Stop 20 access is still blocked when you arrive.',
      buttons: ['Got it'],
    });
    await alert.present();
  }

  private updateStopStatus(stopId: string, status: StopStatus): void {
    this.stops.update((stops) =>
      stops.map((stop) => (stop.id === stopId ? { ...stop, status } : stop))
    );
  }
}
