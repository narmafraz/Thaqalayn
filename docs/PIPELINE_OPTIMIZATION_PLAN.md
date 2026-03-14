# AI Pipeline Optimization Plan

**Date**: 2026-03-13
**Status**: Proposed
**Purpose**: Reduce AI content generation cost from ~$58K (all-Claude) or ~$6.4K (all-GPT-5.4) to ~$4-13K while maintaining scholarly quality, by splitting the pipeline into specialized phases that leverage each model's strengths. All costs are one-time generation costs — zero ongoing expenses, consistent with the project's zero-cost hosting philosophy.

---

## Constraints

### Access Constraints

| Backend | Access | Implication |
|---------|--------|-------------|
| **Claude** | `claude -p` CLI only | No Anthropic API key available. High per-call overhead (~$1/verse for full pipeline). Cannot use Anthropic Batch API. |
| **OpenAI API** | Chat Completions only | Standard real-time API. Works for all GPT-5 family models. |
| **OpenAI Batch API** | **No access** | API key lacks `api.files.write` scope (401 Unauthorized). Would give 50% discount + no timeout, but blocked. |

### Philosophy Constraints

| Constraint | Implication |
|------------|-------------|
| **Zero ongoing costs** | No paid translation API subscriptions (Azure, Google, DeepL). All costs must be one-time generation costs producing static files served free via Netlify. |
| **No external service dependencies** | Generated content must be self-contained static JSON. No runtime API calls from the app. |

### What these constraints mean for the pipeline

- All cost projections use **standard OpenAI API pricing** (not batch)
- Multi-language translation uses **GPT-5-mini** (one-time cost) instead of Azure/Google Translate (recurring cost)
- Claude is only available via CLI with significant overhead — must minimize Claude calls
- If any of these constraints change in future (Anthropic API key obtained, Batch API access fixed, or a translation API free tier is deemed acceptable), costs could drop significantly — see cost tables for "with Batch API" footnotes

---

## Background

The AI pipeline currently generates 12 fields per verse in a **single monolithic AI call**. This is wasteful because:
1. Many fields don't need AI at all (deterministic/programmatic)
2. Translation to 10 non-English languages can use cheap translation APIs
3. Different AI models excel at different fields — GPT-5.4 for structural tasks, Claude for scholarly analysis

This plan is based on benchmark data from the 15-verse benchmark (2026-03-11) comparing Claude Sonnet, GPT-5.4, GPT-5.2, and GPT-5 on representative verses ranging from 4 to 557 Arabic words.

## Benchmark Results Summary

| Model | Completed | Pass Rate | Cost/15 | Quality | Notes |
|-------|-----------|-----------|---------|---------|-------|
| Claude Sonnet | 11/15 | baseline | $2.63 | Research-grade | Via `claude -p` CLI only (no API key) |
| GPT-5.4 | 13/15 | 85% | $1.46 | Structurally valid, shallow scholarly | 2 long verses timed out (300w, 557w) |
| GPT-5.2 | 8/15 | 37% | $0.71 | High error rate | Not viable |
| GPT-5 | 0/14 | N/A | $0 | Non-functional | Zero HTTP responses in 30+ min |
| GPT-5.3 Codex | 0/15 | N/A | $0 | Incompatible | Uses Responses API, not Chat Completions |

**GPT-5.4 is the viable OpenAI model.** GPT-5.2 and below are not production-quality.

---

## Field-by-Field Quality Comparison: Claude vs GPT-5.4

Based on analysis of 4 matched verse pairs (11w, 39w, 77w, 102w) from the benchmark.

### Fields Where They Tie (4 of 12)

| Field | Notes |
|-------|-------|
| **diacritized_text** | Both produce accurate, complete tashkeel on classical Arabic |
| **diacritics_status** | Both valid enums (Claude: "completed", GPT: "added") |
| **word_tags** (POS) | POS accuracy comparable; minor disagreements in both directions |
| **chunks** (boundaries + translations) | Both segment correctly with faithful per-chunk prose translations |

### Fields Where Claude Wins (8 of 12)

