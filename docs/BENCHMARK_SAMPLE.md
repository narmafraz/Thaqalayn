# AI Pipeline Benchmark Sample

**Date**: 2026-03-10
**Purpose**: Representative 15-verse sample for testing frontier OpenAI models before committing to a full-corpus strategy.

---

## Design Criteria

The benchmark must cover the **diversity axes** of the 58K corpus:

1. **Word count range**: 4–557 Arabic words (corpus ranges ~4–600+)
2. **Book diversity**: 7 different books (out of 22+ in corpus)
3. **Content types**: Legal rulings, ethics, theology, cosmology, prophetic traditions, sermons, jurisprudence
4. **Narrator chains**: With chain (varied lengths) and without chain (Quran, Nahj al-Balagha, Faqih)
5. **Chunked processing**: At least 2 verses >80 words (triggers chunked pipeline)
6. **Quran**: Included as baseline (shortest, no narrator chain, distinct format)

## Benchmark Verses

| # | Path | Words | Narrators | Book | Category | Notes |
|---|------|-------|-----------|------|----------|-------|
| 1 | `/books/quran:1:1` | 4 | 0 | Quran | Baseline | Shortest possible, no chain |
| 2 | `/books/al-kafi:1:2:8:2` | 11 | 1 | Al-Kafi v1 | Ethical | Very short hadith |
| 3 | `/books/al-kafi:4:1:1:1` | 14 | 1 | Al-Kafi v4 | Prophetic | Short with chain |
| 4 | `/books/al-kafi:3:1:1:1` | 15 | 1 | Al-Kafi v3 | Legal ruling | Short legal text |
| 5 | `/books/al-kafi:7:4:2:6` | 24 | 1 | Al-Kafi v7 | Jurisprudence | Short legal |
| 6 | `/books/al-kafi:1:2:19:11` | 39 | 1 | Al-Kafi v1 | Theological | Medium-short |
| 7 | `/books/nahj-al-balagha:2:1:3` | 52 | 0 | Nahj al-Balagha | Sermon | No chain, rhetorical |
| 8 | `/books/al-kafi:8:1:12:1` | 54 | 1 | Al-Kafi v8 (Rawda) | Narrative | Rawda genre |
| 9 | `/books/man-la-yahduruhu-al-faqih:1:3:2` | 73 | 0 | Faqih | Legal ruling | No chain, different compilation |
| 10 | `/books/al-kafi:2:1:1:1` | 77 | 1 | Al-Kafi v2 | Cosmological | Near chunk threshold |
| 11 | `/books/al-amali-saduq:1:16` | 81 | 0 | Amali Saduq | Ethics | Just above chunk threshold (80w) |
| 12 | `/books/al-kafi:6:2:8:5` | 102 | 1 | Al-Kafi v6 | Food law | Chunked, legal |
| 13 | `/books/tahdhib-al-ahkam:1:11:5` | 110 | 0 | Tahdhib | Legal ruling | Chunked, no chain |
| 14 | `/books/al-kafi:1:4:41:6` | 300 | 1 | Al-Kafi v1 | Theological | Long, multi-chunk |
| 15 | `/books/al-kafi:1:3:1:1` | 557 | 1 | Al-Kafi v1 | Theological | Maximum complexity, 9+ chunks |

### Distribution Summary

| Metric | Value |
|--------|-------|
| Total Arabic words | 1,513 |
| Mean words/verse | 101 |
| Median words/verse | 54 |
| Below chunk threshold (≤80w) | 10 verses (67%) |
| Above chunk threshold (>80w) | 5 verses (33%) |
| With narrator chain | 10 verses (67%) |
| Without narrator chain | 5 verses (33%) |
| Unique books | 7 |

### Word Count Distribution

```
  4w  ████
 11w  ██████
 14w  ████████
 15w  ████████
 24w  █████████████
 39w  █████████████████████
 52w  ████████████████████████████
 54w  █████████████████████████████
 73w  ██████████████████████████████████████
 77w  ████████████████████████████████████████
 81w  █████████████████████████████████████████ (chunk threshold: 80)
102w  ██████████████████████████████████████████████████████
110w  █████████████████████████████████████████████████████████
300w  ████████████████████████████████████████████████████████████████████████(...)
557w  ████████████████████████████████████████████████████████████████████████(...)
```

