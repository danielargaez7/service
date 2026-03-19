import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonInput,
  IonList,
  IonButton,
  IonToast,
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/auth.service';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonInput,
    IonList,
    IonButton,
    IonToast,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>ServiceCore</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="login-container">
        <div class="branding">
          <h1 class="brand-title">ServiceCore</h1>
          <p class="brand-subtitle">Driver Time Tracking</p>
        </div>

        <ion-list lines="full" class="login-form">
          <ion-item>
            <ion-input
              label="Email"
              labelPlacement="floating"
              type="email"
              autocomplete="email"
              [value]="email()"
              (ionInput)="email.set($any($event).detail.value ?? '')"
            ></ion-input>
          </ion-item>

          <ion-item>
            <ion-input
              label="Password"
              labelPlacement="floating"
              type="password"
              [value]="password()"
              (ionInput)="password.set($any($event).detail.value ?? '')"
            ></ion-input>
          </ion-item>
        </ion-list>

        <ion-button
          expand="block"
          size="large"
          class="login-button"
          (click)="demoLogin()"
        >
          @if (loading()) {
            Signing In...
          } @else {
            Sign In
          }
        </ion-button>
      </div>

      <div class="demo-section">
        <p class="demo-label">Demo Accounts <span>(password: demo)</span></p>
        <div class="demo-buttons">
          <ion-button fill="outline" size="small" color="medium" (click)="fillDemo('driver@servicecore.com'); demoLogin()">Driver (Carlos)</ion-button>
          <ion-button fill="outline" size="small" color="medium" (click)="fillDemo('mike.chen@servicecore.com'); demoLogin()">Mike Chen</ion-button>
          <ion-button fill="outline" size="small" color="medium" (click)="fillDemo('tom.garcia@servicecore.com'); demoLogin()">Tom Garcia</ion-button>
        </div>
      </div>

      <ion-toast
        [isOpen]="showError()"
        [message]="errorMessage()"
        [duration]="3000"
        color="danger"
        position="top"
        (didDismiss)="showError.set(false)"
      ></ion-toast>
    </ion-content>
  `,
  styles: [
    `
      ion-toolbar {
        --background: var(--sc-primary, #1565c0);
        --color: #fff;
      }

      .login-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 80%;
        padding: 24px 16px;
      }

      .branding {
        text-align: center;
        margin-bottom: 40px;
      }

      .brand-title {
        font-size: 2rem;
        font-weight: 800;
        color: var(--sc-primary, #1565c0);
        margin: 0 0 4px;
      }

      .brand-subtitle {
        font-size: 1rem;
        color: var(--sc-text-secondary, #757575);
        margin: 0;
      }

      .login-form {
        width: 100%;
        max-width: 400px;
        margin-bottom: 24px;
        border-radius: 8px;
        overflow: hidden;
      }

      .login-button {
        width: 100%;
        max-width: 400px;
        --border-radius: 8px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .demo-section {
        width: 100%;
        max-width: 400px;
        margin-top: 24px;
        padding: 16px;
        background: #f1f5f9;
        border-radius: 10px;
        border: 1px dashed #94a3b8;
        text-align: center;
      }

      .demo-label {
        font-size: 0.8rem;
        font-weight: 700;
        color: #475569;
        margin: 0 0 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .demo-label span {
        font-weight: 400;
        text-transform: none;
        letter-spacing: 0;
        color: #94a3b8;
      }

      .demo-buttons {
        display: flex;
        gap: 8px;
        justify-content: center;
        flex-wrap: wrap;
      }
    `,
  ],
})
export class LoginPage {
  readonly email = signal('');
  readonly password = signal('');
  readonly loading = signal(false);
  readonly showError = signal(false);
  readonly errorMessage = signal('');

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  fillDemo(email: string): void {
    this.email.set(email);
    this.password.set('demo');
    this.errorMessage.set('');
  }

  demoLogin(): void {
    // Skip API — go straight to the app for demo purposes
    const email = this.email().trim() || 'driver@servicecore.com';
    const nameParts = email.split('@')[0].split('.');
    const demoUser = {
      id: 'demo-driver',
      firstName: nameParts.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))[0] || 'Demo',
      lastName: nameParts.length > 1 ? nameParts.slice(1).map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ') : 'Driver',
      email,
      role: 'DRIVER',
      employeeClass: 'CDL_A',
    };
    localStorage.setItem('sc_access_token', 'demo-token');
    localStorage.setItem('sc_refresh_token', 'demo-refresh');
    localStorage.setItem('sc_user', JSON.stringify(demoUser));
    // Update the auth service signal so the guard sees it
    this.authService.currentUser.set(demoUser);
    this.router.navigate(['/tabs/today']);
  }

  async onLogin(): Promise<void> {
    if (this.loading()) return;

    const email = this.email().trim();
    const password = this.password();

    if (!email || !password) {
      this.errorMessage.set('Please enter your email and password.');
      this.showError.set(true);
      return;
    }

    this.loading.set(true);

    try {
      await this.authService.login(email, password);
      this.router.navigate(['/tabs']);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Login failed. Please check your credentials.';
      this.errorMessage.set(message);
      this.showError.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
