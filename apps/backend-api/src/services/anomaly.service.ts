import { TimeEntry } from '@servicecore/shared-models';

interface AnomalyDetectResponse {
  score?: number;
  is_anomaly?: boolean;
  reasons?: string[];
}

interface PunchLike {
  type: 'IN' | 'OUT';
  timestamp: string;
  gps: { lat: number; lng: number; accuracy: number };
  employeeId: string;
}

export class AnomalyService {
  private readonly baseUrl =
    process.env.ANOMALY_SERVICE_URL ?? 'http://localhost:8003';

  async scorePunch(punch: PunchLike): Promise<{ score: number; flags: string[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: punch.employeeId,
          timestamp: punch.timestamp,
          punchType: punch.type,
          gpsAccuracy: punch.gps.accuracy,
        }),
      });

      if (!response.ok) {
        return this.fallbackPunchScore(punch);
      }

      const data = (await response.json()) as AnomalyDetectResponse;
      return {
        score: Number(data.score ?? 0),
        flags: [...(data.reasons ?? []), ...(data.is_anomaly ? ['model-flagged'] : [])],
      };
    } catch {
      return this.fallbackPunchScore(punch);
    }
  }

  async scoreTimesheetEntries(entries: TimeEntry[]): Promise<Record<string, number>> {
    const scored = await Promise.all(
      entries.map(async (entry) => {
        const result = await this.scorePunch({
          type: entry.clockOut ? 'OUT' : 'IN',
          timestamp: entry.clockIn.toISOString(),
          gps: entry.gpsIn ?? { lat: 0, lng: 0, accuracy: 999 },
          employeeId: entry.employeeId,
        });
        return [entry.id, result.score] as const;
      })
    );

    return Object.fromEntries(scored);
  }

  private fallbackPunchScore(punch: PunchLike): { score: number; flags: string[] } {
    const hour = new Date(punch.timestamp).getHours();
    const flags: string[] = [];
    let score = 0.05;

    if (hour < 4) {
      score += 0.35;
      flags.push('unusual-hour');
    }
    if (punch.gps.accuracy > 120) {
      score += 0.2;
      flags.push('low-gps-accuracy');
    }

    return { score: Math.min(1, score), flags };
  }
}
