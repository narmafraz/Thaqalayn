# AI Pipeline Architecture

> How the Claude Code agent-based AI content generation pipeline works end-to-end.

This document describes the **current production implementation** of the AI content pipeline. For the earlier Batch API design (historical), see [`AI_CONTENT_PIPELINE.md`](AI_CONTENT_PIPELINE.md).

## Overview

The pipeline generates structured AI content (translations, word analysis, tagging, narrator extraction) for every verse and hadith in the corpus (~41,449 items: ~6,236 Quran verses + ~35,213 hadiths). It runs entirely through **Claude Code agents** — no API key or batch API spend. Claude Code runs Opus 4.6, so output quality is identical to the Batch API.

The architecture is a **two-phase, per-verse agent system** with caching and adaptive parallelization:

```
Corpus verses  ->  [Gen Agent] Extract → Generate → Validate → Strip → Save
                ->  [Fix Agent] Review → Fix (if needed) → Re-validate → Save
```

Each verse gets two sequential agents. This gives each phase a fresh context window, avoids context limit crashes, and makes generation/review independently observable.

### Agent Roles

| Agent | Model | File | Role |
|-------|-------|------|------|
| `ai-orchestrate` | Opus | `.claude/agents/ai-orchestrate.md` | Coordinates agents, adaptive parallelism, progress tracking |
| `ai-generate` | Opus | `.claude/agents/ai-generate.md` | Phase 1: content generation, validation, strip, save (1 verse only) |
| `ai-fix` | Opus | `.claude/agents/ai-fix.md` | Phase 2: review + targeted fix (1 verse only) |
| `ai-review` | Opus | `.claude/agents/ai-review.md` | Standalone review (manual use only, not used in orchestrated runs) |

### Agent Naming Convention

Agents are named after the verse they process:
- Generation: `gen-{verse_id}` (e.g., `gen-al-kafi_1_2_1_1`)
- Review+Fix: `fix-{verse_id}` (e.g., `fix-al-kafi_1_2_1_1`)

**Critical rules:**
- **1 verse per agent** — multi-verse batches stall, crash, and lose progress
- **Two phases per verse** — gen agent first, then fix agent (not all-generate-then-all-review)
- **100 agents always running** — start at 100, maintain 100 by spawning replacements as agents complete

---

## Stage 0: Supporting Data

Before any generation starts, reference data is loaded from `ThaqalaynDataSources/ai-pipeline-data/`:

| File | Contents | Purpose |
|------|----------|---------|
| `glossary.json` | ~50 Islamic terms in all 11 languages | Consistent translations (salat = prayer, taqwa = piety) |
| `word_dictionary.json` | 29 high-frequency Arabic particles | Canonical translations for common words (wa, fi, min, etc.) |
| `topic_taxonomy.json` | 14 Level 1 x ~5-8 Level 2 topics (~90 total) | Controlled vocabulary for topic assignment |
| `key_phrases_dictionary.json` | ~160 multi-word Arabic expressions | Seed dictionary for key phrase extraction |
| `few_shot_examples.json` | 3-5 complete input/output pairs | In-context learning examples |
| `sample_verses.json` | 20 diverse verse paths | Testing and sample generation |

All reference data is embedded in the system prompt so every agent sees the same material.

---

## Stage 1: Verse Extraction

For each verse path (e.g., `/books/al-kafi:1:2:3:4`), `extract_pipeline_request()`:

1. Converts the path to a filesystem path in `ThaqalaynData/`
2. Loads the verse JSON and builds a `PipelineRequest`:
   - **`arabic_text`** — the primary content to analyze
   - **`english_text`** — reference English translation (if available)
   - **`book_name`**, **`chapter_title`**, **`hadith_number`** — metadata
   - **`existing_narrator_chain`** — if pre-extracted by the kafi_narrators parser

---

## Stage 2: Processing Mode Decision

The pipeline checks the Arabic word count against the chunked processing threshold (**200 words**):

- **<= 200 words** -> Single-pass generation (one LLM call generates all 13 fields)
- **> 200 words** -> Chunked processing (structure pass + per-chunk detail passes)

Most Quran verses and shorter hadiths use single-pass. Longer hadiths (some Al-Kafi narrations exceed 500 words) use chunked processing.

---

## Stage 3: Generation (Pass 1)

### The 13 Generated Fields

