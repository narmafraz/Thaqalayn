# Reading Engagement & Progress-Tracking Proposal

> **Date:** 2026-05-17 (drafted) / 2026-05-17..2026-05-19 (shipped)
> **Status:** **EVERYTHING SHIPPED.** RE-01 through RE-18 all DONE; RE-12 re-scoped from "PWA push" to "in-app banner" (the API limitation was identified post-draft).
> **Scope:** Features that (a) encourage users to keep reading through the books and (b) let them see what they've already read.

## Status snapshot

| Item | Status | Where it shipped |
|---|---|---|
| RE-01 per-verse auto + manual marks | **✅ DONE** | `bookmark.service.ts` (Dexie v5), `chapter-content.component.ts`, `verse-actions` |
| RE-02 verse-counts manifest | **✅ DONE** | `ThaqalaynDataGenerator/app/verse_counts.py` + `ThaqalaynData/index/verse-counts.json` |
| RE-03 ReadingStatsService | **✅ DONE** | `reading-stats.service.ts` |
| RE-04 per-book completion bars | **✅ DONE** | Homepage explore cards + chapter-list strip |
| RE-05 read/unread verse styling | **✅ DONE** | Global `muteReadVerses` preference (AiPreferencesService); chapter-content `.verse-read` class |
| RE-06 reading-history page | **✅ DONE** | Section on `/bookmarks` Progress tab, grouped by day with book chips |
| RE-07 TOC coverage rings | **✅ DONE** | Per-row ring column in chapter-list + "hide completed" filter chip |
| RE-08 streak counter | **✅ DONE** | Stats strip on `/bookmarks` Progress tab + homepage chip |
| RE-09 daily reading goal | **✅ DONE** | Goal editor on `/bookmarks` Progress tab + homepage ring |
| RE-10 structured reading plans | **✅ DONE** | 17 plans in catalogue (4 Quran + 13 hadith). Plan picker on `/bookmarks` Plans tab, homepage Day-X-of-Y ribbon. Generic `chapterIndex` schema supports any book. |
| RE-11 sticky verse of the day | **✅ DONE** | `RandomVerseService.getTodayQuranVerse()` + homepage relabel |
| RE-12 opt-in reading-reminder banner | **✅ DONE (re-scoped)** | `ReadingBannerService` + `<app-reading-banner>`. Was originally PWA push — pivoted to in-app banner since the Notification Triggers API is Chromium-flag-only. |
| RE-13 milestone toasts | **✅ DONE** | `MilestoneToastService` + `<app-milestone-toaster>`. Durations bumped 6→12s / 8→20s, pause-on-hover. |
| RE-14 spaced-repetition revisits | **✅ DONE** | Homepage "Worth revisiting" panel via `ReadingStatsService.revisitCandidates()` |
| RE-15 cross-book unread surfacing | **✅ DONE** | Read chapters in the related-chapters list are faded + ✓; unread float to the top |
| **RE-16 Achievement badges** | **✅ DONE** | 38-badge catalogue across 5 categories (milestone/streak/book/breadth/habit). Pure-CSS holographic foil cards with hover-tilt + per-category accent colours. Badge-earned toast (20 s, pause-on-hover). |
| **RE-17 Reset progress at any level** | **✅ DONE** | Per-section reset button on chapter-list strip + global wipe on reading-sheet, both with count-aware confirmation |
| **RE-18 Homepage per-book progress panel** | **✅ DONE** | "Books you've started" grid after the book-tree, sorted by most-recently-read |
| Extended export/import covering new tables | **✅ DONE** | Bumped to format version 3 (readVerses + goalConfig + earnedBadges + enrolledPlans). v1 + v2 imports still accepted. |
| `/bookmarks` page tabbed | **✅ DONE** | 5 tabs (Progress · Plans · Badges · Saves · Settings), localStorage-persisted active tab |
| `man-la-yahduruhu-al-faqih` start/end-column parser bug | **✅ DONE** | `set_index` rewrite in `app/lib_model.py` using a dedicated `verse_counter` distinct from the per-depth `indexes` array; 10 new tests pinning the corrected behaviour. Other books still need a full `add_data` regen. |