| Field | Gap Size | Example |
|-------|----------|---------|
| **diacritics_changes** | Large | Claude documents before/after corrections; GPT returns empty `[]` on all verses |
| **isnad_matn (narrators)** | **Massive** | Claude: *"Ali ibn Ibrahim al-Qummi, commentator (d. after 307 AH), author of Tafsir al-Qummi"* -- GPT: *"Ali ibn Ibrahim al-Qummi"* (bare name). GPT also returns empty `word_ranges: []` on 2/4 pairs |
| **translations (summaries)** | Large | Claude: *"cornerstone proof-text in Shia jurisprudence for the impermissibility of qiyas"* -- GPT: *"A man asked Abu Abdullah about matters not found..."* (generic retelling) |
| **related_quran** | **Critical** | GPT returned empty `[]` on 2/4 pairs. Where it found refs, it missed thematic ones and misclassified explicit as thematic |
| **topics** | Slight | Claude includes "imamate" and "reasoning" where relevant; GPT substitutes less specific tags |
| **key_phrases** | Moderate | Claude captures doctrinally significant phrases (`كَذَبْتَ عَلَى اللَّهِ`); GPT picks up generic formulae (`عَلَيْهِ السَّلَامُ`) |
| **ambiguity_note** | Moderate | Claude provides chain-contextual reasoning; GPT names possibilities but rarely commits |
| **key_terms** | Moderate | Claude includes doctrinal vocabulary with interpretive definitions; GPT provides dictionary-level definitions and misses key terms |

### GPT-5.4 Failure Analysis (from benchmark)

| Failure Type | Verses | Root Cause | Fixable? |
|-------------|--------|------------|----------|
| **TIMEOUT** | al-kafi_1_4_41_6 (300w), al-kafi_1_3_1_1 (557w) | Can't produce 40-75K+ tokens in one call | Solved by per-chunk translation |
| **Fix regression** | al-kafi_4_1_1_1 (14w) | Fix pass stripped diacritics from prayer formula; went from 1 warning to 4 errors | Accept original with lenient threshold |
| **Undiacritized particles** | tahdhib-al-ahkam_1_11_5 (110w) | GPT consistently outputs `في`, `ما`, `لا` without tashkeel | Post-processing auto-fix or keep in AI |

**Key insight**: GPT-5.4's fix pass actively hurts results. For GPT-5.4, accepting low-severity warnings is better than risking a fix pass.

---

## What Can Leave the AI Pipeline

### Analysis: Where AI understanding is truly needed vs not

**Needs language understanding (keep in AI):**
- Diacritizing classical Arabic text (ambiguous without context)
- Translating Arabic prose to English (faithful, not summary)
- Writing scholarly summaries (contextual, audience-aware)
- Finding thematic Quran connections (needs knowledge of Quran content)

**Does NOT need AI (programmatic or cheap API):**
- POS tagging on already-diacritized text (CAMeL Tools)
- Narrator identification (regex + canonical registry with 4,629 entries)
- Topic/tag classification (classifier trained on 3,686 labeled examples)
- Key phrase extraction (dictionary lookup from 160-entry seed dictionary)
- Key term selection (word dictionary with per-word translations)
- Explicit Quran ref detection (regex `[S:V]` / `(S:V)` already built)
- Translating English to 10 other languages (Azure Translate)
- Diacritics status (string comparison: original vs diacritized)
- Narrator word_ranges (text matching from word_tags + known names)

---

## Current Output: What Each Field Contains

### Verse-level `translations.{lang}` (11 languages)
- `summary` -- 2-3 sentence scholarly explanation
- `key_terms` -- Arabic terms with definitions in that language
- `seo_question` -- SEO question in that language

### Chunk-level `chunks[].translations.{lang}` (11 languages)
- The actual full translation text, split by chunk (isnad, body, closing, etc.)
- Full verse translation is reconstructed by joining chunk translations

**The chunk translations are ~45% of all output tokens** (11 languages x N chunks per verse). This is the single largest cost driver.

### Token cost breakdown of current monolithic output

| Field | % of output tokens | Optimization |
|-------|-------------------|--------------|
| Chunk translations x 11 langs | **~45%** | AI for EN only, Azure for 10 |
| Verse translations x 11 (summary, key_terms, seo_question) | **~25%** | AI for EN summary only; key_terms via dict; seo_question template |
| word_tags (POS) | ~8% | CAMeL Tools |
| isnad_matn (narrators) | ~8% | Registry + regex |
| Diacritics (fields 1-3) | ~5% | Keep in AI |
| Chunk structure/boundaries | ~3% | Programmatic (partial) |
| related_quran, topics, key_phrases | ~3% | Partial automation |
| tags, content_type | ~2% | Classifier |

