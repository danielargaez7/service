import http from 'http';
import WebSocket from 'ws';

interface WSEvent {
  type: string;
  payload: unknown;
  timestamp: Date;
}

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
}

let wssInstance: WebSocket.Server | null = null;

/**
 * Creates and returns a ws.Server attached to the given http.Server.
 * Sets up connection tracking, heartbeat ping/pong, and exposes a
 * `broadcast` utility.
 */
export function createWebSocketServer(server: http.Server): WebSocket.Server {
  const wss = new WebSocket.Server({ server });
  wssInstance = wss;

  // -----------------------------------------------------------------------
  // Connection handling
  // -----------------------------------------------------------------------
  wss.on('connection', (ws: ExtendedWebSocket) => {
    ws.isAlive = true;
    console.log(
      `[ws] Client connected (total: ${wss.clients.size})`
    );

    // Respond to pong frames
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Handle incoming messages (for future client-to-server events)
    ws.on('message', (data: WebSocket.RawData) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('[ws] Received:', message);
      } catch {
        console.warn('[ws] Received non-JSON message');
      }
    });

    ws.on('close', () => {
      console.log(
        `[ws] Client disconnected (total: ${wss.clients.size})`
      );
    });

    ws.on('error', (err) => {
      console.error('[ws] Socket error:', err.message);
    });

    // Send a welcome event to the newly connected client
    ws.send(
      JSON.stringify({
        type: 'CONNECTED',
        payload: { message: 'Connected to ServiceCore WebSocket' },
        timestamp: new Date().toISOString(),
      })
    );
  });

  // -----------------------------------------------------------------------
  // Heartbeat — ping every 30 seconds, terminate dead connections
  // -----------------------------------------------------------------------
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws as ExtendedWebSocket;
      if (!extWs.isAlive) {
        return extWs.terminate();
      }
      extWs.isAlive = false;
      extWs.ping();
    });
  }, 30_000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  return wss;
}

/**
 * Broadcast an event to all connected WebSocket clients.
 */
export function broadcast(event: WSEvent): void {
  if (!wssInstance) {
    console.warn('[ws] Cannot broadcast — WebSocket server not initialized');
    return;
  }

  const message = JSON.stringify({
    ...event,
    timestamp: event.timestamp.toISOString(),
  });

  wssInstance.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