Architectural decisions captured in [DECISION_LOG.md D061](DECISION_LOG.md#d061-reading-progress-architecture--single-dexie-db-derived-stats-service-intersectionobserver-auto-detect-2026-05-17).

## 6. Post-ship additions (proposed 2026-05-18)

Items the user asked for after living with Waves A–D for a day. Each is a small follow-up, not a new wave.

### RE-16: Achievement badges

User stories:
- As a user, when I cross a meaningful milestone (first book complete, 7-day streak, 1,000 verses cumulative, etc.) I earn a badge that's permanently shown in my progress panel.
- As a user, badges I haven't earned yet are visible as "locked" silhouettes — giving me something to aim for without being pushy.
- As a user, I can tap any badge to see what triggers it and when (or if) I earned it.
- As a user, badges sync across devices alongside the rest of my reading data.

Sketch (no implementation yet):
- New Dexie table `earnedBadges`: `{ badgeId, earnedAt, source }`.
- Static badge definitions in `src/app/data/badges.ts` (icon, label key, description key, predicate).
- Predicates run against existing stats — e.g. `streak.longest >= 7`, `bookProgress('al-kafi').versesRead >= 100`, `totalVersesRead >= 1000`.
- `MilestoneToastService` extension: when a badge predicate flips true, emit a "badge earned" toast (distinct kind from the existing book-complete / cumulative toasts).
- Badge shelf rendered on `/bookmarks` and (collapsed) on the homepage.

Initial badge catalogue (open to revision):
- **First steps** — read 10 verses
- **Day one** — read on 3 consecutive days
- **Week one** — 7-day streak
- **Marathon** — 30-day streak
- **Centurion** — 100 verses cumulative
- **Thousand** — 1,000 verses cumulative
- **Ten thousand** — 10,000 verses cumulative
- **Completionist** — finish a whole book
- **Breadth** — read at least one verse in 5+ different books
- **Imam Ali's Companion** — finish Nahj al-Balagha specifically
- **The Hours** — read at three different parts of the day (morning / afternoon / evening)
- **Quran Bronze / Silver / Gold** — 25% / 50% / 100% of the Quran

### RE-17: Reset progress at any level

User stories:
- As a user, I can clear all read marks under a chapter, book, volume, or whole-book by tapping a "Reset" action.
- As a user, the action is destructive and asks me to confirm first, with a count of how many marks will be removed.
- As a user, this only resets *read* marks — my bookmarks, notes, and reading history stay intact.

Sketch:
- `BookmarkService.resetReadProgress(pathPrefix: string): Promise<number>` returns the number of rows deleted. Iterates `readVerses` where path starts with `/books/<prefix>:` or equals `/books/<prefix>`.
- Reset entry-point on chapter-list rows (under a kebab menu next to the progress ring) and on the chapter-content reading-toolbar.
- Global "Reset all" lives in the reading-sheet next to the existing data-management section.
- Confirmation dialog reuses the existing `error-display` styling pattern; copy says "Remove X read marks under {label}?" with a single OK/Cancel.

### RE-18: Homepage per-book progress panel

User stories:
- As a user, after the book-tree on the homepage I see a "Continue your reading" panel: a card per book I've started, showing per-book progress + a deep-link to where I left off.
- As a user, books I've never opened don't appear in the panel.

Sketch:
- Filter `readingStats.bookProgressMap$` to books where `versesRead > 0`, sorted by `lastReadVerseAt` desc.
- For each, link target = `BookmarkService.readingProgress`'s `lastPath` for that book if set, else `/books/<slug>`.
- Mobile: vertical list. Desktop: 2-3 column grid.
- Visually distinct from the existing top-3 "Continue Reading" chips above the explore cards — those are book-level resumption only.

This document complements `USER_STORIES.md` §8 (Bookmarks, Notes & Reading Progress) and `FEATURE_PROPOSALS.md` §3. Both established the foundation. This proposal extends it from *"save where I left off"* to *"motivate me to read and tell me what I've covered."*

All proposals honour the architecture constraints in `ARCHITECTURE.md`: **zero ongoing costs, static-only hosting, browser-local storage, optional Firebase sync.** No new server-side requirements.

---

## 1. Current Baseline

### 1.1 What ships today (code-verified)

| Capability | Surface | Storage |
|---|---|---|
| One-click bookmark a verse/chapter | Verse-action bar | Dexie `bookmarks` table — `bookmark.service.ts:31-46` |
| Per-verse free-text note | Verse-action bar | Dexie `annotations` table — `bookmark.service.ts:196-211` |
| Per-book *last visited path* | Auto-saved on chapter view (`chapter-content`, `verse-detail`) | Dexie `readingProgress` table — `bookmark.service.ts:111-122` |
| "Continue Reading" cards (top 3 books) | Homepage `book-dispatcher` + `/bookmarks` page | Reads `readingProgress$` |
| Random Quran verse + random hadith | Homepage shuffle cards | `random-verse.service.ts` |
| JSON export / import | `/bookmarks` page | `exportBookmarks()` / `importBookmarks()` |
| Cross-device sync (opt-in) | Firebase Auth + Firestore | `sync.service.ts` |

### 1.2 The gap

The current `ReadingProgress` row stores **one row per book** with the URL of the most recent chapter visited. That is *resumption*, not progress.

| Question a reader naturally asks | Can the app answer today? |
|---|---|
| How much of Al-Kafi have I read? | No — no verse-level marks |
| Which chapters of Volume 1 are done? | No |
| Did I read anything yesterday? | No — only `lastVisited` of one chapter |
| What's a sensible next step from where I am? | No — "next chapter" link exists but no plan |
| How many days in a row have I read? | No |
| Show me everything I've read recently | No — history is overwritten |

**The system records position but does not record coverage.** Encouragement features (streaks, goals, plans) have no data to draw on because the per-verse signal is missing.

---

## 2. Proposed Features

Ordered roughly by effort × impact. Each item is independently shippable.

### Priority 1 — Granular read-state (foundation for everything else)

> **Why first:** every feature below depends on knowing *which verses* (not just which chapter) the user has read.

#### RE-01: Per-verse "read" mark with auto-detection

- Add `readVerses` Dexie table: `{ path, bookId, readAt, source: 'auto' | 'manual' }`.
- **Auto signal:** in `chapter-content`, when an already-observed verse has been visible for ≥ 3 seconds AND the user has scrolled past it, mark `readAt = now`. Use the existing `IntersectionObserver` in `chapter-content.component.ts` — it's already running for lazy verse loading.
- **Manual:** small ✓ button in the existing verse-actions footer; long-press = mark all up to here.
- **Privacy:** local-only by default; sync via existing Firebase flow if user opts in.
- **Bookkeeping:** debounce writes (queue marks, flush every 5 s) to avoid Dexie thrash on fast scroll.

#### RE-02: Verse-count manifest (one-time build artifact)

- New file `ThaqalaynData/index/verse-counts.json`: `{ "al-kafi": { "total": 15397, "by_volume": {"1": 1280, ...}, "by_chapter": {"al-kafi:1:1:1": 23, ...} }, ... }`.
- Generated by a small script in `ThaqalaynDataGenerator/scripts/build_verse_counts.py` that walks `books/*/` JSON and counts `part_type == "Hadith" | "Verse"` entries — same logic the search index already uses.
- Loaded once into a new `ReadingProgressState` (NGXS) on app init.
- Enables exact "X / Y verses read" anywhere in the UI without re-counting client-side.

#### RE-03: Migrate the existing `ReadingProgress` semantics

- Keep `lastPath` + `lastVisited` (used by Continue Reading) — backwards-compatible.
- Add derived fields computed from `readVerses`: `versesRead`, `percentComplete`, `firstReadAt`, `lastReadVerseAt`.
- Wrap behind a `ReadingStatsService` so UI code never queries Dexie directly.

---

### Priority 2 — Show me what I've read

#### RE-04: Per-book completion bars

- In every `book-titles` card (homepage + book-tree), add a thin progress bar under the title: `12% — 1,873 / 15,397`.
- On chapter-list rows, show a tiny ring next to the count column: empty / partial / full / verified-bookmarked.
- Tooltip with absolute counts on hover; full numbers for screen readers via `aria-label`.

#### RE-05: Read / unread styling in verse cards

- Subtle muting (e.g. 0.7 opacity on translation, ✓ in margin) for verses already marked read.
- Toggleable from the existing **Reading Toolbar** (`reading-toolbar` component, recently shipped per `READING_CONTROLS_REDESIGN.md`) — adds to the sticky toolbar's set of three toggles. No FAB clutter.
- Default: ON for hadith books, OFF for Quran (Quran is re-read intentionally).

#### RE-06: Reading history page

- New route `/reading/history` (or a tab on `/bookmarks`).
- Reverse-chronological list grouped by day: "Yesterday — 23 verses across Al-Kafi vol. 1 ch. 4 & Quran 2:1-15."
- Click → jump to the first verse of that session.
- Filter by book; export as CSV.

#### RE-07: Table-of-contents view with coverage heatmap

- For Quran: a 30×Juz grid coloured by % read (existing pattern in Quran apps).
- For multi-volume hadith books: a tree view with each chapter showing a fill ratio bar — basically `book-tree` augmented with progress data.
- A "Show only unread chapters" filter chip.

---

### Priority 3 — Encourage me to keep reading

#### RE-08: Daily streak counter

- Lightweight: count consecutive days where ≥ 1 verse was marked read.
- Surface as a chip in the homepage hero ("🔥 5-day streak") and as an SVG ring on the bookmarks page.
- Forgiving by design: one "freeze day" per week allowed (configurable). No public leaderboards (this is scripture; competition is off-tone).

#### RE-09: Reading goal (verses-per-day OR minutes-per-day)

- Single onboarding question on first visit: *"Want a daily target? 5 / 10 / 20 verses or skip."*
- Settings panel exposes verses/day or minutes/day with toggle. Minutes are estimated from `readVerses` timestamps clustered into sessions.
- A simple progress ring on the homepage and on every chapter page header.

#### RE-10: Structured reading plans

- Static JSON manifests in `ThaqalaynData/plans/`:
  - `quran-in-30-days.json` — surah:ayah ranges per day
  - `quran-in-year.json`
  - `kafi-vol1-usul.json`
  - `nahj-al-balagha-letters.json`
- Plan picker page `/reading/plans`. Selecting a plan creates a row in a new Dexie `enrolledPlans` table and an in-page "Day 1 / 30" ribbon appears on the homepage with a one-tap "Start today's reading" button.
- Critically: plans are *generated content*, not user-authored. Authoring UI is out of scope until v2.

#### RE-11: Verse of the Day (sticky)

- Replace the homepage shuffle cards with a deterministic "today's verse" (hash of YYYY-MM-DD → seed) plus a "more from this surah" CTA.
- Keep shuffle as a fallback button. Sticky verses give a daily anchor; pure random feels disposable.

#### RE-12: Gentle re-engagement prompts (opt-in, PWA only)

- If the user has installed the PWA and granted notification permission, send one notification per day at a user-chosen hour ("Today's verse from Al-Kafi 1:4:7 — Open").
- Push handled via the existing service worker (`@angular/service-worker` already installed). No backend needed: use the **Notification Triggers API** where supported, fall back to in-app banner on next open elsewhere.
- Off by default. Single toggle in settings. Never email, never web-push without explicit opt-in.

#### RE-13: Milestone callouts

- Triggered toasts at completion of: a chapter, a volume, a book, every 100 / 1,000 / 10,000 verses cumulative.
- Body copy is content-respectful, not points-based ("You've finished *Kitab al-`Aql* — 35 hadith. Continue to *Kitab al-`Ilm*?"). Optionally a quiet share-card to social.

---

### Priority 4 — Discovery & spaced repetition (stretch)

#### RE-14: "Read again" surface for bookmarked or annotated verses

- Show 3-5 of the user's bookmarks/annotations on the homepage, weighted toward older ones (spaced repetition: items not seen in 30+ days float to the top).
- Lightweight — uses existing tables, no new schema.

#### RE-15: Cross-book reading recommendations

- After finishing a chapter, suggest "Related chapters you haven't read yet" using existing `related-chapters.service.ts` data intersected with `readVerses`.

---

## 3. Data Model Changes (Dexie v3)

Bumps `ThaqalaynDb` from version 2 → 3, with one additive migration. No destructive changes.

```ts
this.version(3).stores({
  bookmarks:       '++id, path, bookId, createdAt',
  readingProgress: 'bookId, lastVisited',
  annotations:     '++id, path, bookId, updatedAt',
  // NEW
  readVerses:      '++id, &path, bookId, readAt',   // unique on path
  enrolledPlans:   '&planId, startedAt, currentDay',
  readingSessions: '++id, date, bookId',            // for streaks & minutes
  goalConfig:      'id',                             // singleton row
});
```

`readingSessions` is derived from `readVerses` but pre-rolled per day to keep streak math O(1).

---

## 4. UX Principles

These are the constraints any implementer should hold to:

1. **Off-by-default for invasive features.** Streaks, goals, notifications, "% complete" surfaces should be discoverable but never imposed. Scripture reading is not a game.
2. **Auto-track silently.** RE-01 should require zero taps — passive scroll = progress. Manual marks are escape hatches, not the primary path.
3. **Honour Quran vs hadith differently.** Quran is re-read; never grey it out as "done." Hadith collections are referenceable; "I've covered chapter X" is the more useful framing.
4. **No public social pressure.** No leaderboards, no public profiles. Share-cards for personal milestones only.
5. **Continue-reading must remain trivially correct.** RE-03's derived fields supplement `lastPath`; never replace it.
6. **i18n from day one.** Every new string lands in all 12 translation files at the same time. (Reference: `P13-01..P13-05` patterns in `UI_IMPROVEMENT_ROADMAP.md`.)

---

## 5. Suggested Build Order

| Wave | Items | Rough effort | Unblocks |
|------|-------|--------------|----------|
| **Wave A** (foundation) | RE-01, RE-02, RE-03 | ~M (3-5 days, mostly Dexie + IntersectionObserver wiring) | everything below |
| **Wave B** (visibility) | RE-04, RE-05, RE-07 | M | makes Wave A's data visible |
| **Wave C** (history) | RE-06 | S | nice-to-have on top of B |
| **Wave D** (habit) | RE-08, RE-09, RE-11, RE-13 | M | needs A; satisfies the user's "encourage reading" half |
| **Wave E** (plans) | RE-10 | M (content authoring is the bulk) | requires plan JSON authoring |
| **Wave F** (push) | RE-12 | S–M (browser-API testing is the gotcha) | optional |
| **Wave G** (stretch) | RE-14, RE-15 | S each | independent |

Total: ~3-4 weeks of focused frontend work, no backend, no new infra. Cost: $0 ongoing.

---

## 6. Test Surface

Each wave should land with:

- **Unit:** `read-progress.service.spec.ts`, `streak.service.spec.ts`, `reading-plan.service.spec.ts` (Karma).
- **E2E:** new Playwright specs `reading-progress.spec.ts`, `streak.spec.ts`, `plans.spec.ts` against the production site. Add to `e2e/tests/`.
- **Accessibility:** every new progress ring must announce its percentage via `aria-valuetext`; toggleable read-state styling must not rely on colour alone.

---

## 7. Open Questions for Owner

1. **Quran semantics:** Should "% complete" for the Quran show juz-coverage (memorisation-aligned) or ayah-coverage (read-aligned)? Likely both, but which is the default?
2. **Plan authorship:** Curate the initial set in-house, or accept community-submitted plan JSON via PR?
3. **Notification copy & cadence:** Sample text needs review (especially Arabic/Persian/Urdu) before RE-12 ships.
4. **Privacy posture for sync:** Are streak/goal records considered "sensitive" enough that they shouldn't sync by default even when bookmarks do? Suggest: same opt-in switch, but make it obvious in the sync UI which categories are included.

---

## 8. Document Relationships

This proposal:
- **Extends** `USER_STORIES.md` §8 (BMK-05, BMK-06, BMK-07) with verse-level granularity.
- **Extends** `FEATURE_PROPOSALS.md` §3 (Bookmarks, Notes & Reading Progress).
- **Adds to** `CONSOLIDATED_ROADMAP.md` §6.2 "Reading Experience" as a new outstanding workstream.
- **Coexists with** `READING_CONTROLS_REDESIGN.md` (the sticky reading toolbar is the natural place to add RE-05's read/unread toggle).
- **Does not affect** the AI content pipeline, narrator data, or any backend.

Recommended next step: ship RE-01 + RE-02 as a single thin slice ("we now know which verses you've read") and rebuild the homepage progress section on top of that data before committing to the full backlog.
