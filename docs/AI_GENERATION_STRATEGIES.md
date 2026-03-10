# AI Content Generation Strategies — Full Corpus in 2 Months

**Date**: 2026-03-10
**Goal**: Generate AI content for ~58,000 hadith within 2 months (~60 days)
**Current progress**: ~3,686 verses complete (~6.4%)
**Remaining**: ~54,314 verses

## Hard Constraints

| Resource | Available | Monthly Limit |
|----------|-----------|---------------|
| **Claude Code Max subscription** | 2 months | $15K usage/month ($30K total) |
| **OpenAI API key** | Yes | Pay-per-use (existing key) |
| **Additional spending** | **None** | No new API keys, no GPU rentals, no other paid services |

**What this means**: We can only use Claude via `claude -p` CLI (counts against $15K/month) and OpenAI API (pay-per-use). Any genuinely free tiers (no credit card, no payment) from other providers are also allowed.

---

## Cost Model: Per-Word, Not Per-Verse

Verses range from 4 to 400+ Arabic words. A flat "cost per verse" metric is misleading — a 4-word verse and a 300-word verse have wildly different costs. We use **cost per Arabic source word** as the primary metric.

### Output Token Scaling (Measured)

From actual pipeline stats, output scales linearly with word count plus a fixed overhead:

```
Output tokens ≈ 10,000 (fixed overhead) + 150 × (word count)
```

| Word Count | Measured Output Tokens | File Size | Output/Word |
|-----------|----------------------|-----------|-------------|
| 4 | ~9,800 | ~35 KB | 2,450 tok/w |
| 14 | ~10,500 | ~40 KB | 750 tok/w |
| 17 | ~11,260 | ~41 KB | 662 tok/w |
| 48 | ~12,400 | ~49 KB | 258 tok/w |
| 66 | ~12,400 | ~52 KB | 188 tok/w |
| 76 | ~16,600 | ~56 KB | 218 tok/w |
| 85 | ~14,500 | ~60 KB | 171 tok/w |
| 128 | ~22,200* | ~89 KB | 174 tok/w |
| 219 | ~38,000* | ~153 KB | 174 tok/w |
| 435 | ~75,000* | ~280 KB* | 172 tok/w |

*Estimated from file sizes (1 token ≈ 4 bytes for JSON)

**Key insight**: Very short verses (≤20w) have high per-word cost due to the ~10K token fixed overhead (metadata, structure, schema fields). Verses 50+ words amortize this overhead well, converging at ~170-190 output tokens per source word.

### The Fixed Overhead Problem

Every verse, regardless of length, produces these fixed-size fields:
- `summary` (11 languages × ~50 words each) → ~3K tokens
- `key_terms` (5-10 terms × 11 languages) → ~1.5K tokens
- `topics` (2-5 topics) → ~200 tokens
- `related_quran` (0-3 references) → ~200 tokens
- `narrator_chain` metadata → ~500 tokens
- `diacritized_text` + `diacritics_status` → ~200 tokens
- JSON structure/keys → ~2K tokens
- **Total fixed**: ~8-10K tokens

Variable fields scale with word count:
- `word_tags` (1 per word × POS + 11-language translations) → ~100 tokens/word
- `chunk translations` (11 languages × proportional text) → ~50 tokens/word
- **Total variable**: ~150 tokens/word

### Cost Per Arabic Source Word

**Claude CLI** (measured from production stats):

| Verse Length | $/verse | $/word | Output Tokens | Efficiency |
|-------------|---------|--------|---------------|------------|
| 4 words | ~$0.80 | **$0.200** | ~10K | Very poor (mostly overhead) |
| 14 words | ~$0.90 | **$0.064** | ~10.5K | Poor |
| 48 words | ~$1.47 | **$0.031** | ~56K* | Good |
| 66 words | ~$1.47 | **$0.022** | ~56K* | Good |
| 76 words | ~$1.33 | **$0.018** | ~52K* | Good |
| 147 words | ~$2.91 | **$0.020** | ~113K* | Good |

*Claude CLI token counts include conversation overhead; actual content ~3-4x less

**OpenAI GPT-5-mini** (measured from test stats):

| Verse Length | $/verse | $/word | Output Tokens | Status |
|-------------|---------|--------|---------------|--------|
| 4 words | $0.021 | **$0.0052** | 9,776 | Error (chunk boundary) |
| 17 words | $0.012 | **$0.0007** | 11,260 | Pass |
| 66 words | $0.013 | **$0.0002** | 12,391 | Pass |
| 76 words | $0.035 | **$0.0005** | 16,643 | Error (chunk boundary) |
| 85 words | $0.031 | **$0.0004** | 14,534 | Pass (chunked) |

**OpenAI GPT-5-mini batch** (50% off):

