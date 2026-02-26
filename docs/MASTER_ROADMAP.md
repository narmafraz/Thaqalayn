# Master Roadmap

> **Last updated:** 2026-02-23
> **Purpose:** Single source of truth for all planned work across the Thaqalayn ecosystem. Consolidates and supersedes individual proposals. Each phase ends with a team evaluation checkpoint.
>
> **Source documents consolidated:**
> - ARCHITECTURE.md — Design philosophy and constraints
> - FEATURE_PROPOSALS.md — Search, PWA, bookmarks, audio, tafsir, sharing
> - IMPROVEMENT_ROADMAP.md — Original phased improvement plan
> - OPTIMIZATION_PLAN.md — Data size reduction strategies
> - SCHEMA_PROPOSAL.md — Data model evolution
> - PARSER_ARCHITECTURE.md — New book source integration
> - PHASE3_FEATURE_PROPOSAL.md — Phase 3 features (SEO, i18n, navigation, translations, cross-validation, narrators, word-by-word)
> - INDIVIDUAL_HADITH_PAGES_PROPOSAL.md — Per-hadith addressable pages
> - TEST_STRATEGY.md — Testing approach
> - QA_REPORT.md — Quality baseline and resolved issues

---

## Completed Work

Everything below has been implemented and tested. Included for context — do not re-implement.

### Phase 1: Test Coverage (COMPLETE)
- [x] Fixed 5+ broken Angular unit test compilation errors → 20/20 passing
- [x] Set up Playwright E2E framework replacing Protractor → 78 tests across 12 specs
- [x] Added axe-core accessibility tests → 19 tests
- [x] Generator test suite → 455 tests passing
- [x] QA baseline report with 13 issues documented

### Phase 2: Cleanup & Modernization (COMPLETE)
- [x] Removed narrator_chain.text from output (30 MB savings)
- [x] Optimized subchain generation (60 MB savings)
- [x] Refactored error accumulation into ProcessingReport class
- [x] Migrated TSLint → ESLint
- [x] Removed deprecated Protractor
- [x] Updated Angular 18.0→18.2, NGXS 18.0→18.1
- [x] Fixed NGXS race condition console errors (20 TypeErrors)
- [x] Fixed accessibility: semantic landmarks, skip-to-content, heading hierarchy, alt text, aria-labels
- [x] Added dynamic page titles
- [x] Quran breadcrumb index bug fixed
- [x] Reduced npm vulnerabilities (93→72)

### Phase 3A: SEO Foundation (COMPLETE)
- [x] Migrated hash→path routing (`useHash: false` + `_redirects` + legacy redirect handler)
- [x] Created SeoService (meta tags, Open Graph, canonical URLs, JSON-LD structured data)
- [x] Created robots.txt + sitemap.xml generator (7,349 URLs)
- [x] Built searchable expandable navigation (CDK FlatTree + Arabic diacritic search)
- [x] Updated all 78 E2E tests for path routing + 11 new SEO tests

### Phase 3B: Internationalization & Individual Pages (COMPLETE ~95%)

> **Status:** All core deliverables complete. Minor SEO deployment tasks deferred.

#### 3B.0 SEO Follow-Up (from Phase 3A)

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| [x] | Netlify Prerender Extension | Created `netlify.toml` with build config, asset caching headers (immutable for fingerprinted files), security headers, and prerender documentation. Extension to be installed from Netlify dashboard. | Trivial |
| [ ] | Google Search Console | Placeholder meta tag added to `index.html` but needs real verification code. Sitemap not yet submitted. | Trivial |
| [x] | Fix `lang="ar"` on Arabic text | Add `lang="ar"` attribute to all Arabic text containers (`.arabic` classes). Screen readers currently mispronounce Arabic. (QA Report M1, still open) | Low |

#### 3B.1 Full i18n Framework

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| [x] | Language persistence | `?lang=` query param + localStorage fallback. Shareable URLs preserve language. | Low |
| [x] | Runtime translation files | Created `index/ui-strings/{lang}.json` for 12 UI languages. ~50 string keys (buttons, labels, headings, footer). | Medium |
| [x] | TranslatePipe | `{{ 'nav.home' \| translate }}` pipe using `I18nService` that loads the current language's JSON file. Includes race condition fix (`stringsChanged$` + `markForCheck`). | Medium |
| [x] | I18nService | Loads UI strings JSON on language change, provides `get(key)` method, emits language change events. | Medium |
| [x] | Language picker | Dropdown in header showing available UI languages. Sets `?lang=` and reloads strings. | Low |
| [x] | RTL support | When UI language is Arabic/Urdu/Farsi, sets `document.documentElement.dir = 'rtl'`. Uses CSS logical properties. | Medium |
| [x] | Dual-language display | Arabic text always visible. Second language is user's chosen language (not hardcoded English). | Medium |
| [x] | Fix ExpandLanguagePipe | Extended `expand-language.pipe.ts` to include all supported language codes dynamically. | Low |
| [x] | AI UI translations | Generated `ui-strings/{lang}.json` for 12 languages. | Low |

#### 3B.2 Individual Hadith/Verse Pages

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| [x] | Add `verse_detail` kind to Angular Book type | Extended discriminated union in `book.ts` | Low |
| [x] | Generator: per-hadith JSON files | Writes `books/{book}/{...}/{verse}.json` with verse data + chapter context + nav | Medium |
| [x] | VerseDetailComponent | Single-hadith view: large Arabic text, translations, narrator chain, gradings, cross-refs, share button | Medium |
| [x] | Chapter view link icons | Added link icon per hadith pointing to individual page | Low |
| [x] | SeoService: verse_detail meta | Rich meta/JSON-LD for individual hadith pages | Low |
| [x] | Sitemap: include hadith URLs | Updated generator script to add new URLs | Low |
| [x] | E2E tests for hadith pages | Deep-link, content, navigation, share | Low |

#### 3B.3 Schema Evolution

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| [x] | Gradings field (`Dict[str,str]`) | Populated from ThaqalaynAPI data (majlisi, mohseni, behbudi). Display with color-coded badges. | Medium |
| [x] | Book registry (`book_registry.py`) | Declarative book config. New books = registry entry + parser function. No main_add.py changes. | Medium |
| [x] | Book metadata | Author, translator, source URL per book. Display on book landing pages. | Low |
| [x] | PartType: add `Section` | ThaqalaynAPI books have sections within volumes. | Low |
| [x] | `source_url` on Verse | Link back to source site per hadith. | Low |
| [x] | French language support | Added `FR` to Language enum, registered French translations from ThaqalaynAPI `frenchText` field. | Low |

#### 3B.4 Data Scraping (parallel with above)

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| [x] | ThaqalaynAPI parser (`thaqalayn_api.py`) | Generic parser for all 21+ ThaqalaynAPI books. JSON→our schema transformer. | Medium |
| [x] | Register ThaqalaynAPI books | All 20+ books registered in book_registry.py, data generated. | Medium |
| [ ] | rafed.net Arabic text downloader | Deferred — scraper skeleton created but full implementation not viable for automated scraping. Word file extraction requires manual effort. | High |
| [ ] | lib.eshia.ir Arabic text scraper | Deferred — assessed as not viable. Source contains image scans of manuscripts, not structured text. | Medium |

