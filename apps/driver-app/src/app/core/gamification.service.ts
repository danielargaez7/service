import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';

export type BadgeTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
export type BadgeCategory =
  | 'PUNCTUALITY'
  | 'SAFETY'
  | 'EFFICIENCY'
  | 'DOCUMENTATION'
  | 'COMPLIANCE'
  | 'MENTORSHIP';

export interface BadgeDefinition {
  id: string;
  name: string;
  icon: string;
  tier: BadgeTier;
  description: string;
  pointValue: number;
  category: BadgeCategory;
}

export interface BadgeAward {
  badgeId: string;
  awardedAt: string;
}

export interface PointTier {
  name: string;
  minPoints: number;
  icon: string;
  color: string;
}

const BADGE_CATALOG: BadgeDefinition[] = [
  {
    id: 'early_bird_bronze',
    name: 'Early Bird',
    icon: '🌅',
    tier: 'BRONZE',
    description: 'Clocked in on time or early for 5 consecutive scheduled shifts.',
    pointValue: 50,
    category: 'PUNCTUALITY',
  },
  {
    id: 'smooth_hook',
    name: 'Smooth Hook',
    icon: '🪝',
    tier: 'SILVER',
    description: 'Ten consecutive roll-off routes completed with zero damage reports.',
    pointValue: 200,
    category: 'SAFETY',
  },
  {
    id: 'fuel_scout_bronze',
    name: 'Fuel Scout',
    icon: '⛽',
    tier: 'BRONZE',
    description: 'Logged the most cost-efficient fuel stops on your route this week.',
    pointValue: 100,
    category: 'EFFICIENCY',
  },
  {
    id: 'route_champion',
    name: 'Route Champion',
    icon: '🏁',
    tier: 'SILVER',
    description: 'Completed all assigned stops this week under estimate with a clean return.',
    pointValue: 300,
    category: 'EFFICIENCY',
  },
  {
    id: 'clean_sheet',
    name: 'Clean Sheet',
    icon: '📋',
    tier: 'BRONZE',
    description: 'Submitted timesheets with zero missing punches or corrections for 4 weeks.',
    pointValue: 150,
    category: 'DOCUMENTATION',
  },
  {
    id: 'voice_logger',
    name: 'Voice Logger',
    icon: '🎙️',
    tier: 'BRONZE',
    description: 'Used Voice FastFill to log job notes on 20 consecutive shifts.',
    pointValue: 100,
    category: 'DOCUMENTATION',
  },
  {
    id: 'manifest_master',
    name: 'Manifest Master',
    icon: '📄',
    tier: 'SILVER',
    description: 'Zero overdue or rejected e-Manifests for 90 consecutive days.',
    pointValue: 250,
    category: 'COMPLIANCE',
  },
  {
    id: 'dot_clear',
    name: 'DOT Clear',
    icon: '✅',
    tier: 'BRONZE',
    description: 'Zero HOS warnings or violations in the past 30 days.',
    pointValue: 100,
    category: 'COMPLIANCE',
  },
  {
    id: 'first_mate',
    name: 'First Mate',
    icon: '🧭',
    tier: 'SILVER',
    description: 'Successfully mentored 1 new driver through their first 30 routes.',
    pointValue: 400,
    category: 'MENTORSHIP',
  },
  {
    id: 'fleet_captain',
    name: 'Fleet Captain',
    icon: '⚓',
    tier: 'GOLD',
    description: 'Guided 3 new drivers through mentorship quests with strong ratings.',
    pointValue: 1000,
    category: 'MENTORSHIP',
  },
];

const POINT_TIERS: PointTier[] = [
  { name: 'Rookie', minPoints: 0, icon: '🔰', color: '#94A3B8' },
  { name: 'Driver', minPoints: 200, icon: '🚛', color: '#0EA5E9' },
  { name: 'Pro Driver', minPoints: 750, icon: '⭐', color: '#22C55E' },
  { name: 'Road Warrior', minPoints: 2000, icon: '🏅', color: '#F59E0B' },
  { name: 'Fleet Captain', minPoints: 5000, icon: '⚓', color: '#F97316' },
];

const MOCK_AWARDS: BadgeAward[] = [
  { badgeId: 'early_bird_bronze', awardedAt: '2026-03-02T07:15:00.000Z' },
  { badgeId: 'clean_sheet', awardedAt: '2026-03-06T18:40:00.000Z' },
  { badgeId: 'dot_clear', awardedAt: '2026-03-10T11:20:00.000Z' },
  { badgeId: 'voice_logger', awardedAt: '2026-03-11T16:05:00.000Z' },
];

@Injectable({ providedIn: 'root' })
export class GamificationService {
  private readonly auth = inject(AuthService);

  readonly badgeCatalog = computed(() => BADGE_CATALOG);
  readonly awards = computed(() => this.mockAwardsForCurrentUser());
  readonly earnedBadgeIds = computed(
    () => new Set(this.awards().map((award) => award.badgeId))
  );
  readonly totalPoints = computed(() =>
    this.awards().reduce((sum, award) => {
      const badge = BADGE_CATALOG.find((entry) => entry.id === award.badgeId);
      return sum + (badge?.pointValue ?? 0);
    }, 0)
  );
  readonly currentTier = computed(() => {
    const points = this.totalPoints();
    return (
      [...POINT_TIERS].reverse().find((tier) => points >= tier.minPoints) ?? POINT_TIERS[0]
    );
  });
  readonly nextTier = computed(() => {
    const points = this.totalPoints();
    return POINT_TIERS.find((tier) => tier.minPoints > points) ?? null;
  });
  readonly tierProgressPercent = computed(() => {
    const current = this.currentTier();
    const next = this.nextTier();
    const points = this.totalPoints();
    if (!next) {
      return 100;
    }
    const span = next.minPoints - current.minPoints;
    return Math.max(0, Math.min(100, ((points - current.minPoints) / span) * 100));
  });
  readonly recentAwards = computed(() =>
    this.awards()
      .map((award) => ({
        ...award,
        badge: BADGE_CATALOG.find((entry) => entry.id === award.badgeId)!,
      }))
      .sort((left, right) => right.awardedAt.localeCompare(left.awardedAt))
  );

  isEarned(badgeId: string): boolean {
    return this.earnedBadgeIds().has(badgeId);
  }

  getBadge(badgeId: string): BadgeDefinition | undefined {
    return BADGE_CATALOG.find((badge) => badge.id === badgeId);
  }

  getAllPointTiers(): PointTier[] {
    return POINT_TIERS;
  }

  private mockAwardsForCurrentUser(): BadgeAward[] {
    const user = this.auth.currentUser();
    if (!user) {
      return [];
    }

    if (user.role === 'MANAGER') {
      return [...MOCK_AWARDS, { badgeId: 'manifest_master', awardedAt: '2026-03-12T08:30:00.000Z' }];
    }

    return MOCK_AWARDS;
  }
}
