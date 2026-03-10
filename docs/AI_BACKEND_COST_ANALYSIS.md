# AI Backend Cost Analysis

Comparison of available backends for the AI content generation pipeline. Tests conducted 2026-03-09/10 on al-Kafi Volume 1, Book 1, Chapter 1 (15 verses, 27-300 words).

## Executive Summary

| Backend | Model | Pass Rate | Cost/15 verses | Quality | Viable? |
|---------|-------|-----------|----------------|---------|---------|
| Claude CLI (`claude -p`) | Sonnet 4 | **87%** (13/15) | $18.11 | Excellent | Yes, but expensive |
| OpenAI API | gpt-5-mini | **67%** (10/15) | ~$0.32 | Poor scholarly content | No (quality) |
| OpenAI API | gpt-4.1 | **7%** (1/14) | $1.06 | Structural failures | No (broken) |
| OpenAI API | gpt-4.1-mini | ~0% | ~$0.05 | Structural failures | No (broken) |

**Bottom line**: Claude Sonnet produces far superior Islamic scholarly content. OpenAI models fail on structural requirements (word_tags truncation) or scholarly depth (wrong narrator IDs, no Quran references, generic summaries). No OpenAI model currently matches Claude's quality for this domain.

---

## Detailed Results

### Claude Sonnet 4 (via `claude -p`)

- **Pass rate**: 13/15 (87%)
- **Total cost**: $18.11 ($1.21/verse average, ~$1.39/success)
- **Errors**: 2 failures (1 timeout at 300 words, 1 validation error)
- **Fix pass**: 4 needed, 4 succeeded (100% fix rate)

**Quality strengths**:
- Correct narrator identification with proper IDs from narrator_templates
- Accurate Quran cross-references with surah:ayah citations
- Faithful translations preserving rhetorical structure
- Detailed summaries capturing scholarly nuance
- Proper Arabic diacritization

### GPT-5-mini (reasoning model, $0.25/$2.00 per M tokens)

- **Pass rate**: 10/15 (67%)
- **Total cost**: ~$0.32 ($0.021/verse)
- **Errors**: 5 failures (word_tags truncation, structural issues)
- **Fix pass**: 3 needed, 2 succeeded

**Quality weaknesses** (compared to Claude on same verses):
1. **Narrator identification**: Wrong narrator IDs (e.g., assigns `narrator_123` when correct is `narrator_456`). Doesn't leverage narrator_templates effectively.
2. **Quran cross-references**: Often empty `related_quran` where Claude finds 2-3 references.
3. **Translations**: Acceptable grammatically but compressed — loses rhetorical devices, honorifics, and scholarly register.
4. **Summaries**: Generic one-liners vs. Claude's multi-sentence contextual summaries.
5. **Key terms**: Fewer terms identified, translations sometimes inaccurate.

**Cost analysis at scale**:
| Scenario | Standard API | Batch API (50% off) |
|----------|-------------|---------------------|
| Per hadith | ~$0.021 | ~$0.011 |
| 58K corpus | ~$1,218 | ~$609 |
| With fix pass (est.) | ~$1,500 | ~$750 |

### GPT-4.1 ($2.00/$8.00 per M tokens)

- **Pass rate**: 1/14 (7%)
- **Total cost**: $1.06
- **Failure mode**: Systematic `word_tags` array truncation. Model produces fewer entries than actual Arabic words. Gap grows with verse length (up to -61 for 300-word text). Not auto-fixable — missing entries simply don't exist.

### GPT-4.1-mini ($0.40/$1.60 per M tokens)

- **Pass rate**: ~0%
- **Failure mode**: Same word_tags truncation as gpt-4.1 but worse. Additional structural issues with chunk boundaries and narrator word_ranges.

---

## Cost Comparison at Scale (58K hadith corpus)

| Backend | Model | Est. $/hadith | 58K total | Quality |
|---------|-------|---------------|-----------|---------|
| Claude CLI | Sonnet | ~$1.21 | ~$70K | Excellent |
| Claude CLI | Sonnet (only pass) | ~$1.39 | ~$81K* | Excellent |
| OpenAI API | gpt-5-mini | ~$0.021 | ~$1.2K | Poor |
| OpenAI Batch | gpt-5-mini | ~$0.011 | ~$640 | Poor |
| OpenAI API | gpt-5.4 | ~$1.00+ | ~$58K+ | Unknown (untested) |

*Includes wasted cost on errors/retries.

---

## Key Technical Findings

### 1. GPT-5 Reasoning Model API Differences
GPT-5 family models require different API parameters than GPT-4.x:
- `developer` role instead of `system`
- `max_completion_tokens` instead of `max_tokens`
- No `temperature` parameter (reasoning models self-regulate)
- Longer processing times (2-5 min vs 10-30s)
- Reasoning tokens billed as output tokens (included in `completion_tokens`)

