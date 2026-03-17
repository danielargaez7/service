import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface QueuedPunch {
  id: string;
  type: 'IN' | 'OUT';
  timestamp: string;
  gps: { lat: number; lng: number; accuracy: number };
  jobType: string;
  photoBase64?: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
}

const STORAGE_KEY = 'sc_punch_queue';

@Injectable({ providedIn: 'root' })
export class OfflineQueueService {
  constructor(private http: HttpClient) {}

  queuePunch(punch: QueuedPunch): void {
    const punches = this.getAllPunches();
    punches.push(punch);
    this.save(punches);
  }

  getPendingPunches(): QueuedPunch[] {
    return this.getAllPunches().filter((p) => p.syncStatus === 'PENDING');
  }

  markSynced(id: string): void {
    this.updateStatus(id, 'SYNCED');
  }

  markFailed(id: string): void {
    this.updateStatus(id, 'FAILED');
  }

  async syncAll(): Promise<void> {
    const pending = this.getPendingPunches();

    for (const punch of pending) {
      try {
        await firstValueFrom(
          this.http.post(`${environment.apiUrl}/api/timesheets/punch`, {
            type: punch.type,
            timestamp: punch.timestamp,
            gps: punch.gps,
            jobType: punch.jobType,
            photoBase64: punch.photoBase64,
          })
        );
        this.markSynced(punch.id);
      } catch {
        this.markFailed(punch.id);
      }
    }
  }

  private getAllPunches(): QueuedPunch[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private save(punches: QueuedPunch[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(punches));
  }

  private updateStatus(
    id: string,
    status: QueuedPunch['syncStatus']
  ): void {
    const punches = this.getAllPunches();
    const idx = punches.findIndex((p) => p.id === id);
    if (idx !== -1) {
      punches[idx].syncStatus = status;
      this.save(punches);
    }
  }
}
