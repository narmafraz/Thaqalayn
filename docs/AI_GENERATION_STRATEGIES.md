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

## Budget Math

### Claude CLI Budget

| Metric | Value |
|--------|-------|
| Monthly budget | $15K |
| 2-month budget | $30K |
| Cost per verse (proven) | ~$1.21 avg ($1.39/success with 87% pass rate) |
| Verses achievable (2 months) | ~$30K / $1.39 = **~21,600 verses** |
| Corpus gap | 54,314 - 21,600 = **~32,700 verses short** |

Claude CLI alone cannot finish the corpus. We need OpenAI and/or free tiers to cover the gap.

### OpenAI API Budget (Already Have Key)

| Model | $/verse (std) | $/verse (batch) | 58K cost (batch) | Quality |
|-------|--------------|-----------------|------------------|---------|
| GPT-5-mini | ~$0.021 | ~$0.011 | **$640** | Poor (67% pass, tested) |
| GPT-5 | ~$0.12 | ~$0.06 | **$3,480** | Unknown |
| GPT-4.1-mini | ~$0.005 | ~$0.003 | **$174** | Broken (word_tags truncation) |
| GPT-4.1-nano | ~$0.002 | ~$0.001 | **$58** | Unknown |
| o4-mini | ~$0.05 | ~$0.025 | **$1,450** | Unknown |

**OpenAI pricing (March 2026):**

| Model | Input/1M | Output/1M | Batch (50% off) | Cached Input (90% off) |
|-------|----------|-----------|------------------|------------------------|
| GPT-5-mini | $0.25 | $2.00 | $0.125/$1.00 | $0.025 |
| GPT-5 | $1.25 | $10.00 | $0.625/$5.00 | $0.125 |
| GPT-4.1-mini | $0.40 | $1.60 | $0.20/$0.80 | $0.04 |
| GPT-4.1-nano | $0.02 | $0.15 | $0.01/$0.075 | $0.002 |
| o4-mini | $1.10 | $4.40 | $0.55/$2.20 | $0.11 |

**Token estimates per verse** (direct API, not CLI):
- Input: ~6K tokens (with prompt caching bringing ~28K system prompt down to cache hit)
- Output: ~15-25K tokens (short verses), ~25-40K (medium), ~40-60K+ (long)
- Average across corpus: ~20K output tokens

### Free Tiers (No Money Required)

| Provider | Model | Free Allowance | 60-day Capacity | Signup |
|----------|-------|----------------|-----------------|--------|
| Google | Gemini 2.5 Flash | 1,000 req/day | **60,000 verses** | google.com (free, no CC) |
| Google | Gemini 2.5 Flash-Lite | 1,000 req/day | **60,000 verses** | Same |
| Google | Gemini 2.5 Pro | 1,000 req/day | **60,000 verses** | Same |

The Google Gemini free tier is the most significant free resource — it can cover the entire corpus if quality is acceptable.

---

## Token Usage Profile (Per Verse)

| Metric | Claude CLI | OpenAI API | Notes |
|--------|-----------|------------|-------|
| System prompt | ~27-28K tokens | ~6K (with cache) | Claude CLI adds conversation overhead |
| User message | ~150-500 tokens | ~150-500 tokens | Same content |
| Output (short ≤80w) | ~52-56K tokens | ~15-20K tokens | CLI inflates 3-4x |
| Output (medium 80-150w) | ~80-113K tokens | ~25-40K tokens | |
| Output (long >150w) | ~113K+ tokens | ~40-60K+ tokens | |

**Corpus breakdown by verse length** (estimated):
- Short (≤50 words): ~60% → ~35K verses
- Medium (51-80 words): ~20% → ~12K verses
- Long (>80 words): ~20% → ~12K verses (chunked processing)

---

## Strategies (20 Total, Constrained to Available Resources)

### Strategy 1: Hybrid Claude CLI + OpenAI Batch ⭐ MOST PRACTICAL
**Cost: $30K Claude + ~$350-640 OpenAI | Quality: Good-Excellent**

Use Claude for complex verses, OpenAI GPT-5-mini batch for simple ones:

