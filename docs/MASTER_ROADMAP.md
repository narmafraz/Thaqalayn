# Master Roadmap

> **Last updated:** 2026-02-21
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
| [ ] | Netlify Prerender Extension | Install free extension from Netlify marketplace. Bots get server-rendered HTML, humans get SPA. Not yet deployed. | Trivial |
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

## Phase 3C: Scholarly Features & Content (COMPLETE ~85%)

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

| Status | Task | Description | Effort | Cost |
|--------|------|-------------|--------|------|
| [x] | Translation pipeline script | `ai_translation.py` — batch script sending Arabic+English to Claude Haiku Batch API, outputs per-verse translations. | Medium | - |
| [ ] | Generate 5 priority languages | Urdu, Turkish, Farsi, Indonesian, Bengali — not yet generated, requires ~$122 API costs. | Medium | ~$122 |
| [ ] | Generate 5 additional languages | Spanish, French, German, Russian, Chinese — not yet generated, requires ~$123 API costs. | Medium | ~$123 |
| [ ] | Quality review process | Sample-based review per language. Mark as "AI-generated" with disclaimer. Blocked on translation generation. | Medium | - |
| [ ] | Translation ingestion | Script to merge new translation files into existing verse data. Blocked on translation generation. | Medium | - |

### 3C.2 Arabic Text Cross-Validation

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| [x] | Build normalization engine | `arabic_normalization.py` — strips tashkeel, normalizes hamza/teh marbuta/alef maksura, removes tatweel. | Medium |
| [x] | 3-tier comparison | Exact → diacritics-only → substantive differences. Confidence scoring. | High |
| [ ] | Validation data files | `validation/{book}.json` or inline in per-hadith files. Not yet generated. | Medium |
| [x] | Angular: verification badges | Verification badge infrastructure built. Trust indicators on hadith pages. | Medium |
| [ ] | Angular: diff viewer | Collapsible panel showing character-level differences between sources. Not yet built. | Medium |

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
| [x] | Build-time Orama indexes | Generated per-book split indexes at build time (titles ~100KB, per-book corpus ~5-10 MB each). | High |
| [x] | Arabic normalization in indexer | Same normalization as navigation search, applied to index content. | Medium |
| [x] | Search UI component | SearchService with Orama, search bar in header, results page with highlighted matches grouped by book. Includes URL path fix. | High |
| [x] | Lazy-load indexes | Loads titles index immediately (~100 KB), full-text index on demand. | Medium |

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

## Phase 5: Platform Expansion (COMPLETE ~60%)

> **Goal:** Complete all Four Books, add additional collections, modernize the stack.
> **Status:** Angular 19 upgrade complete (19.2.x with NGXS 19). ThaqalaynAPI data scraped for 20+ books (registered in Phase 3B.4). No Tahdhib/Istibsar parsers (different sources needed). No generator quality improvements done.
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

| Task | Description | Effort |
|------|-------------|--------|
| Man La Yahduruhu al-Faqih parser | ThaqalaynAPI JSON source (5 vols, Arabic+English). Use generic `thaqalayn_api.py`. | Medium |
| Tahdhib al-Ahkam parser | ghbook.ir HTML/EPUB source (10 vols, Arabic). rafed.net Word for cross-reference. | High |
| al-Istibsar parser | ghbook.ir HTML/EPUB source (4 vols, Arabic). No English translation available. | High |
| Generalize narrator extraction | Refactor `kafi_narrators.py` into shared module. Different books have different chain styles. | High |
| Cross-reference linker for all books | Extend `link_quran_kafi.py` to `link_books.py` — bidirectional refs across all books. | Medium |

### 5.2 Additional Hadith Collections

| Book | Author | Source | Priority |
|------|--------|--------|----------|
| Nahj al-Balaghah | Al-Sharif al-Radi | ThaqalaynAPI | High |
| Tuhaf al-Uqul | Ibn Shuba Harrani | ThaqalaynAPI | Medium |
| Al-Amali (Tusi/Saduq/Mufid) | Various | ThaqalaynAPI | Medium |
| Uyun Akhbar al-Ridha | Shaykh Saduq | ThaqalaynAPI | Medium |
| Kamil al-Ziyarat | Ibn Qulawayh | ThaqalaynAPI | Low |
| Others (30+ books) | Various | ThaqalaynAPI / mirrors | Low |

### 5.3 Angular 19 Upgrade

| Task | Description | Effort |
|------|-------------|--------|
| Angular 19 upgrade | Standalone components, improved signals, hydration support. | High |
| NgModule → standalone migration | Simplifies module tree, enables better tree-shaking. | High |
| Resolve remaining npm vulnerabilities | Angular 19.2.16+ fixes XSS and XSRF advisories. | Medium |
| Remove `--openssl-legacy-provider` | Should be resolved with updated webpack/Angular build. | Low |

### 5.5 Generator Quality

