# Document Index

> Chronological listing of all documents in `docs/` with current status.
> **Last updated:** 2026-04-24

## Status Legend

| Status | Meaning |
|--------|---------|
| **COMPLETE** | Work described is done. Retained as historical reference. |
| **SUPERSEDED** | Replaced by a newer document. See notes for successor. |
| **REFERENCE** | Living reference doc — not a roadmap, still accurate. |
| **ACTIVE** | Contains outstanding work items that are still relevant. |
| **PARTIAL** | Some items done, some outstanding. Outstanding items collated into `CONSOLIDATED_ROADMAP.md`. |

---

## Documents by Date

### 2026-02-21

| Document | Status | Summary |
|----------|--------|---------|
| [QA_REPORT.md](QA_REPORT.md) | **COMPLETE** | QA baseline report. Phase 1 test coverage verified. Most issues resolved. |
| [INDIVIDUAL_HADITH_PAGES_PROPOSAL.md](INDIVIDUAL_HADITH_PAGES_PROPOSAL.md) | **COMPLETE** | Per-hadith addressable pages. Implemented (USER_STORIES VRS-07 DONE). |
| [PARSER_ARCHITECTURE.md](PARSER_ARCHITECTURE.md) | **REFERENCE** | Guide for building parsers for new book sources. Still valid. |

### 2026-02-22

| Document | Status | Summary |
|----------|--------|---------|
| [ORAMA_SEARCH_FEATURES.md](ORAMA_SEARCH_FEATURES.md) | **REFERENCE** | Comprehensive Orama v3.1.18 feature reference. Search is implemented; many optimization features unused. |

### 2026-02-23

| Document | Status | Summary |
|----------|--------|---------|
| [MASTER_ROADMAP.md](MASTER_ROADMAP.md) | **SUPERSEDED** | Original master roadmap. Phase 1-2 complete, Phase 3+ partially done. Superseded by `CONSOLIDATED_ROADMAP.md`. |
| [AI_CONTENT_PIPELINE.md](AI_CONTENT_PIPELINE.md) | **SUPERSEDED** | Original v1/v2 AI pipeline design with Batch API approach. Superseded by `AI_PIPELINE_ARCHITECTURE.md` (v2 agents), then `AI_PIPELINE_V3_PLAN.md` (v3/v4 CLI). |
| [RESEARCH_AI_ARABIC_TRANSLATION.md](RESEARCH_AI_ARABIC_TRANSLATION.md) | **REFERENCE** | Research survey on LLM translation of Arabic religious texts. Still valid. |
| [RESEARCH_TAHDHIB_ISTIBSAR_SOURCES.md](RESEARCH_TAHDHIB_ISTIBSAR_SOURCES.md) | **REFERENCE** | Source analysis for Tahdhib al-Ahkam and al-Istibsar texts. Still valid. |

### 2026-02-27 (updated)

| Document | Status | Summary |
|----------|--------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | **REFERENCE** | Design philosophy and constraints. Living doc, still accurate. |
| [FEATURE_PROPOSALS.md](FEATURE_PROPOSALS.md) | **PARTIAL** | Feature proposals. PWA done, Search done, Bookmarks done. Audio, Tafsir, Sharing partially done or pending. |
| [IMPROVEMENT_ROADMAP.md](IMPROVEMENT_ROADMAP.md) | **SUPERSEDED** | Original phased improvement plan. Phase 1-2 complete. Phase 3+ items moved to newer docs. Superseded by `CONSOLIDATED_ROADMAP.md`. |
| [OPTIMIZATION_PLAN.md](OPTIMIZATION_PLAN.md) | **PARTIAL** | Data size optimization. Phase 1 DONE (90 MB savings). Phase 2-3 not started. |
| [SCHEMA_PROPOSAL.md](SCHEMA_PROPOSAL.md) | **PARTIAL** | Optimal data model proposal. Phase 1 DONE. Phase 2-4 (new book support, verse_translations, index scaling) not started. |
| [TEST_STRATEGY.md](TEST_STRATEGY.md) | **COMPLETE** | Test strategy. Phase 1 COMPLETE. Retained as test architecture reference. |
| [PHASE3_FEATURE_PROPOSAL.md](PHASE3_FEATURE_PROPOSAL.md) | **PARTIAL** | Phase 3 features. Breadcrumb fix DONE, SEO DONE, i18n partial. Word-by-word, narrator improvements, cross-validation partially done. |

### ~2026-02-27 (undated, estimated)

| Document | Status | Summary |
|----------|--------|---------|
| [USER_STORIES.md](USER_STORIES.md) | **ACTIVE** | User story tracker. Many DONE, ~30 PLANNED items remaining. |
| [DECISION_LOG.md](DECISION_LOG.md) | **REFERENCE** | Architectural decision log. Living doc. |

### 2026-03-07

