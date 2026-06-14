# Cache Freshness Plan — Stale i18n & Stale Book Content

> **Date:** 2026-06-14 · **Status:** ACTIVE
>
> Two recurring mobile bugs: (A) after a deploy, the UI shows raw i18n keys
> (`reading.milestoneCumulative`, `reading.resetAll`, `book.wordByWordAnalysis`)
> instead of translated text; (B) books visited previously never show newly
> generated AI content. Both are caching-layer problems. This doc diagnoses the
> root causes and lays out fix options, all zero-recurring-cost.

---

## 1. Symptom A — Raw i18n keys after a new release

### What the user sees
On mobile (Brave, often over VPN), after a deploy that introduces new features,
the new UI strings render as their raw translation keys. Older strings are fine.

### Root cause: version drift between the JS bundle and the i18n files

- The app bundle is content-hashed (`outputHashing: "all"` in `angular.json`) and
  swaps **atomically** on each deploy via `SwUpdate` auto-activate + reload
  (`pwa.service.ts`). New JS references new keys like `reading.milestoneCumulative`.
- The translation files (`src/assets/i18n/*.json`) are **not** hashed. They are
  fetched at runtime by `I18nService.loadStrings()` and cached by the service
  worker **dataGroup** `i18n` (`ngsw-config.json`): `strategy: freshness`,
  `maxAge: 7d`, `timeout: 10s`, `maxSize: 20`.
- **Key fact about Angular's service worker:** `assetGroups` are versioned with
  the app manifest (they swap atomically when a new version activates), but
  `dataGroups` are **not** — they persist independently across deployments.
- Result: after activation, the JS is new but the cached `en.json` can still be
  the **old** one that lacks the new keys. With `freshness`, the SW tries the
  network first, but on a phone/VPN if that request exceeds the **10 s timeout**
  it falls back to the stale cached copy. `I18nService.get(key)` then can't find
  the key and **returns the key itself** (`i18n.service.ts` — `return key;`).

There is a secondary, transient race (no init barrier: components can render
before `loadStrings()` resolves), but the *persistent* "stuck on keys" symptom
is the stale-cache version drift above.

### Fix options (A)