| Task | Description | Effort |
|------|-------------|--------|
| Externalize configuration | Create `config.py`/`config.yaml` for book indices, paths, source directories. Currently hard-coded across files. | Medium |
| Fix platform-specific file paths | Replace Windows backslashes with `pathlib.Path` or `os.path.join()` for cross-platform compatibility. | Low |
| DRY refactoring | Extract shared translation ID formatting, path conversion logic, chapter loading patterns into utilities. Use `BookParser` base class. | Medium |
| Python type hints + mypy | Add complete type annotations to all public functions. Add `mypy` to CI pipeline. | Medium |
| Increase parser test coverage | Add parser-level integration tests for `quran.py`, `kafi.py`, `kafi_sarwar.py` (correct verse/chapter counts, translation pairing, malformed HTML handling). | Medium |

### 5.4 Data Optimization (remaining)

| Task | Description | Savings | Effort |
|------|-------------|---------|--------|
| Extract verse_translations to shared file | One translations metadata file per book, not per chapter. | ~5 MB | Medium |
| Index file splitting for scalability | Per-book index files when 30+ books are added. | Scalability | Medium |
| Field name shortening (optional) | Rename long field names (e.g., `indexed_titles`→`it`). | ~20 MB | High (invasive) |
| Brotli pre-compression | Pre-compress large JSON files for faster CDN delivery. | Transfer savings | Low |

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
| [ ] | Cross-device sync (Firebase free tier, opt-in) | IMPROVEMENT_ROADMAP.md §8.3.1 | High |
| [ ] | Discussion / commentary system (moderated) | IMPROVEMENT_ROADMAP.md §8.3.2 | High |
| [x] | Daily hadith / verse of the day | IMPROVEMENT_ROADMAP.md §8.3.3 — DailyVerseService with deterministic seed, dynamic chapter discovery, localStorage caching. Shows on homepage. | Low |
| [x] | Embeddable widgets | IMPROVEMENT_ROADMAP.md §8.4.3 — `/embed/books/:index` route with minimal card layout, theme support via `?theme=dark`, grading badges, "View on Thaqalayn" footer link. Iframe-friendly: no header/footer/breadcrumbs. | Medium |

### 6.5 Future Content Expansion

| Task | Source | Effort |
|------|--------|--------|
| Sunni hadith collections (Sahih Bukhari, Muslim, etc.) | IMPROVEMENT_ROADMAP.md §8.1.2 — Cross-sectarian comparative resource. Many available via sunnah.com. | High |

### 6.6 AI-Assisted Features

| Task | Source | Effort |
|------|--------|--------|
| Semantic search (embeddings) | IMPROVEMENT_ROADMAP.md §8.5.1 | High |
| RAG chatbot for hadith Q&A | IMPROVEMENT_ROADMAP.md §8.5.3 | High |

### 6.7 Mobile App

| Status | Task | Source | Effort |
|--------|------|--------|--------|
| [x] | Enhanced PWA (app-like nav, home screen) | ARCHITECTURE.md §3 — Mobile bottom navigation bar with route-aware active section tracking. Fixed-position bottom nav with Home, Books, Topics, Bookmarks icons on screens <=768px. Dark mode support, safe-area-inset for notched devices. Replaces text footer on mobile. | Medium |
| [ ] | Capacitor wrapper (if app store needed) | ARCHITECTURE.md §3 | High |
| [ ] | Custom domain | PHASE3_FEATURE_PROPOSAL.md §8.7 | Low (~$12/yr) |
| [ ] | Angular SSG/prerendering | PHASE3_FEATURE_PROPOSAL.md §8.8 | High |

---

## Cost Summary

| Item | Cost | Phase |
|------|------|-------|
| AI translations (10 languages, Haiku Batch) | ~$245 | 3C |
| AI name transliterations (4,860 names) | ~$2 | 3C |
| AI UI string translations (~50 keys × 10 langs) | ~$0.10 | 3B |
| Custom domain (annual, optional) | ~$12/yr | 6 |
| **All infrastructure** | **Free** | All |
| **Total one-time** | **~$247** | |

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

### Deferred Decisions

| Item | Phase | Rationale |
|------|-------|-----------|
| **rafed.net scraper** | 3B | Scraper skeleton was created but full implementation deferred. The rafed.net site serves Word documents that require manual download and extraction. Automated scraping is not viable for this source format. |
| **lib.eshia.ir scraper** | 3B | Assessed as not viable for automated scraping. The source contains image scans of manuscripts rather than structured/parseable text. Would require OCR which is out of scope. |
| **Word-by-word Quran** | 4 | Deferred from Phase 4.7 to a later phase. Requires significant effort (QUL SQLite conversion, word popover component, root exploration pages) with lower user-facing priority compared to search, PWA, bookmarks, and audio features. |
| **AI translations generation** | 3C | Pipeline script (`ai_translation.py`) is built and ready, but actual batch generation requires ~$245 in API costs. Awaiting user approval before submitting batch jobs. |
