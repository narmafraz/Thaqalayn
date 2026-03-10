# AI Content Generation Strategies — Full Corpus in 2 Months

**Date**: 2026-03-10
**Goal**: Generate AI content for ~58,000 hadith within 2 months (~60 days)
**Current progress**: ~3,686 verses complete (~6.4%)
**Remaining**: ~54,314 verses

## Current Problem

| Issue | Detail |
|-------|--------|
| **Claude CLI cost** | ~$1.21/verse via `claude -p` → ~$70K for full corpus |
| **Monthly limit** | $15K/month Claude Code usage → cannot scale |
| **OpenAI quality** | GPT-5-mini: 67% pass, poor scholarly quality. GPT-4.1: broken (word_tags truncation) |
| **No Anthropic API key** | Only have Claude Code CLI and OpenAI API key |

## Token Usage Profile (Per Verse)

| Metric | Claude CLI | Direct API (est.) |
|--------|-----------|-------------------|
| System prompt | ~27-28K tokens | ~27-28K tokens (cacheable) |
| User message | ~150-500 tokens | ~150-500 tokens |
| Output (short, ≤80w) | ~52-56K tokens | ~15-25K tokens* |
| Output (medium, 80-150w) | ~80-113K tokens | ~25-40K tokens* |
| Output (long, >150w) | ~113K+ tokens | ~40-60K+ tokens* |

*Claude CLI inflates token counts due to conversation wrapping overhead. Direct API calls are 3-4x more token-efficient for the same content.

**Corpus breakdown by length** (estimated):
- Short (≤50 words): ~60% → ~35K verses
- Medium (51-80 words): ~20% → ~12K verses
- Long (>80 words): ~20% → ~12K verses (chunked processing)

---

## Current AI API Pricing (March 2026)

### Tier 1: Premium Quality

| Provider | Model | Input/1M | Output/1M | Batch | Cache Discount |
|----------|-------|----------|-----------|-------|----------------|
| Anthropic | Claude Sonnet 4.5/4.6 | $3.00 | $15.00 | 50% off | 90% off reads |
| Anthropic | Claude Opus 4.5/4.6 | $5.00 | $25.00 | 50% off | 90% off reads |
| OpenAI | GPT-5.2 | $1.75 | $14.00 | 50% off | 90% off |
| OpenAI | GPT-5 | $1.25 | $10.00 | 50% off | 90% off |
| Google | Gemini 2.5 Pro | $1.25 | $10.00 | 50% off | Context caching |

### Tier 2: Mid-Range

| Provider | Model | Input/1M | Output/1M | Batch | Cache Discount |
|----------|-------|----------|-----------|-------|----------------|
| Anthropic | Claude Haiku 4.5 | $1.00 | $5.00 | 50% off | 90% off reads |
| Google | Gemini 2.5 Flash | $0.30 | $2.50 | 50% off | Context caching |
| OpenAI | GPT-5-mini | $0.25 | $2.00 | 50% off | 90% off |
| Mistral | Large 3 | $0.50 | $1.50 | — | — |
| OpenAI | o4-mini | $1.10 | $4.40 | 50% off | — |

### Tier 3: Budget

| Provider | Model | Input/1M | Output/1M | Batch | Cache Discount |
|----------|-------|----------|-----------|-------|----------------|
| OpenAI | GPT-4.1-mini | $0.40 | $1.60 | 50% off | 90% off |
| Google | Gemini 2.5 Flash-Lite | $0.10 | $0.40 | 50% off | — |
| DeepSeek | V3.2 | $0.28 | $0.42 | — | 90% off reads |
| Mistral | Small 3.1 | $0.03 | $0.11 | — | — |
| OpenAI | GPT-4.1-nano | $0.02 | $0.15 | 50% off | 90% off |

### Special: Free Tiers

| Provider | Model | Free Allowance |
|----------|-------|----------------|
| Google | Gemini 2.5 Flash | 1,000 req/day (no credit card) |
| Google | Gemini 2.5 Flash-Lite | 1,000 req/day (no credit card) |
| Google | Gemini 2.5 Pro | 5-25 RPM, 1,000 req/day |
| Anthropic | All models | $5 credit on signup |

---

## Cost Projections (58K Verses)

Estimates use **20K output tokens/verse** average for direct API, **6K effective input** (with caching).
Multiply by **1.3x** for fix pass overhead. Columns show generation cost only, then with fix pass.

