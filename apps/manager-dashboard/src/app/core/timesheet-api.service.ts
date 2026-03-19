import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TimesheetEntry {
  id: string;
  employeeId: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    employeeClass: string;
  };
  clockIn: string;
  clockOut: string | null;
  jobType: string;
  routeId: string | null;
  gpsClockIn: { lat: number; lng: number; accuracy: number } | null;
  gpsClockOut: { lat: number; lng: number; accuracy: number } | null;
  hoursWorked: number | null;
  regularHours: number | null;
  overtimeHours: number | null;
  doubleTimeHours: number | null;
  anomalyScore: number | null;
  anomalyFlags: string[];
  status: string;
  approved: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string | null;
  flagReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimesheetListResponse {
  data: TimesheetEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  source: string;
}

export interface ActiveResponse {
  data: TimesheetEntry[];
  count: number;
}

export interface ExceptionsResponse {
  counts: {
    missedClockOuts: number;
    hosWarnings: number;
    otAlerts: number;
    totalFlagged: number;
  };
  flaggedEntries: TimesheetEntry[];
}

export interface TimesheetQueryParams {
  employeeId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class TimesheetApiService {
  private readonly baseUrl = `${environment.apiUrl}/api/timesheets`;

  constructor(private http: HttpClient) {}

  getTimesheets(params: TimesheetQueryParams = {}): Observable<TimesheetListResponse> {
    let httpParams = new HttpParams();
    if (params.employeeId) httpParams = httpParams.set('employeeId', params.employeeId);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params.endDate) httpParams = httpParams.set('endDate', params.endDate);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());

    return this.http.get<TimesheetListResponse>(this.baseUrl, { params: httpParams });
  }

  getActive(): Observable<ActiveResponse> {
    return this.http.get<ActiveResponse>(`${this.baseUrl}/active`);
  }

  getExceptions(): Observable<ExceptionsResponse> {
    return this.http.get<ExceptionsResponse>(`${this.baseUrl}/exceptions`);
  }

  approve(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/approve`, {});
  }

  reject(id: string, reason: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/reject`, { reason });
  }

  bulkApprove(ids: string[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/bulk-approve`, { ids });
  }
}
