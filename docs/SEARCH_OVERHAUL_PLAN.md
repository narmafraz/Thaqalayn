# Search Overhaul Plan — bandwidth-first, hybrid (Pagefind + in-memory titles)

> **Status:** ACTIVE (proposed; not yet implemented)
> **Date:** 2026-06-14
> **Supersedes for search:** the unused optimization items in [ORAMA_SEARCH_FEATURES.md](ORAMA_SEARCH_FEATURES.md) (kept as a reference)
> **Related:** [PER_LANGUAGE_VERSE_SPLIT.md](PER_LANGUAGE_VERSE_SPLIT.md) (per-language verse-detail split — the search builder must read whichever verse-detail shape is current), [ARCHITECTURE.md](ARCHITECTURE.md), root `CLAUDE.md` (zero-recurring-cost constraint)

## Context

Search today is **stale**, **bandwidth-hostile**, and **ignores the AI content**:

1. **The full-text index is broken by the shell migration.** `ThaqalaynDataGenerator/app/search_index.py::extract_verse_docs()` reads `data["verses"]`, which no longer exists — modern chapters are shells (`verse_refs[]`); verse text + AI content live in separate `verse_detail` files. The shipped per-book `*-docs.json` (e.g. `al-kafi-docs.json`, 19 MB) are stale pre-migration artifacts; a rebuild today would produce near-empty indexes.
2. **~2.2 MB downloads on every visit before anyone searches.** `IndexState.ngxsOnInit` (`src/store/index/index.state.ts:39-51`) eagerly fetches `books.en.json` (1.49 MB) + `books.ar.json` (732 KB) for navigation/breadcrumbs, and the separate search `titles.json` (1.42 MB) is a redundant copy of that same data. Switching to full-text mode then downloads ~50 MB of per-book Orama documents in parallel and inserts them one-by-one at runtime.
3. **AI content is unsearchable.** Summaries, key terms, key phrases, topics/tags, and Quran cross-references (all in `verse.ai`) are never indexed, and the 11 translation languages aren't searchable at all.

**Goal:** rebuild search to be correct, multilingual + AI-enriched, and **bandwidth-minimal — nothing downloads until the user actually searches, and full-text fetches only the index fragments a query needs** — with a redesigned UX.

**Hard rule:** assume the user is on mobile data. Download only what is needed, only when search is used. (Aligns with the zero-recurring-cost constraint and the June 2026 bandwidth incident — see root `CLAUDE.md` and `memory/project_bandwidth_prerender_extension.md`.)

## Decisions

- **Hybrid, three-tier architecture** (below): in-memory titles (zero fetch) + Pagefind term-sharded full-text.
- Incorporate AI **summaries** (searchable + result snippet), **topics/tags as facets**, **key terms / phrases** (+ a `phrase:` operator), and **Quran cross-references** (`ref:`).
- **Full UI redesign** of the search bar + `/search` results page.
- **Offline caching** of fetched index data (service worker; Pagefind fragments), keyed by data version.
- **Arabic root / morphological search → deferred** to a follow-up phase. The Words project has surface→lemma→root data, but there is **no verse→root linkage** today; that artifact must be built first.

---

## Architecture — three tiers, by bandwidth cost

### Tier 1 — Titles / navigation (ZERO extra download) — the only non-Pagefind index

Book / chapter / surah name lookup — the most common navigational query.

- Reuse `IndexState.books`, already eagerly loaded (~2.2 MB) for breadcrumbs. Build a small **in-memory** index lazily **on first search focus**, from `IndexState.books['en'] + ['ar'] + [uiLang]`. Fuzzy + boosted, instant, no network.
- **Why in-memory and not Pagefind:** the title data is *already in RAM* (loaded for navigation → zero extra bytes), and title typeahead fires on *every keystroke* — per-keystroke Pagefind fragment fetches would add latency. Neither property holds for any other tier.
- **Delete `titles.json`** and stop generating it — net **−1.4 MB**. **Keep Orama (`@orama/orama`)** for this tier — built from in-memory data, never fetched — and **lazy-load it via dynamic import** on first search focus (~30 KB gzipped tree-shaken; ~46 KB for the whole package). So non-searching visitors pay nothing, and searchers pay it once alongside the title-index build. We keep Orama rather than hand-rolling a matcher: it's a tiny, already-present dependency that gives boosting + typo tolerance for free. Pagefind is *not* used for titles (per-keystroke typeahead would mean a network fetch per key, and the data is already in RAM).