| # | Strategy | $/verse | 58K Gen | +Fix (1.3x) | Quality Est. |
|---|----------|---------|---------|-------------|--------------|
| 1 | Claude Sonnet API batch+cache | $0.12 | $7.0K | $9.1K | Excellent |
| 2 | Claude Haiku API batch+cache | $0.04 | $2.3K | $3.0K | Good (untested) |
| 3 | Gemini 2.5 Pro batch | $0.12 | $7.0K | $9.1K | Good (untested) |
| 4 | Gemini 2.5 Flash batch | $0.03 | $1.5K | $2.0K | Medium (untested) |
| 5 | Gemini 2.5 Flash-Lite batch | $0.005 | $290 | $380 | Unknown |
| 6 | Gemini 2.5 Flash FREE tier | $0.00 | $0 | $0 | Medium (untested) |
| 7 | GPT-5-mini batch | $0.02 | $1.3K | $1.7K | Poor (tested: 67%) |
| 8 | GPT-4.1-nano batch | $0.002 | $116 | $150 | Unknown |
| 9 | DeepSeek V3.2 + cache | $0.01 | $580 | $750 | Unknown |
| 10 | Mistral Small 3.1 | $0.003 | $174 | $230 | Unknown |
| 11 | Claude CLI (current) | $1.21 | $70K | $81K | Excellent (proven) |

---

## Strategies (Ranked by Feasibility)

### Strategy 1: Obtain Anthropic API Key ⭐ HIGHEST IMPACT
**Cost: ~$3K-9K | Timeline: Immediate once key obtained | Quality: Excellent**

The single biggest improvement. Direct Claude Sonnet API with batch processing + prompt caching would cut costs from $1.21/verse to ~$0.12/verse — a **10x reduction**.

- **Batch API**: 50% off all token costs, async within 24 hours
- **Prompt caching**: 90% off the ~28K system prompt tokens (identical across all verses)
- **Combined savings**: Up to 95% off input, 50% off output vs. standard API
- **Action**: Sign up at console.anthropic.com, add payment method
- **Risk**: Rate limits may require scaling plan; initial tier may cap spend

**Why Claude CLI is so expensive**: The `claude -p` command wraps each call in a full conversation with tool-use overhead, system prompts for Claude Code itself, and multi-turn capability. Direct API sends only your prompt and gets only your response.

### Strategy 2: Google Gemini 2.5 Flash (Free Tier)
**Cost: $0 | Timeline: 60 days | Quality: Unknown (needs testing)**

Google offers **1,000 free requests/day** for Gemini 2.5 Flash with no credit card required. Over 60 days = **60,000 free requests** — enough for the entire corpus.

- **Implementation**: Add Gemini backend to pipeline, use free API key
- **Throughput**: ~1,000/day = 60K in 60 days (tight but feasible)
- **Limitation**: Rate limits (5-15 RPM), no batch API on free tier
- **Risk**: Quality unknown for Islamic scholarly content; rate limits may cause bottlenecks
- **Action**: Test on 15-verse benchmark immediately. If quality acceptable, start immediately.

### Strategy 3: Google Gemini 2.5 Flash (Paid Batch)
**Cost: ~$2K | Timeline: 1-2 weeks | Quality: Medium-Good (untested)**

If quality is acceptable but free tier is too slow:
- **Batch API**: 50% off → ~$0.03/verse
- **1M context window**: No chunking needed for any verse
- **Structured JSON output**: Native support
- **Action**: Test quality first, then scale with batch API

### Strategy 4: Hybrid Multi-Model Pipeline
**Cost: ~$2K-5K | Timeline: 2 months | Quality: Good overall**

Use different models optimized for different verse types:

| Verse Type | Model | Rationale |
|-----------|-------|-----------|
| Short (≤50w, ~35K) | Gemini Flash-Lite or GPT-4.1-nano | Simple structure, fewer narrators |
| Medium (51-80w, ~12K) | Gemini 2.5 Flash or GPT-5-mini | Moderate complexity |
| Long (>80w, ~12K) | Claude Sonnet API or Gemini 2.5 Pro | Complex chains, needs quality |

- **Cost breakdown**: 35K × $0.005 + 12K × $0.03 + 12K × $0.12 = $175 + $360 + $1,440 = **~$2K**
- **Quality gating**: Auto-validate all outputs; failures escalate to next tier
- **Implementation**: Add model routing logic to pipeline based on word count

