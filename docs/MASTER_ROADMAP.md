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

---

## Phase 3B: Internationalization & Individual Pages

> **Goal:** Make the site multilingual, add individually addressable hadith pages, and begin content expansion.
> **Team evaluation:** At end of 3B, assess whether current agents are sufficient for Phase 3C's heavy data work.

### 3B.0 SEO Follow-Up (from Phase 3A)
**Source:** PHASE3_FEATURE_PROPOSAL.md §8.3, §8.6

| Task | Description | Effort |
|------|-------------|--------|
| Netlify Prerender Extension | Install free extension from Netlify marketplace. Bots get server-rendered HTML, humans get SPA. | Trivial |
| Google Search Console | Add `<meta name="google-site-verification">` to `index.html`, submit sitemap, request indexing. | Trivial |
| Fix `lang="ar"` on Arabic text | Add `lang="ar"` attribute to all Arabic text containers (`.arabic` classes). Screen readers currently mispronounce Arabic. (QA Report M1, still open) | Low |

### 3B.1 Full i18n Framework
**Source:** PHASE3_FEATURE_PROPOSAL.md §7, IMPROVEMENT_ROADMAP.md §4.2

| Task | Description | Effort |
|------|-------------|--------|
| Language persistence | `?lang=` query param + localStorage fallback. Shareable URLs preserve language. | Low |
| Runtime translation files | Create `index/ui-strings/{lang}.json` for each UI language. ~50 string keys (buttons, labels, headings, footer). | Medium |
| TranslatePipe | `{{ 'nav.home' \| translate }}` pipe using `I18nService` that loads the current language's JSON file. | Medium |
| I18nService | Loads UI strings JSON on language change, provides `get(key)` method, emits language change events. | Medium |
| Language picker | Dropdown in header (or footer) showing available UI languages. Sets `?lang=` and reloads strings. | Low |
| RTL support | When UI language is Arabic/Urdu/Farsi, set `document.documentElement.dir = 'rtl'`. Use CSS logical properties. | Medium |
| Dual-language display | Arabic text always visible. Second language is user's chosen language (not hardcoded English). | Medium |
| Fix ExpandLanguagePipe | Extend `expand-language.pipe.ts` to include all supported language codes dynamically (currently only en/ar/fa). | Low |
| AI UI translations | Generate `ui-strings/{lang}.json` for 10 languages via Claude Haiku Batch (~$0.10 total). | Low |

### 3B.2 Individual Hadith/Verse Pages
**Source:** INDIVIDUAL_HADITH_PAGES_PROPOSAL.md

| Task | Description | Effort |
|------|-------------|--------|
| Add `verse_detail` kind to Angular Book type | Extend discriminated union in `book.ts` | Low |
| Generator: per-hadith JSON files | Write `books/{book}/{...}/{verse}.json` with verse data + chapter context + nav | Medium |
| VerseDetailComponent | Single-hadith view: large Arabic text, translations, narrator chain, gradings, cross-refs, share button | Medium |
| Chapter view link icons | Add link icon per hadith pointing to individual page | Low |
| SeoService: verse_detail meta | Rich meta/JSON-LD for individual hadith pages | Low |
| Sitemap: include hadith URLs | Update generator script to add ~46,500 new URLs | Low |
| E2E tests for hadith pages | Deep-link, content, navigation, share | Low |

### 3B.3 Schema Evolution
**Source:** SCHEMA_PROPOSAL.md §2

| Task | Description | Effort |
|------|-------------|--------|
| Gradings field (`Dict[str,str]`) | Populate from ThaqalaynAPI data (majlisi, mohseni, behbudi). Display with color-coded badges. | Medium |
| Book registry (`book_registry.py`) | Declarative book config. New books = registry entry + parser function. No main_add.py changes. | Medium |
| Book metadata | Author, translator, source URL per book. Display on book landing pages. | Low |
| PartType: add `Section` | ThaqalaynAPI books have sections within volumes. | Low |
| `source_url` on Verse | Link back to source site per hadith. | Low |
| French language support | Add `FR` to Language enum, register French translations from ThaqalaynAPI `frenchText` field. Angular already handles arbitrary languages. | Low |