### Tier 2 — Topics / tags / phrases → Pagefind (no separate search index)

There is **no benefit** to a separate index here (not preloaded, not per-keystroke), so these ride on Pagefind:

- **Topics & tags** → Pagefind **filters** (faceted sidebar with counts). This can also drive the `/topics` browse page from Pagefind filter metadata → **delete `topics.json` (−2.5 MB)**.
- **Phrases** → `phrase:"…"` maps to a native Pagefind exact-phrase query. Retain only a small curated phrase *list* for the `/phrases` browse-page display (shrink `phrases.json` to display data, or regenerate as a lightweight list).

### Tier 3 — Full-text verse content (Pagefind term-sharded)

The large, multilingual, AI-enriched corpus (Arabic + 11 languages + summaries / key-terms / phrases).

- **Pagefind** (static, build-time, zero recurring cost, MIT). The browser loads a tiny entry chunk + only the per-term fragments for the words typed (~tens of KB/query). Nothing preloaded.
- **One Pagefind index PER LANGUAGE**, each in its own subdirectory (`<searchBaseUrl>/<lang>/`) and keyed by the **real verse URL**. (Pagefind dedups records by URL *globally*, so a single mixed-language index collapses a verse's languages into one — separate per-language indexes are required, and they match our "pick one search language" model.) The client inits Pagefind against the chosen language's subdir → only that language's files are ever fetched. **Filters** provide facets (book, content_type, grading, has_chain, topics, tags) with counts (`filters` = counts in current result set; `totalFilters` = counts ignoring each filter — drives the sidebar). Built-in highlighted **excerpts**.
- Lazy-import the Pagefind runtime on first full-text search; **SSR-guard** (platform check — the app uses `@angular/ssr`). The service worker caches fetched fragments → progressively offline + zero repeat bandwidth.

### Where the Pagefind bundle lives + size → dedicated repo + Netlify site

**Spike results (2026-06-14, 2 fully-AI-covered books = 1,469 verses × ar/en/fa):** validated Arabic + Farsi tokenization/normalization, AI-summary/key-term concept recall, highlighted excerpts, and faceted counts. Measured:
- **Per-query wire size ≈ 33 KB** (one ~28 KB term-index chunk + ~5 × ~1 KB fragments). **First search per language per session ≈ 130–200 KB** one-time (loader 45 KB + wasm ~70 KB + lang meta ~11 KB + filter meta ~25 KB), then cached. Confirms the bandwidth thesis.
- **On-server footprint ≈ 6–8.5 MB per language** for these 1,469 *fully-AI-covered* verses, and **~one fragment file per verse per language** (≈ 1,500 files/lang here).

**Extrapolation + the real risk — file count.** At full corpus (58K verses), each language index is **~58K+ files**; `en` + `ar` alone ≈ **116K files**, and full 12-language coverage trends to **hundreds of thousands of files (~700K) and >1 GB** on disk. **AI-translation coverage is now ~90%+ across nearly all books** (al-kafi 87%, tahdhib 94%, faqih 98%, quran 95%; laggards uyun 47%, sifat-al-shia 40%) — and the AI pipeline emits all 11 languages *together* per verse, so languages rise and fall together. Coverage-gating by language therefore barely helps; we should expect to build ~all languages. Per-query download stays tiny regardless — this is purely a *deploy/host* concern.

**Decisions:**
- **Dedicated repo + Netlify site** `thaqalaynsearch.netlify.app` (mirrors `ThaqalaynWords` / `ThaqalaynTafsirData`). CORS + cache headers in `netlify.toml`; Angular reads the origin from `environment.searchBaseUrl`.
- **Deploy via Netlify CLI, bundle gitignored** (NOT git-autodeploy). Why: with ~700K generated fragment files, committing the bundle would bloat git/GitHub to the point of breaking (slow clones/pushes, repo-size limits). So the repo holds only *source* (`build.mjs`, `lib/`, config); the bundle is built locally and uploaded with `netlify deploy --prod --dir=.`. Netlify dedupes by file hash, so re-deploys only upload changed fragments. (Trade-off vs git-push autodeploy: the deployed artifact isn't in git history and deploys are a manual local command — acceptable for a regenerated artifact.) If a future build comes in small enough, committing + git-autodeploy stays an option.

---

## Build side — self-contained Node build in `ThaqalaynSearch` (IMPLEMENTED)

The build is **one self-contained Node script in the `ThaqalaynSearch` repo** — no Python `search_index.py` step. This avoids a Python→Node handoff that would spill hundreds of MB of intermediate records, and Pagefind's indexer is Node anyway. The same JS Arabic normalizer is shared with the Angular query path.

`ThaqalaynSearch/build.mjs`:
- Reads `verse_detail` files directly from `../ThaqalaynData/books/` (discovers book dirs; skips `complete/`). The merged `ThaqalaynData` `verse.ai` retains the fields we need (summaries, key_terms, chunks.translations, key_phrases, topics, tags, content_type, related_quran, isnad_matn.has_chain).
- Per verse, per language, builds `content` = translation text (human `<lang>.*` id, else `ai.chunks[].translations[lang]`) + `ai.summaries[lang]` + `ai.key_terms[lang]` glosses + (en) key-phrase EN. For `ar`: `normalizeArabic(text)` + normalized Arabic key-terms/phrases.
- Emits **one Pagefind index per language** (keyed by the real verse URL — Pagefind dedupes by URL globally) via the NodeJS Indexing API, with `filters: { book, content_type, has_chain, topic, tag }`.
- Also writes **`qref.json`** (Quran cross-refs: `ai.related_quran` cites + Quran self-refs) and **`manifest.json`** (`data_version` from `index/data_version.json`, built languages + page counts, filter list).
- Skips languages with zero records (so `manifest.json` only lists built languages; the client picker offers only those).

`ThaqalaynSearch/lib/normalize-arabic.mjs` mirrors `ThaqalaynDataGenerator/app/arabic_normalization.py` (built from numeric code points to keep the source ASCII). **Parity verified** by `tests/parity-check.{py,mjs}` against real verse text — 50/50 exact match. The Angular query path reuses this same normalizer.

**Removed:** generation of `titles.json`, `*-docs.json`, `search-meta.json` (the old, stale Orama doc indexes) — delete them from `ThaqalaynData` during cleanup.

---

## Client side — `Thaqalayn` (Angular 19)

- **Defer all index work until search is engaged.** Remove `InitSearchIndex` from the search bar's `ngOnInit` (`src/app/components/search-bar/search-bar.component.ts:35`); trigger Tier-1 build on first focus, Tier-3 Pagefind load on first full-text query. Fix the latent `/`-shortcut bug (`keyboard.service.ts::focusSearch()` targets a non-existent `.search-bar-input`).
- **Refactored `SearchService`:** Tier-1 in-memory Orama (from `IndexState.books`); Tier-3 Pagefind wrapper (lazy dynamic import, language-scoped, facets via filters, highlighted excerpts); `qref.json` lookup for `ref:`.
- **Shared Arabic normalizer** `arabic-normalize.ts` matching the Python canonical (`app/arabic_normalization.py`) — add tatweel / punctuation / whitespace / hamza-variant handling the current `search.service.ts:396-412` misses — plus a shared parity fixture, or queries miss indexed text.
- **Search-language picker** in the UI; default `localStorage` override → `I18nService.currentLang` → `'en'`. Arabic is a choice.
- **Unified operators** in `parseQuery`: `topic:` `tag:` `type:` `phrase:` `ref:` `book:`, routed to Pagefind filters / `qref` / Tier-1. Keep `parseFilteredQuery` as a compat wrapper so existing specs pass.
- **NGXS `SearchState`** gains `searchLang`, `facets`, `activeFacets`, `sort`, `operator`, `recent`.

### UI redesign (full)

- **Search bar:** language pill; sectioned dropdown (Recent / Titles / Topics / Phrases); operator hints; instant Tier-1 typeahead.
- **`/search` page:** sticky **facet sidebar** with live counts (hide empty groups; AI coverage ~90%+ but uneven across books), sort control, removable filter chips, **bilingual highlighted result cards** (Pagefind excerpts; summary as snippet when present, else translation / Arabic), Pagefind-paginated. Reuse the existing `IntersectionObserver` + `verse-loader.service.ts` for any detail hydration.
- Keep Angular Material + the deeppurple-amber theme; production-grade, distinctive cards.

---

## Other considerations

- **Bandwidth protection:** add `Disallow: /search` (query URLs) to `src/robots.txt`; keep `/search` out of `prerender-routes.txt` (already is). Prevents bots from triggering search fetches.
- **Shareable/deep-link search:** `/search?q=&lang=&book=&type=` reconstructs state from the URL (good UX; not crawler-indexed).
- **Accessibility:** ARIA combobox/listbox on the bar, live-region result-count announcements, focus management; the project's axe e2e tests must stay green.
- **Offline / PWA:** service worker caches Pagefind fragments; Tier-1 is in-memory → search works offline for previously-fetched terms.
- **Index versioning:** the Pagefind bundle is content-hashed per build; align cache invalidation with `data_version`; the service worker drops stale fragments.
- **Ranking signals:** Pagefind weighting is coarser than Orama — boost title / exact-phrase matches; optionally down-rank `daif`-graded results. Documented limitation.
- **Analytics:** zero-cost + no backend ⇒ no server-side popular-query analytics. Ship a curated static "suggested searches" list instead; optional privacy-only client counts.
- **Synonyms / Latin-transliteration search** (e.g. "salah" → صلاة): nice-to-have, **deferred**.
- **Root / morphological search:** **deferred** (separate phase; build verse→root from Words data).

---

## Build orchestration (regen scripts)

Kick-off scripts all live in `ThaqalaynDataGenerator/` (even when the work runs in a sibling repo), so there's one place to start any rebuild:
- `add_data.ps1` — regenerate `ThaqalaynData` (hadith pipeline). *Existing.*
- `regen_words.ps1` — rebuild `ThaqalaynWords`. *Existing.*
- `regen_search.ps1` — **(new)** `cd ../ThaqalaynSearch; node build.mjs` (npm install on first run). Kept out of `add_data.ps1` because the build is slow (one fragment per verse per language) — same convention as `regen_words.ps1`.
- `regen_all.ps1` — **(new)** runs the regens in dependency order: `add_data.ps1` → `regen_words.ps1` → `regen_search.ps1` (search last; it depends on the merged `ThaqalaynData`).

## Phasing (status)

0. ✅ Doc committed; Pagefind spike validated the architecture.
1. ✅ Build side: `ThaqalaynSearch` repo + all-Node `build.mjs` (per-language indexes + `qref.json` + `manifest.json`) + shared normalizer (parity 50/50) + `netlify.toml`; `regen_search.ps1` (deploy-by-default) + resilient `deploy.mjs` + `regen_all.ps1`; `environment.searchBaseUrl`/`searchLangUrl`.
2. ✅ **Hosting** (one site per language + a meta site): single-site (~650K files) proved impractical; sharded to 12 `thaqalaynsearch-<lang>` sites + meta. `en` + meta **deployed**; cross-origin load + CORS + search + facets **verified live** from `thaqalayn.netlify.app`. Remaining 11 language sites still to deploy.
3. ✅ Client: Orama lazy-imported (Tier-1 titles, still from `titles.json`); index loading deferred to first focus; `/` shortcut fixed; shared normalizer + spec.
4. ✅ Client: `PagefindService` (per-language, SSR-guarded) + `SearchService` routing full-text to Pagefind; operators `topic:`/`ref:`/`phrase:`/`book:`/`tag:`/`type:`; facets; NGXS `searchLang`/`facets`/`activeFacets`.
5. ✅ UI: `/search` language picker + facet sidebar + highlighted `<mark>` excerpts. (Search-*bar* polish — language pill, sectioned dropdown, recent searches — deferred; see follow-ups.)
6. ✅ robots.txt `Disallow: /search`; removed stale `*-docs.json` + `search-meta.json` from `ThaqalaynData` (kept `titles.json`/`topics.json`/`phrases.json`, still consumed).

## Follow-ups (not yet done)
- **Deploy the other 11 language sites** (`foreach … netlify deploy` or `regen_search.ps1`).
- **Facet completeness:** live `en` returned only `content_type` counts on a plain query — confirm `book`/`has_chain`/`topic`/`tag` facet counts (Pagefind filter load-timing or a cardinality cap?).
- **Search-bar redesign:** language pill, sectioned dropdown (Recent/Titles/Topics/Phrases), recent searches (localStorage), operator hints.
- **Tier-1 from `IndexState.books`:** drop the `titles.json` fetch (reuse the already-loaded nav data) — then delete `titles.json` too.
- **i18n:** add proper language-name strings for the picker (currently shows uppercased codes) + any new search keys.
- **CSP note:** `PagefindService` uses `new Function('u','return import(u)')`; fine today (no strict CSP) — revisit if a strict CSP is added.

## Verification

- **Search build:** `cd ThaqalaynSearch; npm run build` (or `node build.mjs <book>` for a subset); spot-check `manifest.json`, a couple of `<lang>/` indexes, and `qref.json`. Normalizer parity: run `tests/parity-check.py` (generator venv) then `node tests/parity-check.mjs` — must be 0 mismatches.
- **Deploy spike:** full local build → measure file count + run `netlify deploy` to confirm a large bundle deploys within Netlify's limits.
- **Client unit:** `CHROME_BIN=… npx ng test --watch=false --browsers=ChromeHeadless` — normalizer parity, operator parsing, Tier-1 in-memory titles, language switch, SSR guards.
- **E2E / manual:** full stack (`ThaqalaynData/serve.py` + `npm start`): confirm **no index fetch on page load** (Network tab) until search is focused; first full-text query downloads only small fragments; reload/offline works; facets, `topic:` / `phrase:` / `ref:` / `book:`, highlighted snippets, `/` shortcut. Playwright `/search` spec + SSR no-crash check.

## Risks

- **Pagefind Arabic quality / multilingual API** — validate in the spike; pin version.
- **Netlify deploy file-count** for the fragment bundle — validate in the spike; volume-level grouping is the fallback.
- **New Node build step** in a Python pipeline — isolate as a standalone script; document in COMMANDS.md.
- **AI coverage ~90%+ but uneven** (laggards: uyun 47%, sifat-al-shia 40%, kitab-al-duafa 34%) — graceful degradation everywhere (hide empty facets, snippet fallback).
- **~700K-file bundle** — deploy via Netlify CLI (gitignored), not git-autodeploy; deploy spike must confirm Netlify handles it.
- **Normalizer drift** — shared fixture parity test is mandatory.
- **Two engines (Orama in-memory + Pagefind)** — bounded: Orama only for already-loaded titles; no Orama fetch.
- **Cross-repo contract** — land the generator + Pagefind bundle first, then the client.
