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

/** Helper: max verses read in a single calendar day. */
function maxVersesInOneDay(ctx: BadgeContext): number {
  let m = 0;
  for (const d of ctx.dailyTallies) {
    if (d.versesRead > m) m = d.versesRead;
  }
  return m;
}

/** Helper: number of distinct books read in a single calendar day. */
function maxBookBreadthInOneDay(ctx: BadgeContext): number {
  let m = 0;
  for (const d of ctx.dailyTallies) {
    if (d.bookIds.length > m) m = d.bookIds.length;
  }
  return m;
}

/** Helper: max distinct books read across any rolling 7-day window. */
function maxBookBreadthInOneWeek(ctx: BadgeContext): number {
  // dailyTallies is newest-first; we want a rolling window over consecutive
  // days. Sort ascending for the sweep.
  const tallies = [...ctx.dailyTallies].sort((a, b) => a.date.localeCompare(b.date));
  let best = 0;
  for (let i = 0; i < tallies.length; i++) {
    const start = new Date(tallies[i].date).getTime();
    const distinct = new Set<string>();
    for (let j = i; j < tallies.length; j++) {
      const days = (new Date(tallies[j].date).getTime() - start) / 86_400_000;
      if (days > 6) break;  // window of 7 inclusive days: 0..6
      for (const b of tallies[j].bookIds) distinct.add(b);
    }
    if (distinct.size > best) best = distinct.size;
  }
  return best;
}

/** Helper: has the user read on N reads inside the [startHour, endHour) window (wraparound supported). */
function readsInHourRange(ctx: BadgeContext, startHour: number, endHour: number, n: number): boolean {
  let count = 0;
  const wrap = endHour <= startHour; // e.g. 22 → 2 wraps over midnight
  for (const r of ctx.readVerses) {
    const h = (r.readAt instanceof Date ? r.readAt : new Date(r.readAt)).getHours();
    const inRange = wrap ? (h >= startHour || h < endHour) : (h >= startHour && h < endHour);
    if (inRange) count++;
    if (count >= n) return true;
  }
  return false;
}

