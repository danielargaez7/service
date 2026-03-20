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
    <div class="login-page">
      <!-- Left: Branding Panel -->
      <div class="brand-panel">
        <div class="brand-content">
          <div class="brand-logo">
            <div class="logo-icon">SC</div>
          </div>
          <h1>ServiceCore</h1>
          <p class="brand-tagline">Labor Intelligence Platform</p>
          <div class="brand-features">
            <div class="feature"><i class="pi pi-clock"></i><span>Automated Time Tracking</span></div>
            <div class="feature"><i class="pi pi-chart-line"></i><span>Real-Time Analytics</span></div>
            <div class="feature"><i class="pi pi-shield"></i><span>DOT/HOS Compliance</span></div>
            <div class="feature"><i class="pi pi-dollar"></i><span>Payroll Integration</span></div>
          </div>
        </div>
        <p class="brand-footer">Denver Waste Operations · 155 Employees</p>
      </div>

      <!-- Right: Login Form -->
      <div class="form-panel">
        <div class="form-container">
          <div class="form-header">
            <h2>Welcome back</h2>
            <p>Sign in to your dashboard</p>
          </div>

          <form (ngSubmit)="onLogin()" class="login-form">
            <div class="field">
              <label for="email">Email address</label>
              <div class="input-wrap">
                <i class="pi pi-envelope"></i>
                <input
                  pInputText
                  id="email"
                  type="email"
                  [(ngModel)]="email"
                  name="email"
                  placeholder="you@servicecore.com"
                  [disabled]="loading()"
                />
              </div>
            </div>

            <div class="field">
              <div class="field-header">
                <label for="password">Password</label>
                <a class="forgot-link" href="#">Forgot password?</a>
              </div>
              <div class="input-wrap">
                <i class="pi pi-lock"></i>
                <input
                  pInputText
                  id="password"
                  type="password"
                  [(ngModel)]="password"
                  name="password"
                  placeholder="Enter your password"
                  [disabled]="loading()"
                />
              </div>
            </div>

            @if (errorMessage()) {
              <div class="error-bar">
                <i class="pi pi-exclamation-circle"></i>
                {{ errorMessage() }}
              </div>
            }

            <button type="submit" class="sign-in-btn" [disabled]="!email || !password || loading()">
              @if (loading()) {
                <i class="pi pi-spin pi-spinner"></i> Signing in...
              } @else {
                Sign In
              }
            </button>
          </form>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      display: flex;
      min-height: 100vh;
    }

    /* ── Left Brand Panel ── */
    .brand-panel {
      width: 420px;
      flex-shrink: 0;
      background: linear-gradient(160deg, #0f172a 0%, #1e293b 40%, #0f172a 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 48px 40px;
      position: relative;
      overflow: hidden;
    }

    .brand-panel::before {
      content: '';
      position: absolute;
      top: -40%;
      right: -40%;
      width: 500px;
      height: 500px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(249, 115, 22, 0.12) 0%, transparent 70%);
    }

    .brand-content {
      position: relative;
      z-index: 1;
    }

    .brand-logo {
      margin-bottom: 24px;
    }

    .logo-icon {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: linear-gradient(135deg, #f97316, #ea580c);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      font-weight: 800;
      letter-spacing: 1px;
    }

    .brand-panel h1 {
      font-size: 2rem;
      font-weight: 800;
      color: #fff;
      margin: 0 0 8px;
      letter-spacing: -0.5px;
    }

    .brand-tagline {
      color: #94a3b8;
      font-size: 0.95rem;
      margin: 0 0 48px;
    }

    .brand-features {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .feature {
      display: flex;
      align-items: center;
      gap: 12px;
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.88rem;
    }

    .feature i {
      font-size: 1rem;
      color: #f97316;
      width: 20px;
      text-align: center;
    }

    .brand-footer {
      position: absolute;
      bottom: 32px;
      color: rgba(255, 255, 255, 0.25);
      font-size: 0.72rem;
      letter-spacing: 0.5px;
    }

    /* ── Right Form Panel ── */
    .form-panel {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      background: #fafbfc;
    }

    .form-container {
      width: 100%;
      max-width: 400px;
    }

    .form-header {
      margin-bottom: 32px;
    }

    .form-header h2 {
      font-size: 1.6rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 6px;
    }

    .form-header p {
      color: #64748b;
      font-size: 0.92rem;
      margin: 0;
    }

    /* ── Form Fields ── */
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

    .field-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .field label {
      font-size: 0.82rem;
      font-weight: 600;
      color: #334155;
    }

    .forgot-link {
      font-size: 0.78rem;
      color: #f97316;
      text-decoration: none;
      font-weight: 500;
    }

    .forgot-link:hover {
      text-decoration: underline;
    }

    .input-wrap {
      position: relative;
    }

    .input-wrap i {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
      font-size: 0.9rem;
    }

    .input-wrap input {
      width: 100%;
      padding: 12px 14px 12px 42px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      font-size: 0.92rem;
      font-family: inherit;
      background: #fff;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .input-wrap input:focus {
      outline: none;
      border-color: #f97316;
      box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
    }

    .input-wrap input::placeholder {
      color: #cbd5e1;
    }

    .error-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 10px;
      color: #dc2626;
      font-size: 0.84rem;
    }

    .sign-in-btn {
      width: 100%;
      padding: 13px;
      border: none;
      border-radius: 10px;
      background: linear-gradient(135deg, #f97316, #ea580c);
      color: #fff;
      font-size: 0.95rem;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .sign-in-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(249, 115, 22, 0.3);
    }

    .sign-in-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }


    /* ── Responsive ── */
    @media (max-width: 900px) {
      .login-page {
        flex-direction: column;
      }
      .brand-panel {
        width: 100%;
        padding: 32px 24px;
        min-height: auto;
      }
      .brand-features {
        display: none;
      }
      .brand-footer {
        display: none;
      }
      .form-panel {
        padding: 32px 20px;
      }
    }
  `],
})
export class LoginPage {
  email = 'admin@servicecore.io';
  password = 'demo';
  loading = signal(false);
  errorMessage = signal('');

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  async onLogin(): Promise<void> {
    if (!this.email || !this.password) return;

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      await this.auth.login(this.email, this.password);
      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.errorMessage.set(
        err?.error?.error ?? err?.error?.message ?? 'Invalid credentials. Please try again.'
      );
    } finally {
      this.loading.set(false);
    }
  }
}