### 3B.4 Data Scraping (parallel with above)
**Source:** PARSER_ARCHITECTURE.md, DataGatherer research

| Task | Description | Effort |
|------|-------------|--------|
| ThaqalaynAPI parser (`thaqalayn_api.py`) | Generic parser for all 21+ ThaqalaynAPI books. JSON→our schema transformer. | Medium |
| Register ThaqalaynAPI books | Add all 21 books to book_registry.py, generate data. | Medium |
| rafed.net Arabic text downloader | Download Word files for Four Books via API. Extract Arabic text. | High |
| lib.eshia.ir Arabic text scraper | Scrape structured Arabic text for cross-validation. | Medium |

---

## Phase 3C: Scholarly Features & Content

> **Goal:** AI translations, cross-validation pipeline, narrator biographies.
> **Team evaluation:** At end of 3C, assess readiness for Phase 4's advanced features.

### 3C.1 AI-Powered Translations
**Source:** PHASE3_FEATURE_PROPOSAL.md §2

| Task | Description | Effort | Cost |
|------|-------------|--------|------|
| Translation pipeline script | Batch script sending Arabic+English to Claude Haiku Batch API, outputs per-verse translations. | Medium | - |
| Generate 5 priority languages | Urdu, Turkish, Farsi, Indonesian, Bengali | Medium | ~$122 |
| Generate 5 additional languages | Spanish, French, German, Russian, Chinese | Medium | ~$123 |
| Quality review process | Sample-based review per language. Mark as "AI-generated" with disclaimer. | Medium | - |
| Translation ingestion | Script to merge new translation files into existing verse data. | Medium | - |

### 3C.2 Arabic Text Cross-Validation
**Source:** PHASE3_FEATURE_PROPOSAL.md §6

| Task | Description | Effort |
|------|-------------|--------|
| Build normalization engine | Strip tashkeel, normalize hamza/teh marbuta/alef maksura, remove tatweel. | Medium |
| 3-tier comparison | Exact → diacritics-only → substantive differences. Confidence scoring. | High |
| Validation data files | `validation/{book}.json` or inline in per-hadith files. | Medium |
| Angular: verification badges | Trust indicators on hadith pages: "Verified from 2 sources" / "Unverified". | Medium |
| Angular: diff viewer | Collapsible panel showing character-level differences between sources. | Medium |

### 3C.3 Narrator Improvements
**Source:** PHASE3_FEATURE_PROPOSAL.md §3

| Task | Description | Effort |
|------|-------------|--------|
| WikiShia scraper | MediaWiki API scraper for narrator biographies (est. 500-1,000 matches). | Medium |
| Name matching pipeline | 5-step approach: exact match, normalized match, fuzzy match, manual mapping, AI-assisted. | High |
| AI name transliterations | Generate English transliterations for 4,860 Arabic names via Haiku Batch (~$2). | Low |
| Readable hadith references | Replace raw paths with human-readable references on narrator pages. | Medium |
| Biography display | Birth/death, era, reliability, teachers/students, summary on narrator detail pages. | Medium |

---

## Phase 4: Search, PWA & UX Enhancement

> **Goal:** Most-requested features: full-text search, offline support, bookmarks.
> **Team evaluation:** At end of Phase 4, assess readiness for Phase 5's expansion work.

### 4.0 Error Handling & Resilience
**Source:** IMPROVEMENT_ROADMAP.md §2.1.2

| Task | Description | Effort |
|------|-------------|--------|
| ErrorInterceptor | Global HTTP error capture (`src/app/services/error.interceptor.ts`). | Low |
| Timeout & retry | Add `timeout(30000)` and `retry({ count: 2, delay: 1000 })` to `BooksService.getPart()` and `PeopleService.getNarrator()`. | Low |
| Loading/error state in NGXS | Add `loading` and `errors` fields to `BooksStateModel`. Components show spinner/retry UI. | Medium |
| Error display component | "Failed to load chapter. Retry?" component for user feedback on network failures. | Medium |

### 4.1 Full-Text Search
**Source:** FEATURE_PROPOSALS.md §1