### 2. Auto-Fixes Implemented
Two auto-fixes help OpenAI models pass validation on trivial structural errors:
- **Off-by-one chunk word_end**: Model uses last index instead of array length. Auto-corrected.
- **Zero-width narrator word_ranges**: `word_end == word_start`. Auto-corrected to `word_start + 1`.

### 3. Word Tags Truncation (GPT-4.x Fatal Flaw)
GPT-4.1 and GPT-4.1-mini systematically truncate `word_tags` arrays. The model stops generating entries before reaching the actual word count. This is not fixable — the missing entries contain data the model never produced.

---

## Strategy: Path Forward

### Current Constraint
- Claude Code CLI (`claude -p`) produces excellent quality but costs ~$70K for the full corpus
- OpenAI API key is the only available API access
- No Anthropic API key available for direct Claude API calls

### Recommended Approach: Hybrid Pipeline

#### Phase 1: OpenAI for Short Hadiths (Immediate)
- Use **gpt-5-mini Batch API** for hadiths ≤50 words (~60% of corpus)
- Short hadiths have simpler structure, fewer narrators, less room for quality gaps
- Est. cost: ~$350 for ~35K short hadiths
- Run quality audit on first 1,000 to validate before scaling

#### Phase 2: Quality-Gated Processing
- After Phase 1, manually review a sample (50-100 hadiths) to establish quality baseline
- Define automated quality thresholds:
  - Narrator ID accuracy (cross-check against narrator_templates)
  - Related Quran completeness (compare to known cross-references)
  - Translation faithfulness score
- Verses that fail quality gate get flagged for human review or Claude re-processing later

#### Phase 3: Claude for Complex Hadiths
- Reserve Claude (`claude -p`) for hadiths >80 words, multiple narrators, or Quran-heavy content
- Process incrementally: 50-100 verses/session as budget allows
- Estimated: ~23K complex hadiths × $1.39 = ~$32K (can be spread over months)

#### Phase 4: Future API Access
- **Anthropic API key**: If/when available, Claude API is ~$3/$15 per M tokens (Sonnet), ~60% cheaper than `claude -p` overhead
- **Anthropic Batch API**: Additional 50% discount on top of API pricing
- **OpenAI gpt-5.4**: May match Claude quality — worth testing when budget allows ($5/$30 per M tokens)

### Alternative: Prompt Optimization for OpenAI
Before scaling, invest in prompt engineering specifically for GPT-5-mini:
1. **Narrator templates injection**: Include full narrator template data in the prompt (GPT-5-mini may need more explicit guidance)
2. **Few-shot examples**: Add 2-3 complete gold-standard examples to the prompt
3. **Field-by-field generation**: Instead of one massive JSON, generate each field separately (reduces truncation risk)
4. **Post-processing enrichment**: Use narrator_templates to correct narrator IDs after generation

### Cost Projections (Hybrid Approach)

| Phase | Hadiths | Backend | Est. Cost |
|-------|---------|---------|-----------|
| Phase 1 (short, batch) | ~35K | gpt-5-mini batch | ~$350 |
| Phase 2 (quality audit) | 100 samples | Manual review | $0 (time) |
| Phase 3 (complex, incremental) | ~23K | Claude CLI | ~$32K over time |
| **Total** | **58K** | **Hybrid** | **~$32K** (vs $70K pure Claude) |

Savings: ~$38K (54%) by using OpenAI for short hadiths.

---

## Raw Data

### Test Run Details

**Claude run** (2026-03-09, ~122 min):
- Verses: al-kafi 1:1:1:1 through 1:1:1:15
- Workers: 1 (sequential for comparison)
- 13 pass, 0 needs_fix, 2 error
- Total generation cost: $18.11

**OpenAI gpt-5-mini run** (2026-03-09, ~122 min):
- Same 15 verses
- Workers: 1
- 10 pass, 0 needs_fix, 5 error
- Total generation cost: ~$0.32
- Reasoning model: longer per-verse time but cheap

**OpenAI gpt-4.1 run** (2026-03-09):
- 14 verses attempted
- 1 pass, 13 error
- Fatal: word_tags truncation

### Files
- OpenAI test outputs: `ThaqalaynDataSources/ai-content/openai-test/`
- Claude test outputs: `ThaqalaynDataSources/ai-content/samples/responses/`
- OpenAI backend: `ThaqalaynDataGenerator/app/pipeline_cli/openai_backend.py`
- Batch API module: `ThaqalaynDataGenerator/app/pipeline_cli/openai_batch.py`

---

*Last updated: 2026-03-10*
