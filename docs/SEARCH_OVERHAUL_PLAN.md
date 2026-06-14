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
- **Delete `titles.json`** and stop generating it — net **−1.4 MB**. Keep Orama (`@orama/orama`) as a dependency *only* for this in-memory tier, built from in-memory data and never fetched. (A plain fuzzy matcher would also work; Orama gives boosting/fuzziness for free.)

### Tier 2 — Topics / tags / phrases → Pagefind (no separate search index)

There is **no benefit** to a separate index here (not preloaded, not per-keystroke), so these ride on Pagefind:

- **Topics & tags** → Pagefind **filters** (faceted sidebar with counts). This can also drive the `/topics` browse page from Pagefind filter metadata → **delete `topics.json` (−2.5 MB)**.
- **Phrases** → `phrase:"…"` maps to a native Pagefind exact-phrase query. Retain only a small curated phrase *list* for the `/phrases` browse-page display (shrink `phrases.json` to display data, or regenerate as a lightweight list).

### Tier 3 — Full-text verse content (Pagefind term-sharded)

The large, multilingual, AI-enriched corpus (Arabic + 11 languages + summaries / key-terms / phrases).

- **Pagefind** (static, build-time, zero recurring cost, MIT). The browser loads a tiny entry chunk + only the per-term fragments for the words typed (~tens of KB/query). Nothing preloaded.
- Pagefind **per-language sub-indexes** → only the user's chosen search language is fetched. **Filters** provide facets (book, content_type, grading, has_chain, topics, tags) with counts. Built-in highlighted **excerpts**.
- Lazy-import the Pagefind runtime on first full-text search; **SSR-guard** (platform check — the app uses `@angular/ssr`). The service worker caches fetched fragments → progressively offline + zero repeat bandwidth.

### Where the Pagefind bundle lives + size → dedicated repo + Netlify site

- **Estimated footprint:** searchable text ≈ 30 MB Arabic + 40 MB English today, trending to ~40 MB × 11 languages as AI translation coverage grows (currently ~17% → 100%). A Pagefind bundle is ≈ 30–50% of source text plus many fragment files ⇒ **~50–80 MB now, ~150–250 MB at full coverage, tens of thousands of files**. (The per-query *download* stays tiny regardless — this is on-server footprint only.)
- **Decision:** the bundle is a *regenerated build artifact*, too big and too many files to sit in `ThaqalaynData` (already ~908 MB; committing it bloats git like a compiled binary and slows Netlify deploys). Put it in a **dedicated repo + Netlify site** (e.g. `thaqalaynsearch.netlify.app`) serving only the Pagefind bundle, with **CORS headers** (free Netlify config) so the Angular app fetches cross-origin. 100% static, zero recurring cost. Angular reads the origin from a new `environment.searchBaseUrl`.
- The **Phase-0 spike** measures real size + file-count to confirm this threshold (if it comes in small — under ~50 MB / a few thousand files — co-locating under `ThaqalaynData/pagefind/` stays an option, but the trajectory argues for the separate site).

---

## Build side — `ThaqalaynDataGenerator` + a new Pagefind step

### Generator (`search_index.py` rewrite)