---

## Proposed Multi-Phase Pipeline Architecture

### Phase 0: One-Time Setup (run once, reuse across all 58K verses)

| Task | Tool | Est. Cost | Output |
|------|------|-----------|--------|
| Generate bios for 4,629 canonical narrators | Claude (batch) | ~$750 | Enriched `canonical_narrators.json` with biographical descriptions, death dates, epithets |
| Train topic/tag/content_type classifier | Local (scikit-learn or similar) | $0 | Classifier model trained on 3,686 labeled verses |
| Validate CAMeL Tools POS accuracy | Local (test on 50 verses) | $0 | Go/no-go decision on POS extraction |
| Build explicit Quran reference index | Local (regex scan of all English translations) | $0 | Pre-populated `related_quran` explicit refs per verse |

**Narrator bio strategy**: The same ~1,074 frequent narrators appear across 58K verses. Instead of asking Claude to identify narrators per-verse ($58K), we generate biographical profiles once for all canonical narrators (~$750) and look them up per-verse from the registry.

### Phase 1: Per-Verse Core Generation (GPT-5.4 via OpenAI API)

**Why GPT-5.4**: Tied with Claude on diacritization, chunk boundaries, and prose translation. 10x cheaper than Claude CLI.

**Note**: Using standard Chat Completions API (not Batch API, which is currently inaccessible). If Batch API access is obtained, costs for this phase drop by 50%.

**Input**: Full Arabic text + existing English translation (if available)

**Output** (small, focused):
```json
{
  "diacritized_text": "...",
  "diacritics_changes": [...],
  "chunk_boundaries": [
    {"chunk_type": "isnad", "word_start": 0, "word_end": 23},
    {"chunk_type": "body", "word_start": 23, "word_end": 54}
  ],
  "en_chunk_translations": ["Ali ibn Ibrahim...", "Indeed Allah..."],
  "related_quran_thematic": [{"ref": "83:7", "relationship": "thematic"}],
  "en_summary": "..."
}
```

**Cost**: ~$0.04/verse (standard API) = **~$2,320 for 58K corpus**
*(Would be ~$0.02/verse = ~$1,160 with Batch API access)*

**Why this solves the timeout problem**: Long verses (300-557 words) no longer need 40-75K output tokens. The output is just diacritized text + chunk boundaries + English translations. Each chunk translation is short. Total output per verse: ~1-3K tokens regardless of verse length.

### Phase 2: Per-Verse Programmatic Enrichment (Free)

All deterministic, no AI cost:

| Field | Method | Source |
|-------|--------|--------|
| `word_tags` | CAMeL Tools on diacritized_text | Local NLP library |
| `diacritics_status` | Compare original text vs diacritized_text | String comparison |
| `isnad_matn.narrators` | `narrator_linker.py` + `NarratorRegistry` | Existing code + Phase 0 bios |
| `isnad_matn.isnad_ar/matn_ar` | Regex split from narrator_linker | Existing code |
| `narrator word_ranges` | Text match narrator names against word_tags | String matching |
| `topics` | Classifier from Phase 0 | Trained model |
| `tags` / `content_type` | Classifier from Phase 0 | Trained model |
| `key_phrases` | Dictionary lookup against `key_phrases_dictionary.json` | 160-entry seed dict |
| `key_terms` | Select interesting words from word_tags, translate via word dictionary | Existing word dict |
| `related_quran` (explicit) | Regex `[S:V]` / `(S:V)` from `link_books.py` | Existing code |
| `seo_question` (EN) | Template from summary | Pattern: "What does this hadith teach about [topic]?" |

**Cost**: $0

**Note on explicit Quran references**: The `[S:V]` regex pattern works well for Al-Kafi (HubeAli/Sarwar translations mark references). Coverage varies by book -- ThaqalaynAPI sources have inconsistent annotation. Arabic text contains NO markers for Quran quotes (citations are woven into narrative). This is why thematic detection stays in Phase 1 (AI).