| Task | Description | Effort |
|------|-------------|--------|
| Build-time Orama indexes | Generate per-book split indexes at build time (titles ~100KB, per-book corpus ~5-10 MB each). | High |
| Arabic normalization in indexer | Same normalization as navigation search, applied to index content. | Medium |
| Search UI component | Search bar in header, results page with highlighted matches grouped by book. | High |
| Lazy-load indexes | Load titles index immediately (~100 KB), full-text index on demand. | Medium |

### 4.2 Offline / PWA Support
**Source:** FEATURE_PROPOSALS.md §2

| Task | Description | Effort |
|------|-------------|--------|
| `ng add @angular/pwa` | Service worker for app shell caching. | Low |
| Cache-on-read strategy | Cache visited JSON files for offline re-reading. | Medium |
| "Download for offline" per book | Store selected book data in IndexedDB for full offline access. | Medium |
| Install prompt | "Add to Home Screen" prompt for mobile users. | Low |

### 4.3 Bookmarks & Reading Progress
**Source:** FEATURE_PROPOSALS.md §3

| Task | Description | Effort |
|------|-------------|--------|
| Dexie.js integration | IndexedDB wrapper for local storage of bookmarks, notes, progress. | Medium |
| Bookmark any verse/hadith | One-click bookmark with category tagging. | Medium |
| Reading progress tracking | Auto-save last position per book, "Continue reading" on homepage. | Medium |
| Export/import bookmarks | JSON export for backup/sharing. | Low |

### 4.4 Audio Recitation (Quran)
**Source:** FEATURE_PROPOSALS.md §4

| Task | Description | Effort |
|------|-------------|--------|
| EveryAyah integration | Per-verse audio using `everyayah.com` free MP3 files. | Medium |
| Audio player component | Play/pause, continuous playback through surah, reciter selection. | Medium |
| Keyboard/screen reader controls | Accessible audio playback. | Low |

### 4.5 Social Sharing
**Source:** FEATURE_PROPOSALS.md §6, INDIVIDUAL_HADITH_PAGES_PROPOSAL.md

| Task | Description | Effort |
|------|-------------|--------|
| Share button on hadith pages | `navigator.share()` on mobile, copy-to-clipboard on desktop. | Low |
| Verse card images | Client-side generated share images with Arabic calligraphy. | Medium |

### 4.6 Responsive Design & Mobile Polish
**Source:** IMPROVEMENT_ROADMAP.md §5.3.1, QA_REPORT.md L2

| Task | Description | Effort |
|------|-------------|--------|
| Mobile viewport audit | Test all pages at 320px, 375px, 414px. Fix layout issues. | Medium |
| Fix "Mentioned In" link clipping | Cross-reference links truncated at 360px viewport (QA Report L2). Allow text wrapping or smaller font. | Low |
| Touch-friendly navigation | Swipe gestures for next/prev chapter on mobile. | Medium |
| Browser language auto-detection | On first visit, detect `navigator.language` and set default UI + translation language. | Low |

### 4.7 Word-by-Word Quran
**Source:** PHASE3_FEATURE_PROPOSAL.md §1

| Task | Description | Effort |
|------|-------------|--------|
| QUL data processing | Convert SQLite/JSON to per-ayah word files (`words/quran/{surah}/{ayah}.json`). | Medium |
| Word popover component | Click any Arabic word → translation, root, morphology. | High |
| Root exploration pages | Click root → all occurrences across Quran. | High |

---

## Phase 5: Platform Expansion

> **Goal:** Complete all Four Books, add additional collections, modernize the stack.
> **Team evaluation:** At end of Phase 5, assess whether the platform is ready for community features.

### 5.1 Complete the Four Books
**Source:** IMPROVEMENT_ROADMAP.md §3, PARSER_ARCHITECTURE.md

| Task | Description | Effort |
|------|-------------|--------|
| Man La Yahduruhu al-Faqih parser | ThaqalaynAPI JSON source (5 vols, Arabic+English). Use generic `thaqalayn_api.py`. | Medium |
| Tahdhib al-Ahkam parser | ghbook.ir HTML/EPUB source (10 vols, Arabic). rafed.net Word for cross-reference. | High |
| al-Istibsar parser | ghbook.ir HTML/EPUB source (4 vols, Arabic). No English translation available. | High |
| Generalize narrator extraction | Refactor `kafi_narrators.py` into shared module. Different books have different chain styles. | High |
| Cross-reference linker for all books | Extend `link_quran_kafi.py` to `link_books.py` — bidirectional refs across all books. | Medium |