| # | Option | Effort | Effect | Notes |
|---|--------|--------|--------|-------|
| **A1** ⭐ | **Move `/assets/i18n/*.json` into a versioned `assetGroup`** in `ngsw-config.json` | Low | Eliminates drift entirely | i18n files become hash-checked in `ngsw.json` and swap atomically with the JS on every deploy. Use `installMode: lazy` + `updateMode: prefetch` so only the active language downloads on first use but updates prefetch. **Recommended.** |
| A2 | Content-hash i18n files and reference by hashed URL | Med | Same as A1 | More build plumbing than A1; A1 achieves the same within the SW. |
| A3 | Append `?v={appVersion}` to i18n fetch URLs | Low | Forces refetch each deploy | Defeats caching, still network-dependent at runtime — weaker than A1. |
| A4 | Add an init barrier + retry in `I18nService` (don't render with empty strings; refetch on miss) | Low | Fixes the *race*, not the drift | Good complementary robustness measure; not a standalone fix. |
| A5 | Bundle translations into the JS at build (import JSON) | Med | Strongest coupling | Increases initial bundle for 12 languages; overkill vs A1. |

**Recommendation:** **A1**, optionally plus **A4** for belt-and-braces. Both zero-cost.

---

## 2. Symptom B — Stale book / AI content on revisited pages

### What the user sees
Opening a book/chapter visited before shows the **old** content with none of the
recently generated AI translations/summaries, even though the data site has them.

### Root cause: cache-first reads + a stale data-version marker

Two compounding causes:

1. **`BooksService.getPart()` is cache-first.** It calls `getOfflinePart()` —
   which returns the IndexedDB-cached response (`thaqalayn-offline` →
   `CACHE_STORE`, or a downloaded complete book in `STORE_NAME`) — and only hits
   the network if nothing is cached (`books.service.ts:20-48`). A previously
   visited chapter is therefore served from IndexedDB and **never refetched**.
   The SW `api-books` dataGroup (freshness, 30 d) is bypassed entirely.

2. **The only invalidation path is broken in practice.**
   `OfflineStorageService.checkDataVersion()` (`offline-storage.service.ts:215`)
   fetches `index/data_version.json` and clears `CACHE_STORE` when the version
   string changes. But that file is written **only** by `_write_data_version()`
   inside the full `main_add.py` pipeline (`ThaqalaynDataGenerator/app/main_add.py:46,50`).
   The incremental AI-content merges that have been deploying new content
   throughout late May/June do **not** rewrite it.
   - **Confirmed:** `ThaqalaynData/index/data_version.json` is stamped
     `20260519T002723Z` (May 19), but AI generation has continued to ~90 %+
     coverage as of 2026-06-14. The marker is stale → clients see the same
     version → `CACHE_STORE` is never cleared → stale content persists until a
     full site-data reset.

### Fix options (B)

| # | Option | Effort | Effect | Notes / bandwidth |
|---|--------|--------|--------|-------------------|
| **B1** ⭐ | **Bump `data_version.json` on every data deploy** (call `_write_data_version()` after AI auto-merge, or a tiny pre-deploy step) | Low | Existing client logic then clears `CACHE_STORE` → fresh fetch | Reuses machinery that already exists. The real fix. Clears all auto-cached responses globally on any data change; clients re-fetch lazily as pages are visited (acceptable, network-first reload). |
| B2 | Stale-while-revalidate in `getPart()` — return cache immediately, fetch network in background, update cache + emit | Med | Seamless freshness, no full clear | Best UX; double-emit complexity. Good follow-up to B1. |
| B3 | Network-first with cache fallback (drop the cache-first short-circuit when online) | Low | Always fresh online | Re-fetches on every revisit → **more bandwidth**; conflicts with the bandwidth posture. SW dataGroup already does freshness, so partly redundant. |
| B4 | Per-file ETag / per-book version awareness | High | Most precise invalidation | Most work; revisit only if global bump proves too coarse. |
| B5 | Manual "refresh content" / pull-to-refresh on book pages that bypasses cache | Low | User-driven escape hatch | Complements the safe-reset button below. |

**Recommendation:** **B1** now (near-free, uses existing code), with **B2** as a
later UX upgrade. Pair with the safe-reset button (§3) as the manual escape hatch.

> ⚠️ **Bandwidth note:** B1 invalidates everyone's auto-cache on each data
> deploy. Because reads are network-first after invalidation, frequent data
> deploys = more re-downloads. Given the June 2026 bandwidth incident, prefer
> **batching data deploys** (don't redeploy data for every tiny merge) over
> per-merge version bumps. One bump per meaningful content drop is enough.

---

## 3. Safe-reset button (preserve personal data) — user request

### Problem with today's reset
The support page's "reset site data" (`support.component.ts:confirmReset`) is the
**nuclear** option: it clears SW caches, unregisters the SW, clears `localStorage`
and `sessionStorage`, and **deletes every IndexedDB database** — including
`thaqalayn-bookmarks` (bookmarks, notes, reading progress, badges, plans, goals).
That wipes personally authored data.

### Proposed second button: "Refresh app data" (safe)
Clears only server-redownloadable data, **keeps** everything the user authored.

| Layer | Today's nuclear reset | New safe refresh |
|-------|----------------------|------------------|
| SW Cache API (`caches.delete`) — app shell, assets, **i18n**, api data | ✅ cleared | ✅ cleared (re-downloads; also fixes Symptom A on demand) |
| `thaqalayn-offline` IDB (`CACHE_STORE` + downloaded `books` + version marker) | ✅ cleared | ✅ cleared (fixes Symptom B on demand) |
| `thaqalayn-bookmarks` IDB (bookmarks, notes, progress, badges, plans) | ❌ **deleted** | ✅ **preserved** |
| `localStorage` (language, AI toggles, font size) | ❌ **cleared** | ✅ **preserved** |
| `sessionStorage` | cleared | cleared (transient) |
| SW registration | unregistered | kept (just `checkForUpdate()` + reload) |

**Implementation sketch:** instead of looping `indexedDB.databases()` and deleting
all, delete **only** `thaqalayn-offline`; skip `thaqalayn-bookmarks`. Do **not**
call `localStorage.clear()`. Clear all `caches.keys()` (all SW caches are
server-derived and safe to drop). Then `swUpdate.checkForUpdate()` and reload.

This single button manually resolves **both** symptoms (clears stale i18n cache +
stale book cache) while protecting personal data. Present it as the primary
action; keep the existing full reset as a clearly-labelled "nuclear" fallback.

---

## 4. Decision (2026-06-14 — see DECISION_LOG D063)

**Shipped** (commit `8069b43`):
1. **A1** — moved i18n files into a versioned `assetGroup` → kills raw-keys at the source. Verified: 12 files now hash-tracked in `ngsw.json`.
2. **§3 safe-reset button** — user-facing escape hatch that fixes both symptoms without touching bookmarks/notes.

**Deliberately skipped to conserve bandwidth:**
- **B1** (auto-bump `data_version.json` per deploy) — the existing version-gated
  invalidation is kept, but the bump stays tied to a **full pipeline run**
  (`main_add.py`), which is the conscious trigger for a global cache clear.
  Auto-bumping every incremental merge would re-download for all clients on
  every minor content drop — not justified given the June 2026 bandwidth incident.
- **B2** (stale-while-revalidate reads) — would add a background fetch on every
  book revisit where there is currently zero. Unnecessary bandwidth when content
  rarely changes. Parked here as a possible future upgrade.

Stale book content is therefore healed **deliberately** — the user taps
"Refresh App Data", or a full data-pipeline run bumps the version globally.

*Remaining optional follow-ups if ever needed:* A4 (i18n init barrier/retry),
B5 (pull-to-refresh).

### Key files
- `Thaqalayn/ngsw-config.json` — i18n group (A1)
- `Thaqalayn/src/app/services/i18n.service.ts` — loader/race (A4)
- `Thaqalayn/src/app/services/books.service.ts` — cache-first read (B2/B3)
- `Thaqalayn/src/app/services/offline-storage.service.ts` — `checkDataVersion`, stores (B1/B4, §3)
- `Thaqalayn/src/app/components/support/support.component.ts` — reset buttons (§3)
- `ThaqalaynDataGenerator/app/main_add.py` — `_write_data_version()` (B1)