| Verse Type | Count | Backend | Cost | Quality |
|-----------|-------|---------|------|---------|
| Long (>80w) | ~12K | Claude CLI | ~$16.7K ($1.39/verse) | Excellent |
| Medium (51-80w) | ~12K | Claude CLI | ~$14.5K ($1.21/verse) | Excellent |
| Short (≤50w) | ~31K* | OpenAI GPT-5-mini batch | ~$340 ($0.011/verse) | Acceptable** |

*After deducting 3,686 already completed
**Short hadiths have simpler structure — quality gap is smaller

- **Total**: ~$31.5K (slightly over budget — see optimizations below)
- **Timeline**: 6-8 weeks (Claude limited by monthly cap)
- **Month 1**: Process ~12,400 long/medium verses with Claude ($15K) + all short via OpenAI batch ($340)
- **Month 2**: Process remaining ~9,600 long/medium verses with Claude ($13.3K) + fix pass

### Strategy 2: Google Gemini Free Tier as Primary
**Cost: $0 | Quality: Unknown (needs testing)**

Google offers **1,000 free requests/day** for Gemini 2.5 Flash/Pro/Flash-Lite. Over 60 days = **60,000 requests** — enough for the entire remaining corpus.

- **Implementation**: Build Gemini backend (uses OpenAI-compatible API format)
- **Rate limit**: 5-15 RPM → 1,000/day is achievable at ~1 req/min sustained
- **Risk**: Quality completely untested for Islamic scholarly content + 11-language output
- **Mitigation**: Test on 15-verse benchmark first. If quality >70%, use as primary.
- **Fallback**: Verses failing quality gate get re-processed with Claude CLI

### Strategy 3: OpenAI GPT-5-mini Batch for Entire Corpus
**Cost: ~$640 (batch) | Quality: Poor-Medium (67% tested)**

Process everything through GPT-5-mini batch API at $0.011/verse:
- 58K verses = ~$640 total
- At 67% pass rate: ~39K pass, ~19K fail
- Failed verses → Claude CLI fix/regeneration at ~$1.39/verse = up to $26K
- **Best case** (if prompt optimization raises pass to 85%): failures drop to ~8.7K → $12K Claude fix
- **Worst case** (67% pass, all failures need Claude): ~$26K + $640 = ~$27K total

### Strategy 4: OpenAI Prompt Engineering Sprint
**Cost: ~$50 testing + implementation time | Quality: Improvable**

Invest 1-2 weeks improving GPT-5-mini pass rate from 67% to 85%+:

1. **More few-shot examples**: Add 5-10 gold-standard examples (currently 3)
2. **Narrator template injection**: Include full narrator data in prompt for current book/chapter
3. **Explicit Quran cross-reference hints**: Pre-compute likely Quran references, include as hints
4. **OpenAI structured output mode**: Use native JSON schema enforcement (prevents structural errors)
5. **Post-processing auto-fix expansion**: Add more auto-fix rules for common GPT failures
6. **Chain-of-thought for narrator IDs**: Ask model to reason about narrator identification before generating
7. **Book-specific prompt tuning**: Different prompt variants optimized per book's style

- **Impact**: Every 10% improvement in pass rate saves ~$8K in Claude CLI re-processing
- **This is zero-cost optimization** — only uses OpenAI API (cheap) for testing

### Strategy 5: Post-Processing Enrichment Pipeline
**Cost: $0 (code only) | Quality: Improves any model's output**

Automate fields that don't strictly need AI, reducing what the model must generate and improving consistency:

| Field | Automation Approach |
|-------|-------------------|
| **narrator_chain IDs** | Match Arabic names against `narrator_templates.json` (1,074 entries) programmatically |
| **topics** | Rule-based classification using keyword matching against `topic_taxonomy.json` (90 topics) |
| **related_quran** | Build cross-reference database from existing hadith-Quran mappings in corpus |
| **diacritized_text** | Source from existing Arabic text databases (Shamela, Tanzil) |
| **key_terms** | Extract from `key_phrases_dictionary.json` (160 entries) + glossary matching |

- **Impact**: Reduces AI's job to translations + summaries + word_tags
- **Quality**: Code-based fields are more consistent than AI-generated
- **Implementation**: 1-2 weeks development work
- **Applies to**: Any model — makes cheap models more viable by reducing their burden

