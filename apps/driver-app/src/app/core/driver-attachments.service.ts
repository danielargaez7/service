import { Injectable, signal } from '@angular/core';
import {
  Camera,
  CameraResultType,
  CameraSource,
} from '@capacitor/camera';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { GpsService, GpsPosition } from './gps.service';

export interface DriverAttachment {
  id: string;
  shiftId: string;
  category: 'PHOTO' | 'DOCUMENT';
  filename: string;
  imageBase64: string;
  previewUrl: string;
  note?: string;
  timestamp: string;
  gps?: GpsPosition | null;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
}

const STORAGE_KEY = 'sc_driver_attachments';

@Injectable({ providedIn: 'root' })
export class DriverAttachmentsService {
  readonly attachments = signal<DriverAttachment[]>(this.read());

  constructor(
    private readonly api: ApiService,
    private readonly gps: GpsService
  ) {}

  attachmentsForShift(shiftId: string | null): DriverAttachment[] {
    if (!shiftId) return [];
    return this.attachments().filter((attachment) => attachment.shiftId === shiftId);
  }

  async captureForShift(
    shiftId: string,
    category: 'PHOTO' | 'DOCUMENT',
    source: CameraSource,
    note?: string
  ): Promise<DriverAttachment | null> {
    try {
      const photo = await Camera.getPhoto({
        quality: 70,
        resultType: CameraResultType.Base64,
        source,
      });

      if (!photo.base64String) return null;

      let gps: GpsPosition | null = null;
      try {
        gps = await this.gps.getCurrentPosition();
      } catch {
        gps = null;
      }

      const timestamp = new Date().toISOString();
      const attachment: DriverAttachment = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        shiftId,
        category,
        filename: `${category.toLowerCase()}-${timestamp}.jpeg`,
        imageBase64: photo.base64String,
        previewUrl: `data:image/jpeg;base64,${photo.base64String}`,
        note,
        timestamp,
        gps,
        syncStatus: 'PENDING',
      };

      this.attachments.update((items) => [attachment, ...items]);
      this.persist();
      await this.syncAttachment(attachment.id);
      return attachment;
    } catch {
      return null;
    }
  }

  async syncAttachment(id: string): Promise<void> {
    const attachment = this.attachments().find((item) => item.id === id);
    if (!attachment) return;

    try {
      await firstValueFrom(
        this.api.uploadDriverAttachment({
          shiftId: attachment.shiftId,
          category: attachment.category,
          filename: attachment.filename,
          imageBase64: attachment.imageBase64,
          gps: attachment.gps ?? null,
          note: attachment.note,
          timestamp: attachment.timestamp,
        })
      );
      this.updateStatus(id, 'SYNCED');
    } catch {
      this.updateStatus(id, 'FAILED');
    }
  }

  async syncAll(): Promise<void> {
    for (const attachment of this.attachments().filter((item) => item.syncStatus !== 'SYNCED')) {
      await this.syncAttachment(attachment.id);
    }
  }

  private updateStatus(id: string, syncStatus: DriverAttachment['syncStatus']): void {
    this.attachments.update((items) =>
      items.map((item) => (item.id === id ? { ...item, syncStatus } : item))
    );
    this.persist();
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.attachments()));
  }

  private read(): DriverAttachment[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}
