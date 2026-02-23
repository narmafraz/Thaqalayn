# AI Content Pipeline — Design & Architecture

> **Date:** 2026-02-23
> **Purpose:** Comprehensive plan for generating AI-powered content across the Thaqalayn hadith corpus. Covers model selection, content types, fault tolerance, quality validation, attribution, and storage.
> **Budget context:** ~$14,000 remaining in February 2026 Anthropic API budget.

---

## Table of Contents

1. [Goals & Scope](#1-goals--scope)
2. [Model Selection](#2-model-selection)
3. [Content Generated Per API Call](#3-content-generated-per-api-call)
4. [Pipeline Architecture](#4-pipeline-architecture)
5. [Fault Tolerance & Recovery](#5-fault-tolerance--recovery)
6. [Quality Validation (AI Self-Check)](#6-quality-validation-ai-self-check)
7. [Attribution & Labelling](#7-attribution--labelling)
8. [Storage & Persistence](#8-storage--persistence)
9. [Sample-First Approach](#9-sample-first-approach)
10. [Cost Estimates](#10-cost-estimates)
11. [Quran-Specific Considerations](#11-quran-specific-considerations)

---

## 1. Goals & Scope

### What We're Building

A batch AI pipeline that processes every verse/hadith in the Thaqalayn corpus (40,621 verses across 22 books + 6,236 Quran ayat) to generate:
- Translations in 10 languages
- Word-by-word Arabic analysis
- Thematic tags and classifications
- Summaries, glossaries, and cross-references
- Quality validation scores

### What's In Scope

| Content | Quran (6,236 ayat) | Hadith (34,385 hadiths) |
|---------|:------------------:|:-----------------------:|
| AI Translations (10 languages) | Yes | Yes |
| Word-by-word analysis | Yes (supplement QUL) | Yes (only source) |
| Diacritization (tashkeel) | No (already fully voweled) | Yes (add/complete/validate) |
| Thematic tags | Yes | Yes |
| Summaries | Yes | Yes |
| Key terms glossary | Yes | Yes |
| Type classification | N/A | Yes |
| Related Quran refs | N/A | Yes |
| SEO question | Yes | Yes |

> **Dropped: Historical context.** Unlike translation and word analysis (which are grounded in the source text), historical context requires external knowledge the AI may not have reliably. Most hadiths have no documented *asbab al-hadith*. Risk of plausible-sounding but fabricated context is too high for a religious text platform. Better to have no context than wrong context.

### What's NOT In Scope

- Sunni hadith collections (explicitly deprioritized by project owner)
- RAG chatbot (violates zero-ongoing-costs architecture constraint)
- Semantic search embeddings (separate pipeline, may be considered later)

---

## 2. Model Selection

### Decision: Claude Opus 4.6 via Batch API

| Factor | Haiku 4.5 | Sonnet 4.6 | **Opus 4.6 (chosen)** |
|--------|-----------|------------|----------------------|
| Batch input | $0.50/MTok | $1.50/MTok | $2.50/MTok |
| Batch output | $2.50/MTok | $7.50/MTok | $12.50/MTok |
| Context window | 200K | 1M | **1M** |
| Max output | 8K | 64K | **128K** |
| Arabic/Islamic terminology | Good | Very good | **Excellent** |
| Literary quality | Functional | Good | **Scholarly** |
| Honorific preservation | Often misses | Usually correct | **Consistent** |
| Sectarian sensitivity | Mixed | Good | **Best** |

### Why Opus 4.6 Over 4.5

- Same pricing ($5/$25 per MTok standard, $2.50/$12.50 batch)
- 1M context window (vs 200K) — useful for providing more context in prompts
- 128K max output (vs 32K) — critical for combined prompts producing large structured output
- Adaptive thinking — automatically applies deeper reasoning when translating complex passages
- Released February 2026 — latest model with best capabilities

### Why Batch API Over Single Calls

- **50% cost reduction** — $2.50/$12.50 vs $5/$25 per MTok
- Translations are not time-sensitive — 24-hour turnaround is fine
- Batch API handles retries and rate limiting internally
- Better for large workloads (400,000+ requests)

### Validation Model: Sonnet 4.6 via Batch API

The quality validation pass uses the cheaper Sonnet 4.6 ($1.50/$7.50 batch) since validation requires less creative ability and produces shorter output (~100 tokens per review).

---

## 3. Content Generated Per API Call

### Combined Prompt Strategy

Each API call sends one verse/hadith and receives a structured JSON response containing ALL the following content types. This amortizes input token costs across multiple outputs.

### Prompt Design

**System prompt:**
```
You are a specialist in Shia Islamic scholarly texts. You are translating and analyzing
hadith from the Four Books and other primary Shia sources.

IMPORTANT RULES:
- Preserve all honorifics: عليه السلام (peace be upon him), صلى الله عليه وآله وسلم, etc.
- Use established Islamic terminology (do not translate terms like "wudu", "salat", "zakat"
  unless the target language has established equivalents)
- Be faithful to Shia scholarly tradition in interpretation
- Do not add commentary or interpretation — translate faithfully
- Output valid JSON only
```

**User message:**
```
Arabic text: {ARABIC_TEXT}
English reference translation: {ENGLISH_TEXT}
Book: {BOOK_NAME}
Chapter: {CHAPTER_TITLE}
Hadith number: {HADITH_NUMBER}
Target language: {LANGUAGE_CODE} ({LANGUAGE_NAME})

Generate the following as a single JSON object:

1. "translation": Your translation into {LANGUAGE_NAME}
2. "word_analysis": Array of objects for each Arabic word:
   [{"word": "بِسْمِ", "translation": "In the name of", "root": "س م و", "pos": "noun"}]
3. "diacritized_text": The full Arabic text with complete tashkeel (fatha, kasra, damma,
   sukun, shadda, tanwin on every applicable letter). If the original already has
   diacritics, preserve correct ones and fix any errors. If partial, complete them.
4. "diacritics_status": One of: "added" (was bare), "completed" (was partial),
   "validated" (was full, no changes needed), "corrected" (was full, fixes applied)
5. "diacritics_changes": Array of corrections to existing diacritics (empty if "added"):
   [{"original": "عَلِمَ", "corrected": "عُلِمَ", "reason": "passive voice per context"}]
6. "tags": Array of 2-5 thematic tags from this controlled vocabulary:
   [theology, ethics, jurisprudence, worship, quran-commentary, prophetic-tradition,
    family, social-relations, knowledge, dua, afterlife, history, economy, governance]
7. "hadith_type": One of: legal_ruling, narrative, dua, ethical_teaching,
   prophetic_tradition, quranic_commentary, historical_account, supplication
8. "summary": 1-2 sentence summary of the hadith content
9. "key_terms": Object mapping Arabic terms to {LANGUAGE_NAME} explanations:
   {"term_arabic": "explanation in target language"}
10. "related_quran": Array of Quran references (surah:ayah) this hadith relates to
    (only if clearly related, empty array if none)
11. "seo_question": A natural question this hadith answers, in {LANGUAGE_NAME}
```

> **Dropped from prompt: `historical_context`.** High hallucination risk for religious texts. Most hadiths have no documented historical circumstances. See "What's In Scope" table for rationale.

### Output Schema Per Verse

```json
{
  "translation": "Translation text in target language...",
  "word_analysis": [
    {
      "word": "بِسْمِ",
      "translation": "In the name of",
      "root": "س م و",
      "pos": "N"
    }
  ],
  "diacritized_text": "عَنْ عِدَّةٍ مِنْ أَصْحَابِنَا عَنْ أَحْمَدَ بْنِ مُحَمَّدِ بْنِ خَالِدٍ...",
  "diacritics_status": "completed",
  "diacritics_changes": [],
  "tags": ["theology", "knowledge"],
  "hadith_type": "ethical_teaching",
  "summary": "The Imam explains that seeking knowledge is obligatory for every Muslim.",
  "key_terms": {
    "العلم": "Knowledge, specifically religious knowledge",
    "الفريضة": "Religious obligation"
  },
  "related_quran": ["96:1", "20:114"],
  "seo_question": "What is the Islamic obligation regarding seeking knowledge?"
}
```

### Token Estimates Per Request

| Component | Est. input tokens | Est. output tokens |
|-----------|------------------:|-------------------:|
| System prompt | ~200 | — |
| Arabic text + English ref + context | ~350 | — |
| Translation | — | ~200 |
| Word analysis | — | ~400 |
| Diacritized text + status + changes | — | ~200 |
| Tags + type + summary | — | ~100 |
| Key terms + refs + SEO question | — | ~100 |
| **Total per request** | **~550** | **~1,000** |

---

## 4. Pipeline Architecture

### Overview

```
┌─────────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Generate    │────▶│  Submit   │────▶│   Poll   │────▶│ Download │────▶│ Validate │
│  JSONL files │     │  batches  │     │  status  │     │ results  │     │  (Pass 2)│
└─────────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                                              │
                    ┌──────────┐     ┌──────────┐     ┌──────────┐           │
                    │  Serve   │◀────│  Ingest  │◀────│ Regen    │◀──────────┘
                    │  (merge) │     │  (write) │     │ failures │
                    └──────────┘     └──────────┘     └──────────┘
```

### CLI Commands

```bash
# Step 1: Generate batch JSONL files (idempotent — skips already-generated)
python -m app.ai_pipeline generate --manifest jobs/main.json --books all --langs ur,tr,fa,id,bn,es,fr,de,ru,zh

# Step 2: Submit batches to Anthropic API (one at a time or --all)
python -m app.ai_pipeline submit --manifest jobs/main.json [--all] [--max-batches 5]

# Step 3: Check status of submitted batches
python -m app.ai_pipeline status --manifest jobs/main.json

# Step 4: Download completed results (idempotent — skips already-downloaded)
python -m app.ai_pipeline download --manifest jobs/main.json

# Step 5: Run validation pass (Sonnet 4.6 batch)
python -m app.ai_pipeline validate --manifest jobs/main.json

# Step 6: Regenerate items that failed validation
python -m app.ai_pipeline regenerate --manifest jobs/main.json --threshold 7

# Step 7: Ingest validated results into data files (resumable from checkpoint)
python -m app.ai_pipeline ingest --manifest jobs/main.json

# Utility commands
python -m app.ai_pipeline estimate --manifest jobs/main.json    # Cost estimate
python -m app.ai_pipeline sample --books al-kafi,quran --langs ur,fa --count 5  # Generate samples
python -m app.ai_pipeline retry --manifest jobs/main.json       # Retry failed items
```

### Batch Splitting Strategy

Batches are split by **book × language pair** to minimize blast radius:

```
al-kafi × ur = ~8,400 requests → batch_001
al-kafi × tr = ~8,400 requests → batch_002
...
quran × ur   = ~6,236 requests → batch_023
quran × tr   = ~6,236 requests → batch_024
...
```

This produces ~220 batches (22 books × 10 languages). Each batch:
- Costs ~$20 with Opus 4.6 batch pricing
- Can be submitted, tracked, and retried independently
- If one fails, only that book×language combination is affected

---

## 5. Fault Tolerance & Recovery

### Manifest File (Single Source of Truth)

The manifest file (`jobs/{job_id}.json`) tracks the entire pipeline state. It is updated atomically after every operation.

```json
{
  "job_id": "2026-02-main",
  "model": "claude-opus-4-6-20260205",
  "validation_model": "claude-sonnet-4-6-20260205",
  "created": "2026-02-23T10:00:00Z",
  "config": {
    "languages": ["ur", "tr", "fa", "id", "bn", "es", "fr", "de", "ru", "zh"],
    "books": ["al-kafi", "quran", "man-la-yahduruh", "..."],
    "prompt_version": "1.0.0",
    "prompt_hash": "sha256:abc123..."
  },
  "budget": {
    "limit_usd": 5000.00,
    "spent_usd": 1342.50,
    "remaining_usd": 3657.50
  },
  "batches": [
    {
      "batch_id": "batch_abc123",
      "book": "al-kafi",
      "language": "ur",
      "phase": "generation",
      "status": "completed",
      "submitted_at": "2026-02-23T10:05:00Z",
      "completed_at": "2026-02-23T14:30:00Z",
      "requests": 8420,
      "succeeded": 8418,
      "failed": 2,
      "failed_ids": ["al-kafi:1:2:3:5__ur", "al-kafi:3:1:1:12__ur"],
      "cost_usd": 22.30,
      "results_file": "raw/batch_abc123_results.jsonl",
      "validated": true,
      "validation_batch_id": "batch_val_xyz789",
      "validation_scores": {
        "mean_accuracy": 8.7,
        "mean_fluency": 8.9,
        "below_threshold": 12,
        "regenerated": 12
      }
    }
  ],
  "ingestion": {
    "phase": "in_progress",
    "last_checkpoint": "al-kafi:5:2:3",
    "last_checkpoint_lang": "ur",
    "ingested": 24500,
    "skipped": 0,
    "errors": 2
  },
  "summary": {
    "total_batches": 220,
    "completed_batches": 45,
    "total_requests": 406210,
    "succeeded_requests": 380000,
    "failed_requests": 24,
    "regenerated_requests": 180,
    "total_cost_usd": 1342.50
  }
}
```

### Recovery Procedures

| Failure | Detection | Recovery |
|---------|-----------|----------|
| **Process crash during generation** | Manifest has generated JSONL but no `batch_id` for that book×lang | Re-run `generate` — it skips already-generated JSONL files |
| **Batch submission fails** | Manifest has JSONL but `status: "pending"` (no `batch_id`) | Re-run `submit` — it only submits batches without a `batch_id` |
| **Batch partially fails** | `failed > 0` in batch entry, `failed_ids` list populated | Run `retry` — creates new batch with only the failed IDs |
| **Validation batch fails** | `validated: false` or missing `validation_batch_id` | Re-run `validate` — it skips already-validated batches |
| **Ingestion crash** | `ingestion.last_checkpoint` is set but `phase: "in_progress"` | Re-run `ingest` — it resumes from `last_checkpoint` |
| **Budget exceeded** | `budget.remaining_usd < estimated_next_batch_cost` | Pipeline refuses to submit, prints warning. User must increase `budget.limit_usd`. |
| **Corrupted output file** | Validation scores below threshold | `regenerate` re-submits those specific verse×lang pairs |
| **API outage** | HTTP errors during submission | Exponential backoff with 3 retries, then mark batch as failed |

### Atomic File Writes

All file writes use a temp-then-rename pattern to prevent corruption:

```python
def atomic_write_json(path, data):
    tmp = path + ".tmp"
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)  # atomic on POSIX and Windows (NTFS)
```

### Idempotency Rules

Every command is safe to re-run:

| Command | Idempotency mechanism |
|---------|----------------------|
| `generate` | Skips if JSONL file already exists for that book×lang |
| `submit` | Skips batches that already have a `batch_id` |
| `download` | Skips if `results_file` already exists |
| `validate` | Skips if `validated: true` |
| `regenerate` | Only processes items below threshold not yet regenerated |
| `ingest` | Resumes from `last_checkpoint` |

---

## 6. Quality Validation (AI Self-Check)

### Two-Pass Validation Architecture

**Pass 1 — Generation (Opus 4.6 Batch):**
Generates all content (translation + word-by-word + tags + etc.)

**Pass 2 — Validation (Sonnet 4.6 Batch):**
Reviews each translation with a scoring prompt:

```
You are a translation quality reviewer for Islamic religious texts.

Original Arabic: {ARABIC_TEXT}
English reference: {ENGLISH_TEXT}
AI Translation ({LANGUAGE_NAME}): {AI_TRANSLATION}

Score this translation on:
1. accuracy (1-10): Does it faithfully convey the meaning?
2. fluency (1-10): Does it read naturally in {LANGUAGE_NAME}?
3. terminology (1-10): Are Islamic terms handled correctly?
4. honorifics (1-10): Are all honorifics preserved?
5. theological_errors: List any theological mistakes (or empty array)
6. missing_content: List anything omitted from the original (or empty array)
7. suggested_correction: If any score < 7, suggest a corrected translation (or null)

Output as JSON only.
```

**Pass 3 — Regeneration (Opus 4.6 Batch):**
For items scoring below 7 on any dimension, regenerate with the validator's feedback included in the prompt:

```
Previous translation attempt: {PREVIOUS_TRANSLATION}
Review feedback: {VALIDATION_FEEDBACK}
Please provide an improved translation addressing the feedback.
```

### Validation Thresholds

| Score | Action |
|-------|--------|
| All dimensions ≥ 8 | Accept as-is |
| Any dimension 6-7 | Flag for review, accept provisionally |
| Any dimension < 6 | Regenerate with feedback |
| Theological error flagged | Always regenerate |
| Missing honorific flagged | Always regenerate |

### Optional: Back-Translation Spot Check

For a random 1% sample (~4,000 items), perform back-translation:
1. Translate the AI output back to English (Sonnet 4.6)
2. Compare semantic similarity with original English reference
3. High divergence = flag for manual review

Cost: ~$50 for 1% sample. Provides statistical confidence in overall quality.

---

## 7. Attribution & Labelling

### Core Principle

**Every piece of AI-generated content is permanently labelled with the model, date, and pipeline version.** This is non-negotiable.

### Attribution in Raw Files (ai-content/)

Each result file includes full provenance:

```json
{
  "verse_path": "/books/al-kafi:1:1:1:1",
  "language": "ur",
  "ai_attribution": {
    "model": "claude-opus-4-6-20260205",
    "generated_date": "2026-02-23",
    "pipeline_version": "1.0.0",
    "batch_id": "batch_abc123",
    "validation": {
      "model": "claude-sonnet-4-6-20260205",
      "scores": {"accuracy": 9, "fluency": 8, "terminology": 9, "honorifics": 10},
      "validated_date": "2026-02-24"
    }
  },
  "translation": "...",
  "word_analysis": [...],
  "tags": [...],
  ...
}
```

### Attribution in Served Files (books/)

Translation entries in verse data:

```json
{
  "translations": {
    "en.qarai": ["In the Name of Allah..."],
    "ur.ai": ["اللہ کے نام سے..."]
  },
  "translation_meta": {
    "ur.ai": {
      "ai_generated": true,
      "model": "claude-opus-4-6-20260205",
      "generated_date": "2026-02-23"
    }
  }
}
```

### Attribution in Translation Registry (index/translations.json)

```json
{
  "id": "ur.ai",
  "lang": "ur",
  "name": "AI Translation (Urdu)",
  "ai_generated": true,
  "model": "claude-opus-4-6-20260205",
  "generated_date": "2026-02-23",
  "disclaimer": "Generated by Claude Opus 4.6. May contain errors. Not a substitute for scholarly translation."
}
```

### Attribution in Angular UI

- Translation selector shows "AI Translation (Urdu)" with a distinct icon/badge
- Disclaimer banner on first use of any AI translation
- Tooltip on hover showing model and date
- "AI Generated" badge on verse cards when displaying AI translations

---

## 8. Storage & Persistence

### Decision: ThaqalaynDataGenerator Repository (ai-content/)

AI-generated content is persisted in **ThaqalaynDataGenerator** under a new `ai-content/` directory (committed to git, unlike `raw/` which is gitignored).

**Why not ThaqalaynData?** ThaqalaynData is deployed as-is to Netlify CDN. Everything in that repo is served to browsers. Putting intermediate AI data there would:
- Deploy hundreds of MB of JSONL, manifests, and validation data that no browser ever fetches
- Duplicate content (raw AI results + merged `books/` files both contain the translations)
- Bloat the CDN with non-useful data

**Why not ThaqalaynDataGenerator `raw/`?** The `raw/` directory is gitignored because its contents are free to re-download from external sources. AI content costs ~$6,400 to reproduce and must be committed.

| Directory | Gitignored? | Contents | Cost to Reproduce |
|-----------|:-----------:|----------|:-----------------:|
| `raw/` | Yes | External source data (HTML, API JSON) | Free (re-scrape) |
| **`ai-content/`** | **No** | **AI-generated translations, analysis** | **~$6,400** |

This fits the existing data flow — both directories are **inputs** to the generation pipeline:

```
ThaqalaynDataGenerator/
  raw/          → parsers read external sources    → write to ThaqalaynData/books/
  ai-content/   → ingestion reads AI results       → write to ThaqalaynData/books/
                                                   → write to ThaqalaynData/words/
```

**ThaqalaynData stays clean** — only served files that the Angular app actually fetches.

### Directory Structure

```
ThaqalaynDataGenerator/
  ai-content/                                ← committed to git (original content)
    manifest.json                            ← pipeline state & tracking
    metadata.json                            ← global attribution & stats
    raw/                                     ← raw API results (never modified)
      generation/
        batch_abc123_results.jsonl
        batch_def456_results.jsonl
      validation/
        batch_val_xyz789_results.jsonl
    validated/                               ← post-validation, ready to ingest
      al-kafi/
        ur/1_1_1.json                        ← per-chapter validated results
        ur/1_1_2.json
      quran/
        ur/1.json
        ur/2.json
    rejected/                                ← failed validation, for review
      al-kafi/
        ur/rejected.jsonl
    samples/                                 ← initial review samples
      al-kafi_ur_sample.json
      quran_fa_sample.json

ThaqalaynData/                               ← only served files (deployed to CDN)
  books/                                     ← translations merged into existing files
    al-kafi/1/1/1.json                       ← existing + new AI translation fields
  words/                                     ← new: word-by-word analysis
    al-kafi/1/1/1.json                       ← per-chapter word analysis
    quran/1.json                             ← per-surah word analysis
  index/
    translations.json                        ← updated with AI translation entries
```

### What Gets Committed Where

| Content | Repository | Committed | Served to Angular |
|---------|-----------|:---------:|:-----------------:|
| `ai-content/manifest.json` | DataGenerator | Yes | No |
| `ai-content/metadata.json` | DataGenerator | Yes | No |
| `ai-content/raw/*.jsonl` | DataGenerator | Yes (LFS if >100MB) | No |
| `ai-content/validated/*.json` | DataGenerator | Yes | No |
| `ai-content/rejected/*.jsonl` | DataGenerator | Yes | No |
| `ai-content/samples/*.json` | DataGenerator | Yes | No |
| `books/*` (with translations merged) | Data | Yes | **Yes** |
| `words/*` (word-by-word) | Data | Yes | **Yes** |
| `index/translations.json` (updated) | Data | Yes | **Yes** |

### Git Workflow for AI Content

Since raw API results can be large (potentially hundreds of MB of JSONL), use Git LFS for `ai-content/raw/` if total size exceeds 100 MB. The validated per-chapter files in `ai-content/validated/` are smaller and can use regular git.

### Ingestion Step

The ingestion step in the pipeline reads from `ThaqalaynDataGenerator/ai-content/validated/` and writes merged output to `ThaqalaynData/`. This is analogous to how parsers read from `raw/` and write to ThaqalaynData — the generator project transforms source data into served data.

```bash
# Ingest reads from ai-content/validated/, writes to DESTINATION_DIR (ThaqalaynData)
python -m app.ai_pipeline ingest --manifest ai-content/manifest.json
```

---

## 9. Sample-First Approach

### Rationale

Before running the full pipeline (~$4,700), generate a small representative sample for human review. This validates:
- Translation quality across different content types
- Word-by-word analysis accuracy
- Tag relevance and consistency
- Prompt effectiveness
- Output JSON structure correctness

### Sample Plan

Generate **5 samples per book category** across **3 languages** (Urdu, Farsi, Turkish — most critical):

| Book | Sample Verses | Content Types |
|------|--------------|---------------|
| **Quran** (Al-Fatiha, Al-Baqarah, Al-Ikhlas) | 5 ayat | Short surah, long surah, theological |
| **Al-Kafi** (various volumes) | 5 hadiths | Legal, ethical, narrative, du'a, short chain |
| **Nahj al-Balaghah** | 3 passages | Sermon, letter, saying |
| **Man La Yahduruh al-Faqih** | 3 hadiths | Jurisprudential |
| **Other books** | 4 hadiths | Various |

Total: ~20 verses × 3 languages = **60 API calls** (~$1.50, trivial cost).

### Review Checklist

For each sample, verify:
- [ ] Translation reads naturally in target language
- [ ] Islamic terminology preserved correctly
- [ ] Honorifics present and correct
- [ ] Word-by-word analysis has correct roots and POS tags
- [ ] Diacritized text is correctly voweled (compare with known-good sources)
- [ ] Diacritics status accurately reflects what was changed
- [ ] Tags are relevant to content
- [ ] Summary accurately captures meaning
- [ ] No hallucinated Quran references
- [ ] JSON structure is valid and complete
- [ ] Compare with existing human translations where available
- [ ] Optional: cross-check diacritization with CAMeL Tools or Mishkal output

---

## 10. Cost Estimates

### Generation Pass (Opus 4.6 Batch)

| Metric | Value |
|--------|-------|
| Total verses | 40,621 (hadith) + 6,236 (Quran) = 46,857 |
| Languages | 10 |
| Total requests | 468,570 |
| Est. input tokens/request | 550 |
| Est. output tokens/request | 1,000 (translation + word-by-word + diacritization + tags + summary + glossary + refs + SEO) |
| Total input tokens | ~258M |
| Total output tokens | ~469M |
| Input cost ($2.50/MTok) | ~$645 |
| Output cost ($12.50/MTok) | ~$5,863 |
| **Generation total** | **~$6,508** |

### Validation Pass (Sonnet 4.6 Batch)

| Metric | Value |
|--------|-------|
| Total requests | 468,570 |
| Est. input tokens/request | 600 (includes original + AI translation) |
| Est. output tokens/request | 100 |
| Total input tokens | ~281M |
| Total output tokens | ~47M |
| Input cost ($1.50/MTok) | ~$422 |
| Output cost ($7.50/MTok) | ~$352 |
| **Validation total** | **~$774** |

### Regeneration Pass (Opus 4.6 Batch, est. 5% failure rate)

| Metric | Value |
|--------|-------|
| Requests (~5% of total) | ~23,400 |
| Cost (same rate as generation) | ~$325 |
| **Regeneration total** | **~$325** |

### Grand Total

| Phase | Cost |
|-------|------|
| Samples (60 calls) | ~$2 |
| Generation | ~$6,508 |
| Validation | ~$774 |
| Regeneration | ~$325 |
| **Pipeline total** | **~$7,609** |
| Budget remaining after | ~$6,391 |

---

## 11. Quran-Specific Considerations

### Dual Data Source Strategy

The Quran gets **both** QUL (free structured data) **and** AI-generated analysis:

| Feature | QUL Data | AI-Generated |
|---------|----------|-------------|
| Word-by-word translation | 16 languages, curated | 10 languages, AI |
| Morphological analysis | Full (root, lemma, POS, gender, number, case) | Basic (root, POS) |
| Word translations | Scholarly, verified | AI-generated, labelled |
| Thematic tags | Not available | AI-generated |
| Summaries | Not available | AI-generated |
| Cost | Free | Included in pipeline |

**QUL is the primary source for word-by-word Quran data.** AI-generated word analysis supplements it with:
- Translations in languages QUL doesn't cover
- Cross-verification (compare AI roots with QUL roots)
- Consistency with the hadith word-by-word format

**Diacritization does NOT apply to Quran.** The Quran text from Tanzil.net is already fully voweled in the authoritative Uthmanic script. The diacritization feature is for hadith books only, where source text often has partial or no tashkeel.

### Quran Translation Sensitivity

Quran translation is more sensitive than hadith translation. The system prompt includes additional guidance:

```
For Quran translations: These are the words of Allah. Translate with utmost reverence
and precision. Follow established translation conventions for your target language.
When multiple valid interpretations exist, choose the most widely accepted one and
do not add interpretive notes.
```

### QUL Data Processing (Separate from AI Pipeline)

QUL data processing is a separate task that runs independently:

1. Download QUL SQLite/JSON from https://qul.tarteel.ai/
2. Parse into per-ayah word files (`words/quran/{surah}/{ayah}.json`)
3. Generate root index (`words/index/roots.json`)
4. Generate root detail pages (`words/roots/{root}.json`)

The AI pipeline supplements this with translations and tags, but QUL provides the authoritative morphological analysis.

---

## 12. Hadith Similarity Detection

### Goal

Show users which hadiths across different books are similar or related — the same narration appearing in multiple collections, or hadiths covering the same topic with different wording. This is a core scholarly feature since Islamic scholars have always cross-referenced narrations across collections.

### Approach Options

| Approach | How It Works | Pros | Cons | Cost |
|----------|-------------|------|------|------|
| **A. TF-IDF + Cosine Similarity** | Build TF-IDF vectors from Arabic text (after normalization), compute pairwise cosine similarity | Fast, well-understood, no API costs, runs offline | Only catches lexical overlap, misses semantic similarity | Free |
| **B. Jaccard on Normalized N-grams** | Normalize Arabic, generate character/word n-grams, compute Jaccard index | Very fast, good for near-duplicates, no dependencies | Only catches surface-level overlap | Free |
| **C. LCS (Longest Common Subsequence)** | Already implemented in `arabic_normalization.py` for cross-validation diff viewer | Reuses existing code, good for textual variants | O(n²) per pair, slow for full corpus comparison | Free |
| **D. Arabic Sentence Embeddings** | Use a multilingual embedding model (e.g., `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`) to embed each hadith, then nearest-neighbor search | Catches semantic similarity even with different wording | Requires Python ML library, large model download | Free (local) |
| **E. AI-Generated Similarity** | Ask Claude to identify similar hadiths as part of the content generation pipeline | Highest quality, can explain WHY hadiths are similar | Expensive, hard to do pairwise across 40k hadiths | ~$$$$ |
| **F. Hybrid: TF-IDF + Embeddings** | Use TF-IDF for initial candidate filtering (top 100 per hadith), then embeddings for re-ranking | Best quality/cost tradeoff, manageable computation | More complex pipeline | Free (local) |

### Recommended Approach: F (Hybrid) + E (AI for top matches)

**Phase 1 — Offline computation (free):**
1. Normalize all Arabic text (strip diacritics, normalize hamza/teh marbuta — reuse existing `arabic_normalization.py`)
2. Build TF-IDF matrix across all ~40,000 hadiths
3. For each hadith, find top 50 candidates by cosine similarity
4. Re-rank candidates using Arabic sentence embeddings (local model, no API)
5. Output: per-hadith list of similar hadiths with confidence scores

**Phase 2 — AI enrichment (within existing pipeline):**
Add to the combined API call prompt:
```
10. "similar_to_reason": If this hadith is commonly cross-referenced with other
    narrations, briefly explain why (1 sentence) or null if not applicable.
```

This doesn't find similar hadiths (that's the offline computation), but provides scholarly context for known relationships.

### Output Format

```json
{
  "path": "/books/al-kafi:1:1:1:5",
  "similar_hadiths": [
    {
      "path": "/books/man-la-yahduruh:1:2:15",
      "confidence": 0.92,
      "method": "tfidf+embedding",
      "overlap_type": "same_narration"
    },
    {
      "path": "/books/tahdhib:3:1:42",
      "confidence": 0.78,
      "method": "tfidf+embedding",
      "overlap_type": "similar_topic"
    }
  ]
}
```

### Storage

Pre-computed similarity data stored in ThaqalaynData:

```
ThaqalaynData/
  similarity/
    al-kafi/1_1_1.json        ← per-chapter similarity data
    quran/1.json               ← per-surah (for Quran cross-references)
    index.json                 ← metadata (computation date, model, threshold)
```

### Angular UI

- Expandable "Similar Narrations" panel on verse-detail page
- Shows matching hadiths with confidence score and collection name
- Click to navigate to the similar hadith
- Diff view (reuse existing DiffViewerComponent) to show textual differences

### Libraries for Arabic NLP

| Library | Purpose | Installation |
|---------|---------|-------------|
| `scikit-learn` | TF-IDF vectorizer, cosine similarity | `pip install scikit-learn` |
| `sentence-transformers` | Arabic sentence embeddings | `pip install sentence-transformers` |
| `camel-tools` | Arabic morphological analysis (optional) | `pip install camel-tools` |
| `faiss` | Fast approximate nearest neighbor search (for scale) | `pip install faiss-cpu` |

### Why Not Pure AI?

Pairwise comparison of 40,000 hadiths = 800 million pairs. Even at Haiku pricing, this would cost tens of thousands of dollars. The hybrid approach uses free local computation for the heavy lifting and reserves AI for enrichment only.

---

## Appendix A: Supported Languages

| Code | Language | Native Name | Script | Translation Notes |
|------|----------|-------------|--------|-------------------|
| `ur` | Urdu | اردو | Arabic | Rich Islamic scholarly tradition. Use established Urdu hadith terminology. |
| `tr` | Turkish | Türkçe | Latin | Modern Turkish. Transliterate Arabic names to Turkish conventions. |
| `fa` | Farsi | فارسی | Arabic | Deep Islamic scholarly tradition. Use standard Farsi religious vocabulary. |
| `id` | Indonesian | Bahasa Indonesia | Latin | Large Muslim population. Use established Indonesian Islamic terms. |
| `bn` | Bengali | বাংলা | Bengali | Use established Bangla Islamic vocabulary. |
| `es` | Spanish | Español | Latin | Growing Muslim community. Less established Islamic terminology. |
| `fr` | French | Français | Latin | North African Muslim diaspora. Some established Islamic French terms. |
| `de` | German | Deutsch | Latin | Smaller Muslim community. Fewer established conventions. |
| `ru` | Russian | Русский | Cyrillic | Central Asian Muslim traditions. Some established terminology. |
| `zh` | Chinese | 中文 | CJK | Hui Muslim tradition. Use established Chinese Islamic terms (回教). |

### Priority Tiers

- **Tier 1 (highest priority):** Urdu, Turkish, Farsi — largest Shia-interested audiences
- **Tier 2:** Indonesian, Bengali — large Muslim populations
- **Tier 3:** Spanish, French, German, Russian, Chinese — growing diaspora communities

---

## Appendix B: Controlled Tag Vocabulary

Tags are drawn from a controlled vocabulary to ensure consistency across the corpus:

| Tag | Description |
|-----|-------------|
| `theology` | Beliefs about God, prophets, imams, afterlife, divine attributes |
| `ethics` | Moral teachings, virtues, character |
| `jurisprudence` | Legal rulings, halal/haram, fiqh |
| `worship` | Prayer, fasting, hajj, zakat, ritual acts |
| `quran-commentary` | Interpretation or context for Quran verses |
| `prophetic-tradition` | Sayings or actions of the Prophet Muhammad |
| `family` | Marriage, parenting, family relations |
| `social-relations` | Community, neighbors, justice, rights |
| `knowledge` | Seeking knowledge, scholarship, learning |
| `dua` | Supplications and prayers |
| `afterlife` | Paradise, hell, Day of Judgment, barzakh |
| `history` | Historical events, biographies, battles |
| `economy` | Trade, wealth, poverty, financial ethics |
| `governance` | Leadership, authority, political ethics |