### Phase 3: Per-Verse Scholarly Enrichment (Claude, optional)

**Why Claude**: GPT-5.4 summaries are generic paraphrases. Claude provides jurisprudential context, names figures, explains doctrinal significance, and finds Quran connections GPT misses.

**Input**: Arabic text + GPT's EN translation (from Phase 1) + GPT's quran refs

**Prompt** (minimal output):
```
You are an expert in Shia hadith scholarship.

Arabic text: [text]
English translation: [from Phase 1]
Quran references found so far: [from Phase 1 + Phase 2]

Generate JSON:
1. "summary": 2-3 sentence scholarly analysis -- significance,
   historical context, doctrinal implications.
2. "related_quran_additions": Thematic Quran references missed
   above. [] if complete.
```

**Output**: ~150-300 tokens (just summary + any missed Quran refs)

**Cost**: ~$0.10-0.20/verse (tiny output, CLI overhead dominates) = **~$8,700 for 58K corpus**

**This phase is optional.** If GPT-5.4 summary quality is acceptable for v1, skip this phase entirely and save ~$9K. Can also run selectively (e.g., first hadith per chapter, or verses > 50 words only).

### Phase 4: Per-Chunk Multi-Language Translation (GPT-5-mini)

**Why GPT-5-mini**: The project philosophy is **zero ongoing costs** (Netlify free tier, static JSON, no paid subscriptions). Third-party translation APIs like Azure ($10/M chars) and Google ($20/M chars) introduce recurring costs and external dependencies. GPT-5-mini is a one-time generation cost — once the translations are produced and saved as static JSON, there are no ongoing charges.

GPT-5-mini is also the cheapest OpenAI model suitable for translation, at $0.40/$1.60 per million input/output tokens.

**Input per call**: English chunk translation + target language instruction

**Output**: Translation of that chunk in 1 target language

**Languages** (10 non-English):

| Language | Code | GPT-5-mini Support |
|----------|------|-------------------|
| Urdu | ur | Yes |
| Persian/Farsi | fa | Yes |
| Turkish | tr | Yes |
| Indonesian | id | Yes |
| Bengali | bn | Yes |
| Spanish | es | Yes |
| French | fr | Yes |
| German | de | Yes |
| Russian | ru | Yes |
| Chinese | zh | Yes |

**Approach options**:
- **Option 1**: One API call per chunk per language (most parallel, highest quality). ~3 chunks avg x 10 langs = 30 calls/verse. Very cheap per call.
- **Option 2**: One API call per chunk, translate to all 10 languages at once. ~3 calls/verse. Slightly cheaper, output is 10 translations per call.
- **Option 3**: One API call per verse, all chunks x all languages. Risks the same bloated-output problem we're trying to avoid.

**Recommendation**: Option 2 (one call per chunk, all 10 languages). Keeps output manageable (~500-1000 tokens per call) while minimizing API overhead.

**Cost**: ~$0.015/verse = **~$870 for 58K corpus**

**Quality note**: GPT-5-mini handles short passage translation well (this was validated in the benchmark — chunk-level prose translation quality is comparable across models). For scholarly/religious content, European languages (es, fr, de, ru) will be strongest. Urdu/Bengali/Farsi quality will be decent but not scholarly. This is acceptable for v1 — these are one-time generation costs and can be re-generated with better models later.

---

## Translation API Research (for reference)

Third-party translation APIs were researched but **rejected** due to the project's zero-ongoing-cost philosophy:

| Service | Free Tier | Paid Price | All 10 Languages? | Status |
|---------|-----------|------------|-------------------|--------|
| Microsoft Azure Translator | 2M chars/month | $10/M chars | Yes | **Rejected** — recurring cost |
| Google Cloud Translation | 500K chars/month | $20/M chars | Yes | **Rejected** — recurring cost |
| DeepL | 500K chars/month | $25/M chars | No Urdu | **Rejected** — missing language + recurring cost |
| LibreTranslate | Unlimited (self-host) | Free (server cost) | ~30 langs | **Rejected** — requires server |
| **GPT-5-mini** | N/A | ~$0.015/verse | Yes | **Selected** — one-time cost, no subscription |