### Strategy 6: Reduce Output Scope (Fewer Languages First)
**Cost: 50-70% reduction on any strategy | Quality: Same per language**

Currently generating 11 languages per verse. Reduce to core languages:

| Phase | Languages | Token Reduction | Timeline |
|-------|-----------|-----------------|----------|
| **Phase A** | English + Arabic + Farsi + Urdu (4 languages) | ~60% fewer output tokens | Immediate |
| **Phase B** | Add Turkish + Indonesian + Bengali (7 languages) | Remaining 40% | Month 2+ |
| **Phase C** | Add Spanish + French + German + Russian + Chinese | Final languages | Later |

- With 4 languages: output drops from ~20K to ~8K tokens/verse
- Claude CLI cost drops to ~$0.50/verse → 54K verses = $27K (fits in 2-month budget!)
- OpenAI GPT-5-mini drops to ~$0.005/verse → 54K = $290
- **Trade-off**: Non-core languages delayed, but core audience served immediately

### Strategy 7: Two-Pass: Cheap Generate + Claude Fix
**Cost: ~$640 OpenAI + $5-15K Claude fix | Quality: Good**

1. **Pass 1**: GPT-5-mini batch for entire corpus → ~$640
2. **Automated quality gate**: Review checks flag problematic verses
3. **Pass 2**: Only re-generate flagged verses with Claude CLI
4. **Optimization**: Send GPT-5-mini output as context to Claude ("fix this, don't regenerate from scratch") — potentially cheaper fix pass

- If 33% need Claude fix: 19K × $1.39 = $26.4K → over budget
- If prompt optimization gets GPT-5-mini to 85% pass: 8.7K × $1.39 = $12.1K → **total $12.7K** (fits!)
- **Key dependency**: Strategy 4 (prompt engineering) must succeed first

### Strategy 8: OpenAI o4-mini for Quality
**Cost: ~$1,450 batch | Quality: Unknown (reasoning model)**

o4-mini is a reasoning model like GPT-5-mini but potentially better at structured output:
- $1.10/$4.40 per M tokens, batch 50% off
- Reasoning tokens may help with complex fields (narrator IDs, Quran references)
- **Risk**: Untested; reasoning models have been mixed (GPT-5-mini was better than GPT-4.1 but still poor)
- **Action**: Test on 15-verse benchmark. If >80% pass rate, use for medium verses.

### Strategy 9: Field-by-Field Split Generation
**Cost: 30-50% savings | Quality: Same or better**

Instead of one massive 12-field JSON per call, split into focused calls:

| Call | Fields | Model | Why |
|------|--------|-------|-----|
| 1 | `word_tags` + `diacritized_text` | GPT-4.1-nano ($0.001/verse) | Structural, repetitive |
| 2 | `translations` (11 languages) | GPT-5-mini ($0.011/verse) | Translation is commoditized |
| 3 | `summary` + `key_terms` + `related_quran` + `topics` | Claude CLI (~$0.40/verse) | Needs Islamic scholarship |
| 4 | `narrator_chain` enrichment | Code (post-processing) | narrator_templates matching |

- **Total**: ~$0.45/verse → 54K × $0.45 = **$24.3K** (fits in budget!)
- **Challenge**: Complex implementation — split prompts, merge results, handle field dependencies
- **Benefit**: Each call is smaller → faster, fewer timeouts, higher pass rate per field

### Strategy 10: Gemini Free Tier + Claude CLI Fix
**Cost: $0 Gemini + Claude CLI for failures | Quality: Good**

Combine Strategy 2 (free Gemini) with Claude CLI for quality gating:
1. Process entire corpus via Gemini free tier (60 days, 1,000/day)
2. Run automated quality review on all outputs
3. Claude CLI re-processes only failures (~15-30% estimated)
4. Budget: 0 + (8K-16K failures × $1.39) = $11-22K Claude

- **Best case**: Gemini quality is high → few failures → $11K
- **Worst case**: Gemini quality is poor → many failures → $22K (still fits in $30K)
- **Risk**: Must implement Gemini backend first; quality unknown

