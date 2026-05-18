/**
 * Achievement badge catalogue (RE-16).
 *
 * Each badge has a stable `id` (used as the storage key), an emoji icon for
 * personality, two i18n keys for label + description, and a pure
 * `predicate(ctx)` that decides whether the badge is earned given the
 * current reading-stats snapshot.
 *
 * Badges are evaluated each time the upstream stats change. Once earned, a
 * badge is stored in Dexie and never re-evaluated for un-earning — even if
 * the user resets progress, their earned badges remain (the journey
 * happened). Reseting badges has its own escape hatch in the reading-sheet.
 *
 * Categories drive the tab grouping on the badge shelf.
 */

import { BookProgress, DailyReadingTally, StreakInfo } from '@app/services/reading-stats.service';
import { ReadVerse } from '@app/services/bookmark.service';

export type BadgeCategory = 'milestone' | 'streak' | 'book' | 'breadth' | 'habit';

export interface BadgeContext {
  /** Per-book progress, keyed by book slug. Pulled from ReadingStatsService. */
  bookProgressMap: Map<string, BookProgress>;
  /** Cumulative verses read across every book. */
  totalVersesRead: number;
  /** Current + longest streak. */
  streak: StreakInfo;
  /** Per-day tallies (newest first). */
  dailyTallies: DailyReadingTally[];
  /** Raw read-verse records (for predicates that need timestamps). */
  readVerses: ReadVerse[];
}

export interface Badge {
  id: string;
  icon: string;
  labelKey: string;
  descKey: string;
  category: BadgeCategory;
  predicate: (ctx: BadgeContext) => boolean;
}

/** Helper: count distinct books with at least one read verse. */
function distinctBooksRead(ctx: BadgeContext): number {
  let n = 0;
  for (const bp of ctx.bookProgressMap.values()) {
    if (bp.versesRead > 0) n++;
  }
  return n;
}

/** Helper: how many distinct day-parts (morning / afternoon / evening) have ≥1 read. */
function distinctDayParts(ctx: BadgeContext): number {
  const seen = new Set<string>();
  for (const r of ctx.readVerses) {
    const h = (r.readAt instanceof Date ? r.readAt : new Date(r.readAt)).getHours();
    if (h < 6) seen.add('night');
    else if (h < 12) seen.add('morning');
    else if (h < 18) seen.add('afternoon');
    else seen.add('evening');
  }
  return seen.size;
}

/** Helper: book completion fraction (0..1). */
function fractionForBook(ctx: BadgeContext, slug: string): number {
  return ctx.bookProgressMap.get(slug)?.fraction ?? 0;
}

/**
 * Catalogue order matters — it's the display order on the badge shelf.
 * Earned-then-unearned grouping happens in the shelf component, not here.
 */