| # | Field | Type | Purpose |
|---|-------|------|---------|
| 1 | `diacritized_text` | string | Full Arabic text with complete tashkeel (vowel marks) |
| 2 | `diacritics_status` | enum | How tashkeel was handled: added/completed/validated/corrected |
| 3 | `diacritics_changes` | array | What corrections were made (empty if "added"/"validated") |
| 4 | `word_analysis` | array | Per-word: diacritized form, 11-language translations, POS tag |
| 5 | `tags` | array(2-5) | Thematic tags (theology, ethics, jurisprudence, etc.) |
| 6 | `content_type` | enum | Single classification (theological, creedal, narrative, etc.) |
| 7 | `related_quran` | array | Quran cross-references with explicit/thematic relationship |
| 8 | `isnad_matn` | object | Narrator chain: names, roles, confidence, isnad/matn split |
| 9 | `translations` | object | 11 languages x {text, summary, key_terms, seo_question} |
| 10 | `chunks` | array | Semantic segmentation: type, word range, per-chunk translations |
| 11 | `topics` | array(1-5) | Level 2 topic keys from controlled vocabulary |
| 12 | `key_phrases` | array(0-5) | Multi-word Arabic expressions with categories |
| 13 | `similar_content_hints` | array(0-3) | Unverified thematic hints for finding parallel narrations |

The **11 languages** are: en, ur, tr, fa, id, bn, es, fr, de, ru, zh.

### Single-Pass Mode

`build_system_prompt()` + `build_user_message()` produce the full prompt. The LLM generates all 13 fields in one response.

### Chunked Mode (> 200 words)