### 5.2 Additional Hadith Collections
**Source:** IMPROVEMENT_ROADMAP.md §8.1

| Book | Author | Source | Priority |
|------|--------|--------|----------|
| Nahj al-Balaghah | Al-Sharif al-Radi | ThaqalaynAPI | High |
| Tuhaf al-Uqul | Ibn Shuba Harrani | ThaqalaynAPI | Medium |
| Al-Amali (Tusi/Saduq/Mufid) | Various | ThaqalaynAPI | Medium |
| Uyun Akhbar al-Ridha | Shaykh Saduq | ThaqalaynAPI | Medium |
| Kamil al-Ziyarat | Ibn Qulawayh | ThaqalaynAPI | Low |
| Others (30+ books) | Various | ThaqalaynAPI / mirrors | Low |

### 5.3 Angular 19 Upgrade
**Source:** IMPROVEMENT_ROADMAP.md §2, ARCHITECTURE.md §11

| Task | Description | Effort |
|------|-------------|--------|
| Angular 19 upgrade | Standalone components, improved signals, hydration support. | High |
| NgModule → standalone migration | Simplifies module tree, enables better tree-shaking. | High |
| Resolve remaining npm vulnerabilities | Angular 19.2.16+ fixes XSS and XSRF advisories. | Medium |
| Remove `--openssl-legacy-provider` | Should be resolved with updated webpack/Angular build. | Low |

### 5.5 Generator Quality
**Source:** IMPROVEMENT_ROADMAP.md §2.2, §6.2

| Task | Description | Effort |
|------|-------------|--------|
| Externalize configuration | Create `config.py`/`config.yaml` for book indices, paths, source directories. Currently hard-coded across files. | Medium |
| Fix platform-specific file paths | Replace Windows backslashes with `pathlib.Path` or `os.path.join()` for cross-platform compatibility. | Low |
| DRY refactoring | Extract shared translation ID formatting, path conversion logic, chapter loading patterns into utilities. Use `BookParser` base class. | Medium |
| Python type hints + mypy | Add complete type annotations to all public functions. Add `mypy` to CI pipeline. | Medium |
| Increase parser test coverage | Add parser-level integration tests for `quran.py`, `kafi.py`, `kafi_sarwar.py` (correct verse/chapter counts, translation pairing, malformed HTML handling). | Medium |

### 5.4 Data Optimization (remaining)
**Source:** OPTIMIZATION_PLAN.md, SCHEMA_PROPOSAL.md

| Task | Description | Savings | Effort |
|------|-------------|---------|--------|
| Extract verse_translations to shared file | One translations metadata file per book, not per chapter. | ~5 MB | Medium |
| Index file splitting for scalability | Per-book index files when 30+ books are added. | Scalability | Medium |
| Field name shortening (optional) | Rename long field names (e.g., `indexed_titles`→`it`). | ~20 MB | High (invasive) |
| Brotli pre-compression | Pre-compress large JSON files for faster CDN delivery. | Transfer savings | Low |

---

## Phase 6: Community & Advanced Features

> **Goal:** Features for scholarly use, community engagement, and developer access.

### 6.1 Scholarly Features

| Task | Source | Effort |
|------|--------|--------|
| Hadith grading system with filtering | IMPROVEMENT_ROADMAP.md §8.2.1 | High |
| Thematic tagging & topic index | IMPROVEMENT_ROADMAP.md §8.2.3 | Medium |
| Comparative hadith view (same hadith across collections) | IMPROVEMENT_ROADMAP.md §8.2.4 | Medium |
| Tafsir integration (Quran commentary via free API) | FEATURE_PROPOSALS.md §5 | Medium |
| Side-by-side translation view | IMPROVEMENT_ROADMAP.md §5.1.4 | Medium |

### 6.2 UX Polish & Code Quality