---

## Phase 3C: Scholarly Features & Content (COMPLETE ~90%)

> **Goal:** AI translations, cross-validation pipeline, narrator biographies.
> **Status:** Core infrastructure built (AI pipeline, normalization, WikiShia scraper, grading badges). Actual data generation and some UI components remain.
> **Team evaluation:** At end of 3C, assess readiness for Phase 4's advanced features.

### Team Composition (4 agents)

| Agent Name | Type | Responsibilities |
|------------|------|-----------------|
| **frontend-dev** | `general-purpose` | Angular UI for new scholarly features: verification badges on hadith pages, diff viewer component for cross-validation, narrator biography display (birth/death, era, reliability, teachers/students), readable hadith references on narrator pages. |
| **data-engineer** | `general-purpose` | AI translation pipeline: batch script for Claude Haiku Batch API, generate translations for 10 languages, quality review process, translation ingestion into verse data. Also builds the Arabic text normalization engine and 3-tier comparison logic for cross-validation. |
| **researcher** | `general-purpose` (isolated worktree) | WikiShia MediaWiki API scraper for narrator biographies, 5-step name matching pipeline (exact → normalized → fuzzy → manual → AI-assisted), AI name transliterations via Haiku Batch for 4,860 Arabic names. |
| **qa-engineer** | `general-purpose` | Regression testing: run full E2E suite after each feature merge, verify no existing tests break, write new E2E tests for cross-validation badges and narrator biography pages. Monitor console errors on new pages. |

**Coordination notes:**
- `data-engineer` must complete the normalization engine before cross-validation can produce results for `frontend-dev` to display.
- `researcher`'s WikiShia data feeds into `frontend-dev`'s biography display — coordinate handoff mid-phase.
- `qa-engineer` runs continuous regression; does not need to wait for feature completion to start testing partial integrations.
- AI translation costs (~$245) require user approval before batch jobs are submitted.

### 3C.1 AI-Powered Translations

> **SUPERSEDED by Phase 7.** The original Haiku-based translation pipeline has been replaced by a comprehensive Opus 4.6-based pipeline that combines translations with word-by-word analysis, tagging, summaries, and quality validation. See [`docs/AI_CONTENT_PIPELINE.md`](AI_CONTENT_PIPELINE.md) and Phase 7 in this document.

| Status | Task | Description | Effort | Cost |
|--------|------|-------------|--------|------|
| [x] | Translation pipeline script | `ai_translation.py` — batch script infrastructure (to be upgraded to `ai_pipeline.py` in Phase 7). | Medium | - |
| SUPERSEDED | Generate 5 priority languages | Moved to Phase 7.1 with Opus 4.6 + combined content generation. | Medium | — |
| SUPERSEDED | Generate 5 additional languages | Moved to Phase 7.1 with Opus 4.6 + combined content generation. | Medium | — |
| SUPERSEDED | Quality review process | Moved to Phase 7.1 with automated AI validation pass (Sonnet 4.6). | Medium | — |
| SUPERSEDED | Translation ingestion | Moved to Phase 7.1 with checkpoint-based ingestion. | Medium | — |

### 3C.2 Arabic Text Cross-Validation

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| [x] | Build normalization engine | `arabic_normalization.py` — strips tashkeel, normalizes hamza/teh marbuta/alef maksura, removes tatweel. | Medium |
| [x] | 3-tier comparison | Exact → diacritics-only → substantive differences. Confidence scoring. | High |
| [x] | Validation data files | `validation/cross-validation/` — 1,977 per-chapter JSON files + summary.json. Cross-validated 12,190 hadiths between HubeAli and thaqalayn.net sources (96-97% confidence). `cross_validate.py` handles narrator chain concatenation and hadith number prefix stripping. | Medium |
| [x] | Angular: verification badges | Verification badge infrastructure built. Trust indicators on hadith pages. | Medium |
| [x] | Angular: diff viewer | DiffViewerComponent: collapsible panel with LCS-based character-level Arabic text diffing. Color-coded equal/insert/delete/replace segments. Dark mode + RTL support. Integrated into verse-detail cross-validation section. 14 unit tests. | Medium |

### 3C.3 Narrator Improvements

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| [x] | WikiShia scraper | `wikishia/` module — MediaWiki API scraper for narrator biographies. | Medium |
| [x] | Name matching pipeline | 5-step approach: exact match, normalized match, fuzzy match, manual mapping, AI-assisted. | High |
| [x] | AI name transliterations | Infrastructure for generating English transliterations for 4,860 Arabic names via Haiku Batch (~$2). | Low |
| [x] | Readable hadith references | PathLinkComponent formats paths as human-readable references (e.g. "Quran 59:2", "Al-Kafi 1:2:3, #4"). Book name mapping for known books with titleCase fallback. | Medium |
| [x] | Biography display | Grading badges displayed in UI. | Medium |

---

## Phase 4: Search, PWA & UX Enhancement (COMPLETE)

> **Goal:** Most-requested features: full-text search, offline support, bookmarks.
> **Status:** Core features implemented (search with Orama, PWA, bookmarks with Dexie.js, audio, sharing, language auto-detection). Word-by-word Quran, some mobile UX, and NGXS error state deferred.
> **Team evaluation:** At end of Phase 4, assess readiness for Phase 5's expansion work.

### Team Composition (4 agents)

| Agent Name | Type | Responsibilities |
|------------|------|-----------------|
| **frontend-search** | `general-purpose` | Search UI: search bar in header, results page with highlighted matches, lazy-load Orama indexes, Arabic normalization in search. Also handles error handling & resilience (ErrorInterceptor, timeout/retry, loading/error NGXS state, error display component). |
| **frontend-ux** | `general-purpose` | PWA setup (`@angular/pwa`), cache-on-read strategy, offline per-book download, bookmarks & reading progress (Dexie.js), audio recitation (EveryAyah integration, player component), social sharing (share button, verse card images), mobile responsive polish, browser language auto-detection. |
| **data-engineer** | `general-purpose` | Build-time search index generation: per-book Orama indexes with Arabic normalization. Word-by-word Quran data processing (QUL SQLite→JSON conversion, per-ayah word files). |
| **qa-engineer** | `general-purpose` | Cross-browser testing of search, PWA offline mode, audio player accessibility, mobile viewport testing at 320/375/414px. Performance benchmarks for search index loading. |

**Coordination notes:**
- `frontend-search` depends on `data-engineer` completing search indexes before full integration testing.
- `frontend-ux` works independently on PWA/bookmarks/audio — no dependencies on search work.
- Two frontend agents are needed because Phase 4 has the highest UI workload (search + PWA + audio + bookmarks + sharing + mobile polish).
- `qa-engineer` should test PWA offline scenarios on real mobile devices if possible (or mobile emulation in Playwright).
- Word-by-word Quran (4.7) is the lowest priority in this phase — deferred to later.

### 4.0 Error Handling & Resilience

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| [x] | ErrorInterceptor | Global HTTP error capture (`src/app/services/error.interceptor.ts`). | Low |
| [x] | Timeout & retry | Added `timeout(30000)` and `retry({ count: 2, delay: 1000 })` to `BooksService.getPart()` and `PeopleService.getNarrator()`. | Low |
| [x] | Loading/error state in NGXS | `loading` and `errors` fields in `BooksStateModel`, `getCurrentLoading`/`getCurrentError` selectors, wired into book-dispatcher with spinner and retry. | Medium |
| [x] | Error display component | `ErrorDisplayComponent` with retry button, used in book-dispatcher, people-content, people-list. | Medium |