Using GPT-5-mini for translation is a one-time generation cost ($870) that produces static JSON files. Once generated, the translations serve forever at zero cost via Netlify — consistent with the project's zero-ongoing-cost architecture.

---

## Cost Projection

### Option A: Full Pipeline (with Claude scholarly enrichment)

| Phase | Per Verse | 58K Corpus | Model/Tool |
|-------|-----------|------------|------------|
| 0. Narrator bios (one-time) | -- | ~$750 | Claude CLI |
| 0. Classifier training (one-time) | -- | $0 | Local |
| 1. Core generation | $0.04 | $2,320 | GPT-5.4 (standard API) |
| 2. Programmatic enrichment | $0 | $0 | Local |
| 3. Scholarly enrichment | $0.15 | $8,700 | Claude CLI |
| 4. Multi-lang translation | $0.015 | $870 | GPT-5-mini |
| **Total** | **~$0.21** | **~$12,640** | |

*With Batch API access: Phase 1 drops to $1,160 → total ~$11,480*

### Option B: Without Claude enrichment (GPT-5.4 quality summaries)

| Phase | Per Verse | 58K Corpus | Model/Tool |
|-------|-----------|------------|------------|
| 0. Setup (one-time) | -- | ~$750 | Mixed |
| 1. Core generation | $0.04 | $2,320 | GPT-5.4 (standard API) |
| 2. Programmatic enrichment | $0 | $0 | Local |
| 4. Multi-lang translation | $0.015 | $870 | GPT-5-mini |
| **Total** | **~$0.07** | **~$3,940** | |

*With Batch API access: Phase 1 drops to $1,160 → total ~$2,780*

### Comparison with current approaches

| Approach | 58K Corpus Cost | Quality |
|----------|----------------|---------|
| All Claude (`claude -p`, monolithic) | ~$58,000 | Research-grade |
| All GPT-5.4 (monolithic, standard API) | ~$6,400 | Structurally valid, shallow |
| **Option A (optimized, with Claude)** | **~$12,640** | Research-grade summaries, good translations |
| **Option B (optimized, no Claude)** | **~$3,940** | GPT-5.4 quality summaries, good translations |

---

## Why Per-Chunk Translation Solves the Timeout Problem

The 300w and 557w verses that timed out GPT-5.4 required 40-75K+ output tokens in a single API call (all 11 languages for all chunks at once).

With the new architecture:
- Phase 1 outputs only diacritized text + chunk boundaries + English translations
- Each chunk is ~20-80 words, English translation is ~50-200 tokens
- Total Phase 1 output: ~1-3K tokens regardless of verse length
- Phase 4 (Azure) handles the 10x language multiplication with no token limit

**Result**: No verse is too long for the pipeline, regardless of word count.

---

## POS Tagging: Why Not a Corpus-Wide Dictionary?

Considered extracting unique words and tagging each once (like word translations). **Rejected because POS is context-dependent:**

- `مَا` can be NEG (negation), REL (relative), INTERR (interrogative), or PART
- `لَا` can be NEG or PART (prohibition)
- `أَنَّ` / `إِنَّ` both PART but context determines which

Diacritics reduce ambiguity significantly, but function words remain ambiguous. A corpus-wide `word -> POS` dictionary would be lossy for these cases.

**Recommendation**: Use CAMeL Tools (NYU Abu Dhabi) for context-aware POS tagging on diacritized text. Needs validation on 50+ hadith verses before committing. If accuracy < 90%, keep POS in the Phase 1 AI call (small token cost anyway, ~5-8% of output).

---

## Quran Reference Detection: Format Coverage

### Existing regex approach

`link_books.py` uses: `[\[\(](\d+):(\d+)[\]\)]`

### Formats found across the corpus

| Format | Example | Source | Detected? |
|--------|---------|--------|-----------|
| `[S:V]` | `[8:33]` | English translations (most books) | Yes |
| `(S:V)` | `(33:33)` | English translations, descriptions | Yes |
| `Surah Name (S:V)` | `Surah al-Talaq (65:3)` | AI summaries, key_terms | **No** |
| Verse ranges | `(82:10-12)` | Descriptions | **Partial** (loses range) |
| Unmarked Arabic quotes | Quran text woven into hadith | Arabic source text | **No** |