**Step 1 — Check cache:** `get_cached_or_plan()` checks for a valid cached structure. The 3-layer staleness system determines what needs regeneration (see [Caching](#caching) below).

**Step 2 — Structure pass** (skip if cached): `build_structure_prompt()` generates all fields EXCEPT `word_analysis` and chunk translations. This defines narrative structure: chunk boundaries, verse-level translations, isnad/matn separation, topics, key phrases. Saved via `save_structure_cache()`.

**Step 3 — Detail passes** (one per chunk, parallelizable): `build_chunk_detail_prompt()` generates `word_analysis` entries and chunk translations for one chunk at a time. The full Arabic text is included for context, but the LLM only analyzes the chunk's word segment. Each result saved via `save_chunk_cache()`.

**Step 4 — Assembly:** `assemble_chunked_result()` concatenates word_analysis from all chunks, inserts chunk translations, fixes word ranges to match actual word counts, and validates.

---

## Stage 4: Schema Validation

`validate_result()` enforces strict schema rules:

- All required top-level fields present
- `diacritics_status` in valid enum; cross-check that "added"/"validated" have empty changes
- Every word in `word_analysis` has all 11 language translations, valid POS tag, diacritics present
- `tags` has 2-5 items from valid set; `content_type` is valid enum
- `related_quran` refs have valid surah:ayah format (1-114 surah range, ayah within surah bounds via `quran-data.xml`)
- `isnad_matn` has required fields; `has_chain=True` requires non-empty isnad_ar and narrators
- Translations: all 11 languages present, each with text/summary/key_terms/seo_question
- `key_terms` must be dict (not list), with Arabic-character keys
- Chunks: sequential, non-overlapping, complete coverage of word_analysis
- Topics from controlled vocabulary; key phrases multi-word with valid categories

---

## Stage 5: Quality Review (Pass 2)

`review_result()` runs 10 automated checks that catch issues schema validation cannot:

| # | Check | Category | Catches |
|---|-------|----------|---------|
| 1 | Translation length ratio | `length_ratio` | Summaries masquerading as translations |
| 2 | Arabic echo-back | `arabic_echo` | Untranslated word translations (>50% Arabic chars) |
| 3 | European diacritics | `missing_diacritics` | ASCII-only Turkish/French/German/Spanish |
| 4 | Quran self-reference | `empty_related_quran` | Quran verses with no related verses |
| 5 | Chunk coherence | `chunk_translation_mismatch` | Chunk translations differ >30% from verse-level |
| 6 | Missing isnad chunk | `missing_isnad_chunk` | has_chain=True without isnad chunk |
| 7 | Back-reference pattern | `back_reference_no_chain` | Arabic starts with back-ref but has_chain=False |
| 8 | Key terms disparity | `key_terms_count_disparity` | One language has >2x more key_terms than another |
| 9 | Word analysis text match | `word_count_mismatch` / `word_text_mismatch` | word_analysis words don't match original Arabic |
| 10 | Narrator word ranges | `narrator_word_range_mismatch` / `missing_narrator_word_ranges` | word_ranges point to wrong words, or missing in chained hadith |

Translation ratio bounds are per-language: Latin-script (0.3-5.0x), CJK (0.15-3.0x), Perso-Arabic (0.4-4.0x).

The review agent also applies expert judgment beyond automated checks and returns: **pass**, **needs_fix**, or **needs_regeneration**.

---

## Stage 6: Fix Pass (Pass 3, if needed)

If review returns "needs_fix":

1. `build_fix_prompt()` extracts only flagged fields and warning details
2. Fix agent generates corrected fields only — does NOT modify unflagged content
3. Corrections merged back into original result
4. Result goes through validation + review again (max 2 fix iterations)

If review returns "needs_regeneration" (fundamentally flawed), the entire generation restarts.

---

## Stage 7: Strip Redundant Fields

`strip_redundant_fields()` removes three categories of data that can be reconstructed, achieving **~21% size reduction**:

| Removed field | Reconstructed from |
|--------------|-------------------|
| `diacritized_text` | Joining `word_analysis[].word` with spaces |
| `chunks[].arabic_text` | Joining `word_analysis[word_start:word_end]` words |
| `translations[lang].text` | Concatenating `chunks[].translations[lang]` |

Both `validate_result()` and `review_result()` auto-call `reconstruct_fields()` when they detect stripped input, so stripped files pass validation seamlessly.

---

## Stage 8: Save and Cache Back-fill

The final result is saved with a wrapper:

```json
{
  "verse_path": "/books/al-kafi:1:2:3:4",
  "ai_attribution": {
    "model": "claude-opus-4-6-20260205",
    "generated_date": "2026-02-27",
    "pipeline_version": "2.0.0",
    "generation_method": "claude_code_direct"
  },
  "result": { /* 13 validated + stripped fields */ }
}
```

Saved to: `ThaqalaynDataSources/ai-content/samples/responses/{verse_id}.json`
(where `verse_id` = path with `/books/` stripped, `:` replaced by `_`)

Then `save_structure_from_file()` and `save_chunk_from_file()` back-fill the cache so future regeneration can reuse structural data.

---

## Caching

Cache location: `ThaqalaynDataSources/ai-content/samples/cache/{verse_id}/`

| File | Contents |
|------|----------|
| `meta.json` | Hashes, versions, timestamps for staleness detection |
| `structure.json` | Structure pass output |
| `chunk_N.json` | Detail pass output for chunk N |

### Three-Layer Staleness Detection

| Layer | Trigger | Invalidates |
|-------|---------|-------------|
| Layer 1 | Arabic text hash changed | Everything (structure + all chunks) |
| Layer 2 | Structure schema version changed | Everything (structure + all chunks) |
| Layer 3 | Pipeline version / glossary / language keys | Chunks only (structure survives) |

Key functions: `check_cache_staleness()`, `get_cached_or_plan()`, `invalidate_cache()`, `invalidate_chunks()`.

---

## Orchestration at Scale

The `ai-orchestrate` agent coordinates full corpus runs using a **two-phase per-verse pipeline** with adaptive parallelism:

### Per-Verse Pipeline

For each verse, the orchestrator spawns two sequential agents:

1. **`gen-{verse_id}`** — Generation agent: extract → generate → validate → strip → save → cache → stats
2. **`fix-{verse_id}`** — Review+fix agent: review → fix if needed → re-validate → re-strip → save → update stats

This two-phase approach ensures:
- Fresh context for each phase (no context limit crashes)
- Generation and review are independently observable
- Fix agents start clean and focus purely on quality

### Parallelism

The orchestrator always maintains **100 running agents**:

1. **Start at 100** — Spawn 100 gen agents on session start
2. **Maintain 100** — As agents complete, count active agents and spawn replacements to stay at 100
3. **Log metrics every 100 completions** — Track throughput, success rate, errors in `orchestrator_settings.json`
4. **Persist settings** — `orchestrator_settings.json` survives orchestrator restarts

### Agent Naming

Every agent is named after its verse: `gen-al-kafi_1_2_1_1`, `fix-al-kafi_1_2_1_1`. This makes it easy to track progress and identify failures.

### Resume Safety

- Agents skip verses that already have response files
- The orchestrator recomputes remaining from filesystem on each session start
- No manual work needed between sessions — just say "continue corpus generation"

The caching system means interrupted runs resume efficiently — structure passes survive pipeline version bumps, and individual chunks can be regenerated without redoing the full hadith.

---

## Generation Stats

Per-hadith generation metrics are persisted to `ai-content/{subdir}/generation_stats.json`. This file is used for planning future generation runs, estimating costs, and identifying quality trends.

**Content stats** (written by each `ai-generate` agent after step 8):
- `verse_path`, `verse_id`, `file_size_bytes`, `model`, `generated_date`, `pipeline_version`
- `source_word_count`, `word_analysis_count`, `is_chunked_processing`
- `chunk_count`, `chunk_types`, `content_type`, `tags`, `topics`
- `narrator_count`, `has_chain`, `key_phrase_count`, `similar_hint_count`
- `quran_ref_count`, `quran_explicit_refs`, `quran_thematic_refs`, `quran_refs_with_word_ranges`
- `validation_passed`, `validation_errors`, `stats_recorded_at`

**Timing stats** (merged by orchestrator from task notifications):
- `generation_duration_ms` — wall-clock generation time
- `generation_total_tokens` — total tokens consumed by the agent
- `generation_tool_uses` — number of tool calls

**Benchmark findings** (first 100 Al-Kafi, Feb 2026):
- Short hadiths (14-50 words): ~3-8 min, ~85K tokens
- Medium hadiths (50-100 words): ~5-8 min, ~90K tokens
- Long single-pass (100-200 words): ~17-45 min, ~120-140K tokens
- Chunked hadiths (200+ words): TBD

---

## Narrator Discoverability

Each narrator in `isnad_matn.narrators` can include an optional `word_ranges` field that links the narrator to specific words in `word_analysis`:

```json
{
  "name_ar": "مُحَمَّدُ بْنُ يَحْيَى",
  "name_en": "Muhammad ibn Yahya",
  "role": "narrator",
  "position": 1,
  "word_ranges": [{"word_start": 3, "word_end": 6}]
}
```

This enables the UI to highlight narrator names within the word-by-word view and create clickable links to narrator detail pages. The `word_start`/`word_end` use the same half-open indexing as chunk word ranges.

Validation: `validate_result()` checks that `word_ranges` are within bounds. Check 10 in `review_result()` verifies the words at those indices match the narrator's `name_ar`.

---

## Generation Attempts & Quarantine

Each response wrapper tracks `generation_attempts` (starting at 1, incremented on each retry). If a verse exceeds `MAX_GENERATION_ATTEMPTS` (3), it's saved to a quarantine directory instead of responses:

```
ai-content/{subdir}/quarantine/{verse_id}.json
```

Quarantined verses include a `quarantine_reason` field and are never retried automatically.

---

## Corpus Manifest

For full-corpus runs, `generate_corpus_manifest()` walks `ThaqalaynData/books/` and produces a manifest of all verse paths:

```json
{
  "total": 41449,
  "verses": [
    {"path": "/books/quran:1:1", "book": "quran"},
    {"path": "/books/al-kafi:1:1:1:1", "book": "al-kafi"}
  ]
}
```

CLI: `python -m app.ai_pipeline manifest [--book X] [--volume N] [--range 1-100]`

The manifest supports filtering by book, volume, and numeric range for incremental processing.

---

## Configurable Output Directory

The `AI_CONTENT_SUBDIR` environment variable controls the output subdirectory:

| Variable | Default | Purpose |
|----------|---------|---------|
| `AI_CONTENT_SUBDIR=samples` | Default | Sample/development runs |
| `AI_CONTENT_SUBDIR=corpus` | — | Full corpus production runs |

All paths (responses, cache, quarantine) use this prefix. Config constants: `AI_RESPONSES_DIR`, `AI_CACHE_DIR`, `AI_QUARANTINE_DIR`.

---

## Key Modules

| Module | Location | Purpose |
|--------|----------|---------|
| `ai_pipeline.py` | `ThaqalaynDataGenerator/app/` | Core: PipelineRequest, prompts, validation, strip/reconstruct |
| `ai_pipeline_review.py` | `ThaqalaynDataGenerator/app/` | Review checks, chunked processing, prompt builders |
| `ai_pipeline_cache.py` | `ThaqalaynDataGenerator/app/` | 3-layer caching, save/load, staleness detection |
| `config.py` | `ThaqalaynDataGenerator/app/` | Paths: AI_CONTENT_DIR, AI_PIPELINE_DATA_DIR |