The builder must read `verse_detail` files (resolve `verse_refs[].path` → `books/<slug>/.../n.json`; `books/complete/*.json` are also shells — no shortcut). Walk the ~68K files **once, book-by-book**, reusing `app/build_ai_indexes.py::_walk_json_files()` + `_extract_verses()`. Per verse, emit a normalized record carrying, per language: translation text (+ AI summary, key-term glosses, key phrases) and, for Arabic, `normalize_arabic(text)` + Arabic key-terms / phrases. Attach facet fields: book, content_type, derived grade token, has_chain, topics, tags. `_select_translation_id()` must pick exactly one id per language (critical for Quran's 17 en / 11 fa translations, else the `en` shard explodes).

Outputs:

- **Pagefind source records** — a JSONL/NDJSON manifest of `{url, language, content, meta, filters}` per verse-language, consumed by the Pagefind indexing step (or fed to Pagefind directly).
- **`qref.json`** — Quran cross-ref inverted index `{ "2:255": [paths…] }`, built in the same pass (hadith `related_quran` cites + Quran self-refs). Small; loaded only on a `ref:` query.
- **Remove generation of `titles.json`, `*-docs.json`, `search-meta.json`** — and delete them from the data repo.

Wire into `app/main_add.py` **after `merge_ai_content()`** (AI blocks must be on disk); share one `data_version` written to both `index/data_version.json` and the search manifest. Log per-book AI-coverage % to catch zero-coverage regressions.

### Pagefind index build (new Node step → dedicated repo)

A Node script uses Pagefind's **NodeJS Indexing API** (`createIndex()` → `addCustomRecord({url, content, language, meta, filters})`) over the generator's records, writing the bundle into the **dedicated search repo** (deployed to its own Netlify site with CORS). Pin the Pagefind version. Build-time only — zero recurring cost. Document the command in [COMMANDS.md](COMMANDS.md).

### Tests

Rewrite `tests/test_search_index.py` around `verse_detail` fixtures: per-language record building + `<lang>.ai` fallback; Arabic normalization; facet fields with optional omission; graceful no-record when a language has neither translation nor AI; `_derive_grade_token`; `build_qref_index` (cite + Quran self-ref, dedup/sort); assert old flat files are no longer produced.

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
- **`/search` page:** sticky **facet sidebar** with live counts (hide empty groups — AI coverage ~17%), sort control, removable filter chips, **bilingual highlighted result cards** (Pagefind excerpts; summary as snippet when present, else translation / Arabic), Pagefind-paginated. Reuse the existing `IntersectionObserver` + `verse-loader.service.ts` for any detail hydration.
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

## Phasing

0. **(gating)** Commit this doc; run the **Pagefind spike** (2 books, Arabic + 2 languages) to validate Arabic tokenization, filter/facet counts, per-query wire size, and total bundle size + Netlify file-count.
1. Generator rewrite + `qref.json` + tests; delete `titles.json` / `*-docs.json` / `search-meta.json`; wire `main_add.py`.
2. Pagefind Node build step → dedicated repo/site.
3. Client: shared normalizer; Tier-1 in-memory titles; defer-until-engaged; remove the `titles.json` consumer.
4. Client: Pagefind wrapper, language picker, operators, facets, highlighting; NGXS state.
5. UI redesign (bar + `/search`), recent searches, suggestions, accessibility.
6. robots.txt update; cleanup stale data files; docs/index updates.

## Verification

- **Generator:** `cd ThaqalaynDataGenerator; source .venv/Scripts/activate; … python -m pytest tests/test_search_index.py --no-cov -q`; regenerate; spot-check records, `qref.json`, per-book coverage logs.
- **Pagefind spike:** measure per-query bytes (DevTools Network), facet-count correctness, fragment file count vs Netlify limit.
- **Client unit:** `CHROME_BIN=… npx ng test --watch=false --browsers=ChromeHeadless` — normalizer parity, operator parsing, Tier-1 in-memory titles, language switch, SSR guards.
- **E2E / manual:** full stack (`ThaqalaynData/serve.py` + `npm start`): confirm **no index fetch on page load** (Network tab) until search is focused; first full-text query downloads only small fragments; reload/offline works; facets, `topic:` / `phrase:` / `ref:` / `book:`, highlighted snippets, `/` shortcut. Playwright `/search` spec + SSR no-crash check.

## Risks

- **Pagefind Arabic quality / multilingual API** — validate in the spike; pin version.
- **Netlify deploy file-count** for the fragment bundle — validate in the spike; volume-level grouping is the fallback.
- **New Node build step** in a Python pipeline — isolate as a standalone script; document in COMMANDS.md.
- **AI coverage ~17%** — graceful degradation everywhere (hide empty facets, snippet fallback); grows on each regen.
- **Normalizer drift** — shared fixture parity test is mandatory.
- **Two engines (Orama in-memory + Pagefind)** — bounded: Orama only for already-loaded titles; no Orama fetch.
- **Cross-repo contract** — land the generator + Pagefind bundle first, then the client.