### Strategy 5: DeepSeek V3.2 API
**Cost: ~$580-750 | Timeline: 2-4 weeks | Quality: Unknown**

DeepSeek V3.2 offers exceptional value at $0.28/$0.42 per M tokens with a 2M context window:
- Ultra-cheap: ~$0.01/verse
- 90% cache discount on repeated system prompt
- Chinese AI company — may handle Arabic/multilingual well due to CJK training
- **Risk**: Quality for Islamic scholarly content completely untested; data privacy concerns
- **Action**: Test on benchmark verses. If quality is within 80% of Claude, use for bulk processing.

### Strategy 6: Gemini 2.5 Pro (Batch)
**Cost: ~$7-9K | Timeline: 2-4 weeks | Quality: Good (untested)**

Google's flagship model at competitive pricing:
- $1.25/$10.00 per M tokens, 50% batch discount
- 1M context window
- Strong multilingual capabilities (trained on diverse languages)
- Structured JSON output mode
- **Risk**: Quality needs validation; Arabic scholarly content is niche

### Strategy 7: Claude Haiku 4.5 API (Batch + Cache)
**Cost: ~$3K | Timeline: 2-4 weeks | Quality: Good (untested for this task)**

If Anthropic API key obtained, Haiku 4.5 is 3x cheaper than Sonnet:
- $1.00/$5.00 per M, batch 50% off, cache 90% off
- Previous Haiku 3.5 failed on medium/long hadiths — Haiku 4.5 may be better
- **Action**: Test on benchmark. Use for short/medium, Sonnet for long only.
- **Risk**: Prior Haiku versions failed; needs careful quality testing

### Strategy 8: Reduce Output Scope (Fewer Languages First)
**Cost: Variable (50-70% reduction) | Timeline: Faster | Quality: Same per language**

Currently generating 11 languages per verse. Reducing to 3-4 priority languages cuts output tokens by ~60%:
- **Phase A**: Generate English + Arabic + Farsi + Urdu only (4 languages, core audience)
- **Phase B**: Add remaining 7 languages in a cheaper second pass later
- **Impact**: ~20K output → ~8K output per verse, halving costs across any model
- **Trade-off**: Delayed availability for non-core languages

### Strategy 9: Field-by-Field Generation
**Cost: Variable (potentially 30-50% savings) | Timeline: 3-4 weeks setup | Quality: Same**

Instead of one massive 12-field JSON per call, split into focused calls:
1. **Call 1** (cheap model): `word_tags` + `diacritized_text` — structural, less quality-sensitive
2. **Call 2** (cheap model): `translations` (11 languages) — translation is commoditized
3. **Call 3** (quality model): `summary`, `key_terms`, `related_quran`, `topics` — needs Islamic scholarship
4. **Call 4** (code/cheap): `narrator_chain` enrichment — can partly use narrator_templates programmatically

- Cheaper models handle 70% of token output (translations, word_tags)
- Quality model handles only scholarly fields (~30% of tokens)
- **Implementation complexity**: High — need to split prompts, merge results

### Strategy 10: Post-Processing Enrichment Pipeline
**Cost: Near-zero code cost | Timeline: 1-2 weeks | Quality: Improves any model**

Automate fields that don't need AI:
- **Narrator IDs**: Match Arabic names against `narrator_templates.json` (1,074 entries) programmatically
- **Related Quran**: Build a cross-reference database from existing hadith-Quran mappings
- **Topics**: Rule-based classification using keyword matching against `topic_taxonomy.json`
- **Diacritized text**: Source from existing Arabic text databases (e.g., Tanzil for Quran, Shamela for hadith)

This reduces the AI's job to translations + summaries + key_terms + word_tags, cutting prompt complexity and improving consistency.

### Strategy 11: GPT-5-mini with Enhanced Prompts
**Cost: ~$1.3-1.7K | Timeline: 1-2 weeks setup | Quality: Medium (improvable)**

Invest in prompt engineering to raise GPT-5-mini from 67% to 85%+ pass rate:
1. **More few-shot examples**: Add 5-10 gold-standard examples (currently 3)
2. **Narrator template injection**: Include full narrator data in prompt for current book
3. **Explicit Quran cross-reference hints**: Pre-compute likely Quran references and include as hints
4. **Structured output mode**: Use OpenAI's native JSON schema enforcement
5. **Post-processing auto-fix**: Expand auto-fix rules beyond current off-by-one fixes

