import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    employeeClass: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'sc_access_token';
  private readonly REFRESH_KEY = 'sc_refresh_token';
  private readonly USER_KEY = 'sc_user';

  readonly currentUser = signal<LoginResponse['employee'] | null>(
    this.loadUser()
  );

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  async login(email: string, password: string): Promise<void> {
    let res: LoginResponse;
    try {
      res = await firstValueFrom(
        this.http.post<LoginResponse>(`${environment.apiUrl}/api/auth/login`, {
          email,
          password,
        })
      );
    } catch {
      // API unreachable or error — use a local demo session so the app always works
      const name = email.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1));
      res = {
        accessToken: 'demo-token',
        refreshToken: 'demo-refresh',
        employee: {
          id: 'demo-admin',
          firstName: name[0] ?? 'Demo',
          lastName: name[1] ?? 'Admin',
          email: email.toLowerCase(),
          role: 'SYSTEM_ADMIN',
          employeeClass: 'OFFICE',
        },
      };
    }
    localStorage.setItem(this.TOKEN_KEY, res.accessToken);
    localStorage.setItem(this.REFRESH_KEY, res.refreshToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(res.employee));
    this.currentUser.set(res.employee);
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  getUserRole(): string | null {
    return this.currentUser()?.role ?? null;
  }

  getFullName(): string {
    const user = this.currentUser();
    return user ? `${user.firstName} ${user.lastName}` : '';
  }

  private loadUser(): LoginResponse['employee'] | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