export const BADGE_CATALOGUE: Badge[] = [
  // Cumulative-volume milestones
  {
    id: 'first-steps',
    icon: '🌱',
    labelKey: 'badges.firstSteps.label',
    descKey: 'badges.firstSteps.desc',
    category: 'milestone',
    predicate: ctx => ctx.totalVersesRead >= 10,
  },
  {
    id: 'centurion',
    icon: '💯',
    labelKey: 'badges.centurion.label',
    descKey: 'badges.centurion.desc',
    category: 'milestone',
    predicate: ctx => ctx.totalVersesRead >= 100,
  },
  {
    id: 'thousand',
    icon: '🌟',
    labelKey: 'badges.thousand.label',
    descKey: 'badges.thousand.desc',
    category: 'milestone',
    predicate: ctx => ctx.totalVersesRead >= 1000,
  },
  {
    id: 'ten-thousand',
    icon: '🏆',
    labelKey: 'badges.tenThousand.label',
    descKey: 'badges.tenThousand.desc',
    category: 'milestone',
    predicate: ctx => ctx.totalVersesRead >= 10000,
  },

  // Streak badges
  {
    id: 'streak-three',
    icon: '🔥',
    labelKey: 'badges.streakThree.label',
    descKey: 'badges.streakThree.desc',
    category: 'streak',
    predicate: ctx => ctx.streak.longest >= 3,
  },
  {
    id: 'streak-week',
    icon: '🔥🔥',
    labelKey: 'badges.streakWeek.label',
    descKey: 'badges.streakWeek.desc',
    category: 'streak',
    predicate: ctx => ctx.streak.longest >= 7,
  },
  {
    id: 'streak-month',
    icon: '🔥🔥🔥',
    labelKey: 'badges.streakMonth.label',
    descKey: 'badges.streakMonth.desc',
    category: 'streak',
    predicate: ctx => ctx.streak.longest >= 30,
  },

  // Book-completion badges
  {
    id: 'completionist',
    icon: '📖',
    labelKey: 'badges.completionist.label',
    descKey: 'badges.completionist.desc',
    category: 'book',
    predicate: ctx => {
      for (const bp of ctx.bookProgressMap.values()) {
        if (bp.total > 0 && bp.versesRead >= bp.total) return true;
      }
      return false;
    },
  },
  {
    id: 'imam-ali',
    icon: '🕊️',
    labelKey: 'badges.imamAli.label',
    descKey: 'badges.imamAli.desc',
    category: 'book',
    predicate: ctx => fractionForBook(ctx, 'nahj-al-balagha') >= 1,
  },

  // Quran tiers (the user asked for ayah-coverage)
  {
    id: 'quran-bronze',
    icon: '🥉',
    labelKey: 'badges.quranBronze.label',
    descKey: 'badges.quranBronze.desc',
    category: 'book',
    predicate: ctx => fractionForBook(ctx, 'quran') >= 0.25,
  },
  {
    id: 'quran-silver',
    icon: '🥈',
    labelKey: 'badges.quranSilver.label',
    descKey: 'badges.quranSilver.desc',
    category: 'book',
    predicate: ctx => fractionForBook(ctx, 'quran') >= 0.5,
  },
  {
    id: 'quran-gold',
    icon: '🥇',
    labelKey: 'badges.quranGold.label',
    descKey: 'badges.quranGold.desc',
    category: 'book',
    predicate: ctx => fractionForBook(ctx, 'quran') >= 1,
  },

  // Breadth — reading across multiple books
  {
    id: 'breadth-three',
    icon: '📚',
    labelKey: 'badges.breadthThree.label',
    descKey: 'badges.breadthThree.desc',
    category: 'breadth',
    predicate: ctx => distinctBooksRead(ctx) >= 3,
  },
  {
    id: 'breadth-five',
    icon: '📚📚',
    labelKey: 'badges.breadthFive.label',
    descKey: 'badges.breadthFive.desc',
    category: 'breadth',
    predicate: ctx => distinctBooksRead(ctx) >= 5,
  },
  {
    id: 'breadth-ten',
    icon: '🌍',
    labelKey: 'badges.breadthTen.label',
    descKey: 'badges.breadthTen.desc',
    category: 'breadth',
    predicate: ctx => distinctBooksRead(ctx) >= 10,
  },

  // Habit — *how* the user reads
  {
    id: 'the-hours',
    icon: '⏰',
    labelKey: 'badges.theHours.label',
    descKey: 'badges.theHours.desc',
    category: 'habit',
    predicate: ctx => distinctDayParts(ctx) >= 3,
  },
  {
    id: 'early-bird',
    icon: '🌅',
    labelKey: 'badges.earlyBird.label',
    descKey: 'badges.earlyBird.desc',
    category: 'habit',
    predicate: ctx => {
      // 5 reads logged between 04:00 and 07:00 local time
      let n = 0;
      for (const r of ctx.readVerses) {
        const h = (r.readAt instanceof Date ? r.readAt : new Date(r.readAt)).getHours();
        if (h >= 4 && h < 7) n++;
        if (n >= 5) return true;
      }
      return false;
    },
  },
  {
    id: 'night-owl',
    icon: '🌙',
    labelKey: 'badges.nightOwl.label',
    descKey: 'badges.nightOwl.desc',
    category: 'habit',
    predicate: ctx => {
      // 5 reads logged between 22:00 and 02:00 local
      let n = 0;
      for (const r of ctx.readVerses) {
        const h = (r.readAt instanceof Date ? r.readAt : new Date(r.readAt)).getHours();
        if (h >= 22 || h < 2) n++;
        if (n >= 5) return true;
      }
      return false;
    },
  },
];

/** Lookup helper. */
export function badgeById(id: string): Badge | undefined {
  return BADGE_CATALOGUE.find(b => b.id === id);
}
