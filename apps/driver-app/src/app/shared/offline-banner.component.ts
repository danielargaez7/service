import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-offline-banner',
  template: `
    @if (isOffline()) {
      <div class="offline-banner">
        <i class="pi pi-wifi" style="text-decoration: line-through; font-size: 1.1rem;"></i>
        <div class="offline-text">
          <strong>You're offline</strong>
          <span>Punches will sync when you're back online</span>
        </div>
      </div>
    }
  `,
  styles: [`
    .offline-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      background: #fef3c7;
      color: #92400e;
      font-size: 0.85rem;
      border-bottom: 2px solid #f59e0b;
      animation: slideDown 0.3s ease;
    }
    .offline-text {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .offline-text strong { font-size: 0.85rem; }
    .offline-text span { font-size: 0.75rem; color: #a16207; }
    @keyframes slideDown {
      from { transform: translateY(-100%); }
      to { transform: translateY(0); }
    }
  `],
})
export class OfflineBannerComponent implements OnInit, OnDestroy {
  isOffline = signal(!navigator.onLine);
  private onlineHandler = () => this.isOffline.set(false);
  private offlineHandler = () => this.isOffline.set(true);

  ngOnInit(): void {
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
  }
}
