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
6B. [Quran Reference Validation](#6b-quran-reference-validation)
6C. [Arabic Root Cross-Validation (CAMeL Tools)](#6c-arabic-root-cross-validation-camel-tools)
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

### Multi-Language Strategy

Each API call processes **one verse × all 10 languages** in a single request. This is better than one-language-at-a-time because:

1. **Language-independent outputs** (word analysis, diacritization, tags) are generated once instead of 10 times
2. **Input tokens** (Arabic text + system prompt) are sent once instead of 10 times
3. **Cross-language consistency** — the model settles on one interpretation and applies it uniformly
4. **63% cost reduction** — from ~$6,500 to ~$2,400 for the generation pass

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
- For ALL enum fields, use ONLY the exact values listed. Do not invent new values.
- Output valid JSON only
```

**User message:**
```
Arabic text: {ARABIC_TEXT}
English reference translation: {ENGLISH_TEXT}
Book: {BOOK_NAME}
Chapter: {CHAPTER_TITLE}
Hadith number: {HADITH_NUMBER}

Generate a single JSON object with these fields:

1. "diacritized_text": (string) The full Arabic text with complete tashkeel (fatha, kasra,
   damma, sukun, shadda, tanwin on every applicable letter). If the original already has
   diacritics, preserve correct ones and fix errors. If partial, complete the missing ones.

2. "diacritics_status": (enum) MUST be exactly one of these values:
   - "added"      — original had no/minimal diacritics, full tashkeel was added
   - "completed"  — original had partial diacritics, missing ones were filled in
   - "validated"  — original had full diacritics, all were correct, no changes made
   - "corrected"  — original had full diacritics, but some errors were fixed

3. "diacritics_changes": (array) Corrections made to existing diacritics. Empty array []
   if diacritics_status is "added" or "validated". Each entry:
   {"original": "عَلِمَ", "corrected": "عُلِمَ", "reason": "passive voice per context"}

4. "word_analysis": (array) One entry per Arabic word in order of appearance:
   [
     {
       "word": "بِسْمِ",
       "translation_en": "In the name of",
       "root": "س م و",
       "pos": (enum) MUST be exactly one of:
             "N"     — noun (اسم)
             "V"     — verb (فعل)
             "ADJ"   — adjective (صفة)
             "ADV"   — adverb (ظرف)
             "PREP"  — preposition (حرف جر)
             "CONJ"  — conjunction (حرف عطف)
             "PRON"  — pronoun (ضمير)
             "DET"   — determiner/article (أداة تعريف)
             "PART"  — particle (حرف)
             "INTJ"  — interjection (حرف نداء)
             "REL"   — relative pronoun (اسم موصول)
             "DEM"   — demonstrative (اسم إشارة)
             "NEG"   — negation particle (حرف نفي)
             "COND"  — conditional particle (أداة شرط)
             "INTERR" — interrogative (أداة استفهام),
       "is_proper_noun": (boolean) true if this word is a proper noun (name of a
             person, place, tribe, book, etc.) — e.g., محمد, مكة, قريش. false otherwise.
     }
   ]

5. "tags": (array of 2-5 enums) Each tag MUST be exactly one of:
   - "theology"            — beliefs about God, prophets, imams, divine attributes
   - "ethics"              — moral teachings, virtues, character development
   - "jurisprudence"       — legal rulings, halal/haram, fiqh obligations
   - "worship"             — prayer, fasting, hajj, zakat, ritual acts
   - "quran_commentary"    — interpretation or context for Quran verses
   - "prophetic_tradition" — sayings or actions of Prophet Muhammad (saww)
   - "family"              — marriage, parenting, family relations, inheritance
   - "social_relations"    — community, neighbors, justice, rights, brotherhood
   - "knowledge"           — seeking knowledge, scholarship, learning, teachers
   - "dua"                 — supplications, prayers, dhikr
   - "afterlife"           — paradise, hell, Day of Judgment, barzakh, death
   - "history"             — historical events, biographies, battles, migrations
   - "economy"             — trade, wealth, poverty, charity, financial ethics
   - "governance"          — leadership, authority, political ethics, wilayah

6. "hadith_type": (enum) MUST be exactly one of:
   - "legal_ruling"         — contains a specific fiqhi/legal ruling
   - "ethical_teaching"     — moral or ethical instruction
   - "dua"                  — supplication or prayer text
   - "narrative"            — story or historical account
   - "prophetic_tradition"  — direct saying or action of the Prophet (saww)
   - "quranic_commentary"   — explanation or context for a Quran verse
   - "supplication"         — formulaic prayer or devotional text
   - "creedal"              — statement of belief or theological principle
   - "eschatological"       — about end times, resurrection, afterlife events
   - "biographical"         — about a specific person's life or character

7. "related_quran": (array of objects) Quran references related to this hadith.
   Only include clearly related verses. Empty array [] if none.
   Each entry:
   {
     "ref": "96:1",
     "relationship": (enum) MUST be exactly one of:
           "explicit"  — the hadith directly quotes, cites, or explains this verse
           "thematic"  — the hadith covers a related theme or topic without direct citation
   }
   Example: [{"ref": "96:1", "relationship": "explicit"}, {"ref": "20:114", "relationship": "thematic"}]

8. "translations": (object) Translations into ALL of the following 10 languages.
   For each language, provide:
   - "text": (string) faithful translation of the hadith
   - "summary": (string) 1-2 sentence summary in that language
   - "key_terms": (object) Arabic terms mapped to explanations in that language
   - "seo_question": (string) a natural question this hadith answers, in that language

   Languages (use these exact keys):
   {
     "ur": { "text": "...", "summary": "...", "key_terms": {...}, "seo_question": "..." },
     "tr": { "text": "...", "summary": "...", "key_terms": {...}, "seo_question": "..." },
     "fa": { "text": "...", "summary": "...", "key_terms": {...}, "seo_question": "..." },
     "id": { "text": "...", "summary": "...", "key_terms": {...}, "seo_question": "..." },
     "bn": { "text": "...", "summary": "...", "key_terms": {...}, "seo_question": "..." },
     "es": { "text": "...", "summary": "...", "key_terms": {...}, "seo_question": "..." },
     "fr": { "text": "...", "summary": "...", "key_terms": {...}, "seo_question": "..." },
     "de": { "text": "...", "summary": "...", "key_terms": {...}, "seo_question": "..." },
     "ru": { "text": "...", "summary": "...", "key_terms": {...}, "seo_question": "..." },
     "zh": { "text": "...", "summary": "...", "key_terms": {...}, "seo_question": "..." }
   }
```

> **Dropped from prompt: `historical_context`.** High hallucination risk for religious texts. Most hadiths have no documented historical circumstances. See "What's In Scope" table for rationale.

### Enum Validation (Post-Processing)

Even with explicit enum values in the prompt, the pipeline validates every enum field after receiving the response:

```python
VALID_DIACRITICS_STATUS = {"added", "completed", "validated", "corrected"}
VALID_POS_TAGS = {"N", "V", "ADJ", "ADV", "PREP", "CONJ", "PRON", "DET",
                  "PART", "INTJ", "REL", "DEM", "NEG", "COND", "INTERR"}
VALID_TAGS = {"theology", "ethics", "jurisprudence", "worship", "quran_commentary",
              "prophetic_tradition", "family", "social_relations", "knowledge",
              "dua", "afterlife", "history", "economy", "governance"}
VALID_HADITH_TYPES = {"legal_ruling", "ethical_teaching", "dua", "narrative",
                      "prophetic_tradition", "quranic_commentary", "supplication",
                      "creedal", "eschatological", "biographical"}
VALID_LANGUAGE_KEYS = {"ur", "tr", "fa", "id", "bn", "es", "fr", "de", "ru", "zh"}
VALID_QURAN_RELATIONSHIPS = {"explicit", "thematic"}

def validate_enums(result):
    errors = []
    if result["diacritics_status"] not in VALID_DIACRITICS_STATUS:
        errors.append(f"invalid diacritics_status: {result['diacritics_status']}")
    if result["hadith_type"] not in VALID_HADITH_TYPES:
        errors.append(f"invalid hadith_type: {result['hadith_type']}")
    for tag in result["tags"]:
        if tag not in VALID_TAGS:
            errors.append(f"invalid tag: {tag}")
    for word in result["word_analysis"]:
        if word["pos"] not in VALID_POS_TAGS:
            errors.append(f"invalid pos: {word['pos']} for word {word['word']}")
        if not isinstance(word.get("is_proper_noun"), bool):
            errors.append(f"invalid is_proper_noun: {word.get('is_proper_noun')} for word {word['word']}")
    for ref_obj in result.get("related_quran", []):
        if ref_obj.get("relationship") not in VALID_QURAN_RELATIONSHIPS:
            errors.append(f"invalid quran relationship: {ref_obj.get('relationship')} for ref {ref_obj.get('ref')}")
        # Validate surah:ayah format
        ref = ref_obj.get("ref", "")
        parts = ref.split(":")
        if len(parts) != 2 or not parts[0].isdigit() or not parts[1].isdigit():
            errors.append(f"invalid quran ref format: {ref}")
        elif not (1 <= int(parts[0]) <= 114):
            errors.append(f"invalid surah number: {parts[0]} in ref {ref}")
    for key in result["translations"]:
        if key not in VALID_LANGUAGE_KEYS:
            errors.append(f"invalid language key: {key}")
    missing_langs = VALID_LANGUAGE_KEYS - set(result["translations"].keys())
    if missing_langs:
        errors.append(f"missing languages: {missing_langs}")
    return errors
```

Items with enum validation errors are sent to the retry queue rather than rejected outright — the model may have used a close variant (e.g., `"Noun"` instead of `"N"`) that can be fixed with a targeted retry prompt.

### Output Schema Per Verse (Multi-Language)

```json
{
  "diacritized_text": "عَنْ عِدَّةٍ مِنْ أَصْحَابِنَا عَنْ أَحْمَدَ بْنِ مُحَمَّدِ بْنِ خَالِدٍ...",
  "diacritics_status": "completed",
  "diacritics_changes": [],
  "word_analysis": [
    {
      "word": "عَنْ",
      "translation_en": "from/about",
      "root": "ع ن ن",
      "pos": "PREP",
      "is_proper_noun": false
    },
    {
      "word": "عِدَّةٍ",
      "translation_en": "a number of",
      "root": "ع د د",
      "pos": "N",
      "is_proper_noun": false
    }
  ],
  "tags": ["theology", "knowledge"],
  "hadith_type": "ethical_teaching",
  "related_quran": [
    {"ref": "96:1", "relationship": "explicit"},
    {"ref": "20:114", "relationship": "thematic"}
  ],
  "translations": {
    "ur": {
      "text": "اردو ترجمہ...",
      "summary": "امام نے فرمایا کہ ہر مسلمان پر علم حاصل کرنا فرض ہے۔",
      "key_terms": {"العلم": "علم، خاص طور پر دینی علم", "الفريضة": "دینی فریضہ"},
      "seo_question": "علم حاصل کرنے کی اسلامی ذمہ داری کیا ہے؟"
    },
    "tr": {
      "text": "Türkçe çeviri...",
      "summary": "İmam, ilim öğrenmenin her Müslümana farz olduğunu açıklamaktadır.",
      "key_terms": {"العلم": "İlim, özellikle dini bilgi", "الفريضة": "Dini yükümlülük"},
      "seo_question": "İlim öğrenmenin İslami yükümlülüğü nedir?"
    },
    "fa": { "text": "...", "summary": "...", "key_terms": {}, "seo_question": "..." },
    "id": { "text": "...", "summary": "...", "key_terms": {}, "seo_question": "..." },
    "bn": { "text": "...", "summary": "...", "key_terms": {}, "seo_question": "..." },
    "es": { "text": "...", "summary": "...", "key_terms": {}, "seo_question": "..." },
    "fr": { "text": "...", "summary": "...", "key_terms": {}, "seo_question": "..." },
    "de": { "text": "...", "summary": "...", "key_terms": {}, "seo_question": "..." },
    "ru": { "text": "...", "summary": "...", "key_terms": {}, "seo_question": "..." },
    "zh": { "text": "...", "summary": "...", "key_terms": {}, "seo_question": "..." }
  }
}
```

### Token Estimates Per Request (Multi-Language)

| Component | Est. input tokens | Est. output tokens |
|-----------|------------------:|-------------------:|
| System prompt | ~300 | — |
| Arabic text + English ref + context | ~350 | — |
| **Language-independent (generated once):** | | |
| Diacritized text + status + changes | — | ~200 |
| Word analysis | — | ~400 |
| Tags + type + related Quran | — | ~80 |
| **Per-language (× 10):** | | |
| Translation text (× 10) | — | ~2,000 |
| Summary (× 10) | — | ~500 |
| Key terms (× 10) | — | ~500 |
| SEO question (× 10) | — | ~300 |
| **Total per request** | **~650** | **~3,980** |

Compared to single-language approach (10 separate calls):
- Input: 650 vs 5,500 tokens (8.5× savings)
- Output: 3,980 vs 10,000 tokens (2.5× savings)
- API calls: 46,857 vs 468,570 (10× fewer)

---

## 4. Pipeline Architecture

### Overview

```
┌─────────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Generate    │────▶│  Submit   │────▶│   Poll   │────▶│ Download │
│  JSONL files │     │  batches  │     │  status  │     │ results  │
└─────────────┘     └──────────┘     └──────────┘     └──────────┘
                                                             │
                   ┌───────────────────────────────────────────┘
                   ▼
┌──────────────┐     ┌──────────────┐     ┌──────────┐     ┌──────────┐
│ Validate     │────▶│ Validate     │────▶│ Validate │────▶│ Regen    │
│ Quran refs   │     │ roots (CAMeL)│     │ (Pass 2) │     │ failures │
└──────────────┘     └──────────────┘     └──────────┘     └──────────┘
                                                                  │
                    ┌──────────┐     ┌──────────┐                │
                    │  Serve   │◀────│  Ingest  │◀───────────────┘
                    │  (merge) │     │  (write) │
                    └──────────┘     └──────────┘
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

# Step 5a: Validate Quran references against actual Quran text (local, no API cost)
python -m app.ai_pipeline validate-quran-refs --manifest jobs/main.json

# Step 5b: Cross-validate Arabic roots against CAMeL Tools (local, no API cost)
python -m app.ai_pipeline validate-roots --manifest jobs/main.json

# Step 6: Run translation quality validation pass (Sonnet 4.6 batch)
python -m app.ai_pipeline validate --manifest jobs/main.json

# Step 7: Regenerate items that failed validation
python -m app.ai_pipeline regenerate --manifest jobs/main.json --threshold 7

# Step 8: Ingest validated results into data files (resumable from checkpoint)
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
| **Quran ref validation crash** | `quran_ref_validation.last_checkpoint` set | Re-run `validate-quran-refs` — resumes from checkpoint |
| **Root validation crash** | `root_validation.last_checkpoint` set | Re-run `validate-roots` — resumes from checkpoint |
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
| `validate-quran-refs` | Skips chapters already validated, resumes from checkpoint |
| `validate-roots` | Skips chapters already validated, resumes from checkpoint |
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

## 6B. Quran Reference Validation

### Problem

The AI's `related_quran` suggestions have a **high hallucination risk** — the model may suggest Quran verse references that are plausible-sounding but incorrect. Since this is a religious text platform, incorrect cross-references are unacceptable without clear labelling.

### Validation Pipeline Step

After downloading AI results (Step 4) and before ingestion (Step 7), a **Quran reference validation step** checks every AI-suggested reference against the actual Quran text in ThaqalaynData.

```
┌──────────┐     ┌──────────────┐     ┌──────────┐     ┌──────────┐
│ Download │────▶│ Validate     │────▶│ Validate │────▶│ Regen    │
│ results  │     │ Quran refs   │     │ (Pass 2) │     │ failures │
└──────────┘     └──────────────┘     └──────────┘     └──────────┘
```

### How It Works

For each AI-suggested `related_quran` entry:

1. **Load the actual Quran text** for the referenced surah:ayah from `ThaqalaynData/books/quran:{surah}/{verse}.json`
2. **Extract the Arabic text** of the referenced ayah
3. **Search the hadith Arabic text** for textual overlap with the ayah:
   - Normalize both texts (strip diacritics, normalize hamza/teh marbuta — reuse `arabic_normalization.py`)
   - Look for shared n-grams (minimum 3 consecutive words) between hadith text and ayah text
   - Compute a text overlap score (0.0–1.0)
4. **Classify the reference** based on overlap + AI-declared relationship:

| AI Declared | Text Overlap Score | Final Classification | Action |
|-------------|-------------------|---------------------|--------|
| `explicit` | ≥ 0.3 (shared phrases found) | `explicit_verified` | Accept — strong evidence |
| `explicit` | < 0.3 (no textual overlap) | `thematic_unverified` | **Downgrade** — AI claimed explicit but no textual evidence |
| `thematic` | ≥ 0.3 (shared phrases found) | `explicit_verified` | **Upgrade** — AI was conservative, text proves direct link |
| `thematic` | < 0.3 | `thematic_unverified` | Accept at lower confidence |

5. **Invalid references** (surah > 114, ayah > max for that surah) are **rejected entirely**

### Output Classifications

After validation, every Quran cross-reference in the served data carries one of three relationship types:

| Classification | Source | Meaning | UI Display |
|----------------|--------|---------|------------|
| `explicit_reference` | Existing `link_books.py` regex detection | Quran text appears verbatim in the hadith. Detected by pattern matching, not AI. | Full confidence — no badge needed |
| `explicit_verified` | AI-suggested + text overlap confirmed | AI identified the reference AND textual overlap was found | High confidence badge |
| `thematic_unverified` | AI-suggested, no textual overlap confirmed | AI suggests a thematic connection but it could not be verified against the text | "AI Suggested" badge with lower visual weight |

### Storage of Validation Results

Validation results are stored alongside AI content in ThaqalaynDataGenerator:

```
ThaqalaynDataGenerator/
  ai-content/
    quran-ref-validation/
      summary.json               ← aggregate stats (verified/downgraded/upgraded/rejected counts)
      al-kafi/
        1_1_1.json               ← per-chapter validation results
      rejected/
        rejected_refs.jsonl      ← all rejected/invalid references with reasons
```

Each per-chapter validation file:

```json
{
  "chapter_path": "/books/al-kafi:1:1:1",
  "validated_at": "2026-02-24T10:00:00Z",
  "references": [
    {
      "hadith_path": "/books/al-kafi:1:1:1:3",
      "ref": "96:1",
      "ai_relationship": "explicit",
      "text_overlap_score": 0.72,
      "shared_phrases": ["اقْرَأْ بِاسْمِ رَبِّكَ"],
      "final_classification": "explicit_verified"
    },
    {
      "hadith_path": "/books/al-kafi:1:1:1:5",
      "ref": "20:114",
      "ai_relationship": "thematic",
      "text_overlap_score": 0.08,
      "shared_phrases": [],
      "final_classification": "thematic_unverified"
    }
  ]
}
```

### CLI Command

```bash
# Run after download, before validation pass
python -m app.ai_pipeline validate-quran-refs --manifest jobs/main.json

# View summary
python -m app.ai_pipeline validate-quran-refs --manifest jobs/main.json --summary
```

### Angular UI Impact

- **`explicit_reference`** (from `link_books.py`): Displayed as current "Mentions" links — no change needed
- **`explicit_verified`** (AI + text match): Displayed with a Quran icon and high confidence styling
- **`thematic_unverified`** (AI only): Displayed with a lighter "Related" label and "AI Suggested" badge. Users understand this is a thematic connection, not a proven citation.

---

## 6C. Arabic Root Cross-Validation (CAMeL Tools)

### Problem

AI-generated Arabic word roots in `word_analysis` have a **medium-high hallucination risk**. The model may produce plausible but incorrect roots, especially for rare words, loan words, or words with irregular derivations.

### Solution: Cross-Check Against CAMeL Tools

[CAMeL Tools](https://github.com/CAMeL-Lab/camel_tools) is an open-source Arabic NLP toolkit developed by NYU Abu Dhabi. It provides morphological analysis grounded in established Arabic linguistic databases (SAMA/ALMOR).

### How It Works

1. **For each word in `word_analysis`**, run CAMeL Tools morphological analyzer:
   ```python
   from camel_tools.morphology.analyzer import Analyzer

   analyzer = Analyzer.builtin_analyzer(db_name='calima-msa-s31')

   def validate_root(word: str, ai_root: str) -> dict:
       analyses = analyzer.analyze(word)
       camel_roots = {a.get('root', '') for a in analyses if a.get('root')}

       # Normalize root format: CAMeL uses "s-m-w", our format is "س م و"
       ai_root_normalized = ai_root.replace(" ", "")
       camel_roots_normalized = {r.replace("-", "") for r in camel_roots}

       match = ai_root_normalized in camel_roots_normalized
       return {
           "word": word,
           "ai_root": ai_root,
           "camel_roots": list(camel_roots),
           "match": match,
           "camel_pos_tags": [a.get('pos') for a in analyses]
       }
   ```

2. **Classification:**

| Scenario | Action |
|----------|--------|
| AI root matches one of CAMeL's analyses | **Accept** — root is verified |
| AI root doesn't match but CAMeL has analyses | **Flag** — add `root_verified: false` to output, log discrepancy |
| CAMeL has no analysis (unknown word) | **Accept AI root** — likely a proper noun or rare term, flag as `root_source: "ai_only"` |
| AI root is empty/missing | **Use CAMeL root** if available, flag as `root_source: "camel"` |

3. **Proper nouns** (where `is_proper_noun: true`) are **exempt** from root validation — proper nouns often have no meaningful Arabic root or have irregular derivations.

### Output Fields Added to word_analysis

After cross-validation, each word entry gains:

```json
{
  "word": "عِلْمٍ",
  "translation_en": "knowledge",
  "root": "ع ل م",
  "pos": "N",
  "is_proper_noun": false,
  "root_verified": true,
  "root_source": "ai+camel"
}
```

| Field | Values | Meaning |
|-------|--------|---------|
| `root_verified` | `true` / `false` | Whether the root was confirmed by CAMeL Tools |
| `root_source` | `"ai+camel"` / `"ai_only"` / `"camel"` | Where the root came from |

### CLI Command

```bash
# Run after download, can run in parallel with Quran ref validation
python -m app.ai_pipeline validate-roots --manifest jobs/main.json

# View summary (match rate, flagged words, corrections)
python -m app.ai_pipeline validate-roots --manifest jobs/main.json --summary
```

### Storage

```
ThaqalaynDataGenerator/
  ai-content/
    root-validation/
      summary.json               ← aggregate stats (match rate, flagged count)
      flagged_roots.jsonl        ← all words where AI root didn't match CAMeL
```

### Installation

```bash
# Add to ThaqalaynDataGenerator dependencies
pip install camel-tools

# Download morphological database (one-time, ~200 MB)
camel_data -i morphology-db-msa-s31
```

### Angular UI Impact

- Words with `root_verified: true` display normally
- Words with `root_verified: false` could show a subtle indicator (e.g., lighter root text or small "?" icon) — optional, depending on UI review
- The `root_source` field is metadata for debugging/auditing, not displayed to users

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
    quran-ref-validation/                    ← Quran reference validation results
      summary.json                           ← aggregate stats
      al-kafi/
        1_1_1.json                           ← per-chapter validated references
      rejected/
        rejected_refs.jsonl                  ← invalid/rejected references
    root-validation/                         ← CAMeL Tools root cross-check results
      summary.json                           ← aggregate stats (match rate, flags)
      flagged_roots.jsonl                    ← words where AI root didn't match CAMeL
    validated/                               ← post-validation, ready to ingest
      al-kafi/
        ur/1_1_1.json                        ← per-chapter validated results
        ur/1_1_2.json
      quran/
        ur/1.json
        ur/2.json
    rejected/                                ← failed translation validation, for review
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
| `ai-content/quran-ref-validation/*` | DataGenerator | Yes | No |
| `ai-content/root-validation/*` | DataGenerator | Yes | No |
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
- [ ] Quran references validated against actual Quran text (explicit vs thematic correctly classified)
- [ ] Proper nouns correctly flagged (`is_proper_noun`)
- [ ] Arabic roots spot-checked against CAMeL Tools output
- [ ] JSON structure is valid and complete
- [ ] Compare with existing human translations where available
- [ ] Optional: cross-check diacritization with CAMeL Tools or Mishkal output

---

## 10. Cost Estimates

### Generation Pass (Opus 4.6 Batch, Multi-Language)

| Metric | Value |
|--------|-------|
| Total verses | 40,621 (hadith) + 6,236 (Quran) = 46,857 |
| Languages per request | 10 (all at once) |
| **Total requests** | **46,857** (not 468,570) |
| Est. input tokens/request | 650 |
| Est. output tokens/request | 3,980 (shared outputs + 10 language-specific outputs) |
| Total input tokens | ~30M |
| Total output tokens | ~187M |
| Input cost ($2.50/MTok) | ~$76 |
| Output cost ($12.50/MTok) | ~$2,338 |
| **Generation total** | **~$2,414** |

### Validation Pass (Sonnet 4.6 Batch)

Validation is still per-language since each translation is reviewed independently.

| Metric | Value |
|--------|-------|
| Total requests | 468,570 (46,857 verses × 10 languages) |
| Est. input tokens/request | 600 (original Arabic + English + AI translation for one language) |
| Est. output tokens/request | 100 (scores + feedback) |
| Total input tokens | ~281M |
| Total output tokens | ~47M |
| Input cost ($1.50/MTok) | ~$422 |
| Output cost ($7.50/MTok) | ~$352 |
| **Validation total** | **~$774** |

### Regeneration Pass (Opus 4.6 Batch, est. 5% failure rate)

Regeneration re-sends the full multi-language request for verses with failures, so the model can maintain cross-language consistency.

| Metric | Value |
|--------|-------|
| Verses requiring regeneration (~5%) | ~2,343 |
| Cost per request (same as generation) | ~$0.052 |
| **Regeneration total** | **~$122** |

### Grand Total

| Phase | Cost |
|-------|------|
| Samples (20 verses × 1 multi-lang call each) | ~$1 |
| Generation (46,857 multi-lang calls) | ~$2,414 |
| Validation (468,570 per-lang reviews) | ~$774 |
| Regeneration (~2,343 multi-lang calls) | ~$122 |
| **Pipeline total** | **~$3,311** |
| Budget remaining after | ~$10,689 |

> **Cost savings from multi-language approach:** ~$4,300 less than single-language (~$7,600). The savings come from sending input tokens once instead of 10 times and generating language-independent outputs (word analysis, diacritization, tags) only once.

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