### 4.1 Full-Text Search

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| [x] | Build-time Orama indexes | Generated per-book split indexes for all 22 books (38,578 documents). Dynamic discovery via `search-meta.json`. Titles index ~1.4 MB, per-book corpus files vary. | High |
| [x] | Arabic normalization in indexer | Same normalization as navigation search, applied to index content. | Medium |
| [x] | Search UI component | SearchService with Orama, search bar in header, results page with book filter chips, human-readable path formatting, search tips dialog. AND search for multi-word queries with OR fallback. Boost weighting and fuzzy tolerance. | High |
| [x] | Lazy-load indexes | Loads titles index immediately, full-text indexes on demand with parallel loading (Promise.all). | Medium |

### 4.2 Offline / PWA Support

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| [x] | `ng add @angular/pwa` | PwaService + manifest.webmanifest created. Service worker for app shell caching. Includes apple-touch-icon fix. | Low |
| [x] | Cache-on-read strategy | BooksService caches every API response in IndexedDB for offline re-reading. Complements service worker caching. | Medium |
| [x] | "Download for offline" per book | BooksService checks OfflineStorageService first: extracts individual chapters from downloaded complete books via `getPartFromBook()`, with in-memory parsed book cache for performance. | Medium |
| [x] | Install prompt | "Add to Home Screen" prompt for mobile users. | Low |

### 4.3 Bookmarks & Reading Progress

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| [x] | Dexie.js integration | IndexedDB wrapper (BookmarkService) for local storage of bookmarks, notes, progress. | Medium |
| [x] | Bookmark any verse/hadith | Bookmarks page with bookmark management. | Medium |
| [x] | Reading progress tracking | Auto-save last position per book. | Medium |
| [x] | Export/import bookmarks | JSON export/import for backup/sharing. | Low |

### 4.4 Audio Recitation (Quran)

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| [x] | EveryAyah integration | AudioService with 4 reciters, per-verse audio using free MP3 files. | Medium |
| [x] | Audio player component | Play/pause, continuous playback through surah, reciter selection. | Medium |
| [x] | Keyboard/screen reader controls | Accessible audio playback. | Low |

### 4.5 Social Sharing

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| [x] | Share button on hadith pages | Share button on verse-detail. `navigator.share()` on mobile, copy-to-clipboard on desktop. | Low |
| [x] | Verse card images | ShareCardService using Canvas API generates PNG cards with Arabic text, translation, reference, grading, and branding. Integrated into both chapter-content (per-verse icon button) and verse-detail components. Uses `navigator.share()` with file on mobile, falls back to download on desktop. | Medium |

### 4.6 Responsive Design & Mobile Polish

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| [x] | Mobile viewport audit | Tested at 320px, 360px, 375px. Added 360px breakpoint tier, fixed search dropdown overflow with CSS min(), added breadcrumb scroll mask fade, responsive people-list table, compact header/footer at ultra-narrow widths. | Medium |
| [x] | Fix "Mentioned In" link clipping | Fixed via 360px breakpoint and responsive adjustments to chapter-content, people-list, and breadcrumbs. | Low |
| [x] | Touch-friendly navigation | Swipe gestures for next/prev chapter on mobile. Horizontal swipe >80px triggers navigation with vertical filtering. | Medium |
| [x] | Browser language auto-detection | On first visit, detects `navigator.language` and sets default UI + translation language. | Low |

### 4.7 Word-by-Word Quran (DEFERRED)

> **Decision:** Deferred to a later phase. QUL data processing and word popover component require significant effort with lower priority than other features.

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| [ ] | QUL data processing | Convert SQLite/JSON to per-ayah word files (`words/quran/{surah}/{ayah}.json`). | Medium |
| [ ] | Word popover component | Click any Arabic word → translation, root, morphology. | High |
| [ ] | Root exploration pages | Click root → all occurrences across Quran. | High |

---

## Phase 5: Platform Expansion (COMPLETE ~90%)

> **Goal:** Complete all Four Books, add additional collections, modernize the stack.
> **Status:** Angular 19 upgrade complete (19.2.x with NGXS 19). ThaqalaynAPI data scraped and fully generated for 22 books (registered in Phase 3B.4). Full data generation pipeline running end-to-end: 22 books, 40,621 verses, 1,009 generator tests passing. Gradings working in both dict and list formats (824 dict + 13,900 list). Cross-reference linker for all books complete (2,146 hadiths linked, 79,814 modular files patched). No Tahdhib/Istibsar parsers (different sources needed). Data optimization (5.4) remaining.
> **Team evaluation:** At end of Phase 5, assess whether the platform is ready for community features.

### Team Composition (5 agents)

| Agent Name | Type | Responsibilities |
|------------|------|-----------------|
| **frontend-dev** | `general-purpose` | Angular 19 upgrade: standalone component migration, NgModule removal, npm vulnerability resolution, remove `--openssl-legacy-provider` hack. Verify all existing features work post-upgrade. |
| **parser-dev-1** | `general-purpose` | Four Books parsers: Man La Yahduruhu al-Faqih (ThaqalaynAPI source), Tahdhib al-Ahkam (ghbook.ir HTML/EPUB), generalize narrator extraction from `kafi_narrators.py` into shared module. |
| **parser-dev-2** | `general-purpose` | al-Istibsar parser (ghbook.ir HTML/EPUB), cross-reference linker for all books (`link_books.py`), generator quality tasks (externalize config, fix platform paths, DRY refactoring, type hints). |
| **researcher** | `general-purpose` (isolated worktree) | Source acquisition for additional collections: Nahj al-Balaghah, Tuhaf al-Uqul, Al-Amali, Uyun Akhbar al-Ridha, Kamil al-Ziyarat. Evaluate ThaqalaynAPI availability and data quality for each. Register books in book_registry.py. |
| **qa-engineer** | `general-purpose` | Full regression after Angular 19 upgrade (all 78+ E2E tests). Verify data integrity for newly parsed books: verse counts, chapter counts, translation pairing, narrator chain resolution. Data optimization validation (verse_translations extraction, Brotli compression). |

**Coordination notes:**
- `frontend-dev` should complete Angular 19 upgrade before other agents merge UI-related changes, to avoid conflicts.
- `parser-dev-1` and `parser-dev-2` work in parallel on different books — use isolated worktrees to avoid data file conflicts.
- `researcher` feeds book sources to parser devs mid-phase; coordinate handoff points.
- Two parser agents are needed because Phase 5 has the heaviest data/generator workload (4+ new parsers + generalization + quality).
- Data optimization (5.4) can happen in parallel with parsing work since it modifies different parts of the pipeline.