| Verse Length | $/word (batch) | Notes |
|-------------|---------------|-------|
| ≤20 words | **$0.0003-0.003** | High overhead ratio, but still cheap |
| 50-80 words | **$0.0001-0.0002** | Sweet spot |
| 80-150 words | **$0.0002-0.0003** | Chunked processing adds overhead |

### Corpus-Wide Cost Estimate

Assuming corpus average of ~60 Arabic words/verse (weighted by length distribution):

| Backend | $/word | 58K verses × ~60w avg | Total Est. |
|---------|--------|----------------------|------------|
| Claude CLI | ~$0.022/w | 3.48M words | **~$76K** |
| Claude CLI (short ≤50w only) | ~$0.035/w | 0.88M words (35K × 25w avg) | **~$31K** |
| Claude CLI (long >80w only) | ~$0.020/w | 1.44M words (12K × 120w avg) | **~$29K** |
| GPT-5-mini batch | ~$0.0002/w | 3.48M words | **~$700** |
| GPT-5-mini batch (short only) | ~$0.0002/w | 0.88M words | **~$176** |

**Critical insight**: Claude CLI's per-word cost is **~100x** GPT-5-mini's. The question is entirely about quality, not cost. Every verse we can acceptably process with OpenAI saves ~$1.20.

### Frontier OpenAI Models: The Untested Opportunity

We tested GPT-5-mini (cheapest reasoning model) and GPT-4.1/4.1-mini (non-reasoning). We have **not tested** OpenAI's more capable models, which are still dramatically cheaper than Claude CLI:

