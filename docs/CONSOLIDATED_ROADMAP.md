# Consolidated Roadmap

> **Created:** 2026-03-15
> **Last updated:** 2026-04-24 (added SEO section — see `SEO_ROADMAP.md` for full detail)
> **Last verified against source code:** 2026-03-15
> **Purpose:** Single source of truth for all outstanding work across the Thaqalayn ecosystem.
> Collates unfinished items from all prior roadmaps and proposals into one prioritized list.
> All status assessments verified against actual source code, not documentation.
>
> **Source documents reviewed:** All 32 docs in `docs/` — see `_DOC_INDEX.md` for full inventory and status of each.
>
> **Completed work is NOT listed here.** See `MASTER_ROADMAP.md` (Phase 1-2) and `_DOC_INDEX.md` for historical context.

---

## Priority 1: AI Content Pipeline — Complete Corpus Generation

**Goal:** Generate AI content for all ~58,000 hadith (currently ~3,686 done, ~6.4%).

**Source docs:** `PIPELINE_OPTIMIZATION_PLAN.md` (2026-03-13, primary), `AI_PIPELINE_V3_PLAN.md`, `BENCHMARK_SAMPLE.md`, `BENCHMARK_INSTRUCTIONS.md`

### 1.1 Complete OpenAI Benchmarks

| Item | Status | Source |
|------|--------|--------|
| GPT-5.4 benchmark (15 verses) | **DONE** — 85% pass, $1.46 | BENCHMARK_SAMPLE.md |
| GPT-5.2 benchmark (128K output) | **PENDING** — may handle long verses | BENCHMARK_INSTRUCTIONS.md |
| GPT-5 benchmark | **1/15 done** | BENCHMARK_INSTRUCTIONS.md |
| GPT-5-mini re-test with optimizations | **PENDING** | BENCHMARK_INSTRUCTIONS.md |
| Claude baseline (4 missing verses) | **PENDING** (~$6) | BENCHMARK_INSTRUCTIONS.md |
| Cross-model comparison analysis | **PENDING** — blocked on above | BENCHMARK_INSTRUCTIONS.md |

### 1.2 Implement Multi-Phase Pipeline Architecture

From `PIPELINE_OPTIMIZATION_PLAN.md` — the recommended approach based on benchmark data.

**Code verified (2026-03-15):** Phased pipeline modules already exist in `app/pipeline_cli/`:
- `phased_prompts.py` — Phase-specific prompts
- `programmatic_enrichment.py` — Phase 2 deterministic enrichment
- `scholarly_phase.py` — Phase 3 scholarly content
- `translation_phase.py` — Phase 4 translation
- Pipeline supports `--phased` flag

| Phase | Description | Model | Est. Cost | Status |
|-------|-------------|-------|-----------|--------|
| Phase 0 | Narrator bios (4,629 canonical) | Claude CLI | ~$750 | NOT STARTED |
| Phase 0 | Train topic/tag classifier | Local | $0 | NOT STARTED |
| Phase 0 | Validate CAMeL Tools POS | Local | $0 | NOT STARTED |
| Phase 0 | Build explicit Quran ref index | Local | $0 | NOT STARTED |
| Phase 1 | Core generation (diacritics, chunks, EN translation, summary) | GPT-5.4 API | ~$2,320 | CODE EXISTS — needs production run |
| Phase 2 | Programmatic enrichment (narrators, POS, topics, key terms) | Local code | $0 | CODE EXISTS — needs production run |
| Phase 3 | Scholarly enrichment (optional) | Claude CLI | ~$8,700 | CODE EXISTS — needs production run |
| Phase 4 | Multi-language translation (10 langs) | GPT-5-mini | ~$870 | CODE EXISTS — needs production run |

### 1.3 Pipeline Technical Debt

From `AI_PIPELINE_V3_PLAN.md`:

| Item | Status | Notes |
|------|--------|-------|
| Chunked processing in pipeline CLI | NOT DONE | ~1,300 long hadiths (3.4%) can't process without this |
| Prompt archiving | NOT DONE | Save prompts for full audit trail |
| Structured event log file | NOT DONE | Console-only logging currently |
| Cumulative token/cost tracking | NOT DONE | Only per-call `--max-budget-usd` |
| `reprocess` command | NOT DONE | Re-run postprocessing on raw responses |