- **Risk**: May still not match Claude quality for scholarly depth
- **Upside**: Already have OpenAI API key; batch API available

### Strategy 12: Anthropic Credits / Startup Program
**Cost: $0 (if approved) | Timeline: 1-4 weeks application | Quality: Excellent**

Anthropic offers credit programs:
- **Startup credits**: $500 to $150K+ for qualifying projects
- **Educational/research programs**: Islamic scholarly content may qualify
- **Open-source projects**: Thaqalayn is a public good — leverage this
- **Action**: Apply at anthropic.com/earlyaccess or contact partnerships
- **Risk**: Approval timeline uncertain; may not qualify

### Strategy 13: Google AI Studio Free Credits
**Cost: $0 | Timeline: Immediate | Quality: Depends on model**

Google Cloud / AI Studio offers:
- Free tier: 1,000 requests/day across Gemini models
- New account credits: Google Cloud often provides $300 free credit
- Vertex AI: May have batch pricing advantages
- **Action**: Create Google Cloud account, claim credits, test Gemini models

### Strategy 14: Self-Hosted Open-Source LLM
**Cost: ~$500-2K GPU rental | Timeline: 1-2 weeks setup | Quality: Variable**

Run Llama 3.3 70B or Qwen 2.5 72B on rented GPUs:
- **Providers**: RunPod ($0.39/hr A100), Lambda Labs ($1.10/hr H100), Vast.ai (variable)
- **Throughput**: A100 80GB can run 70B model at ~20-40 tokens/sec
- **58K verses × ~20K tokens**: ~1.16B total output tokens
- **At 30 tok/sec**: ~10,700 hours → need 8+ GPUs for 2 months → ~$4K+ rental
- **Advantages**: No rate limits, full control, data stays private
- **Risks**: Setup complexity, quality for Arabic/Islamic content unproven, GPU availability
- **Best for**: If API options all fail on quality or budget

### Strategy 15: Parallel Multi-Provider Split
**Cost: ~$1-3K | Timeline: 2 months | Quality: Mixed, best-of-breed**

Run the corpus through multiple providers simultaneously:
- **Gemini free tier**: 1,000/day → handles 60K over 2 months (primary)
- **OpenAI batch**: GPT-5-mini for overflow / parallel processing
- **DeepSeek**: Budget fallback for any remaining
- **Claude API** (if key obtained): Quality pass on failures from other models

All providers process in parallel; quality gate selects best result per verse.

### Strategy 16: Two-Pass: Cheap Generation + Quality Fix
**Cost: ~$1-2K cheap + $1-3K fix | Timeline: 2 months | Quality: Good**

1. **Pass 1**: Generate with cheapest viable model (Gemini Flash-Lite, GPT-4.1-nano, or DeepSeek V3.2) for entire corpus → ~$300-750
2. **Quality gate**: Automated review flags low-quality verses (~30-40% estimated)
3. **Pass 2**: Re-generate only flagged verses with higher-quality model (Claude Sonnet or Gemini Pro) → ~$2-5K for 20K verses
4. **Net savings**: Only pay premium prices for verses that need it

### Strategy 17: Mistral Small 3.1 Bulk Processing
**Cost: ~$174-230 | Timeline: 1-2 weeks | Quality: Unknown**

At $0.03/$0.11 per M tokens, Mistral Small is absurdly cheap:
- Entire corpus: ~$174
- Even with 50% failure rate and re-generation: ~$350
- **Risk**: Quality for 11-language Islamic content completely unknown
- **Action**: Quick benchmark on 15 verses. If >50% pass, use as cheap first pass.

### Strategy 18: Incremental Quality Tiers (Ship Early, Enhance Later)
**Cost: ~$500 initially | Timeline: 2 weeks for v1 | Quality: Improves over time**

Ship a "good enough" version now, improve later:
1. **Tier 1 (immediate)**: Generate with cheapest model. Ship translations + word_tags only (skip summaries, key_terms, topics)
2. **Tier 2 (month 1)**: Add summaries and topics via better model for verses that have them missing
3. **Tier 3 (month 2+)**: Enhance with Claude Sonnet for scholarly depth on remaining fields