### 5.1 Complete the Four Books

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| [x] | Man La Yahduruhu al-Faqih parser | Already scraped and generated via ThaqalaynAPI `thaqalayn_api.py`. Registered in book_registry.py. | Medium |
| [ ] | Tahdhib al-Ahkam parser | ghbook.ir HTML/EPUB source (10 vols, Arabic). rafed.net Word for cross-reference. | High |
| [ ] | al-Istibsar parser | ghbook.ir HTML/EPUB source (4 vols, Arabic). No English translation available. | High |
| [ ] | Generalize narrator extraction | Refactor `kafi_narrators.py` into shared module. Different books have different chain styles. | High |
| [x] | Cross-reference linker for all books | `link_books.py` — scans all 22 books for Quran references, creates bidirectional Mentions/Mentioned In relations, replaces `[S:V]`/`(S:V)` with HTML links. 2,146 hadiths across 15 books linked. Propagates changes to 79,814 modular files (verse_list + verse_detail). 30 unit tests. | Medium |

### 5.2 Additional Hadith Collections (COMPLETE)

> All books below were scraped via ThaqalaynAPI and registered in book_registry.py during Phase 3B.4.
> 22 books total are now generated and served, including all listed below plus 10+ additional collections.

| Status | Book | Author | Source | Priority |
|--------|------|--------|--------|----------|
| [x] | Nahj al-Balaghah | Al-Sharif al-Radi | ThaqalaynAPI | High |
| [x] | Tuhaf al-Uqul | Ibn Shuba Harrani | ThaqalaynAPI | Medium |
| [x] | Al-Amali (Tusi/Saduq/Mufid) | Various | ThaqalaynAPI | Medium |
| [x] | Uyun Akhbar al-Ridha | Shaykh Saduq | ThaqalaynAPI | Medium |
| [x] | Kamil al-Ziyarat | Ibn Qulawayh | ThaqalaynAPI | Low |
| [x] | Others (15+ books) | Various | ThaqalaynAPI | Low |

### 5.3 Angular 19 Upgrade (COMPLETE)

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| [x] | Angular 19 upgrade | Upgraded to Angular 19.2.18 with NGXS 19. Standalone components, improved signals, hydration support. | High |
| [x] | NgModule → standalone migration | Simplified module tree with lazy-loaded PeopleModule and StaticPagesModule. | High |
| [x] | Resolve remaining npm vulnerabilities | Reduced from 93→67 vulnerabilities. Angular 19.2.18 fixes XSS and XSRF advisories. Remaining are transitive/dev-only. | Medium |
| [x] | Remove `--openssl-legacy-provider` | Removed from `package.json` start script. No longer needed with Angular 19 build tooling. | Low |

### 5.5 Generator Quality

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| [x] | Externalize configuration | Created `app/config.py` with project-wide constants: paths (APP_DIR, RAW_DIR), book identifiers, translation IDs, API settings, `get_raw_path()` helper, JSON encoding settings. | Medium |
| [x] | Fix platform-specific file paths | Replaced Windows backslashes with `os.path.join()` and forward slashes in `quran.py`, `kafi.py`, `kafi_sarwar.py`. All path operations now cross-platform compatible. | Low |
| [x] | DRY refactoring | Created `base_parser.py` with shared utilities: `make_chapter()`, `make_verse()`, `register_translation()`, `publish_book()`, `get_parser_raw_path()`. Reduces duplication across parsers. | Medium |
| [x] | Python type hints | Added complete type annotations to all public functions in `lib_db.py`, `kafi.py`, `kafi_sarwar.py`, `quran.py`. | Medium |
| [x] | Add mypy to CI | Added `mypy>=1.0` to dev deps, `[tool.mypy]` config in pyproject.toml, type checking step in GitHub Actions CI. Checks `base_parser.py`, `config.py`, `lib_db.py`, `lib_model.py`. | Low |
| [x] | Increase parser test coverage | Added 94 tests across 3 new files: `test_base_parser.py` (35 tests for make_chapter, make_verse, register_translation, publish_book, get_parser_raw_path), `test_kafi_parser.py` (42 tests for extract_headings, we_dont_care, table_of_contents, join_texts, is_* helpers, add_hadith, regex patterns), `test_kafi_sarwar_parser.py` (17 tests for we_dont_care, sitepath_from_filepath, constants, add_chapter_content with HTML fixtures). Also fixed `register_translation()` bug (Pydantic required fields). Total: 955 generator tests. | Medium |

### 5.4 Data Optimization (remaining)

| Status | Task | Description | Savings | Effort |
|--------|------|-------------|---------|--------|
| [x] | Brotli pre-compression | Netlify CDN handles Brotli compression automatically for all static assets. No pre-compression needed. | Transfer savings | N/A |
| [ ] | Extract verse_translations to shared file | Measured: only 0.42 MB across 7,738 files (not 5 MB as estimated). Cross-project change not justified for <0.1% savings. Deferred indefinitely. | ~0.4 MB | Medium |
| [ ] | Index file splitting for scalability | Per-book index files when 30+ books are added. Not needed yet (22 books). | Scalability | Medium |
| [ ] | Field name shortening (optional) | Rename long field names (e.g., `indexed_titles`→`it`). Breaking change across all 3 projects. | ~20 MB | High (invasive) |

---

## Phase 6: Community & Advanced Features (IN PROGRESS ~95%)

> **Goal:** Features for scholarly use, community engagement, and developer access.
> **Status:** UX polish complete (dark mode, keyboard shortcuts, font controls, lazy loading, OnPush, daily verse, annotations, side-by-side translations). Comprehensive test suite (347 tests). CI/CD pipeline done. Mobile viewport audit done. Scholarly features and most community features pending.

### Team Composition (3–4 agents, scaled as needed)

| Agent Name | Type | Responsibilities |
|------------|------|-----------------|
| **frontend-dev** | `general-purpose` | Scholarly features UI: hadith grading system with filtering, thematic tagging, comparative hadith view, tafsir integration, side-by-side translation view. UX polish: font controls, dark mode, keyboard shortcuts, sub-chapter grouping, lazy loading, OnPush migration, remove `any` types. Community features: user annotations (Dexie.js), Firebase sync, daily hadith widget, embeddable widgets. |
| **frontend-dev-2** *(optional)* | `general-purpose` | Needed only if community features (6.4) are prioritized alongside scholarly features (6.1). Handles: discussion/commentary system, cross-device sync, mobile app (enhanced PWA / Capacitor wrapper), Angular SSG/prerendering. Can be skipped if Phase 6 is done sequentially rather than in parallel. |
| **data-engineer** | `general-purpose` | Infrastructure: CI/CD pipeline (GitHub Actions), automated data generation pipeline, data schema validation script, JSON Schema definitions, public API documentation, versioned API paths, downloadable data packages (JSON/CSV/SQLite), REST/GraphQL API layer (Netlify Functions). Comprehensive Angular test suite (70%+ coverage target). |
| **qa-engineer** | `general-purpose` | Full regression across all features. Performance testing for caching service, lazy loading, OnPush. Accessibility audit of new components (dark mode contrast, keyboard shortcuts). Schema validation of downloadable data packages. Client-side caching service verification. |

**Coordination notes:**
- Phase 6 is the most flexible in composition — scale from 3 to 4 agents based on priority.
- If scholarly features (6.1) are the priority, use 3 agents (1 frontend + 1 data + 1 QA).
- If community features (6.4) are also needed, add `frontend-dev-2` for a 4-agent team.
- AI-assisted features (6.6: semantic search, RAG chatbot) require specialized knowledge — consider a dedicated research agent if these are prioritized.
- Sunni collections (6.5) could use a dedicated `parser-dev` agent borrowed from the Phase 5 pattern.
- Custom domain (6.7) is a trivial admin task — any agent can handle it.