## How to Run the Benchmark

### Single-verse test (quick validation)
```bash
cd ThaqalaynDataGenerator
PYTHONPATH="$PWD:$PWD/app" SOURCE_DATA_DIR="../ThaqalaynDataSources/" \
  .venv/Scripts/python.exe -m app.pipeline_cli.pipeline \
  --backend openai --openai-model gpt-5.4 \
  --single /books/al-kafi:1:2:19:11
```

### Full benchmark (all 15 verses)
```bash
cd ThaqalaynDataGenerator
for path in \
  "/books/quran:1:1" \
  "/books/al-kafi:1:2:8:2" \
  "/books/al-kafi:4:1:1:1" \
  "/books/al-kafi:3:1:1:1" \
  "/books/al-kafi:7:4:2:6" \
  "/books/al-kafi:1:2:19:11" \
  "/books/nahj-al-balagha:2:1:3" \
  "/books/al-kafi:8:1:12:1" \
  "/books/man-la-yahduruhu-al-faqih:1:3:2" \
  "/books/al-kafi:2:1:1:1" \
  "/books/al-amali-saduq:1:16" \
  "/books/al-kafi:6:2:8:5" \
  "/books/tahdhib-al-ahkam:1:11:5" \
  "/books/al-kafi:1:4:41:6" \
  "/books/al-kafi:1:3:1:1"; do
  echo "=== Processing $path ==="
  PYTHONPATH="$PWD:$PWD/app" SOURCE_DATA_DIR="../ThaqalaynDataSources/" \
    .venv/Scripts/python.exe -m app.pipeline_cli.pipeline \
    --backend openai --openai-model MODEL_NAME \
    --single "$path"
done
```

### Batch API benchmark (cheapest)
```bash
# Submit all 15 as a single batch
PYTHONPATH="$PWD:$PWD/app" SOURCE_DATA_DIR="../ThaqalaynDataSources/" \
  .venv/Scripts/python.exe -m app.pipeline_cli.pipeline batch submit \
  --backend openai --openai-model MODEL_NAME \
  --max-verses 15
# Then: batch status → batch download → batch submit-fixes → batch download-fixes
```

## Success Criteria

A model passes the benchmark if:

1. **Pass rate ≥ 80%** (12/15 verses pass validation)
2. **Short hadith pass rate ≥ 90%** (9/10 of the ≤80w verses)
3. **No systematic failures** (same error type on >3 verses)
4. **Chunked verses**: At least 3/5 pass (chunk boundary handling works)
5. **Quality spot-check**: Narrator IDs correct, Quran refs present where expected, translations faithful (not summaries)

## Models to Test (Priority Order)

| Priority | Model | Model ID | Max Output | Reason | Est. Cost for 15 Verses |
|----------|-------|----------|-----------|--------|------------------------|
| 1 | GPT-5.4 | `gpt-5.4` | ~16K? | Frontier model (Intelligence Index 57) | ~$1.50 |
| 2 | GPT-5.2 | `gpt-5.2` | **128K** | Large output capacity, same price as 5.3 | ~$0.30 |
| 3 | GPT-5 | `gpt-5` | ~16K? | Cheapest GPT-5 family | ~$0.15 |
| 4 | GPT-5-mini (re-test) | `gpt-5-mini` | ~16K? | Baseline with optimizations applied | ~$0.05 |

**Skip**:
- **GPT-5.3 Codex** (`gpt-5.3-codex`): 128K output but uses Responses API (`/v1/responses`), not Chat Completions — incompatible with pipeline
- **GPT-5.3 Chat** (`gpt-5.3-chat-latest`): Only 16K max output — truncates verses needing 10-25K+ tokens
- **o4-mini**: Intelligence Index 33 < GPT-5-mini's 41, costs more
- **GPT-4.1 family**: Known word_tags truncation issue