### Strategy 11: OpenAI GPT-5 (Full Model) for Quality-Critical Verses
**Cost: ~$3.5K batch for 58K | Quality: Unknown (untested)**

GPT-5 (full, not mini) at $1.25/$10.00 per M tokens, batch 50% off:
- ~$0.06/verse → 58K = $3.5K
- Full GPT-5 may have significantly better scholarly output than GPT-5-mini
- **Risk**: Completely untested for this task; could have same issues
- **Action**: Test on 15-verse benchmark immediately
- **If quality matches Claude**: This is the winning strategy at 1/50th the cost of CLI

### Strategy 12: Maximize Claude CLI Efficiency
**Cost: $30K (same budget, more verses) | Quality: Excellent**

Optimize the Claude CLI pipeline to get more verses per dollar:

| Optimization | Savings Est. | Effort |
|-------------|-------------|--------|
| **Trim system prompt** (remove redundant few-shot examples) | 5-10% | Low |
| **Maximize parallelism** (20+ workers) | 0% cost, faster | Low |
| **Improve pass rate** (better validation → fewer retries) | 10-15% | Medium |
| **Reduce fix pass triggers** (relax non-critical warnings) | 5-10% | Low |
| **Skip already-complete verses** | Variable | Already done |
| **Use `--fallback-model haiku`** for fix pass | 10-15% | Low |

Combined: potentially ~$0.90-1.00/verse → 30K-33K verses achievable.
Still not enough alone, but stretches the budget.

### Strategy 13: Incremental Quality Tiers (Ship Early, Enhance Later)
**Cost: Variable | Quality: Improves over time**

Don't generate all 12 fields at once. Ship what's cheap, enhance later:

| Tier | Fields | Model | Cost |
|------|--------|-------|------|
| **Tier 1** (week 1-2) | `translations` (4 langs) + `word_tags` | OpenAI batch | ~$200 |
| **Tier 2** (week 3-4) | `summary` + `topics` + `key_terms` | OpenAI/Claude | ~$2-5K |
| **Tier 3** (week 5-8) | Remaining languages + `related_quran` + quality fixes | Claude CLI | ~$10-15K |