### Coverage by book

- **Al-Kafi** (HubeAli/Sarwar): Good coverage -- translators consistently mark `[S:V]`
- **ThaqalaynAPI books**: Variable -- depends on which translator annotated references
- **Arabic text (all books)**: Zero coverage -- Quran citations are narrative, no brackets

### Strategy

1. Pre-populate explicit refs via regex (free) -- catches annotated references
2. Keep thematic + unmarked explicit detection in Phase 1 AI call -- the model reads the Arabic text and recognizes Quran quotations that have no markers

---

## Implementation Order (Recommended)

### Step 1: Azure Translate integration
- Biggest single cost reduction, lowest risk
- Can A/B test quality against AI translations on existing benchmark verses
- Implement as a post-processing step: take any EN translation, produce 10 languages

### Step 2: Restructure AI prompt for Phase 1 output
- Reduce from 12 fields to: diacritized_text, diacritics_changes, chunk_boundaries, EN chunk translations, EN summary, related_quran
- Remove: word_tags, narrators, topics, tags, content_type, key_phrases, key_terms, 10 non-EN translations
- Test on benchmark 15 verses to validate GPT-5.4 still passes

### Step 3: Build Phase 2 programmatic pipeline
- Wire narrator_linker + registry for narrator fields
- Wire word dictionary for key_terms
- Wire key_phrases dictionary lookup
- Train and integrate topic/tag classifier

### Step 4: Phase 0 narrator bio batch
- Design prompt for canonical narrator biographical profiles
- Run Claude batch on 4,629 entries
- Integrate bios into canonical_narrators.json

### Step 5: Phase 3 Claude enrichment (optional)
- Design minimal scholarly enrichment prompt
- Test on benchmark verses
- Decide: run on all 58K, run selectively, or skip for v1

### Step 6: CAMeL Tools POS validation
- Install and test on 50+ diacritized hadith verses
- Compare against Claude and GPT-5.4 POS output
- If >= 90% accuracy, integrate; otherwise keep POS in Phase 1

---

## Open Questions

1. **Claude enrichment ROI**: Is ~$8,700 for scholarly summaries worth it for v1, or is GPT-5.4 summary quality acceptable? Could run selectively (e.g., first hadith per chapter, long hadiths only) to reduce cost.
2. **CAMeL Tools on Windows**: Need to verify installation, compatibility, and accuracy on classical Arabic hadith text. If POS accuracy < 90%, keep word_tags in Phase 1 AI call (small token cost).
3. **GPT-5-mini translation quality**: Needs testing on 10-20 chunks across all 10 languages before committing to $870 corpus run. Particular concern: Urdu, Bengali, and Farsi quality from English source.

---

## Relationship to Other Documents

- **[AI_BACKEND_COST_ANALYSIS.md](AI_BACKEND_COST_ANALYSIS.md)**: Initial model comparison (Claude vs GPT-5-mini vs GPT-4.1). This document supersedes with GPT-5.4 benchmark data.
- **[AI_GENERATION_STRATEGIES.md](AI_GENERATION_STRATEGIES.md)**: 20 high-level strategies for cost reduction. This document implements Strategy #1 (hybrid pipeline) with concrete architecture.
- **[AI_PIPELINE_ARCHITECTURE.md](AI_PIPELINE_ARCHITECTURE.md)**: Current monolithic pipeline design. This document proposes replacing it with the multi-phase architecture.
- **[BENCHMARK_SAMPLE.md](BENCHMARK_SAMPLE.md)**: The 15-verse benchmark that produced the data underlying this plan.
- **[BENCHMARK_INSTRUCTIONS.md](BENCHMARK_INSTRUCTIONS.md)**: How to run benchmarks. Results are stored in `ThaqalaynDataSources/ai-content/benchmarks/`.
- **[OPENAI_PIPELINE_OPTIMIZATION.md](OPENAI_PIPELINE_OPTIMIZATION.md)**: Earlier optimization work on the OpenAI pipeline. Some findings (fix pass issues, diacritics patterns) are confirmed by this benchmark.

---

*This plan should be reviewed and approved before implementation begins. The benchmark data is in `ThaqalaynDataSources/ai-content/benchmarks/{claude-sonnet,gpt-5.4}/`.*
