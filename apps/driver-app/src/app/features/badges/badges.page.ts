import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import {
  BadgeDefinition,
  BadgeTier,
  GamificationService,
} from '../../core/gamification.service';

@Component({
  standalone: true,
  selector: 'app-badges',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    DatePipe,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonButton,
  ],
  template: `
    <ion-header translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/more"></ion-back-button>
        </ion-buttons>
        <ion-title>My Badges</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="badges-content">
      <ion-card class="tier-card">
        <ion-card-content>
          <div class="tier-display">
            <div class="tier-icon" [style.background]="currentTier().color">
              {{ currentTier().icon }}
            </div>
            <div class="tier-copy">
              <p class="eyebrow">Current Rank</p>
              <h2>{{ currentTier().name }}</h2>
              <p>{{ totalPoints() }} points earned</p>
            </div>
          </div>

          <div class="tier-progress">
            <div class="tier-progress-copy">
              <span>{{ nextTierLabel() }}</span>
              <strong>{{ tierProgressPercent().toFixed(0) }}%</strong>
            </div>
            <div class="progress-track">
              <div class="progress-fill" [style.width.%]="tierProgressPercent()"></div>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card class="recent-card">
        <ion-card-header>
          <ion-card-title>Recent Awards</ion-card-title>
          <ion-card-subtitle>Badges land after nightly review, not mid-shift.</ion-card-subtitle>
        </ion-card-header>
        <ion-list lines="none">
          @for (award of recentAwards(); track award.badge.id + award.awardedAt) {
            <ion-item>
              <div class="recent-icon" slot="start">{{ award.badge.icon }}</div>
              <ion-label>
                <h3>{{ award.badge.name }}</h3>
                <p>{{ award.badge.description }}</p>
              </ion-label>
              <ion-note slot="end">{{ award.awardedAt | date: 'MMM d' }}</ion-note>
            </ion-item>
          }
        </ion-list>
      </ion-card>

      <section class="badge-section">
        <div class="section-header">
          <div>
            <p class="eyebrow">Badge Catalog</p>
            <h2>Earned and Locked</h2>
          </div>
          <ion-button fill="outline" size="small" (click)="toggleLocked()">
            {{ showLocked() ? 'Hide Locked' : 'Show Locked' }}
          </ion-button>
        </div>

        <div class="badge-grid">
          @for (badge of visibleBadges(); track badge.id) {
            <button
              type="button"
              class="badge-item"
              [class.earned]="isEarned(badge.id)"
              [class.locked]="!isEarned(badge.id)"
              (click)="showBadgeDetail(badge)"
            >
              <span class="badge-icon">{{ badge.icon }}</span>
              <span class="badge-name">{{ badge.name }}</span>
              <span class="badge-tier" [style.color]="getTierColor(badge.tier)">
                {{ badge.tier }}
              </span>
            </button>
          }
        </div>
      </section>
    </ion-content>
  `,
  styles: [
    `
      .badges-content {
        --background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
      }

      .tier-card,
      .recent-card {
        margin: 16px;
        border-radius: 24px;
        box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
      }

      .tier-display {
        display: flex;
        gap: 16px;
        align-items: center;
      }

      .tier-icon {
        width: 64px;
        height: 64px;
        border-radius: 20px;
        display: grid;
        place-items: center;
        font-size: 1.9rem;
        color: #fff;
      }

      .tier-copy h2,
      .section-header h2 {
        margin: 0;
        color: var(--sc-text);
      }

      .tier-copy p,
      .eyebrow,
      .tier-progress-copy span {
        margin: 0;
        color: var(--sc-text-secondary);
      }

      .eyebrow {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 700;
      }

      .tier-progress {
        margin-top: 20px;
      }

      .tier-progress-copy {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .progress-track {
        height: 12px;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.25);
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--sc-orange) 0%, #facc15 100%);
      }

      .recent-icon {
        width: 42px;
        height: 42px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        background: rgba(249, 115, 22, 0.12);
        font-size: 1.4rem;
      }

      .badge-section {
        padding: 0 16px 28px;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: end;
        gap: 16px;
        margin-bottom: 16px;
      }

      .badge-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .badge-item {
        border: 1px solid rgba(148, 163, 184, 0.2);
        background: #fff;
        border-radius: 20px;
        padding: 18px 14px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        text-align: center;
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.05);
      }

      .badge-item.earned {
        border-color: rgba(249, 115, 22, 0.3);
        transform: translateY(-1px);
      }

      .badge-item.locked {
        opacity: 0.55;
        filter: grayscale(1);
      }

      .badge-icon {
        font-size: 2.4rem;
      }

      .badge-name {
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--sc-text);
      }

      .badge-tier {
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.08em;
      }

      @media (min-width: 768px) {
        .badge-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
    `,
  ],
})
export class BadgesPage {
  private readonly alerts = inject(AlertController);
  readonly gamification = inject(GamificationService);
  readonly showLocked = signal(true);
  readonly totalPoints = this.gamification.totalPoints;
  readonly currentTier = this.gamification.currentTier;
  readonly recentAwards = this.gamification.recentAwards;
  readonly tierProgressPercent = this.gamification.tierProgressPercent;
  readonly visibleBadges = computed(() => {
    const allBadges = this.gamification.badgeCatalog();
    if (this.showLocked()) {
      return allBadges;
    }
    return allBadges.filter((badge) => this.gamification.isEarned(badge.id));
  });

  nextTierLabel(): string {
    const nextTier = this.gamification.nextTier();
    if (!nextTier) {
      return 'Top tier reached';
    }
    return `${nextTier.minPoints - this.totalPoints()} pts to ${nextTier.name}`;
  }

  isEarned(badgeId: string): boolean {
    return this.gamification.isEarned(badgeId);
  }

  getTierColor(tier: BadgeTier): string {
    switch (tier) {
      case 'BRONZE':
        return '#B45309';
      case 'SILVER':
        return '#64748B';
      case 'GOLD':
        return '#CA8A04';
      case 'PLATINUM':
        return '#7C3AED';
    }
  }

  toggleLocked(): void {
    this.showLocked.update((value) => !value);
  }

  async showBadgeDetail(badge: BadgeDefinition): Promise<void> {
    const isEarned = this.isEarned(badge.id);
    const alert = await this.alerts.create({
      header: badge.name,
      subHeader: `${badge.tier} · ${badge.pointValue} pts`,
      message: `${badge.description} ${isEarned ? 'Already earned and counted toward your rank.' : 'Still locked. Keep stacking clean shifts, compliance wins, and sharp paperwork.'}`,
      buttons: ['Close'],
    });
    await alert.present();
  }
}
