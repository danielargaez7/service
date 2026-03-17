import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Timesheets
  clockPunch(body: {
    type: 'IN' | 'OUT';
    timestamp: string;
    gps: { lat: number; lng: number; accuracy: number };
    jobType?: string;
    photoBase64?: string;
  }): Observable<unknown> {
    return this.http.post(`${this.base}/api/timesheets/punch`, body);
  }

  getActiveTimesheets(): Observable<unknown> {
    return this.http.get(`${this.base}/api/timesheets/active`);
  }

  getMyTimesheets(params?: Record<string, string>): Observable<unknown> {
    return this.http.get(`${this.base}/api/timesheets`, { params });
  }

  // Employees
  getMyHOS(): Observable<unknown> {
    return this.http.get(`${this.base}/api/employees/me/hos`);
  }

  getMyProfile(): Observable<unknown> {
    return this.http.get(`${this.base}/api/employees/me`);
  }
}
