import { Injectable, computed, signal } from '@angular/core';

export type LeaderboardPeriod = 'week' | 'month' | 'quarter';

export interface LeaderboardDriver {
  name: string;
  points: number;
  badge?: {
    name: string;
    icon: string;
  };
}

export interface RecentBadgeAward {
  driverName: string;
  badge: {
    name: string;
    icon: string;
  };
  awardedAt: string;
}

const LEADERBOARD_DATA: Record<LeaderboardPeriod, LeaderboardDriver[]> = {
  week: [
    { name: 'Marcus Johnson', points: 420, badge: { name: 'Route Champion', icon: '🏁' } },
    { name: 'Jake Hernandez', points: 360 },
    { name: 'DeShawn Carter', points: 310 },
  ],
  month: [
    { name: 'Marcus Johnson', points: 1230, badge: { name: 'Clean Sheet', icon: '📋' } },
    { name: 'Miguel Rodriguez', points: 1120 },
    { name: 'Jake Hernandez', points: 980 },
  ],
  quarter: [
    { name: 'Marcus Johnson', points: 2820, badge: { name: 'Manifest Master', icon: '📄' } },
    { name: 'Miguel Rodriguez', points: 2410 },
    { name: 'Terrell Williams', points: 2180 },
  ],
};

const RECENT_AWARDS: RecentBadgeAward[] = [
  {
    driverName: 'Marcus Johnson',
    badge: { name: 'Route Champion', icon: '🏁' },
    awardedAt: '18m ago',
  },
  {
    driverName: 'Jake Hernandez',
    badge: { name: 'DOT Clear', icon: '✅' },
    awardedAt: '1h ago',
  },
  {
    driverName: 'Terrell Williams',
    badge: { name: 'Clean Sheet', icon: '📋' },
    awardedAt: 'Yesterday',
  },
];

@Injectable({ providedIn: 'root' })
export class ManagerGamificationService {
  readonly selectedPeriod = signal<LeaderboardPeriod>('week');
  readonly leaders = computed(() => LEADERBOARD_DATA[this.selectedPeriod()]);
  readonly recentAwards = computed(() => RECENT_AWARDS);

  setPeriod(period: LeaderboardPeriod): void {
    this.selectedPeriod.set(period);
  }
}