### 6.1 Scholarly Features

| Status | Task | Source | Effort |
|--------|------|--------|--------|
| [x] | Hadith grading system with filtering | IMPROVEMENT_ROADMAP.md §8.2.1 — Inline color-coded grading badges on chapter-content (sahih, hasan, daif, mutabar, majhul, muwathaq). Added `gradings?: string[]` to Verse interface. Parsing handles `Scholar: <span>term</span>` HTML format. Tooltip shows full grading text. | High |
| [x] | Thematic tagging & topic index | IMPROVEMENT_ROADMAP.md §8.2.3 — `/topics` page with categorized card grid. Topics extracted from Al-Kafi book-level chapters, grouped into 6 categories (Theology, Knowledge & Ethics, Worship, Jurisprudence, Daily Life, Family & Life Events). Search filter, bilingual display, direct navigation to chapters. | Medium |
| [x] | Comparative hadith view (same hadith across collections) | IMPROVEMENT_ROADMAP.md §8.2.4 — Inline expansion of cross-references on both chapter-content and verse-detail. Click expand button to fetch and display the referenced Quran verse or hadith text + translation without navigating away. "Compare all" button on verse-detail loads all relations at once. | Medium |
| [x] | Tafsir integration (Quran commentary via free API) | FEATURE_PROPOSALS.md §5 — TafsirService using spa5k/tafsir_api CDN. 3 English editions (Ibn Kathir, al-Jalalayn, Maarif-ul-Quran). Expandable tafsir panel with edition selector on Quran verse cards. Cached per-surah with shareReplay. | Medium |
| [x] | Side-by-side translation view | IMPROVEMENT_ROADMAP.md §5.1.4 — Compare button in translation selector, second dropdown via `?translation2=` query param, grid layout in verse-text, responsive (stacks on mobile). | Medium |

### 6.2 UX Polish & Code Quality

| Status | Task | Source | Effort |
|--------|------|--------|--------|
| [x] | Font size & readability controls | IMPROVEMENT_ROADMAP.md §5.2.3 | Medium |
| [x] | Dark mode (full polish across all components) | ARCHITECTURE.md §4 aspirations | Medium |
| [x] | Keyboard shortcuts (j/k nav, / search, d dark mode, ? help) | ARCHITECTURE.md §5 aspirations | Low |
| [ ] | Sub-chapter grouping in chapter list | IMPROVEMENT_ROADMAP.md §5.1.2 — Deferred: current data has no nested sub-chapters at chapter_list level. Will be needed when more books are added with section grouping. | Medium |
| [x] | Lazy loading (PeopleModule, StaticPagesModule) | IMPROVEMENT_ROADMAP.md §6.1.1 — Reduced initial bundle from 4.11 MB to 3.96 MB with 186 KB in lazy chunks. | Medium |
| [x] | OnPush change detection | IMPROVEMENT_ROADMAP.md §6.1.2 — Already on all components via prior work. | Medium |
| [x] | Client-side caching service | IMPROVEMENT_ROADMAP.md §6.1.3 — NGXS store already caches: `state.parts[index]` check skips re-fetch. No separate CacheService needed for static data. | Low |
| [x] | Remove `any` types | IMPROVEMENT_ROADMAP.md §6.1.5 — Replaced with proper types in prior phases. | Low |
| [x] | Comprehensive Angular test suite | IMPROVEMENT_ROADMAP.md §6.1.4 — Expanded from ~19 to 347 tests (all passing). Covers AudioService (65 tests), BookmarkService (64), ThemeService, I18nService, BooksService, PeopleService, DailyVerseService, BooksState, RouterState, ErrorDisplayComponent, PathLinkComponent, BookDispatcherComponent, TranslatePipe, ExpandLanguagePipe, Book model functions. | High |

### 6.3 Developer & Infrastructure

| Status | Task | Source | Effort |
|--------|------|--------|--------|
| [x] | CI/CD pipeline (GitHub Actions) | IMPROVEMENT_ROADMAP.md §6.3.1 — `.github/workflows/ci.yml` with build, test, lint stages. | Medium |
| [x] | Automated data generation pipeline | IMPROVEMENT_ROADMAP.md §6.3.2 — GitHub Actions CI workflow for ThaqalaynDataGenerator: runs pytest, then validates data against ThaqalaynData repo using `validate_data.py`. | Medium |
| [x] | Data schema validation script | IMPROVEMENT_ROADMAP.md §6.3.3 — `validate_data.py` checks all 7,353 JSON files: wrapper structure, path format, narrator ID consistency, navigation targets, verse counts. 0 errors on full dataset. | Medium |
| [x] | JSON Schema definitions | IMPROVEMENT_ROADMAP.md §6.4.2 — JSON Schema 2020-12 definitions for response_wrapper, chapter, verse, narrator in `app/schemas/`. | Medium |
| [x] | Public API documentation | IMPROVEMENT_ROADMAP.md §6.4.1 — `API.md` in ThaqalaynData: endpoints, data models (TypeScript interfaces), path format, translation IDs, cross-references, gradings, CORS. | Medium |
| [x] | Versioned API paths | IMPROVEMENT_ROADMAP.md §6.4.3 — Netlify redirect `/v2/*` → `/:splat` in ThaqalaynData. API docs updated with versioning section. | Low |
| [x] | Downloadable data packages (JSON, CSV, SQLite) | IMPROVEMENT_ROADMAP.md §8.4.1 — Data Packages section on download page with direct download links for 4 datasets (Al-Kafi, Quran, Narrators, Translations) and CSV export for book data. | Medium |
| [x] | REST API layer (Netlify Functions) | IMPROVEMENT_ROADMAP.md §6.4.2 — Three serverless endpoints: `/api/random-hadith` (random hadith with text), `/api/stats` (collection statistics), `/api/narrator-hadiths?id=N` (paginated hadiths by narrator with optional full text). Clean URL redirects, CORS, documented in API.md. | High |

### 6.4 Community Features

| Status | Task | Source | Effort |
|--------|------|--------|--------|
| [x] | User annotations & notes (Dexie.js local) | FEATURE_PROPOSALS.md §3 — Dexie v2 schema, CRUD methods, note editor on chapter-content + verse-detail, "My Notes" section on bookmarks page, export/import support. | Medium |
| [x] | Cross-device sync (Firebase free tier, opt-in) | IMPROVEMENT_ROADMAP.md §8.3.1 — SyncService with Firebase JS SDK (dynamic imports for tree-shaking), Google + anonymous auth, push/pull/two-way sync via Firestore, status observables. Bookmarks page shows sync UI only when Firebase is configured (`projectId` set). i18n support across all 12 locales. | High |
| [x] | Discussion / commentary system (moderated) | IMPROVEMENT_ROADMAP.md §8.3.2 — DiscussionService with Firebase Firestore real-time comments. Collapsible discussion panel on verse-detail pages. Post, flag, delete comments. Scholar verification badge. Google auth. Only visible when Firebase configured. i18n across 12 locales. | High |
| [x] | Daily hadith / verse of the day | IMPROVEMENT_ROADMAP.md §8.3.3 — DailyVerseService with deterministic seed, dynamic chapter discovery, localStorage caching. Shows on homepage. | Low |
| [x] | Embeddable widgets | IMPROVEMENT_ROADMAP.md §8.4.3 — `/embed/books/:index` route with minimal card layout, theme support via `?theme=dark`, grading badges, "View on Thaqalayn" footer link. Iframe-friendly: no header/footer/breadcrumbs. | Medium |