| Task | Source | Effort |
|------|--------|--------|
| Font size & readability controls | IMPROVEMENT_ROADMAP.md §5.2.3 | Medium |
| Dark mode | ARCHITECTURE.md §4 aspirations | Medium |
| Keyboard shortcuts (j/k nav, / search) | ARCHITECTURE.md §5 aspirations | Low |
| Sub-chapter grouping in chapter list | IMPROVEMENT_ROADMAP.md §5.1.2 | Medium |
| Lazy loading (feature modules) | IMPROVEMENT_ROADMAP.md §6.1.1 | Medium |
| OnPush change detection | IMPROVEMENT_ROADMAP.md §6.1.2 — Add to all components receiving data via `@Input()` or NGXS selectors. | Medium |
| Client-side caching service | IMPROVEMENT_ROADMAP.md §6.1.3 — Ensure resolvers check NGXS store before re-fetching. Optional `CacheService` with TTL. | Low |
| Remove `any` types | IMPROVEMENT_ROADMAP.md §6.1.5 — Replace 4+ instances of `any` with proper types or `unknown` + type guards. | Low |
| Comprehensive Angular test suite | IMPROVEMENT_ROADMAP.md §6.1.4 — Target 70%+ coverage: service tests, component tests, NGXS state tests. | High |

### 6.3 Developer & Infrastructure

| Task | Source | Effort |
|------|--------|--------|
| CI/CD pipeline (GitHub Actions) | IMPROVEMENT_ROADMAP.md §6.3.1 | Medium |
| Automated data generation pipeline | IMPROVEMENT_ROADMAP.md §6.3.2 | Medium |
| Data schema validation script | IMPROVEMENT_ROADMAP.md §6.3.3 — Post-generation validation: JSON validity, path resolution, narrator ID consistency, verse counts. | Medium |
| JSON Schema definitions | IMPROVEMENT_ROADMAP.md §6.4.2 | Medium |
| Public API documentation | IMPROVEMENT_ROADMAP.md §6.4.1 | Medium |
| Versioned API paths | IMPROVEMENT_ROADMAP.md §6.4.3 — Add `/v2/` prefix to API paths for backward-compatible schema evolution. | Low |
| Downloadable data packages (JSON, CSV, SQLite) | IMPROVEMENT_ROADMAP.md §8.4.1 | Medium |
| REST/GraphQL API layer | IMPROVEMENT_ROADMAP.md §6.4.2 — Thin API via Netlify Functions for queries like "all hadiths by narrator X about topic Y". | High |

### 6.4 Community Features

| Task | Source | Effort |
|------|--------|--------|
| User annotations & notes (Dexie.js local) | FEATURE_PROPOSALS.md §3 | Medium |
| Cross-device sync (Firebase free tier, opt-in) | IMPROVEMENT_ROADMAP.md §8.3.1 | High |
| Discussion / commentary system (moderated) | IMPROVEMENT_ROADMAP.md §8.3.2 | High |
| Daily hadith / verse of the day | IMPROVEMENT_ROADMAP.md §8.3.3 | Low |
| Embeddable widgets | IMPROVEMENT_ROADMAP.md §8.4.3 | Medium |

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

| Task | Source | Effort |
|------|--------|--------|
| Enhanced PWA (app-like nav, home screen) | ARCHITECTURE.md §3 | Medium |
| Capacitor wrapper (if app store needed) | ARCHITECTURE.md §3 | High |
| Custom domain | PHASE3_FEATURE_PROPOSAL.md §8.7 | Low (~$12/yr) |
| Angular SSG/prerendering | PHASE3_FEATURE_PROPOSAL.md §8.8 | High |

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

| Phase | Frontend | Data/Generator | Research | QA |
|-------|----------|---------------|----------|-----|
| **3B** | 1 (i18n + hadith pages + SEO follow-up) | 1 (schema + parser + French support) | 1 (data scraping) | — |
| **3C** | 1 (cross-validation UI + narrator UI) | 1 (translation pipeline + validation engine) | 1 (WikiShia + name matching) | 1 (regression) |
| **4** | 2 (search UI + PWA + audio + error handling + mobile polish) | 1 (search indexes + word data) | — | 1 |
| **5** | 1 (Angular 19 upgrade) | 2 (Four Books parsers + narrator generalization + generator quality) | 1 (source acquisition) | 1 |
| **6** | 1-2 (community features + code quality) | 1 (data packages + API + schema validation) | — | 1 |

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
