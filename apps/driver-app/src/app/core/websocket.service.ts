import { Injectable, OnDestroy, signal } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable, retry, timer, Subject, filter, takeUntil } from 'rxjs';
import { environment } from '../../environments/environment';

export interface WSEvent {
  type: string;
  payload: unknown;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private socket$: WebSocketSubject<WSEvent> | null = null;
  private readonly destroy$ = new Subject<void>();

  readonly connected = signal(false);

  connect(): void {
    if (this.socket$) return;

    this.socket$ = webSocket<WSEvent>({
      url: environment.wsUrl,
      openObserver: {
        next: () => this.connected.set(true),
      },
      closeObserver: {
        next: () => this.connected.set(false),
      },
    });

    // Keep connection alive with auto-reconnect
    this.socket$
      .pipe(
        retry({
          delay: (_, retryCount) =>
            timer(Math.min(1000 * Math.pow(2, retryCount), 30000)),
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        error: (err) => console.error('[WS] Error:', err),
      });
  }

  on<T = unknown>(eventType: string): Observable<T> {
    if (!this.socket$) this.connect();
    return this.socket$!.pipe(
      filter((event) => event.type === eventType),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filter((event): event is any => true),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filter((_: any) => true)
    ) as unknown as Observable<T>;
  }

  onEvent(eventType: string): Observable<WSEvent> {
    if (!this.socket$) this.connect();
    return this.socket$!.pipe(
      filter((event) => event.type === eventType)
    );
  }

  disconnect(): void {
    this.socket$?.complete();
    this.socket$ = null;
    this.connected.set(false);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }
}
