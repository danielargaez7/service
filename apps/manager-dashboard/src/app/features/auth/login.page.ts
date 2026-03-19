import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '../../core/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, ButtonModule, PasswordModule],
  selector: 'app-login',
  template: `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="login-brand">
          <i class="pi pi-bolt brand-icon"></i>
          <h1>ServiceCore</h1>
          <p class="brand-subtitle">Manager Dashboard</p>
        </div>

        <form (ngSubmit)="onLogin()" class="login-form">
          <div class="field">
            <label for="email">Email</label>
            <input
              pInputText
              id="email"
              type="email"
              [(ngModel)]="email"
              name="email"
              placeholder="manager@company.com"
              class="w-full"
              [disabled]="loading()"
            />
          </div>

          <div class="field">
            <label for="password">Password</label>
            <p-password
              id="password"
              [(ngModel)]="password"
              name="password"
              placeholder="Enter your password"
              [feedback]="false"
              [toggleMask]="true"
              styleClass="w-full"
              inputStyleClass="w-full"
              [disabled]="loading()"
            />
          </div>

          @if (errorMessage()) {
            <div class="error-message">
              <i class="pi pi-exclamation-circle"></i>
              {{ errorMessage() }}
            </div>
          }

          <p-button
            type="submit"
            label="Sign In"
            icon="pi pi-sign-in"
            styleClass="w-full"
            [loading]="loading()"
            [disabled]="!email || !password"
          />
        </form>

        <div class="login-footer">
          <p>Time Tracking & Workforce Management</p>
        </div>
      </div>

      <div class="demo-accounts-outer">
        <p class="demo-title-outer">Demo Accounts <span>(password: demo)</span></p>
        <div class="demo-list-outer">
          <button type="button" class="demo-btn-outer" (click)="fillDemo('manager@servicecore.com')">
            <strong>Manager</strong><span>manager&#64;servicecore.com</span>
          </button>
          <button type="button" class="demo-btn-outer" (click)="fillDemo('admin@servicecore.com')">
            <strong>HR Admin</strong><span>admin&#64;servicecore.com</span>
          </button>
          <button type="button" class="demo-btn-outer" (click)="fillDemo('payroll@servicecore.com')">
            <strong>Payroll</strong><span>payroll&#64;servicecore.com</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #1a1f36 0%, #2d3561 50%, #1a1f36 100%);
      padding: 20px;
    }

    .login-card {
      background: #fff;
      border-radius: 16px;
      padding: 48px 40px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .login-brand {
      text-align: center;
      margin-bottom: 36px;
    }

    .brand-icon {
      font-size: 2.5rem;
      color: var(--sc-accent, #4f8cff);
      margin-bottom: 8px;
    }

    .login-brand h1 {
      font-size: 1.8rem;
      font-weight: 800;
      color: var(--sc-text-primary, #1e293b);
      margin: 8px 0 4px;
      letter-spacing: -0.5px;
    }

    .brand-subtitle {
      color: var(--sc-text-secondary, #64748b);
      font-size: 0.9rem;
      margin: 0;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--sc-text-primary, #1e293b);
    }

    .w-full {
      width: 100%;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #dc2626;
      font-size: 0.85rem;
    }

    .demo-accounts-outer {
      width: 100%;
      max-width: 420px;
      margin-top: 20px;
    }

    .demo-title-outer {
      font-size: 0.78rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.5);
      margin: 0 0 10px;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .demo-title-outer span {
      font-weight: 400;
      text-transform: none;
      letter-spacing: 0;
    }

    .demo-list-outer {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .demo-btn-outer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
    }

    .demo-btn-outer:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .demo-btn-outer strong {
      font-size: 0.82rem;
      color: rgba(255, 255, 255, 0.9);
    }

    .demo-btn-outer span {
      font-size: 0.78rem;
      color: rgba(255, 255, 255, 0.5);
    }

    .login-footer {
      text-align: center;
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid var(--sc-border, #e2e6ed);
    }

    .login-footer p {
      color: var(--sc-text-secondary, #94a3b8);
      font-size: 0.8rem;
      margin: 0;
    }

    @media (max-width: 480px) {
      .login-card {
        padding: 32px 24px;
      }
    }
  `],
})
export class LoginPage {
  email = '';
  password = '';
  loading = signal(false);
  errorMessage = signal('');

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  fillDemo(email: string): void {
    this.email = email;
    this.password = 'demo';
    this.errorMessage.set('');
  }

  async onLogin(): Promise<void> {
    if (!this.email || !this.password) return;

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      await this.auth.login(this.email, this.password);
      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.errorMessage.set(
        err?.error?.message || 'Invalid credentials. Please try again.'
      );
    } finally {
      this.loading.set(false);
    }
  }
}