## Expected Output

After running the benchmark, analyse results with:
```bash
python scripts/analyse_run.py --run-dir ../ThaqalaynDataSources/ai-content/samples/responses/ --batch-report
```

Record results in a table:

| Model | Completed | Pass | Needs Fix | Error | Pass Rate | Cost | Notes |
|-------|-----------|------|-----------|-------|-----------|------|-------|
| GPT-5.4 | 13/15 | 11 | 2 | 0 | **85%** | $1.46 | 300w + 557w timed out (APITimeoutError) |
| GPT-5.2 | 0/15 | — | — | — | **TBD** | — | Not yet run. 128K max output — may handle long verses |
| GPT-5.3 Codex | 0/15 | 0 | 0 | 15 | **N/A** | $0.00 | Uses Responses API, not Chat Completions — incompatible |
| GPT-5.3 Chat | — | — | — | — | **SKIP** | — | 16K max output — too small for our verses |
| GPT-5 | 1/15 | 1 | 0 | 0 | **TBD** | $0.08 | Only quran_1_1 run so far |
| GPT-5-mini (prior) | 6/15 | 5 | 0 | 1 | **83%** | $0.16 | Pre-optimization data from prior test run |

### GPT-5.4 Detailed Results (2026-03-11)

| Verse | Words | Status | Cost | Tokens | Notes |
|-------|-------|--------|------|--------|-------|
| quran_1_1 | 4 | pass | $0.051 | 2,573 | |
| al-kafi_1_2_8_2 | 11 | pass | $0.102 | 5,930 | |
| al-kafi_4_1_1_1 | 14 | needs_fix | $0.096 | 4,956 | Diacritics fix needed |
| al-kafi_3_1_1_1 | 15 | pass | $0.089 | 5,075 | |
| al-kafi_7_4_2_6 | 24 | pass | $0.094 | 5,364 | |
| al-kafi_1_2_19_11 | 39 | pass | $0.090 | 5,107 | |
| nahj-al-balagha_2_1_3 | 52 | pass | $0.105 | 6,089 | |
| al-kafi_8_1_12_1 | 54 | pass | $0.108 | 6,266 | |
| man-la-yahduruhu-al-faqih_1_3_2 | 73 | pass | $0.113 | 6,571 | |
| al-kafi_2_1_1_1 | 77 | pass | $0.148 | 8,906 | |
| al-amali-saduq_1_16 | 81 | pass | $0.146 | 8,841 | |
| al-kafi_6_2_8_5 | 102 | pass | $0.163 | 9,809 | Chunk boundary auto-fixed |
| tahdhib-al-ahkam_1_11_5 | 110 | needs_fix | $0.158 | 9,219 | Diacritics fix failed |
| al-kafi_1_4_41_6 | 300 | **TIMEOUT** | — | — | APITimeoutError with SDK retries |
| al-kafi_1_3_1_1 | 557 | **TIMEOUT** | — | — | APITimeoutError with SDK retries |

**Short hadith (≤80w) pass rate**: 9/10 (90%) — meets success criteria
**Key finding**: GPT-5.4 quality is excellent on ≤110w verses but cannot produce 40-75K+ output tokens needed for long verses.

### Key Findings (2026-03-11)

1. **GPT-5.3 Codex is incompatible** — uses OpenAI Responses API (`/v1/responses`), not Chat Completions. Requires new endpoint support to test.
2. **GPT-5.4 times out on long verses** (300w+) — the model can't complete 40-75K token outputs in time, even with 15-min SDK timeout. May need batch API (no timeout, 50% off).
3. **GPT-5.4 narrator identification is excellent** — this was GPT-5-mini's #1 weakness. GPT-5.4 correctly identifies all narrators with proper `known_identity`.
4. **Chunk boundary auto-fix works** — `al-kafi_6_2_8_5` had off-by-one chunk boundary, automatically corrected.

---

*This benchmark should be run before committing to any full-corpus strategy. Results directly feed into the model selection in [AI_GENERATION_STRATEGIES.md](AI_GENERATION_STRATEGIES.md).*