### 1.4 Chapter Name Translations

From `CHAPTER_TRANSLATION_GAP.md`:

- 7,798 chapter/book names × 8 missing languages = ~62,400 translations
- Cost: ~$6 via GPT-5-mini batch
- Requires: new `books.{lang}.json` index files + Angular `MultiLingualText` update
- Should ship alongside verse AI content

---

## Priority 2: Frontend — i18n & Accessibility Completion

**Goal:** Complete internationalization and fix accessibility gaps identified in UX reviews.

**Source docs:** `UX_REVIEW_2026_03_10.md`, `UI_IMPROVEMENT_ROADMAP.md`, `UX_REVIEW_REPORTS.md`

### 2.1 i18n Critical Issues

| Item | Severity | Source | Status |
|------|----------|--------|--------|
| `?lang=` URL parameter ignored on fresh sessions — breaks link sharing | CRITICAL | UX_REVIEW_REPORTS §3 | **NEEDS INVESTIGATION** — worker-p2 assessed but may need deeper routing fix |
| Missing `books.{lang}.json` for 8 languages — causes "undefined undefined" | CRITICAL | UX_REVIEW_REPORTS §3 | **OUTSTANDING** — requires generator-side changes to produce index files |
| About + Support pages entirely hardcoded in English | HIGH | UX_REVIEW_2026_03_10 D-01 | **OUTSTANDING** |
| AI Settings panel labels hardcoded in English (7 strings) | HIGH | UX_REVIEW_2026_03_10 D-02 | **OUTSTANDING** |
| Verse-detail section headers hardcoded ("Quran References", etc.) | HIGH | UX_REVIEW_2026_03_10 D-03 | **OUTSTANDING** |
| Topics page tabs/content hardcoded | HIGH | UX_REVIEW_2026_03_10 D-04 | **OUTSTANDING** |
| Phrase list page entirely hardcoded | HIGH | UX_REVIEW_2026_03_10 D-05 | **OUTSTANDING** |
| ~20 raw i18n keys leak as visible text | HIGH | UX_REVIEW_REPORTS §3 | **OUTSTANDING** |
| ~15 hardcoded English content labels (Summary, Key Terms, etc.) | MEDIUM | UI_REVIEW_DETAILS.md | **OUTSTANDING** |
| AI toggle aria-labels hardcoded in English | HIGH | UX_REVIEW_2026_03_10 D-08 | **DONE** (commit `4eff213`) — replaced with translated strings |
| Settings close + book-tree tooltips hardcoded | MEDIUM | UX_REVIEW_2026_03_10 | **DONE** (commit `e0ca470`) — i18n keys added to all 12 locales |

### 2.2 Accessibility Issues

| Item | Severity | Source | Status |
|------|----------|--------|--------|
| AI toggle buttons too small for touch on mobile (~20px) | HIGH | UX_REVIEW_2026_03_10 M-01 | **DONE** (commit `4eff213`) — padding increased to 6px with flexbox centering |
| Topic category headers used as buttons without ARIA role | HIGH | UX_REVIEW_2026_03_10 A-01 | **OUTSTANDING** |
| AI settings checkboxes lack proper label pairing | HIGH | UX_REVIEW_2026_03_10 A-02 | **DONE** (commit `4eff213`) — explicit id/for pairing added |
| Discussion section toggle lacks ARIA attributes | MEDIUM | UX_REVIEW_2026_03_10 A-03 | **OUTSTANDING** |
| Embed verse component lacks dynamic lang attributes | MEDIUM | UX_REVIEW_2026_03_10 A-04 | **DONE** (commit `4eff213`) — dynamic lang attributes added |
| Search dropdown missing ARIA selected state / keyboard nav | MEDIUM | UX_REVIEW_2026_03_10 A-05 | **OUTSTANDING** |
| Narrator sort headers lack accessible names (known issue) | LOW | QA_REPORT.md | **OUTSTANDING** |