### 6.5 Future Content Expansion

| Status | Task | Source | Effort |
|--------|------|--------|--------|
| DEPRIORITIZED | Sunni hadith collections (Sahih Bukhari, Muslim, etc.) | IMPROVEMENT_ROADMAP.md §8.1.2 — Cross-sectarian comparative resource. Many available via sunnah.com. **Decision (2026-02-23): Explicitly deprioritized by project owner. Focus remains on Shia collections.** | High |

### 6.6 AI-Assisted Features

| Status | Task | Source | Effort |
|--------|------|--------|--------|
| [x] | Full-text search across all 22 books | Extends Phase 4.1 — Expanded from 2 books (Quran, Al-Kafi) to all 22 books (38,578 documents). Dynamic book discovery via `search-meta.json`. Parallel index loading. AND search for multi-word queries (threshold:0) with OR fallback. Boost weighting (English 2x, Arabic 1.5x). Fuzzy tolerance for typos. Book filter chips on results page. Human-readable path formatting. Search tips dialog. Comprehensive Orama features reference doc (`docs/ORAMA_SEARCH_FEATURES.md`). | High |
| [ ] | Semantic search (embeddings) | IMPROVEMENT_ROADMAP.md §8.5.1 | High |
| DEPRIORITIZED | RAG chatbot for hadith Q&A | IMPROVEMENT_ROADMAP.md §8.5.3 — **Decision (2026-02-23): Deprioritized. Requires server-side LLM calls which violates the zero-ongoing-costs architectural constraint. Would need Netlify Functions + per-query API costs. Not viable with static-only architecture.** | High |

### 6.7 Mobile App

| Status | Task | Source | Effort |
|--------|------|--------|--------|
| [x] | Enhanced PWA (app-like nav, home screen) | ARCHITECTURE.md §3 — Mobile bottom navigation bar with route-aware active section tracking. Fixed-position bottom nav with Home, Books, Topics, Bookmarks icons on screens <=768px. Dark mode support, safe-area-inset for notched devices. Replaces text footer on mobile. | Medium |
| [x] | Capacitor wrapper (if app store needed) | ARCHITECTURE.md §3 — Configured Capacitor with Android/iOS platforms, splash screen, status bar, keyboard, haptics, and share plugins. Added `cap:build`, `cap:android`, `cap:sync` npm scripts. Native directories gitignored. | High |
| [ ] | Custom domain | PHASE3_FEATURE_PROPOSAL.md §8.7 | Low (~$12/yr) |
| [x] | Angular SSG/prerendering | PHASE3_FEATURE_PROPOSAL.md §8.8 — Installed `@angular/ssr`, added SSR-safe `isPlatformBrowser` guards to all services (theme, i18n, keyboard, PWA) and app component. Production-only prerendering of static routes (/, /about, /support, /download, /topics, /bookmarks, /books) with client hydration (`provideClientHydration(withEventReplay())`). | High |

---

## Phase 7: AI Content Generation & Enrichment (PLANNED)

> **Goal:** Generate AI translations, word-by-word analysis, narrator extraction with ambiguity detection, thematic tags, summaries, and similarity data for the entire corpus using Claude Opus 4.6 Batch API.
> **Status:** Planning complete. Sample generation next, then bulk pipeline.
> **Budget:** ~$14,000 available. Estimated pipeline cost: ~$3,926 (multi-language optimization, few-shot prompting, narrator analysis).
> **Full design document:** [`docs/AI_CONTENT_PIPELINE.md`](AI_CONTENT_PIPELINE.md)

### 7.1 AI Content Pipeline

| Status | Task | Description | Est. Cost |
|--------|------|-------------|-----------|
| [ ] | Upgrade `ai_translation.py` to `ai_pipeline.py` | Combined pipeline: translation + word-by-word + diacritization + tags + summaries + glossary + cross-refs + type classification + SEO questions. Manifest-based fault tolerance with checkpoint recovery. Atomic file writes. Budget guards. | — |
| [ ] | Generate review samples | 20 verses × 3 languages (Urdu, Farsi, Turkish) from Al-Kafi, Quran, Nahj al-Balaghah, Faqih. For human review before bulk generation. | ~$2 |
| [ ] | Review and approve samples | Compare AI translations with existing human translations. Verify word-by-word accuracy, tag relevance, summary quality. Iterate on prompt if needed. | — |
| [ ] | Generate Tier 1 languages (ur, tr, fa) | All 22 books + Quran. ~140,000 API calls via Opus 4.6 Batch. | ~$1,900 |
| [ ] | Generate Tier 2 languages (id, bn) | All 22 books + Quran. ~94,000 API calls. | ~$1,270 |
| [ ] | Generate Tier 3 languages (es, fr, de, ru, zh) | All 22 books + Quran. ~234,000 API calls. | ~$3,160 |
| [ ] | Validate Quran references | Check AI-suggested Quran cross-refs against actual Quran text. Classify as `explicit_verified` or `thematic_unverified`. Reject invalid refs. | — |
| [ ] | Validate Arabic roots (CAMeL Tools) | Cross-check AI-generated word roots against CAMeL Tools morphological analyzer. Flag mismatches, add `root_verified` field. | — |
| [ ] | Validation pass (all languages) | Sonnet 4.6 Batch scores each translation on accuracy, fluency, terminology, honorifics. | ~$774 |
| [ ] | Regenerate failures | Re-generate items scoring below threshold with validator feedback. Est. 5% failure rate. | ~$267 |
| [ ] | Ingest into ThaqalaynData | Merge translations into served `books/` files. Create `words/` directory for word-by-word. Update `index/translations.json`. Quran refs carry validated relationship types. | — |
| [ ] | Angular UI: AI translation badges | Show "AI Generated" indicator on translations. Display model + date in tooltip. Disclaimer on first use. | — |
| [ ] | Angular UI: diacritized text toggle | Option to view fully voweled Arabic text (AI-diacritized) vs original. Show diacritics status badge. | — |
| [ ] | Angular UI: word-by-word component | Clickable Arabic words with popover showing translation, root, POS. Reused for both Quran and hadith. | — |

### 7.2 Quran Word-by-Word (QUL Data)

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| [ ] | Download and process QUL data | Convert QUL SQLite/JSON to per-ayah word files (`words/quran/{surah}/{ayah}.json`). 6,236 files. | Medium |
| [ ] | Generate root index | Aggregate ~1,700 unique roots with meanings and occurrence counts. | Low |
| [ ] | Generate root detail pages | Per-root files with lemmas, occurrences, related roots. ~1,700 files. | Medium |
| [ ] | Angular: word-by-word verse component | Grid layout with clickable words. Toggle between reading and word-by-word views. | Medium |
| [ ] | Angular: word popover component | Tooltip: translation, root, morphology (POS, gender, number, case from QUL). | Medium |
| [ ] | Angular: root exploration pages | Route `/words/root/{root}` showing all occurrences across Quran. | High |