| Document | Status | Summary |
|----------|--------|---------|
| [AI_PIPELINE_V3_PLAN.md](AI_PIPELINE_V3_PLAN.md) | **PARTIAL** | v3 pipeline plan (Python asyncio + `claude -p`). Largely implemented. Chunked processing and some audit features pending. |

### ~2026-03-08 (undated, estimated)

| Document | Status | Summary |
|----------|--------|---------|
| [AI_PIPELINE_ARCHITECTURE.md](AI_PIPELINE_ARCHITECTURE.md) | **SUPERSEDED** | v2 agent-based pipeline architecture. Superseded by v3/v4 pipeline (`AI_PIPELINE_V3_PLAN.md`). Retained as reference for field definitions and review checks. |
| [HADITH_CARD_ANATOMY.md](HADITH_CARD_ANATOMY.md) | **REFERENCE** | Visual anatomy of every UI element in hadith display. Current and accurate. |

### 2026-03-09

| Document | Status | Summary |
|----------|--------|---------|
| [UI_IMPROVEMENT_ROADMAP.md](UI_IMPROVEMENT_ROADMAP.md) | **ACTIVE** | 60-item UI improvement plan from 4 UX reviews. Phase 1 partially done, Phases 2-5 pending. |
| [UX_REVIEW_REPORTS.md](UX_REVIEW_REPORTS.md) | **REFERENCE** | Raw findings from 4 specialized UX review agents. Source data for UI_IMPROVEMENT_ROADMAP. |
| [UI_REVIEW_DETAILS.md](UI_REVIEW_DETAILS.md) | **REFERENCE** | Implementation specs for UI improvements (CSS, component specs, narrator redesign). |

### 2026-03-10

| Document | Status | Summary |
|----------|--------|---------|
| [AI_BACKEND_COST_ANALYSIS.md](AI_BACKEND_COST_ANALYSIS.md) | **SUPERSEDED** | Initial model comparison (Claude vs GPT-5-mini vs GPT-4.1). Superseded by `PIPELINE_OPTIMIZATION_PLAN.md` which includes GPT-5.4 benchmark data. |
| [AI_GENERATION_STRATEGIES.md](AI_GENERATION_STRATEGIES.md) | **SUPERSEDED** | 20 strategies for corpus generation. Superseded by `PIPELINE_OPTIMIZATION_PLAN.md` which implements the winning strategy (multi-phase hybrid pipeline). |
| [OPENAI_PIPELINE_OPTIMIZATION.md](OPENAI_PIPELINE_OPTIMIZATION.md) | **PARTIAL** | 10 code optimizations for OpenAI pipeline. Some implemented (chunk boundary fix, pricing fix, timeout). Benchmarks partially completed. |
| [BENCHMARK_SAMPLE.md](BENCHMARK_SAMPLE.md) | **PARTIAL** | 15-verse benchmark sample. GPT-5.4 benchmarked (85% pass). GPT-5.2, GPT-5, GPT-5-mini re-test pending. |
| [BENCHMARK_INSTRUCTIONS.md](BENCHMARK_INSTRUCTIONS.md) | **PARTIAL** | Benchmark run instructions. Code changes DONE. GPT-5.4 run DONE. Other models pending. |
| [CHAPTER_TRANSLATION_GAP.md](CHAPTER_TRANSLATION_GAP.md) | **ACTIVE** | Gap analysis: 62,400 chapter title translations needed. Not started. ~$6-31 cost. |
| [UX_REVIEW_2026_03_10.md](UX_REVIEW_2026_03_10.md) | **ACTIVE** | Codebase-level UX review. 15 issues across i18n, mobile, accessibility. Most not yet fixed. |

### 2026-03-13

| Document | Status | Summary |
|----------|--------|---------|
| [PIPELINE_OPTIMIZATION_PLAN.md](PIPELINE_OPTIMIZATION_PLAN.md) | **ACTIVE** | Most recent AI pipeline plan. Multi-phase architecture (GPT-5.4 + programmatic + Claude + GPT-5-mini). Not yet implemented. |

### 2026-03-22

| Document | Status | Summary |
|----------|--------|---------|
| [BIHAR_MIRAT_SCRAPING_PLAN.md](BIHAR_MIRAT_SCRAPING_PLAN.md) | **ACTIVE** | Scraping plan for Bihar al-Anwar (110 vols) and Mir'at al-Uqul (26 vols) from rafed.net Word API. Includes cross-referencing strategy. |

### 2026-04-24

| Document | Status | Summary |
|----------|--------|---------|
| [SEO_ROADMAP.md](SEO_ROADMAP.md) | **ACTIVE** | Full SEO plan: ~40 items across quick wins, structural fixes, GEO (LLM search), Core Web Vitals, E-E-A-T, crawl/discovery. Includes manual steps for the site owner (Search Console verification, Netlify Prerender install, custom domain decision). Supersedes `PHASE3_FEATURE_PROPOSAL.md` §8 as the single source of truth for SEO. |