### 2.3 Mobile Issues

| Item | Severity | Source | Status |
|------|----------|--------|--------|
| Word-analysis popup may overflow viewport on mobile | HIGH | UX_REVIEW_2026_03_10 M-02 | **OUTSTANDING** |
| Mobile menu lacks AI settings | MEDIUM | UX_REVIEW_2026_03_10 M-03 | **OUTSTANDING** |
| ~~Bottom navigation missing Narrators link~~ | ~~MEDIUM~~ | ~~UX_REVIEW_2026_03_10 M-04~~ | **DONE** — code shows 5 nav items including Narrators |
| Compact header breadcrumb text 9px — illegible | MEDIUM | UX_REVIEW_2026_03_10 M-05 | **DONE** (commit `4eff213`) — minimum increased to 11px |

---

## Priority 3: Frontend — Narrator Pages Overhaul

**Goal:** Make narrator pages usable for non-Arabic readers and performant for high-narration narrators.

**Source docs:** `UI_IMPROVEMENT_ROADMAP.md`, `UX_REVIEW_REPORTS.md` §4, `UI_REVIEW_DETAILS.md`, `USER_STORIES.md` (PPL-07 through PPL-20)

### 3.1 Critical Fixes

| Item | Source | Status |
|------|--------|--------|
| Narrator profile pages freeze browser for high-narration narrators (#4: 3,116, #19: 5,511) | UX_REVIEW_REPORTS §1 | **DONE** (commit `38c173b`, FIX-04) — `mat-paginator` for hadith paths and subchains; `slice(0, 10)` caps elsewhere |
| Add English transliteration to narrator names (list + profiles) | PPL-07, UX_REVIEW_REPORTS | **DONE** (commit `ce3cbb6`) — two-line name cell with Arabic + English |
| Default sort narrators by narration count (not opaque ID) | UX_REVIEW_REPORTS §4 | **OUTSTANDING** |

### 3.2 Narrator List Enhancements

| Item | Source | Status |
|------|--------|--------|
| Featured Imams section (horizontal scrollable cards) | UI_REVIEW_DETAILS.md | **OUTSTANDING** |
| Enhanced table (two-line name, narration count pills, role badges) | UI_REVIEW_DETAILS.md | **DONE** (commit `ce3cbb6`) — count pills + Imam role badges |
| Mobile card layout replacing table | UI_REVIEW_DETAILS.md | **OUTSTANDING** |
| Filter by English transliteration | PPL-02 enhancement | **OUTSTANDING** |

### 3.3 Narrator Profile Enhancements

| Item | Source | Status |
|------|--------|--------|
| Profile header hero (monogram, stats pills, era, reliability) | UI_REVIEW_DETAILS.md | **DONE** (commit `7f3ec03`) — full hero with monogram, stats, gold Imam styling |
| Hadith preview cards (not bare path links) | PPL-10 | **OUTSTANDING** |
| Lazy loading (50 hadiths at a time) | UI_REVIEW_DETAILS.md | **OUTSTANDING** |
| Transmission network summary (top co-narrators by frequency) | UI_REVIEW_DETAILS.md | **OUTSTANDING** |
| Stats summary (total narrations, book distribution) | PPL-08 | **DONE** (commit `7f3ec03`) — stats in hero header |

### 3.4 Future Narrator Features (Lower Priority)

From `USER_STORIES.md` and `UX_REVIEW_REPORTS.md` §6:

- Narrator hover cards with reliability/count/link (PPL-12) — **DONE**
- Teacher/student lists (PPL-14) — PLANNED
- Reliability ratings from multiple rijal scholars (PPL-15) — PLANNED
- Visual chain diagram with color-coded reliability (PPL-16) — PLANNED
- Browse narrators by category (PPL-17) — PLANNED
- Advanced search by reliability/count/era (PPL-18) — PLANNED
- Interactive network graph (PPL-19) — PLANNED
- Side-by-side narrator comparison (PPL-13) — PLANNED

---

## Priority 4: Frontend — Search & Discovery Improvements

**Goal:** Optimize Orama search and add structured browsing features.

**Source docs:** `ORAMA_SEARCH_FEATURES.md`, `FEATURE_PROPOSALS.md` §1

### 4.1 Quick Wins (search.service.ts changes only)

| Item | Impact | Effort | Status |
|------|--------|--------|--------|
| Set `threshold: 0` for multi-word AND behavior | High | Easy | **DONE** — already in code before team run |
| Add `boost: { en: 2, t: 0.5 }` for better ranking | High | Easy | **DONE** — already in code before team run |
| Add `tolerance: 1` for typo tolerance | Medium | Easy | **DONE** — already in code before team run |
| Expose `offset` for search pagination | High | Easy | **DONE** (commits `88b2ba9`, `1f14faf`, `f5e91cd`) — offset wired through NGXS state + edge cases fixed |
| BM25 relevance tuning (`b: 0.5`) | Medium | Easy | **DONE** (commit `88b2ba9`) — reduces length penalty on longer hadiths |
| Skip path tokenization (`tokenizeSkipProperties`) | Low | Easy | **DONE** (commit `88b2ba9`) — prevents path fields from polluting search |

### 4.2 Schema Enrichment (generator + service changes)

| Item | Impact | Effort | Status |
|------|--------|--------|--------|
| Add `book` enum field to search documents | Very High | Medium | **OUTSTANDING** — needs generator-side changes |
| Faceted search (counts by book) | Very High | Medium | **OUTSTANDING** — needs book enum field first |
| Where filters (filter by book/volume) | Very High | Medium | **OUTSTANDING** — needs book enum field first |
| GroupBy (results organized by book) | High | Medium | **OUTSTANDING** — needs book enum field first |

### 4.3 Performance & Arabic Quality

| Item | Impact | Effort | Status |
|------|--------|--------|--------|
| Pre-built Orama indexes (save/load at build time) | Very High | Medium | **OUTSTANDING** — needs Node.js build script in generator |
| Arabic tokenizer (`language: 'arabic'`) | High | Medium | **DONE** — already in code before team run |
| Arabic stemmer (`@orama/stemmers`) | High | Medium | **OUTSTANDING** — needs npm install of `@orama/stemmers` |
| Arabic stop words (`@orama/stopwords`) | Medium | Easy | **OUTSTANDING** — needs npm install of `@orama/stopwords` |

---

## Priority 5: Data — New Book Integration

**Goal:** Expand from 2 books (Quran + Al-Kafi) to 30+ including the Four Books.

**Source docs:** `SCHEMA_PROPOSAL.md`, `PARSER_ARCHITECTURE.md`, `RESEARCH_TAHDHIB_ISTIBSAR_SOURCES.md`, `MASTER_ROADMAP.md`

### 5.1 Schema Changes for New Books

**Verified by worker-p5 (2026-03-15):** All schema changes are already implemented. Infrastructure is ready for new books.

| Item | Source | Status |
|------|--------|--------|
| Change `gradings` from `List[str]` to `Dict[str, str]` | SCHEMA_PROPOSAL §2.2 | **DONE** — already `Dict[str, str]` in Python model + Angular interface |
| Add `source_url` to Verse model | SCHEMA_PROPOSAL §2.2 | **DONE** — exists in both Python model + Angular interface |
| Add `Section` to PartType enum | SCHEMA_PROPOSAL §2.8 | **DONE** — exists in PartType enum |
| Add `FR` to Language enum | SCHEMA_PROPOSAL §2.9 | **DONE** — exists in Language enum |
| Create `book_registry.py` for declarative book registration | SCHEMA_PROPOSAL §2.1 | **DONE** — functional with configs for all books |
| Add book metadata to books.json (author, source, verse_count, hierarchy) | SCHEMA_PROPOSAL §2.5 | **DONE** — books.json includes metadata |

### 5.2 New Book Parsers

| Item | Source | Status |
|------|--------|--------|
| `thaqalayn_api.py` — generic parser for ThaqalaynAPI JSON | PARSER_ARCHITECTURE §2 | **DONE** — functional parser |
| `thaqalayn_net.py` — HTML parser for mirror books | PARSER_ARCHITECTURE §3 | **DONE** — file exists (verified by worker-p5) |
| `ai_content_merger.py` — merge AI content into data | — | **DONE** — functional |
| Tahdhib al-Ahkam sourcing (hadith.inoor.ir API or ghbook.ir) | RESEARCH_TAHDHIB_ISTIBSAR_SOURCES | **OUTSTANDING** |
| al-Istibsar sourcing | RESEARCH_TAHDHIB_ISTIBSAR_SOURCES | **OUTSTANDING** |

### 5.3 Data Optimization (Remaining)

| Item | Savings | Source |
|------|---------|--------|
| Extract verse_translations to book-level file | ~5 MB | OPTIMIZATION_PLAN Phase 2 |
| Field name shortening (optional, high effort) | ~20 MB | OPTIMIZATION_PLAN Phase 3 |
| Per-book index files (when needed at 10+ books) | Scalability | SCHEMA_PROPOSAL §2.10 |

---

## Priority 6: Frontend — UI Polish & Design System

**Goal:** Establish consistent design language and improve reading experience.

**Source docs:** `UI_IMPROVEMENT_ROADMAP.md` (Phases 3-5), `UI_REVIEW_DETAILS.md`

### 6.1 Design System Foundation

| Item | Source | Status |
|------|--------|--------|
| 8px spacing scale (4, 8, 12, 16, 24, 32, 48, 64) | UI_REVIEW_DETAILS DS-01 | **OUTSTANDING** — CSS custom properties not yet added |
| Typography scale (heading, subheading, body, caption, overline) | UI_REVIEW_DETAILS DS-02 | **OUTSTANDING** — CSS custom properties not yet added |
| Verse card improvements (alternating bg, accent border, verse numbers) | UI_REVIEW_DETAILS | **PARTIALLY DONE** (commit `ce3cbb6`) — alternating bg + accent border done; verse numbers outstanding |
| Replace `>>` breadcrumb separator with chevron | UX_REVIEW_REPORTS §4 | **OUTSTANDING** |

### 6.2 Reading Experience

| Item | Source | Status |
|------|--------|--------|
| Reduce verse metadata visual weight / collapse by default | UX_REVIEW_REPORTS §1 | **OUTSTANDING** |
| Increase Arabic/English gap from 8px to 16px | UX_REVIEW_REPORTS §4 | **OUTSTANDING** |
| Add "jump to verse" for long surahs | UX_REVIEW_REPORTS §1 | **OUTSTANDING** |
| Add tooltips to 26 icons missing them | UI_REVIEW_DETAILS | **PARTIALLY DONE** (commits `ce3cbb6`, `e0ca470`) — settings + book-tree tooltips done; ~20 remaining (verse footer, bookmark page, search/filter) |

### 6.3 Remaining Feature Proposals

**Code verified (2026-03-15):** Audio and Tafsir services exist and are functional.

| Item | Status (code-verified) | Source |
|------|--------|--------|
| ~~Audio recitation (Quran, EveryAyah API)~~ | **DONE** — `audio.service.ts` exists with 4 reciters (Husary, Minshawi, Abdulbasit, Alafasy) | FEATURE_PROPOSALS §4 |
| ~~Tafsir integration~~ | **DONE** — `tafsir.service.ts` exists with 3 editions (Ibn Kathir, Al-Jalalayn, Maarif-ul-Quran) | FEATURE_PROPOSALS §5 |
| Cross-device sync via Firebase (optional) | PARTIAL (Firebase installed, sync service exists) | FEATURE_PROPOSALS §3 |
| Word-by-word QUL data integration | PARTIAL (AI word analysis done, QUL source not integrated) | PHASE3_FEATURE_PROPOSAL §1 |
| Arabic text cross-validation | PARTIAL (diff-viewer component exists) | PHASE3_FEATURE_PROPOSAL §6 |

---

## Priority 6.5: SEO

**Goal:** Make the site actually indexable and discoverable — covering search engines (Google/Bing) and AI assistants (ChatGPT/Claude/Perplexity).

**Source doc:** `SEO_ROADMAP.md` (2026-04-24) — full detail there. Summary of outstanding items:

| Track | Scope | Status |
|-------|-------|--------|
| Manual (owner-only) | Search Console verification, Netlify Prerender install, custom domain decision, IndexNow key | **PENDING — blocks everything else** |
| Track A (quick wins) | Twitter Card, `BreadcrumbList` JSON-LD, dynamic `<html lang>` + `og:locale`, `lang="ar"` on Arabic, `<lastmod>` in sitemap, wire sitemap into build, AI-crawler policy in robots.txt, per-page OG images, word-boundary description truncation | **OUTSTANDING** |
| Track B (structural) | Sitemap index (>50K URLs), add all 67K verse-detail URLs, hreflang in sitemap, SSR-inline lazy verse bodies (or Netlify Prerender), soft-404 fix, narrator virtualization | **OUTSTANDING** |
| GEO (AI search) | `llms.txt`, FAQPage schema per chapter, definitional opening sentences, named author attribution | **OUTSTANDING** |
| Performance (CWV) | Preconnect, critical CSS, web-vitals field data, INP audit | **OUTSTANDING** |
| Discovery | IndexNow, Bing Webmaster Tools, internal linking audit, `noindex` on utility pages | **OUTSTANDING** |

Already-done baseline (SEO-01..04 from USER_STORIES): `SeoService`, OG tags, JSON-LD (WebSite/Book/CreativeWork/Person/CollectionPage), canonical URLs, path routing, static sitemap, E2E tests.

---

## Priority 7: Infrastructure & Quality

**Source docs:** `QA_REPORT.md`, `TEST_STRATEGY.md`, `ARCHITECTURE.md`

| Item | Source |
|------|--------|
| Cross-browser testing (Firefox, Safari, Edge) | QA_REPORT §10 |
| Screen reader testing (NVDA, VoiceOver) | QA_REPORT §10 |
| Performance profiling (page load, bundle size) | QA_REPORT §10 |
| Test with slow network conditions | QA_REPORT §10 |
| Increase Angular unit test coverage (basic component init only) | QA_REPORT §10 |
| Bump Python minimum to 3.10+ | ARCHITECTURE §11 |
| Remove `--openssl-legacy-provider` from npm start | ARCHITECTURE §11 |
| Standalone components migration | ARCHITECTURE §11 |

---

## Document Relationships

```
CONSOLIDATED_ROADMAP.md (this file)
  ├── collates outstanding items from:
  │   ├── MASTER_ROADMAP.md (superseded)
  │   ├── IMPROVEMENT_ROADMAP.md (superseded)
  │   ├── FEATURE_PROPOSALS.md (partial)
  │   ├── OPTIMIZATION_PLAN.md (partial)
  │   ├── SCHEMA_PROPOSAL.md (partial)
  │   ├── PHASE3_FEATURE_PROPOSAL.md (partial)
  │   ├── AI_PIPELINE_V3_PLAN.md (partial)
  │   ├── PIPELINE_OPTIMIZATION_PLAN.md (active)
  │   ├── BENCHMARK_INSTRUCTIONS.md (partial)
  │   ├── UI_IMPROVEMENT_ROADMAP.md (active)
  │   ├── UX_REVIEW_2026_03_10.md (active)
  │   ├── CHAPTER_TRANSLATION_GAP.md (active)
  │   └── USER_STORIES.md (active)
  │
  └── reference docs (not collated, still valid):
      ├── ARCHITECTURE.md
      ├── PARSER_ARCHITECTURE.md
      ├── HADITH_CARD_ANATOMY.md
      ├── ORAMA_SEARCH_FEATURES.md
      ├── RESEARCH_AI_ARABIC_TRANSLATION.md
      ├── RESEARCH_TAHDHIB_ISTIBSAR_SOURCES.md
      ├── UI_REVIEW_DETAILS.md
      ├── UX_REVIEW_REPORTS.md
      └── DECISION_LOG.md
```