### 7.3 Hadith Similarity Detection

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| [ ] | Research & design similarity approach | Evaluate: TF-IDF + cosine similarity, Arabic sentence embeddings, Jaccard on normalized text, LCS-based matching. See research notes. | Medium |
| [ ] | Build similarity computation pipeline | Offline computation of pairwise similarity scores. Store as pre-computed JSON. | High |
| [ ] | Generate similarity data | Run pipeline across entire corpus. Output: per-hadith list of similar hadiths with confidence scores. | Medium |
| [ ] | Angular: similar hadiths panel | Expandable section on verse-detail showing similar hadiths across collections with diff highlighting. | Medium |

### 7.4 Source Acquisition for Four Books Completion

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| [ ] | Investigate hadith.inoor.ir API | Reverse-engineer internal REST API of the Noor hadith platform. See [`docs/RESEARCH_TAHDHIB_ISTIBSAR_SOURCES.md`](RESEARCH_TAHDHIB_ISTIBSAR_SOURCES.md). | Medium |
| [ ] | Build Tahdhib al-Ahkam parser | Parse from hadith.inoor.ir or ghbook.ir HTML/EPUB. 10 volumes, ~13,590 hadiths. | High |
| [ ] | Build al-Istibsar parser | Parse from same source. 4 volumes, ~5,511 hadiths. | High |
| [ ] | Generalize narrator extraction | Refactor `kafi_narrators.py` into shared module for different chain styles. | High |

### 7.5 Arabic Word Dictionary & Word Detail Pages

> **Goal:** Build a comprehensive Arabic word dictionary with dedicated pages for each unique word, enabling deep study of vocabulary across the entire Quran and hadith corpus. This replaces and expands the earlier "root exploration pages" concept from Phase 4.7/7.2.
>
> **Key insight:** Context-independent word attributes (root, morphological form/wazn, is_proper_noun) should NOT be generated per-verse in the AI pipeline. Instead, generate them once per unique word in a dedicated batch pass, producing richer content than what fits in a per-verse prompt.

#### Scope

**Word detail pages** (`/#/words/{word-id}`): A page for each unique Arabic word/lemma showing:
- Root and morphological form (wazn)
- Morphological breakdown (prefix-stem-suffix)
- All inflected forms of this word across the corpus
- Translations in all 11 languages
- Related words from the same root (navigate between forms)
- Occurrences across Quran and all hadith collections
- Etymology and scholarly notes

**Root index pages** (`/#/words/roots/{root}`): All words sharing a root, grouped by morphological pattern, with occurrence counts and navigation to word detail pages.

**Word-by-word verse integration**: Clickable Arabic words in verse display link to their word detail page.