/** Helper: read on every day of a given calendar-week ISO offset (Monday-start). */
function readEveryDayOfAnyWeek(ctx: BadgeContext): boolean {
  if (ctx.dailyTallies.length < 7) return false;
  const dateSet = new Set(ctx.dailyTallies.map(t => t.date));
  // For each day that's a Monday in the tally set, check 7 consecutive.
  for (const t of ctx.dailyTallies) {
    const start = new Date(t.date);
    if (start.getDay() !== 1) continue; // 1 = Monday in JS
    let allPresent = true;
    for (let i = 0; i < 7; i++) {
      const d = new Date(start.getTime() + i * 86_400_000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!dateSet.has(key)) { allPresent = false; break; }
    }
    if (allPresent) return true;
  }
  return false;
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
 * Within each category, entries are sorted from easiest to hardest so a
 * fresh user sees the closest goals first. Earned-then-unearned grouping
 * happens in the shelf component, not here.
 *
 * Categories themselves render in the order:
 *   milestone → streak → book → breadth → habit
 * (matches `BadgeShelfComponent`'s categoryOrder array.)
 */
export const BADGE_CATALOGUE: Badge[] = [
  // ===== MILESTONES — cumulative + single-day volume =====
  {
    id: 'first-steps',
    icon: '🌱',
    labelKey: 'badges.firstSteps.label',
    descKey: 'badges.firstSteps.desc',
    category: 'milestone',
    predicate: ctx => ctx.totalVersesRead >= 10,
  },
  {
    id: 'daily-fifty',
    icon: '⚡',
    labelKey: 'badges.dailyFifty.label',
    descKey: 'badges.dailyFifty.desc',
    category: 'milestone',
    predicate: ctx => maxVersesInOneDay(ctx) >= 50,
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
    id: 'daily-hundred',
    icon: '🚀',
    labelKey: 'badges.dailyHundred.label',
    descKey: 'badges.dailyHundred.desc',
    category: 'milestone',
    predicate: ctx => maxVersesInOneDay(ctx) >= 100,
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
  {
    id: 'twenty-five-thousand',
    icon: '👑',
    labelKey: 'badges.twentyFiveThousand.label',
    descKey: 'badges.twentyFiveThousand.desc',
    category: 'milestone',
    predicate: ctx => ctx.totalVersesRead >= 25000,
  },
  {
    id: 'fifty-thousand',
    icon: '✨',
    labelKey: 'badges.fiftyThousand.label',
    descKey: 'badges.fiftyThousand.desc',
    category: 'milestone',
    predicate: ctx => ctx.totalVersesRead >= 50000,
  },

  // ===== STREAKS — ascending day-count =====
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
    icon: '🔥',
    labelKey: 'badges.streakWeek.label',
    descKey: 'badges.streakWeek.desc',
    category: 'streak',
    predicate: ctx => ctx.streak.longest >= 7,
  },
  {
    id: 'streak-fortnight',
    icon: '🔥',
    labelKey: 'badges.streakFortnight.label',
    descKey: 'badges.streakFortnight.desc',
    category: 'streak',
    predicate: ctx => ctx.streak.longest >= 14,
  },
  {
    id: 'streak-month',
    icon: '🔥',
    labelKey: 'badges.streakMonth.label',
    descKey: 'badges.streakMonth.desc',
    category: 'streak',
    predicate: ctx => ctx.streak.longest >= 30,
  },
  {
    id: 'streak-quarter',
    icon: '🌟',
    labelKey: 'badges.streakQuarter.label',
    descKey: 'badges.streakQuarter.desc',
    category: 'streak',
    predicate: ctx => ctx.streak.longest >= 90,
  },
  {
    id: 'streak-half-year',
    icon: '💎',
    labelKey: 'badges.streakHalfYear.label',
    descKey: 'badges.streakHalfYear.desc',
    category: 'streak',
    predicate: ctx => ctx.streak.longest >= 180,
  },
  {
    id: 'streak-nine-months',
    icon: '🏵️',
    labelKey: 'badges.streakNineMonths.label',
    descKey: 'badges.streakNineMonths.desc',
    category: 'streak',
    predicate: ctx => ctx.streak.longest >= 270,
  },
  {
    id: 'streak-year',
    icon: '🌳',
    labelKey: 'badges.streakYear.label',
    descKey: 'badges.streakYear.desc',
    category: 'streak',
    predicate: ctx => ctx.streak.longest >= 365,
  },

  // ===== BOOK COMPLETION — ascending effort =====
  {
    id: 'quran-bronze',
    icon: '🥉',
    labelKey: 'badges.quranBronze.label',
    descKey: 'badges.quranBronze.desc',
    category: 'book',
    predicate: ctx => fractionForBook(ctx, 'quran') >= 0.25,
  },
  {
    id: 'imam-ali',
    icon: '🕊️',
    labelKey: 'badges.imamAli.label',
    descKey: 'badges.imamAli.desc',
    category: 'book',
    predicate: ctx => fractionForBook(ctx, 'nahj-al-balagha') >= 1,
  },
  {
    id: 'kafi-vol1',
    icon: '🧠',
    labelKey: 'badges.kafiVol1.label',
    descKey: 'badges.kafiVol1.desc',
    category: 'book',
    predicate: ctx => {
      // "al-kafi" book progress — vol 1 isn't tracked separately, so we
      // approximate via the bookProgressMap. Gate on >= 9.4% of al-kafi
      // (Vol 1 is ~1463/15397 ≈ 9.5%).
      const bp = ctx.bookProgressMap.get('al-kafi');
      return !!bp && bp.fraction >= 0.094;
    },
  },
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
    id: 'quran-silver',
    icon: '🥈',
    labelKey: 'badges.quranSilver.label',
    descKey: 'badges.quranSilver.desc',
    category: 'book',
    predicate: ctx => fractionForBook(ctx, 'quran') >= 0.5,
  },
  {
    id: 'al-saduq-master',
    icon: '📜',
    labelKey: 'badges.alSaduqMaster.label',
    descKey: 'badges.alSaduqMaster.desc',
    category: 'book',
    predicate: ctx => {
      const saduqSlugs = [
        'al-amali-saduq', 'al-khisal', 'al-tawhid', 'kamal-al-din',
        'maani-al-akhbar', 'man-la-yahduruhu-al-faqih', 'thawab-al-amal',
        'uyun-akhbar-al-rida', 'fadail-al-shia', 'sifat-al-shia',
      ];
      let finished = 0;
      for (const slug of saduqSlugs) {
        const bp = ctx.bookProgressMap.get(slug);
        if (bp && bp.total > 0 && bp.versesRead >= bp.total) finished++;
        if (finished >= 3) return true;
      }
      return false;
    },
  },
  {
    id: 'quran-gold',
    icon: '🥇',
    labelKey: 'badges.quranGold.label',
    descKey: 'badges.quranGold.desc',
    category: 'book',
    predicate: ctx => fractionForBook(ctx, 'quran') >= 1,
  },
  {
    id: 'four-books',
    icon: '🏛️',
    labelKey: 'badges.fourBooks.label',
    descKey: 'badges.fourBooks.desc',
    category: 'book',
    predicate: ctx => {
      const four = ['al-kafi', 'man-la-yahduruhu-al-faqih', 'tahdhib-al-ahkam', 'al-istibsar'];
      for (const slug of four) {
        const bp = ctx.bookProgressMap.get(slug);
        if (!bp || bp.total === 0 || bp.versesRead < bp.total) return false;
      }
      return true;
    },
  },

  // ===== BREADTH — reading across distinct books =====
  {
    id: 'breadth-three',
    icon: '📚',
    labelKey: 'badges.breadthThree.label',
    descKey: 'badges.breadthThree.desc',
    category: 'breadth',
    predicate: ctx => distinctBooksRead(ctx) >= 3,
  },
  {
    id: 'variety-day',
    icon: '🎨',
    labelKey: 'badges.varietyDay.label',
    descKey: 'badges.varietyDay.desc',
    category: 'breadth',
    predicate: ctx => maxBookBreadthInOneDay(ctx) >= 3,
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
    id: 'diversified',
    icon: '⚖️',
    labelKey: 'badges.diversified.label',
    descKey: 'badges.diversified.desc',
    category: 'breadth',
    predicate: ctx => {
      const quran = ctx.bookProgressMap.get('quran');
      if (!quran || quran.versesRead === 0) return false;
      let hadithBooks = 0;
      for (const [bookId, bp] of ctx.bookProgressMap) {
        if (bookId === 'quran') continue;
        if (bp.versesRead > 0) hadithBooks++;
        if (hadithBooks >= 3) return true;
      }
      return false;
    },
  },
  {
    id: 'shia-canon',
    icon: '🏛️',
    labelKey: 'badges.shiaCanon.label',
    descKey: 'badges.shiaCanon.desc',
    category: 'breadth',
    predicate: ctx => {
      // At least one verse touched in each of the Four Books.
      const four = ['al-kafi', 'man-la-yahduruhu-al-faqih', 'tahdhib-al-ahkam', 'al-istibsar'];
      for (const slug of four) {
        const bp = ctx.bookProgressMap.get(slug);
        if (!bp || bp.versesRead === 0) return false;
      }
      return true;
    },
  },
  {
    id: 'variety-week',
    icon: '🎭',
    labelKey: 'badges.varietyWeek.label',
    descKey: 'badges.varietyWeek.desc',
    category: 'breadth',
    predicate: ctx => maxBookBreadthInOneWeek(ctx) >= 5,
  },
  {
    id: 'breadth-ten',
    icon: '🌍',
    labelKey: 'badges.breadthTen.label',
    descKey: 'badges.breadthTen.desc',
    category: 'breadth',
    predicate: ctx => distinctBooksRead(ctx) >= 10,
  },
  {
    id: 'breadth-fifteen',
    icon: '🗺️',
    labelKey: 'badges.breadthFifteen.label',
    descKey: 'badges.breadthFifteen.desc',
    category: 'breadth',
    predicate: ctx => distinctBooksRead(ctx) >= 15,
  },
  {
    id: 'explorer',
    icon: '🌌',
    labelKey: 'badges.explorer.label',
    descKey: 'badges.explorer.desc',
    category: 'breadth',
    predicate: ctx => distinctBooksRead(ctx) >= 20,
  },

  // ===== HABIT — when + how the user reads =====
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
    predicate: ctx => readsInHourRange(ctx, 4, 7, 5),
  },
  {
    id: 'night-owl',
    icon: '🌙',
    labelKey: 'badges.nightOwl.label',
    descKey: 'badges.nightOwl.desc',
    category: 'habit',
    predicate: ctx => readsInHourRange(ctx, 22, 2, 5),
  },
  {
    id: 'fajr-reader',
    icon: '🕌',
    labelKey: 'badges.fajrReader.label',
    descKey: 'badges.fajrReader.desc',
    category: 'habit',
    predicate: ctx => readsInHourRange(ctx, 4, 6, 10),
  },
  {
    id: 'consistent-week',
    icon: '📅',
    labelKey: 'badges.consistentWeek.label',
    descKey: 'badges.consistentWeek.desc',
    category: 'habit',
    predicate: ctx => readEveryDayOfAnyWeek(ctx),
  },
];

/** Lookup helper. */
export function badgeById(id: string): Badge | undefined {
  return BADGE_CATALOGUE.find(b => b.id === id);
}