- Angular app handles missing fields gracefully (show what's available)
- Users get basic content fast, scholarly depth later
- **Prioritizes**: Translations (highest user value) over metadata fields

### Strategy 14: Batch Processing Optimization for OpenAI
**Cost: 50% savings on all OpenAI usage | Quality: Same**

Always use OpenAI Batch API instead of standard API:
- **50% off** all token costs
- 24-hour async processing (acceptable for this workload)
- Already implemented in pipeline (`batch` subcommand)
- **Combined with prompt caching**: Cached input tokens get 90% off + 50% batch = 95% off input
- **Action**: Ensure all OpenAI runs use batch mode, never standard API

### Strategy 15: Smart Queue Ordering
**Cost: $0 (optimization) | Quality: Same**

Process verses in optimal order to maximize value within budget:

1. **Short verses first** (cheapest per verse, highest pass rate)
2. **Books with existing narrator coverage** next (better narrator matching)
3. **Long/complex verses last** (most expensive, save for Claude CLI)
4. **Skip verses with known chronic timeout issues** (save for targeted fix later)

- Ensures maximum corpus coverage if budget runs out before completion
- Front-loads the "easy wins" for early progress

### Strategy 16: Crowdsource + AI Assist
**Cost: $0 (volunteer time) | Quality: High (human-verified)**

Combine AI generation with community review:
1. AI generates drafts with cheapest model (OpenAI batch)
2. Build a simple web review interface
3. Recruit Islamic studies students/scholars to verify summaries, key_terms, Quran references
4. Focus AI budget on structural fields (word_tags, translations) that are tedious to review manually
5. Humans handle scholarly fields where domain expertise matters most

- **Upside**: Highest quality; builds community; free labor
- **Risk**: Volunteer availability; coordination overhead; may exceed 2-month timeline

### Strategy 17: Apply for Anthropic API Credits
**Cost: $0 if approved | Quality: Excellent**

Anthropic offers credit programs for qualifying projects:
- **Startup credits**: $500 to $150K+ for qualifying projects
- **Research/educational programs**: Islamic scholarly content as digital humanities
- **Open-source angle**: Thaqalayn is a public good serving underserved communities
- **Action**: Apply at anthropic.com/earlyaccess or partnerships
- **If approved**: Direct API with batch+cache → $3-9K for entire corpus (see original pricing analysis)
- **Risk**: Timeline uncertain; may not qualify; approval could take weeks

### Strategy 18: OpenAI GPT-4.1-nano for Structural Fields Only
**Cost: ~$58 batch for 58K | Quality: Unknown for partial generation**

GPT-4.1-nano is nearly free at $0.02/$0.15 per M tokens:
- Use ONLY for `word_tags` and `diacritized_text` (structural, repetitive)
- GPT-4.1 had word_tags truncation issues, but nano may behave differently
- Even if 50% fail, it's only ~$116 to retry
- **Risk**: May have same truncation issues as GPT-4.1
- **Action**: Test on 15 verses. If word_tags pass, use for structural fields across corpus.

### Strategy 19: Parallel Free-Tier Gemini + OpenAI Processing
**Cost: $0 Gemini + ~$640 OpenAI | Quality: Best-of-two**

Run both providers simultaneously, keep best result per verse:
1. **Gemini free tier**: 1,000/day → processes corpus over 60 days
2. **OpenAI GPT-5-mini batch**: Processes entire corpus in ~24 hours → $640
3. **Quality gate**: For each verse, compare both outputs, keep the one with fewer review warnings
4. **Claude CLI**: Only for verses where both providers fail → minimize Claude spend

- **Advantage**: Two independent attempts per verse → higher effective pass rate
- **Combined pass rate**: If Gemini ~70% and GPT-5-mini ~67% independently → ~90% combined (assuming independent errors)
- **Claude budget saved for**: Only the hardest ~10% of verses → ~5.8K × $1.39 = $8K

### Strategy 20: Reduce Validation Strictness for Non-Critical Fields
**Cost: $0 (config change) | Quality: Slightly lower, much higher pass rate**

Current review checks are calibrated for Claude-quality output. Relaxing non-critical checks:

| Check | Current | Proposed | Impact |
|-------|---------|----------|--------|
| `narrator_id_accuracy` | Hard fail | Warning only | Many OpenAI failures are wrong IDs — post-fix with code |
| `related_quran_completeness` | Medium severity | Low severity | GPT-5-mini often misses refs — add via post-processing |
| `summary_depth` | Medium severity | Low severity | Generic summaries acceptable as v1 |
| `translation_faithfulness` | Keep strict | Keep strict | Core value, must be accurate |
| `word_tags_count` | Keep strict | Keep strict | Structural requirement |

- **Impact**: GPT-5-mini pass rate could jump from 67% to 80-85% by relaxing non-critical checks
- **Trade-off**: Lower scholarly depth, compensated by post-processing (Strategy 5)

---

## Recommended Combination

The strategies above aren't mutually exclusive. The optimal approach combines several:

### The Plan: "Cheap First, Claude for Quality"

```
Week 1:  [Setup]
         - Implement Gemini backend (free tier)
         - Test Gemini 2.5 Flash + GPT-5 (full) + o4-mini on 15-verse benchmark
         - Implement post-processing enrichment (narrator IDs, topics)
         - Optimize GPT-5-mini prompts (few-shot, structured output, narrator hints)

Week 2:  [Cheap Bulk Pass]
         - Start Gemini free tier: 1,000 verses/day
         - Submit OpenAI GPT-5-mini batch for all 54K remaining verses (~$640)
         - Run quality comparison: GPT-5-mini vs Gemini for each verse
         - Apply post-processing enrichment to all outputs
         - Apply for Anthropic API credits (Strategy 17)

Week 3-4: [Claude CLI Month 1 — Complex Verses]
         - Start Claude CLI for verses >80 words (highest quality need)
         - ~$15K budget → ~10,800 complex verses
         - Continue Gemini free tier for remaining simple verses
         - Automated quality gating on all Gemini/OpenAI outputs

Week 5-6: [Claude CLI Month 2 — Failures + Medium Verses]
         - Claude CLI for quality-gate failures from OpenAI/Gemini
         - Process medium-complexity verses not yet done
         - ~$15K budget → ~10,800 more verses

Week 7-8: [Fix Pass + Completion]
         - Fix pass on all verses with review warnings
         - Final quality audit
         - Fill any remaining gaps
```

### Projected Outcome

| Source | Verses | Cost | Quality |
|--------|--------|------|---------|
| Already complete | 3,686 | $0 | Excellent |
| OpenAI GPT-5-mini batch | ~35K short (with quality gate) | ~$640 | Acceptable |
| Gemini free tier | ~35K (parallel, keep best) | $0 | Unknown |
| Claude CLI (month 1) | ~10,800 complex | ~$15K | Excellent |
| Claude CLI (month 2) | ~10,800 failures + medium | ~$15K | Excellent |
| **Total** | **~58K** | **~$30.6K** | **Good-Excellent** |

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Gemini quality is poor | Still have OpenAI + Claude CLI as backup |
| GPT-5-mini prompt optimization fails | Claude CLI handles more verses (reduce from $640 to fewer OpenAI) |
| Claude CLI $15K/month runs out early | Prioritize complex verses first; simple ones handled by OpenAI |
| Gemini free tier rate-limited | Use only as bonus; not on critical path |
| More failures than expected | Reduce output scope (Strategy 6): 4 languages instead of 11 |

### Emergency Fallback: 4-Language Mode

If budget looks tight mid-process, switch to 4 core languages (en, ar, fa, ur):
- Cuts output tokens by ~60%
- Claude CLI cost drops to ~$0.50/verse → $30K covers 60K verses
- OpenAI GPT-5-mini drops to ~$0.005/verse → entire corpus for $290
- Remaining 7 languages added as a cheaper second pass later

---

## Immediate Next Steps

1. **TODAY**: Sign up for Google AI Studio (free, no CC required), get Gemini API key
2. **THIS WEEK**: Test GPT-5 (full model) and o4-mini on 15-verse benchmark (already have OpenAI key)
3. **THIS WEEK**: Implement Gemini backend in pipeline + test on 15-verse benchmark
4. **THIS WEEK**: Start OpenAI prompt optimization sprint (Strategy 4)
5. **THIS WEEK**: Build post-processing enrichment for narrator IDs and topics (Strategy 5)
6. **WEEK 2**: Submit first OpenAI batch + start Gemini free tier processing
7. **WEEK 3**: Begin Claude CLI processing for complex verses

---

## Appendix: Full Pricing Reference (March 2026)

### Available Resources (No Additional Cost)

**Claude Code Max** ($15K/month, 2 months):
- Access via `claude -p` CLI
- Uses Sonnet 4.6 by default, Haiku available as fallback
- ~$1.21/verse average (proven)
- Max ~24,800 verses over 2 months

**OpenAI API** (pay-per-use, existing key):

| Model | Input/1M | Output/1M | Batch (50% off) | Cached Input (90% off) | Context |
|-------|----------|-----------|------------------|------------------------|---------|
| GPT-5-mini | $0.25 | $2.00 | $0.125/$1.00 | $0.025 | — |
| GPT-5 | $1.25 | $10.00 | $0.625/$5.00 | $0.125 | 400K |
| GPT-4.1 | $2.00 | $8.00 | $1.00/$4.00 | $0.20 | 1M |
| GPT-4.1-mini | $0.40 | $1.60 | $0.20/$0.80 | $0.04 | 1M |
| GPT-4.1-nano | $0.02 | $0.15 | $0.01/$0.075 | $0.002 | 1M |
| o4-mini | $1.10 | $4.40 | $0.55/$2.20 | $0.11 | — |

**Google Gemini Free Tier** (no signup cost):

| Model | Input/1M | Output/1M | Free Limit | Context |
|-------|----------|-----------|------------|---------|
| Gemini 2.5 Pro | $0 (free) | $0 (free) | 1,000 req/day | 1M |
| Gemini 2.5 Flash | $0 (free) | $0 (free) | 1,000 req/day | 1M |
| Gemini 2.5 Flash-Lite | $0 (free) | $0 (free) | 1,000 req/day | 1M |

---

*This document should be updated after benchmark results are available.*