| Model | Intelligence Index* | Input/1M | Output/1M | Batch $/word** | 58K Corpus (batch) | vs Claude CLI |
|-------|-------------------|----------|-----------|---------------|--------------------|----|
| **GPT-5.4** | 57 (#2 globally) | $2.50 | $15.00 | **$0.0025/w** | **~$8.7K** | 9x cheaper |
| **GPT-5.3 Codex** | 54 (#3 globally) | $1.75 | $14.00 | **$0.0024/w** | **~$8.4K** | 9x cheaper |
| **GPT-5** | ~45 (est.) | $1.25 | $10.00 | **$0.0017/w** | **~$6.0K** | 13x cheaper |
| GPT-5-mini | 41 (#6) | $0.25 | $2.00 | $0.0002/w | ~$700 | 110x cheaper |
| Claude CLI | — | — | — | $0.022/w | ~$76K | baseline |

*Artificial Analysis Intelligence Index (higher = better, Claude Sonnet 4.5 is ~50)
**Batch pricing (50% off), assuming 60-word average verse with ~20K output tokens

**GPT-5.4 is OpenAI's actual frontier model** (released March 2026, 1M context window, Intelligence Index 57 — tied #1 globally with Gemini 3.1 Pro). At $8.7K for the entire corpus via batch API, it's well within budget. GPT-5.3 Codex (released Feb 2026, structured/coding focus) is very close behind at $8.4K.

**o4-mini is NOT worth testing** — it has Intelligence Index 33 (vs GPT-5-mini's 41), costs more ($1.10/$4.40 vs $0.25/$2.00), and OpenAI themselves recommend GPT-5-mini over it. It would perform worse on our task.

**Why these haven't been tested**: The original analysis focused on the cheapest viable option (GPT-5-mini) and the known models (GPT-4.1). The quality gap between GPT-5-mini (67% pass, poor scholarly depth) and Claude Sonnet (87% pass, excellent) is large — but that gap may shrink substantially with GPT-5.4 or GPT-5.3.

**Key question**: Does GPT-5.4's superior reasoning close the quality gap on:
1. Narrator identification (wrong IDs was GPT-5-mini's #1 quality issue)
2. Quran cross-references (often empty with GPT-5-mini)
3. Scholarly summary depth (generic vs contextual)
4. Word_tags structural correctness (chunk boundary errors)

Academic research (ACL 2025) found GPT-4 "fails to capture some religion-based terms accurately" for Islamic content. GPT-5.4 is two generations ahead — the only way to know is to **test on the 15-verse benchmark** (~$3-4 per model).

**Budget impact of frontier models**:

| Scenario | Model | Corpus Cost | + Fix Pass (15%) | Total | Budget Left |
|----------|-------|-------------|------------------|-------|-------------|
| GPT-5.4 at 90% pass | GPT-5.4 batch | $8.7K | $1.3K fixes | **$10.0K** | $20K buffer |
| GPT-5.4 at 80% pass | GPT-5.4 batch | $8.7K | $2.5K fixes | **$11.2K** | $19K buffer |
| GPT-5.3 at 85% pass | GPT-5.3 batch | $8.4K | $1.3K fixes | **$9.7K** | $20K buffer |
| GPT-5 at 85% pass | GPT-5 batch | $6.0K | $1.3K fixes | **$7.3K** | $23K buffer |
| GPT-5-mini at 85% (optimized) | GPT-5-mini batch + Claude CLI | $0.7K + $12K | — | **$12.7K** | $17K buffer |

Even in the worst case (GPT-5.4 at 80% pass), the total is $11.2K with $19K left over.

**This is the #1 thing to test this week.** Benchmark cost: ~$11-15 total across all models.

### Additional Work: Chapter Name Translations

**Gap discovered**: Chapter/book names exist in only English + Arabic, but the site supports 11 languages. This means ~62,400 chapter title translations are needed (7,798 titles × 8 missing languages). Since titles are short (2-15 words), this is trivially cheap: **~$6 via GPT-5-mini batch**. See [CHAPTER_TRANSLATION_GAP.md](CHAPTER_TRANSLATION_GAP.md) for full analysis. This should be included in the same batch processing run as verse content.

---

## OpenAI Optimization: Raising Quality from 67% to 85%+

### Current Failure Analysis (GPT-5-mini)

From detailed analysis of 18 test verses:

| Failure Mode | Frequency | Root Cause | Fixable? |
|-------------|-----------|------------|----------|
| **Chunk word_start == word_end** | 40% of errors | Model doesn't understand isnad/matn segmentation | Yes (auto-fix or prompt) |
| **Off-by-one word_end** | 20% of errors | Last index vs array length confusion | Yes (auto-fix exists) |
| **Invalid topics** | 15% of errors | Topics not in taxonomy vocabulary | Yes (auto-strip exists) |
| **Word count mismatch** | 15% of errors | Tokenization differences | Partially (tolerance) |
| **Timeout (>5 min)** | 10% of errors | Long verses (>200w) in chunked mode | Yes (increase timeout) |

**Most errors are structural, not quality-related.** The model produces good content but fails validation on chunk boundaries and word ranges.

### Optimization 1: Deterministic Chunk Boundary Fix (Zero LLM Cost)

The #1 failure mode is chunk `word_start == word_end` for isnad segments. This can be fixed deterministically:

```python
# After AI generation, before validation:
if chunk["word_start"] == chunk["word_end"]:
    # Calculate from actual Arabic text word count
    isnad_words = len(isnad_text.split())
    chunk["word_start"] = 0
    chunk["word_end"] = isnad_words
    # Adjust subsequent chunks accordingly
```

- **Impact**: Eliminates ~40% of GPT-5-mini errors → pass rate jumps from 67% to ~80%
- **Cost**: $0 (pure code fix)
- **Risk**: None — it's correcting a structural field based on ground truth (Arabic text)

### Optimization 2: OpenAI Structured Outputs (JSON Schema Enforcement)

Use `response_format: {"type": "json_schema", ...}` instead of relying on prompt instructions:
- OpenAI compiles the schema into a context-free grammar at the API layer
- Guarantees structural correctness (no missing fields, correct types, valid enums)
- Prevents malformed JSON entirely
- **Does NOT prevent truncation** — always check `finish_reason == "length"`
- **Supported on**: GPT-5-mini, GPT-5, GPT-4.1 family, o4-mini

### Optimization 3: Remove Few-Shot Examples for GPT-5 Family

Research (including OpenAI's own prompting guides) shows GPT-5 reasoning models **perform worse with few-shot examples**:
- 5-shot prompting **reduced** performance vs zero-shot on reasoning models
- Confirmed by DeepSeek R1 and "Medprompt to o1" paper
- Current pipeline sends 3 examples (~52 KB / ~13K tokens) → wasted input tokens

**Action**: Remove few-shot examples from GPT-5-mini prompts. This:
- Reduces input tokens by ~13K per call → saves ~$0.003/verse at batch pricing
- May actually **improve** quality
- Saves ~$174 across 58K verses in input token costs alone

### Optimization 4: Prompt Caching Optimization

OpenAI auto-caches prompts ≥1,024 tokens with identical prefixes. To maximize cache hits:
- **Put all static content first**: system prompt, schema definition, glossary, taxonomy
- **Put per-verse content last**: Arabic text, metadata, narrator hints
- **Use consistent `prompt_cache_key`**: Ensures routing to same cache shard
- **Benefit**: 50% off input tokens for cache hits (stacks with batch 50% = 75% total off input)

### Optimization 5: Expand Auto-Fix Rules

Current auto-fixes handle off-by-one word_end and zero-width narrator ranges. Add:

| Auto-Fix | What it does | Error % eliminated |
|----------|-------------|-------------------|
| Chunk boundary recalculation | Fix word_start/word_end from actual Arabic word count | ~40% |
| Invalid topic stripping | Remove topics not in taxonomy | ~15% |
| Missing ambiguity_note | Auto-fill empty string | ~5% |
| Narrator ID post-correction | Match against narrator_templates after generation | ~10% |

Combined: raises effective pass rate from 67% to **~85-90%**.

### Optimization 6: Separate Structural from Scholarly Generation

Split the single mega-call into two focused calls:

| Call | Purpose | Model | Output | Cost |
|------|---------|-------|--------|------|
| **Call 1** | Translations + word_tags | GPT-5-mini | ~12-15K tokens | ~$0.013/verse |
| **Call 2** | Summary + key_terms + topics + related_quran | GPT-5-mini | ~3-5K tokens | ~$0.005/verse |

- Smaller outputs → less truncation risk
- Each call has a focused task → higher quality per field
- Can use different models per call if needed
- **Total**: ~$0.018/verse (~$1,044 for 58K, batch pricing)

### Optimization 7: Fine-Tune GPT-4.1-mini on Existing Corpus

We have ~3,686 Claude-generated gold-standard examples. Fine-tuning GPT-4.1-mini:
- **Training cost**: ~$25/1M tokens. With ~500 examples × ~20K tokens = ~$0.25 training
- **Inference**: Fine-tuned GPT-4.1-mini at $0.40/$1.60 per M (same as base)
- **Potential benefit**: Model learns our exact schema, narrator ID format, Islamic terminology
- **Risk**: Cannot fix truncation issues (architectural limit); GPT-4.1 family has known word_tags truncation
- **Action**: Test fine-tuning on 500 examples, evaluate on held-out set

### Optimization 8: Increase max_completion_tokens

Set `max_completion_tokens` generously (30,000+) to prevent truncation:
- You only pay for actual tokens generated, not the limit
- Prevents `finish_reason: "length"` truncation
- Always check `finish_reason` in response to detect truncation

### Optimization 9: GPT-5 (Full) Quality Test

GPT-5 (full model) is untested but may be dramatically better than GPT-5-mini:
- 5x more expensive ($1.25/$10.00 vs $0.25/$2.00) but still 50x cheaper than Claude CLI
- Full GPT-5 has better multilingual capabilities and complex reasoning
- Batch pricing: ~$0.06/verse → $3.5K for entire corpus
- **Action**: Test on 15-verse benchmark immediately. If quality matches Claude, this wins.

### Optimization 10: Relax Non-Critical Validation

Calibrate validation for "good enough" rather than "Claude-quality":

| Check | Severity Change | Rationale |
|-------|----------------|-----------|
| narrator_id_accuracy | Hard → Warning | Fix with code post-processing |
| related_quran_completeness | Medium → Low | Add via cross-reference DB |
| summary_depth | Medium → Low | Generic acceptable for v1 |
| translation_faithfulness | Keep strict | Core user value |
| word_tags_count | Keep strict | Structural requirement |

---

## Budget Math (Revised with Per-Word Metrics)

### Claude CLI Budget

| Metric | Value |
|--------|-------|
| Monthly budget | $15K |
| 2-month budget | $30K |
| Cost per word (proven, 50-80w verses) | ~$0.020-0.031/word |
| Cost per word (>80w verses) | ~$0.020/word |
| Total corpus words (est. 58K × 60w avg) | ~3.48M words |
| Words achievable ($30K ÷ $0.022/w) | **~1.36M words** (~40% of corpus) |

### OpenAI GPT-5-mini Batch Budget

| Metric | Value |
|--------|-------|
| Cost per word (50-80w verses, batch) | ~$0.0001-0.0002/word |
| Total corpus words | ~3.48M words |
| Total cost (batch, all verses) | **~$350-700** |
| With auto-fix optimizations (85% pass) | Covers ~49K verses |
| Remaining for Claude CLI (~8.7K failures) | ~$12K Claude budget |

### Free Tiers (No Money Required)

| Provider | Model | Free Allowance | 60-day Capacity |
|----------|-------|----------------|-----------------|
| Google | Gemini 2.5 Flash | 1,000 req/day | **60,000 verses** |
| Google | Gemini 2.5 Flash-Lite | 1,000 req/day | **60,000 verses** |
| Google | Gemini 2.5 Pro | 1,000 req/day | **60,000 verses** |

---

## Strategies (20 Total, Constrained to Available Resources)

### Strategy 1: OpenAI GPT-5.4 Frontier Model (Batch) ⭐ HIGHEST POTENTIAL
**Cost: ~$8.7K batch | $/word: $0.0025 | Quality: Unknown (MUST TEST)**

GPT-5.4 is OpenAI's actual frontier model (released March 2026, Intelligence Index 57 — tied #1 globally). At batch pricing it's **9x cheaper than Claude CLI**:

- **1M context window** — no chunking needed for any verse
- **Frontier reasoning** (extended thinking) — may match Claude on scholarly depth
- **Structured output support** — JSON schema enforcement available
- **Batch API**: 50% off → $1.25/$7.50 per M tokens

| Pass Rate | Corpus Cost | + Claude CLI Fix | Total | Budget Left |
|-----------|------------|------------------|-------|-------------|
| 90% pass | $8.7K | $1.3K (5.4K failures) | **$10.0K** | $20K |
| 80% pass | $8.7K | $2.5K (10.8K failures) | **$11.2K** | $19K |
| 70% pass | $8.7K | $5.8K (16.2K failures) | **$14.5K** | $16K |

Even at 70% pass rate (same as GPT-5-mini), the total cost is ~$14.5K. **This is the #1 thing to benchmark this week.**

### Strategy 2: OpenAI GPT-5.3 Codex / GPT-5 (Batch)
**Cost: ~$6-8.4K batch | $/word: $0.0017-0.0024 | Quality: Unknown (MUST TEST)**

Two strong alternatives to GPT-5.4:

**GPT-5.3 Codex** (Feb 2026, Intelligence Index 54, reasoning/coding specialist):
- $0.875/$7.00 per M tokens (batch) → ~$8.4K for corpus
- 128K max output tokens (vs 16K for GPT-5.3 Chat — critical since our verses produce 10-25K+ tokens)
- 400K context window, configurable reasoning effort (low/medium/high/xhigh)
- Note: GPT-5.3 Chat (general-purpose) is a different model with only 16K max output — **not viable** for our task

**GPT-5** (Intelligence Index ~45):
- $0.625/$5.00 per M tokens (batch) → ~$6.0K for corpus
- "30% fewer response-level errors than GPT-5.1" per OpenAI
- Best cost/quality ratio if quality is sufficient

| Model | 85% pass total | 70% pass total |
|-------|---------------|----------------|
| GPT-5.3 Codex | **$9.7K** | **$14.2K** |
| GPT-5 | **$7.3K** | **$11.8K** |

**Models skipped and why**:
- **GPT-5.3 Chat**: 16K max output tokens — would truncate most verses (need 10-25K+)
- **GPT-5.2**: Superseded by both GPT-5.3 Codex and GPT-5.4 at same/similar pricing
- **o4-mini**: Intelligence Index 33, worse AND costlier than GPT-5-mini

### Strategy 3: Hybrid Claude CLI + Optimized OpenAI GPT-5-mini Batch
**OpenAI cost: ~$640 | Claude cost: ~$12-15K | Quality: Good-Excellent**

If frontier models don't test well, fall back to optimized GPT-5-mini:

| Verse Type | Count | Backend | $/word | Cost | Quality |
|-----------|-------|---------|--------|------|---------|
| All verses (first pass) | ~54K | OpenAI GPT-5-mini batch | $0.0002/w | ~$640 | 85% pass (optimized) |
| Failures from OpenAI | ~8K | Claude CLI | $0.022/w | ~$11K | Excellent |
| Fix pass (warnings) | ~5K | Claude CLI | $0.010/w | ~$3K | Excellent |

- **Total**: ~$15K (well within $30K budget)
- **Timeline**: 4-6 weeks

### Strategy 4: Google Gemini Free Tier as Primary
**Cost: $0 | Quality: Unknown (needs testing)**

1,000 free requests/day × 60 days = 60,000 requests — covers entire corpus.

- **Rate limit**: 5-15 RPM → ~1 req/min sustained
- **Risk**: Quality untested for Islamic scholarly content
- **Mitigation**: Test on 15-verse benchmark first
- **Fallback**: Failed verses → OpenAI batch or Claude CLI

### Strategy 5: Chapter Name Translation Batch
**Cost: ~$6-31 | $/word: trivial | Quality: Good (short text)**

Gap discovered: 7,798 chapter/book names exist only in English + Arabic but the site supports 11 languages. Need ~62,400 title translations (8 missing languages). Since titles are 2-15 words each, this is trivially cheap via GPT-5-mini batch (~$6). See [CHAPTER_TRANSLATION_GAP.md](CHAPTER_TRANSLATION_GAP.md).
- Include in the same batch run as verse content
- Requires: new `books.{lang}.json` index files + Angular `MultiLingualText` update

### Strategy 6: OpenAI Prompt Engineering + Auto-Fix Sprint
**Cost: ~$50 testing | Quality: Raises pass rate from 67% to 85%+**

Zero-cost optimizations (see OpenAI Optimization section above):
1. Deterministic chunk boundary fix → +13% pass rate
2. Structured output mode → eliminates JSON errors
3. Remove few-shot examples → saves tokens, may improve quality
4. Expand auto-fix rules → +5-10% pass rate
5. Prompt caching optimization → reduces input cost 50-75%

**Impact**: Every 10% improvement saves ~$8K in Claude CLI re-processing.

### Strategy 7: Post-Processing Enrichment Pipeline
**Cost: $0 (code only) | Quality: Improves any model's output**

Automate fields that don't need AI:

| Field | Automation | Impact |
|-------|-----------|--------|
| narrator_chain IDs | Match `narrator_templates.json` (1,074 entries) | Fixes #1 OpenAI quality issue |
| topics | Keyword matching against `topic_taxonomy.json` (90 topics) | Eliminates invalid topic errors |
| related_quran | Cross-reference database from existing corpus | Fills GPT-5-mini's biggest gap |
| key_terms | `key_phrases_dictionary.json` (160 entries) + glossary | More consistent than AI |

Reduces AI's job to translations + summaries + word_tags.

### Strategy 8: Reduce Output Scope (Fewer Languages First)
**Cost: 50-70% token reduction | Quality: Same per language**

| Phase | Languages | $/word reduction | Timeline |
|-------|-----------|-----------------|----------|
| **Phase A** | en + ar + fa + ur (4 langs) | ~60% fewer output tokens | Immediate |
| **Phase B** | Add tr + id + bn (7 langs) | Remaining 40% | Month 2+ |
| **Phase C** | Add es + fr + de + ru + zh | Final languages | Later |

- With 4 languages, output drops from ~150 to ~60 tokens/word variable
- Claude CLI: ~$0.010/word → entire corpus fits in $30K budget alone
- OpenAI batch: ~$0.0001/word → entire corpus for ~$350

### Strategy 9: Two-Pass: Cheap Generate + Claude Fix
**Cost: ~$640 OpenAI + $5-15K Claude | Quality: Good**

1. GPT-5-mini batch for everything → ~$640
2. Quality gate flags problematic verses
3. Claude CLI re-generates only flagged verses
4. With optimizations (85% pass): 8.7K failures × $1.39 = $12.1K → **total $12.7K**

### Strategy 10: Field-by-Field Split Generation
**Cost: 30-50% savings | Quality: Same or better**

| Call | Fields | Model | $/word |
|------|--------|-------|--------|
| 1 | word_tags + diacritized_text | GPT-4.1-nano batch | ~$0.00003/w |
| 2 | translations (11 langs) | GPT-5-mini batch | ~$0.0001/w |
| 3 | summary + key_terms + related_quran + topics | Claude CLI | ~$0.008/w |
| 4 | narrator_chain | Code post-processing | $0 |

- Total: ~$0.008/word → 3.48M words × $0.008 = **$27.8K** (fits in budget)
- Each call is smaller → fewer timeouts, higher pass rate
- **Challenge**: Complex implementation — split prompts, merge results

### Strategy 11: Gemini Free + Claude CLI Fix
**Cost: $0 Gemini + $11-22K Claude | Quality: Good**

1. Gemini free tier processes corpus over 60 days (1,000/day)
2. Quality gate flags failures
3. Claude CLI re-processes only failures (15-30%)
4. Budget: 8K-16K failures × $1.39 = $11-22K

### Strategy 12: Maximize Claude CLI Efficiency
**Cost: $30K (same budget, more words) | Quality: Excellent**

| Optimization | $/word impact | Effort |
|-------------|--------------|--------|
| Trim system prompt (remove few-shot) | -5-10% | Low |
| Improve pass rate (reduce retries) | -10-15% | Medium |
| Relax non-critical warnings | -5-10% | Low |
| Use Haiku for fix pass | -10-15% | Low |
| Process long verses last (better amortization) | -5% | Low |

Combined: ~$0.016/word → 1.88M words achievable ($30K), ~54% of corpus.

### Strategy 13: Incremental Quality Tiers (Ship Early, Enhance Later)
**Cost: Variable | Quality: Improves over time**

| Tier | Fields | Model | $/word |
|------|--------|-------|--------|
| **Tier 1** (wk 1-2) | translations (4 langs) + word_tags | OpenAI batch | ~$0.00005/w |
| **Tier 2** (wk 3-4) | summary + topics + key_terms | OpenAI/Claude | ~$0.002-0.008/w |
| **Tier 3** (wk 5-8) | Remaining langs + related_quran + fixes | Claude CLI | ~$0.010/w |

Angular app handles missing fields gracefully — users get basics fast.

### Strategy 14: Batch Processing Optimization for OpenAI
**Cost: 50% savings on all OpenAI | Quality: Same**

Always use Batch API:
- 50% off all tokens
- Combined with prompt caching: 75% off input tokens
- Combined with removing few-shot: additional 13K fewer input tokens per call
- **Net effect**: ~$0.008/verse for GPT-5-mini batch (vs $0.021 standard)

### Strategy 15: Smart Queue Ordering
**Cost: $0 | Quality: Same**

Process in order of cost-efficiency:
1. **50-80 word verses first** — best $/word ratio, highest pass rate
2. **Books with narrator coverage** — better narrator matching
3. **Very short verses (≤20w) in large batches** — amortize overhead
4. **Long verses last** — reserve for Claude CLI budget

### Strategy 16: Crowdsource + AI Assist
**Cost: $0 | Quality: High (human-verified)**

AI generates drafts with cheapest model; community reviews scholarly fields.

### Strategy 17: Apply for Anthropic API Credits
**Cost: $0 if approved | Quality: Excellent**

Direct API with batch + cache → $3-9K for entire corpus. Apply as digital humanities / public good project.

### Strategy 18: GPT-4.1-nano for Structural Fields
**Cost: ~$58 batch for 58K | Quality: Unknown**

Use ONLY for word_tags + diacritized_text at $0.01/$0.075 per M batch.
- **Risk**: May have same truncation as GPT-4.1
- **Action**: Test on 15 verses

### Strategy 19: Parallel Free Gemini + OpenAI
**Cost: $0 Gemini + ~$640 OpenAI | Quality: Best-of-two**

Two independent attempts per verse → ~90% combined pass rate (if errors are independent).
Claude CLI only for the ~10% where both fail → ~5.8K × $1.39 = $8K.

### Strategy 20: Reduce Validation Strictness
**Cost: $0 | Quality: Slightly lower, much higher pass rate**

Relax non-critical checks (narrator_id → warning, related_quran → low, summary_depth → low).
GPT-5-mini pass rate: 67% → 80-85% with no code changes.

---

## Recommended Combination

### The Plan: "Test Frontier Models First, Then Scale"

```
Week 1:  [Benchmark Sprint — THE CRITICAL WEEK]
         - Test GPT-5.4, GPT-5.3 Codex, GPT-5 on 15-verse benchmark (~$9-12 total)
         - Test Gemini 2.5 Flash/Pro via free tier on same 15 verses
         - Implement deterministic chunk boundary auto-fix (see OPENAI_PIPELINE_OPTIMIZATION.md)
         - Add OpenAI structured output mode
         - Remove few-shot examples from GPT-5 family prompts
         - Build post-processing enrichment (narrator IDs, topics)
         - DECISION: Pick primary model based on quality/cost results

Week 2:  [Bulk Pass with Best Model]
         If GPT-5.2 or GPT-5 quality is good (>80% pass):
           - Submit batch for all 54K remaining verses ($6-8.4K)
           - Start Gemini free tier in parallel (1,000/day)
         If only GPT-5-mini viable:
           - Submit GPT-5-mini batch for all 54K (~$640)
           - Apply post-processing enrichment to all outputs

Week 3-4: [Claude CLI Month 1 — Fix Failures]
         - Claude CLI for verses that failed quality gate
         - Prioritize by word count: long (>80w) failures first
         - ~$15K budget → ~680K words of content

Week 5-6: [Claude CLI Month 2 — Remaining + Quality]
         - Claude CLI for remaining failures and quality improvements
         - Fix pass on verses with review warnings
         - ~$15K budget → ~680K more words

Week 7-8: [Completion]
         - Final quality audit
         - Fill any remaining gaps
         - Second language pass if budget allows
```

### Projected Outcomes (by benchmark result)

**Scenario A: GPT-5.2 tests at ≥85% pass rate (best case)**

| Source | Verses | $/word | Cost | Quality |
|--------|--------|--------|------|---------|
| Already complete | 3,686 | — | $0 | Excellent |
| GPT-5.2 batch (pass) | ~46K | $0.0024/w | ~$8.4K | Good-Excellent |
| Claude CLI (failures) | ~8K | $0.022/w | ~$6K | Excellent |
| **Total** | **~58K** | — | **~$14.4K** | **Good-Excellent** |
| **Budget remaining** | | | **$15.6K** | For quality fixes, extra languages |

**Scenario B: GPT-5 tests at ≥80% pass rate**

| Source | Verses | $/word | Cost | Quality |
|--------|--------|--------|------|---------|
| Already complete | 3,686 | — | $0 | Excellent |
| GPT-5 batch (pass) | ~43K | $0.0017/w | ~$6K | Good |
| Claude CLI (failures) | ~11K | $0.022/w | ~$9K | Excellent |
| **Total** | **~58K** | — | **~$15K** | **Good-Excellent** |
| **Budget remaining** | | | **$15K** | |

**Scenario C: Only GPT-5-mini viable (fallback)**

| Source | Verses | $/word | Cost | Quality |
|--------|--------|--------|------|---------|
| Already complete | 3,686 | — | $0 | Excellent |
| GPT-5-mini batch (optimized, 85% pass) | ~46K | $0.0002/w | ~$640 | Acceptable |
| Claude CLI (failures) | ~8K | $0.022/w | ~$11K | Excellent |
| Claude CLI (fix pass) | ~5K | $0.010/w | ~$3K | Excellent |
| **Total** | **~58K** | — | **~$15K** | **Good-Excellent** |

All three scenarios fit comfortably within the $30K budget.

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| GPT-5.2/GPT-5 quality no better than mini | Fall back to Scenario C (optimized GPT-5-mini + Claude) |
| Frontier models have same structural errors | Auto-fix + structured output mode handles them |
| Claude CLI $15K/month runs out early | Prioritize high-word-count verses (better $/word) |
| More failures than expected | Switch to 4-language mode (60% token reduction) |
| Gemini free tier quality is excellent | Use as primary instead of OpenAI (saves entire OpenAI budget) |

### Emergency Fallback: 4-Language Mode

If budget looks tight mid-process:
- Switch to en, ar, fa, ur only → 60% fewer output tokens
- Claude CLI: ~$0.010/word → $30K covers ~3M words (86% of corpus)
- OpenAI batch: ~$0.0001/word → entire corpus for ~$350
- Remaining 7 languages added later as cheaper second pass

---

## Immediate Next Steps

1. **TODAY**: Run 15-verse benchmark on **GPT-5.4** (frontier, ~$3-4 test cost)
2. **TODAY**: Run 15-verse benchmark on **GPT-5.3 Codex** (128K output, ~$3-4 test cost)
3. **TODAY**: Run 15-verse benchmark on **GPT-5** (full, ~$2-3 test cost)
4. **TODAY**: Implement deterministic chunk boundary auto-fix (see [OPENAI_PIPELINE_OPTIMIZATION.md](OPENAI_PIPELINE_OPTIMIZATION.md))
5. **THIS WEEK**: Add OpenAI structured output mode to pipeline
6. **THIS WEEK**: Sign up for Google AI Studio (free), test Gemini on same 15 verses
7. **THIS WEEK**: Build post-processing enrichment for narrator IDs and topics
8. **WEEK 1 END**: **DECISION POINT** — pick primary model based on benchmark results
9. **WEEK 2**: Submit full corpus batch (verse content + chapter name translations) with chosen model
10. **WEEK 3+**: Claude CLI for failures and quality improvements

---

## Appendix: Pricing Reference (March 2026)

### Available Resources

**Claude Code Max** ($15K/month, 2 months):
- Access via `claude -p` CLI, Sonnet 4.6 default
- ~$0.020-0.031/word (varies by verse length)
- ~1.36M words achievable over 2 months

**OpenAI API** (existing key):

| Model | Input/1M | Output/1M | Batch (50% off) | Cached Input (-90%) |
|-------|----------|-----------|------------------|---------------------|
| GPT-5-mini | $0.25 | $2.00 | $0.125/$1.00 | $0.025 |
| GPT-5 | $1.25 | $10.00 | $0.625/$5.00 | $0.125 |
| GPT-4.1-mini | $0.40 | $1.60 | $0.20/$0.80 | $0.04 |
| GPT-4.1-nano | $0.02 | $0.15 | $0.01/$0.075 | $0.002 |
| o4-mini | $1.10 | $4.40 | $0.55/$2.20 | $0.11 |

**Google Gemini Free Tier** (no cost):

| Model | Free Limit | 60-day Capacity | Context |
|-------|------------|-----------------|---------|
| Gemini 2.5 Pro | 1,000 req/day | 60,000 | 1M |
| Gemini 2.5 Flash | 1,000 req/day | 60,000 | 1M |
| Gemini 2.5 Flash-Lite | 1,000 req/day | 60,000 | 1M |

---

*This document should be updated after benchmark results are available.*

## Related Documents

- **[BENCHMARK_SAMPLE.md](BENCHMARK_SAMPLE.md)** — The 15-verse benchmark sample with exact paths, word counts, run instructions, and success criteria
- **[OPENAI_PIPELINE_OPTIMIZATION.md](OPENAI_PIPELINE_OPTIMIZATION.md)** — Data-driven pipeline optimizations to apply before benchmarking
- **[AI_BACKEND_COST_ANALYSIS.md](AI_BACKEND_COST_ANALYSIS.md)** — Raw test results from GPT-5-mini, GPT-4.1, Claude Sonnet
- **[CHAPTER_TRANSLATION_GAP.md](CHAPTER_TRANSLATION_GAP.md)** — Chapter name translation gap (~62,400 translations, ~$6 via batch)