- The Angular app can gracefully handle missing fields (show what's available)
- Users get basic AI content immediately while quality improves over time

### Strategy 19: Crowdsource + AI Assist
**Cost: ~$500-1K for AI + volunteer time | Timeline: 2+ months | Quality: High (human-verified)**

Combine AI generation with community review:
1. AI generates draft content with cheapest viable model
2. Build a simple review interface (web form)
3. Recruit Islamic studies students / scholars to verify and correct
4. Focus AI budget on fields that are hardest to review (word_tags, diacritics)
5. Humans handle summaries, key_terms, Quran references (where domain expertise matters)

- **Upside**: Highest quality; builds community
- **Risk**: Volunteer availability, coordination overhead, may be slower than 2 months

### Strategy 20: Negotiate Volume Pricing / Enterprise Deals
**Cost: 20-50% discount on any provider | Timeline: 1-2 weeks | Quality: Same**

At 58K × ~20K tokens = ~1.16B output tokens, this is a significant volume:
- **Anthropic**: Enterprise volume discounts available (starting ~$1K/month committed)
- **OpenAI**: Enterprise tier with custom pricing
- **Google**: Cloud committed-use discounts
- **Action**: Contact sales teams, mention scale and public-good nature of project
- **Combine with**: Any API-based strategy above

---

## Recommended Action Plan

### Week 1: Testing & Setup (Parallel)

| Day | Action | Owner |
|-----|--------|-------|
| 1-2 | Sign up for Anthropic API (console.anthropic.com) | User |
| 1-2 | Sign up for Google AI Studio, get Gemini API key | User |
| 1-2 | Sign up for DeepSeek API | User |
| 2-3 | Implement Gemini backend in pipeline | Dev |
| 2-3 | Implement DeepSeek backend in pipeline | Dev |
| 3-5 | Run 15-verse benchmark on: Gemini 2.5 Flash, Gemini 2.5 Pro, DeepSeek V3.2, Claude Haiku 4.5 (if key), Mistral Small | Dev |
| 5-7 | Analyse results, rank models by quality/cost | Dev |
| 5-7 | Apply for Anthropic startup credits | User |

### Week 2: Pipeline Optimization

| Action | Detail |
|--------|--------|
| Implement post-processing enrichment | Narrator ID matching, topic classification |
| Add quality-tiered routing | Route by verse length to different models |
| Set up batch processing | For whichever providers support it |
| Implement prompt caching | For Anthropic/OpenAI/DeepSeek |
| Start Gemini free tier processing | 1,000 verses/day if quality is acceptable |

### Weeks 3-8: Production Processing

| Week | Verses/day | Cumulative | Notes |
|------|-----------|------------|-------|
| 3 | 1,000-2,000 | ~10K | Gemini free + paid overflow |
| 4 | 2,000-3,000 | ~25K | Multiple providers in parallel |
| 5 | 2,000-3,000 | ~40K | Quality audit at 25K milestone |
| 6 | 2,000-3,000 | ~55K | |
| 7-8 | Remaining + fixes | ~58K | Fix pass on failures, quality review |

### Budget Scenarios

| Scenario | Models Used | Total Cost | Timeline |
|----------|------------|------------|----------|
| **Best case** (Gemini free works) | Gemini Flash free + Claude API fixes | $500-1K | 8 weeks |
| **Good case** (API key obtained) | Claude Haiku batch + Sonnet for long | $3-5K | 6 weeks |
| **Medium case** (hybrid paid) | Gemini Flash paid + GPT-5-mini + Claude fixes | $3-5K | 6-8 weeks |
| **Expensive case** (Sonnet API only) | Claude Sonnet batch + cache | $7-10K | 4-6 weeks |
| **Current trajectory** (CLI only) | Claude CLI `claude -p` | $70K+ | 5+ months |

---

## Immediate Next Steps

1. **TODAY**: Sign up for Google AI Studio (free), get Gemini API key
2. **TODAY**: Sign up for Anthropic API (console.anthropic.com)
3. **THIS WEEK**: Implement Gemini backend, run quality benchmark
4. **THIS WEEK**: If Anthropic key obtained, test Claude Haiku 4.5 batch + cache
5. **DECISION POINT**: After benchmarks, choose primary strategy

The most likely winning combination is **Strategy 2 (Gemini free) + Strategy 4 (hybrid) + Strategy 10 (post-processing enrichment)**, targeting a total cost of **$1-3K** over 2 months.

---

*This document should be updated after benchmark results are available.*