#### Design Principles (requires UX research)
- **Progressive disclosure** — Don't overwhelm the user with linguistic detail upfront. Show translation and root first, expand for morphology/etymology/occurrences on demand.
- **Optimal navigation** — Easy to move between related forms (same root, different pattern) without getting lost. Breadcrumbs and back-navigation are critical.
- **Audience-aware** — Casual readers need simple translations; Arabic students need morphological detail; scholars need cross-corpus occurrence data. The page must serve all three without cluttering.
- **In-depth UX research needed** — Before implementation, research similar tools (corpus.quran.com, Aratools, Lane's Lexicon online, ejtaal.net) for navigation patterns, information hierarchy, and what works/doesn't at scale.

#### Data Pipeline

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| [ ] | Extract unique word inventory | Compute unique diacritized lemmas from all AI-generated word_analysis across the corpus. Normalize case endings to group inflected forms under one lemma. | Medium |
| [ ] | Design word dictionary schema | Define JSON structure for word detail pages: root, form/wazn, morphological breakdown, translations, related words, occurrence index. Research what attributes are most valuable. | Medium |
| [ ] | Batch AI generation for word content | Generate rich per-word content (root, form, is_proper_noun, morphological breakdown, etymology, related words) once per unique lemma via batch API. Much cheaper than per-verse. | Medium |
| [ ] | Generate root index files | Aggregate words by root. ~1,700 roots for Quran, more with hadith corpus. Per-root file with all derived words and occurrence counts. | Low |
| [ ] | Generate word detail files | Per-word JSON files with full linguistic analysis. Estimated ~5,000-10,000 unique lemmas across corpus. | Medium |

#### Angular UI

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| [ ] | UX research and design | Study existing Arabic lexicon tools for navigation patterns. Design wireframes for word detail page with progressive disclosure. User test with different audience levels. | High |
| [ ] | Word detail page component | Route `/#/words/{word-id}` showing word analysis, translations, related forms, occurrences. | High |
| [ ] | Root index page component | Route `/#/words/roots/{root}` showing all words from a root grouped by pattern. | Medium |
| [ ] | Word-by-word verse integration | Clickable Arabic words in verse display linking to word detail pages. Toggle between reading and word-by-word views. | High |
| [ ] | Word popover component | Quick-view tooltip on hover/tap: translation, root, link to full word page. | Medium |

#### Relationship to Per-Verse AI Pipeline

The per-verse AI pipeline (Phase 7.1) generates **context-dependent** word attributes only:
- `word` (diacritized surface form)
- `translation` (11-language object — meaning varies by context)
- `pos` (part of speech — varies by context)

The word dictionary pipeline generates **context-independent** attributes once per unique word:
- `root`, `form/wazn`, `is_proper_noun`, morphological breakdown, etymology, related words

This split avoids generating the same root/form thousands of times across verses and enables much richer per-word content.

> **Decision (2026-02-26):** Remove `root` and `is_proper_noun` from the per-verse AI pipeline schema before full corpus generation. These fields will be generated in the word dictionary batch pass instead. See Decision Log D030.

---

## Cost Summary

| Item | Cost | Phase |
|------|------|-------|
| ~~AI translations (10 languages, Haiku Batch)~~ | ~~$245~~ | ~~3C~~ |
| AI content pipeline (Opus 4.6 Batch — translations + word-by-word + diacritization + narrator extraction + tags + summaries for 11 languages, multi-language optimization, few-shot prompting) | ~$4,400 | 7 |
| AI word dictionary (batch generation — root, form/wazn, morphological breakdown, etymology per unique lemma, ~5-10K words) | ~$50-100 | 7 |
| AI name transliterations (4,860 names) | ~$2 | 3C |
| AI UI string translations (~50 keys × 10 langs) | ~$0.10 | 3B |
| Custom domain (annual, optional) | ~$12/yr | 6 |
| **All infrastructure** | **Free** | All |
| **Total one-time** | **~$4,565** | |

> **Budget note (2026-02-23):** Project has ~$15,000/month Anthropic API budget through end of April 2026. As of Feb 23, less than $1,000 spent this month. The Phase 7 AI pipeline is fully funded.

---

## Architectural Constraints (from ARCHITECTURE.md)

These constraints apply to ALL phases and must never be violated:

1. **Zero ongoing costs** — No servers, no paid services, no subscriptions
2. **Static JSON API** — All data served as pre-generated JSON files from Netlify CDN
3. **Build-time computation** — Complex logic runs in Python generator, not in user's browser
4. **Stable identifiers** — Verse paths, narrator IDs, and URLs are permanent once assigned
5. **UTF-8 everywhere** — Arabic text must never be escaped (`ensure_ascii=False`)
6. **Progressive enhancement** — Core reading works without search, audio, bookmarks, etc.
7. **Content integrity** — Source texts faithfully preserved; corrections separated from parsing

---

## Team Evaluation Checkpoints

At the end of each phase, evaluate:

1. **Did the team composition work?** Were there bottlenecks (too much frontend, not enough data)?
2. **Are new skills needed?** (e.g., NLP expertise for Phase 3C narrator matching, Arabic linguistics for cross-validation)
3. **Should agents be added, removed, or re-specialized?**
4. **Is the phase scope correct?** Should anything be pulled forward or deferred?
5. **What blocked progress?** Process improvements for next phase.

### Recommended team shapes by phase:

| Phase | Total | Agents | Summary |
|-------|-------|--------|---------|
| **3B** | 3 | `frontend-dev`, `data-engineer`, `data-scraper` | i18n + hadith pages + schema + scraping |
| **3C** | 4 | `frontend-dev`, `data-engineer`, `researcher`, `qa-engineer` | AI translations + cross-validation + narrators |
| **4** | 4 | `frontend-search`, `frontend-ux`, `data-engineer`, `qa-engineer` | Search + PWA + audio + mobile polish |
| **5** | 5 | `frontend-dev`, `parser-dev-1`, `parser-dev-2`, `researcher`, `qa-engineer` | Four Books + Angular 19 + additional collections |
| **6** | 3–4 | `frontend-dev`, `frontend-dev-2`*(opt)*, `data-engineer`, `qa-engineer` | Scholarly + community + infrastructure |

See the **Team Composition** section within each phase for detailed agent responsibilities and coordination notes.

---

## Document Disposition

This master roadmap **supersedes** the following documents for planning purposes. The original documents remain as detailed reference for implementation specifics:

| Document | Status | Use Going Forward |
|----------|--------|-------------------|
| IMPROVEMENT_ROADMAP.md | Superseded by this file | Historical reference for Phase 1-2 details |
| FEATURE_PROPOSALS.md | Incorporated into Phases 4-6 | Reference for implementation details (Orama config, Dexie schema, etc.) |
| OPTIMIZATION_PLAN.md | Partially completed, rest in Phase 5.4 | Reference for exact code changes |
| SCHEMA_PROPOSAL.md | Incorporated into Phase 3B.3 | Reference for data model details |
| PHASE3_FEATURE_PROPOSAL.md | Split across Phases 3A-3C and 4 | Reference for research findings and data sources |
| INDIVIDUAL_HADITH_PAGES_PROPOSAL.md | Incorporated into Phase 3B.2 | Reference for schema and component details |
| PARSER_ARCHITECTURE.md | Referenced in Phases 3B.4 and 5.1 | Reference for parser implementation |
| TEST_STRATEGY.md | Phase 1 complete | Reference for test patterns |
| QA_REPORT.md | Phase 1-2 issues resolved | Reference for remaining accessibility items |
| ARCHITECTURE.md | Active — constraints section above | Always authoritative for design decisions |

---

## Implementation Log

Documented decisions and notable bug fixes applied during development.

### Bug Fixes Applied

| Fix | Phase | Description |
|-----|-------|-------------|
| **TranslatePipe race condition** | 3B | The `TranslatePipe` was not updating the view when language strings loaded asynchronously. Fixed by adding a `stringsChanged$` observable and calling `markForCheck()` on the `ChangeDetectorRef` to trigger change detection in OnPush components. |
| **Search URL path fix** | 4 | Search result links were generating incorrect URLs. The SearchService was constructing paths that did not match the Angular router's expected format. Fixed path construction to align with the app's routing structure. |
| **PWA manifest creation** | 4 | `manifest.webmanifest` was missing or misconfigured after initial PWA setup. Created proper manifest with correct `start_url`, icons, theme color, and display mode. |
| **apple-touch-icon fix** | 4 | iOS devices were not displaying the correct icon when adding the app to the home screen. Added properly sized `apple-touch-icon` link in `index.html`. |
| **Gradings type mismatch** | 5 | `Verse.gradings` was typed as `Dict[str, str]` but kafi_sarwar.py produces `List[str]` format. Changed to `Union[Dict[str, str], List[str]]`. Updated JSON Schema to use `oneOf`. Fixed the only failing test (`test_kafi_paths.py`). |
| **Windows pipeline bugs** | 5 | Three fixes: (1) UTF-8 stdout encoding for Arabic text (`sys.stdout.reconfigure`), (2) directory-as-file PermissionError in kafi_sarwar.py, (3) glob pattern matching sibling files. Pipeline now runs end-to-end on Windows. |
| **narrator_chain.text test updates** | 5 | Data validation tests still checked for `narrator_chain.text` which was removed in Phase 2. Updated to check `narrator_chain.parts` instead. |
| **Search tips ALL CAPS** | 6 | Search tips panel inherited `text-transform: uppercase` from parent `.bannerTop` CSS. Fixed by adding `text-transform: none` to `.search-tips-panel`. |
| **Single-threaded data server** | 6 | Local dev data server (`serve.py`) used single-threaded `HTTPServer`, causing hangs when Angular sent concurrent API requests. Fixed by adding `ThreadingMixIn` for parallel request handling. |
| **Cross-reference linker propagation** | 5 | The cross-reference linker only updated complete aggregation files but not the modular verse_list/verse_detail files that the Angular app serves. Added `_propagate_to_modular_files()` to patch 79,814 modular files with relations and HTML-linked translations after cross-referencing. |
| **Cross-reference link format** | 5 | Quran reference links in translations used old hash routing format (`/#/books/quran:S#hV`). Fixed to use path routing format (`/books/quran:S#hV`) matching the app's current routing configuration. |
| **PeopleState NGXS selector guards** | 5 | PeopleState selectors (`getNarratorByIndex`, `getNarratorIndex`, etc.) lacked null guards for when state modules aren't registered in tests. Added optional chaining and null checks to all 5 selectors. |

### Deferred Decisions

| Item | Phase | Rationale |
|------|-------|-----------|
| **rafed.net scraper** | 3B | Scraper skeleton was created but full implementation deferred. The rafed.net site serves Word documents that require manual download and extraction. Automated scraping is not viable for this source format. |
| **lib.eshia.ir scraper** | 3B | Assessed as not viable for automated scraping. The source contains image scans of manuscripts rather than structured/parseable text. Would require OCR which is out of scope. |
| **Word-by-word Quran** | 4 | Deferred from Phase 4.7 to Phase 7.5 (Arabic Word Dictionary). Expanded scope: dedicated word detail pages per unique lemma, root index pages, navigation between word forms, applies to both Quran and hadith (not just Quran). Context-independent attributes (root, form/wazn, is_proper_noun) generated once per word in batch, not per-verse. Requires UX research for optimal navigation design. |
| **AI translations generation** | 3C | Pipeline script (`ai_translation.py`) is built and ready, but actual batch generation requires ~$245 in API costs. Awaiting user approval before submitting batch jobs. |
