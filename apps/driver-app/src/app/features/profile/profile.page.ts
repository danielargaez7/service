import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonButton,
  IonIcon,
  IonAvatar,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { AuthService } from '../../core/auth.service';

interface Certification {
  name: string;
  status: 'Valid' | 'Expiring' | 'Expired';
  expiryDate: string;
}

@Component({
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonButton,
    IonIcon,
    IonAvatar,
    IonGrid,
    IonRow,
    IonCol,
  ],
  selector: 'app-profile',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Profile</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Driver Info Card -->
      <ion-card class="profile-card">
        <ion-card-header>
          <div class="profile-header">
            <ion-avatar class="profile-avatar">
              <div class="avatar-placeholder">
                {{ initials() }}
              </div>
            </ion-avatar>
            <div class="profile-info">
              <ion-card-title>{{ fullName() }}</ion-card-title>
              <p class="role">{{ user()?.role ?? 'Driver' }}</p>
            </div>
            <ion-badge color="primary" class="class-badge">
              {{ user()?.employeeClass ?? 'CDL-A' }}
            </ion-badge>
          </div>
        </ion-card-header>
      </ion-card>

      <!-- Stats Grid -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Stats</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-grid>
            <ion-row>
              <ion-col size="6">
                <div class="stat-box">
                  <span class="stat-value">36.3</span>
                  <span class="stat-label">Hours This Week</span>
                </div>
              </ion-col>
              <ion-col size="6">
                <div class="stat-box">
                  <span class="stat-value">78.5</span>
                  <span class="stat-label">Hours This Pay Period</span>
                </div>
              </ion-col>
            </ion-row>
            <ion-row>
              <ion-col size="6">
                <div class="stat-box">
                  <span class="stat-value">12</span>
                  <span class="stat-label">On-Time Streak (days)</span>
                </div>
              </ion-col>
              <ion-col size="6">
                <div class="stat-box">
                  <span class="stat-value">98%</span>
                  <span class="stat-label">Safety Score</span>
                </div>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-card-content>
      </ion-card>

      <!-- Certifications -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>
            <ion-icon name="shield-checkmark-outline" class="section-icon"></ion-icon>
            Certifications
          </ion-card-title>
        </ion-card-header>
        <ion-card-content class="cert-card-content">
          <ion-list lines="full">
            @for (cert of certifications; track cert.name) {
              <ion-item>
                <ion-label>
                  <h3>{{ cert.name }}</h3>
                  <p>Expires: {{ cert.expiryDate }}</p>
                </ion-label>
                <ion-badge slot="end" [color]="certColor(cert.status)">
                  {{ cert.status }}
                </ion-badge>
              </ion-item>
            }
          </ion-list>
        </ion-card-content>
      </ion-card>

      <!-- Logout -->
      <ion-button expand="block" color="danger" fill="outline" class="logout-btn" (click)="logout()">
        <ion-icon slot="start" name="log-out-outline"></ion-icon>
        Logout
      </ion-button>
    </ion-content>
  `,
  styles: [
    `
      .profile-card ion-card-header {
        padding-bottom: 16px;
      }

      .profile-header {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .profile-avatar {
        --border-radius: 50%;
        width: 56px;
        height: 56px;
        flex-shrink: 0;
      }

      .avatar-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--sc-primary, #3880ff);
        color: #fff;
        font-weight: 700;
        font-size: 1.2rem;
        border-radius: 50%;
      }

      .profile-info {
        flex: 1;
      }

      .profile-info ion-card-title {
        font-size: 1.1rem;
      }

      .role {
        margin: 2px 0 0;
        color: var(--sc-text-secondary, #666);
        font-size: 0.85rem;
      }

      .class-badge {
        font-size: 0.8rem;
        padding: 4px 10px;
        align-self: flex-start;
      }

      .stat-box {
        text-align: center;
        padding: 12px 4px;
        border-radius: 8px;
        background: var(--ion-color-light, #f4f5f8);
      }

      .stat-value {
        display: block;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--sc-text-primary, #222);
      }

      .stat-label {
        display: block;
        font-size: 0.75rem;
        color: var(--sc-text-secondary, #666);
        margin-top: 4px;
      }

      .section-icon {
        vertical-align: middle;
        margin-right: 6px;
        font-size: 1.1rem;
      }

      .cert-card-content {
        padding: 0;
      }

      .logout-btn {
        margin: 24px 0 32px;
      }
    `,
  ],
})
export class ProfilePage {
  private readonly auth = inject(AuthService);

  readonly user = this.auth.currentUser;

  readonly fullName = computed(() => {
    const u = this.user();
    return u ? `${u.firstName} ${u.lastName}` : 'Driver';
  });

  readonly initials = computed(() => {
    const u = this.user();
    if (!u) return 'D';
    return `${u.firstName.charAt(0)}${u.lastName.charAt(0)}`.toUpperCase();
  });

  readonly certifications: Certification[] = [
    { name: 'CDL-A', status: 'Valid', expiryDate: '2027-09-15' },
    { name: 'DOT Physical', status: 'Expiring', expiryDate: '2026-04-05' },
    { name: 'HAZWOPER', status: 'Valid', expiryDate: '2027-01-20' },
  ];

  constructor() {
    addIcons({ logOutOutline, shieldCheckmarkOutline });
  }

  certColor(status: Certification['status']): string {
    switch (status) {
      case 'Valid': return 'success';
      case 'Expiring': return 'warning';
      case 'Expired': return 'danger';
    }
  }

  logout(): void {
    this.auth.logout();
  }
}
