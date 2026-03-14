# Benchmark Implementation Plan & Run Instructions

**Date**: 2026-03-10
**Goal**: Implement pipeline optimizations, then benchmark frontier OpenAI models on 15 representative verses

---

## Part 1: Pre-Benchmark Code Changes (Phase 1)

All changes are in `ThaqalaynDataGenerator/`. Five independent changes, implementable in parallel.

### Change 1: Deterministic Chunk Boundary Fix

**Why**: 33% of OpenAI failures are zero-length chunks (`word_start == word_end == 0`). The model generates correct isnad/matn text but outputs placeholder `(0,0)` word ranges.

**File**: `app/pipeline_cli/verse_processor.py`

**What**: Add new function `fix_chunk_boundaries(result)` and call it in `postprocess_verse()` BEFORE `validate_result()`:

```python
def fix_chunk_boundaries(result: dict) -> list:
    """Recalculate chunk word_start/word_end from actual text. Returns list of fixes applied."""
    fixes = []
    word_analysis = result.get("word_analysis") or result.get("word_tags", [])
    total_words = len(word_analysis)
    chunks = result.get("chunks", [])
    if not chunks or total_words == 0:
        return fixes

    for i, chunk in enumerate(chunks):
        # Fix zero-length chunks
        if chunk.get("word_start", 0) == chunk.get("word_end", 0):
            if chunk.get("chunk_type") == "isnad" and result.get("isnad_matn", {}).get("isnad_ar"):
                isnad_words = len(result["isnad_matn"]["isnad_ar"].split())
                chunk["word_start"] = 0
                chunk["word_end"] = min(isnad_words, total_words)
                fixes.append(f"chunk[{i}] isnad: set word_end={chunk['word_end']} from isnad_ar word count")
            elif len(chunks) == 1:
                chunk["word_start"] = 0
                chunk["word_end"] = total_words
                fixes.append(f"chunk[{i}] single: set word_end={total_words}")

        # Fix off-by-one on last chunk
        if i == len(chunks) - 1:
            if chunk.get("word_end", 0) == total_words - 1:
                chunk["word_end"] = total_words
                fixes.append(f"chunk[{i}] last: word_end {total_words-1} -> {total_words}")

    # Enforce sequential: chunk[i+1].word_start = chunk[i].word_end
    for i in range(len(chunks) - 1):
        expected = chunks[i]["word_end"]
        if chunks[i + 1].get("word_start") != expected:
            old = chunks[i + 1].get("word_start")
            chunks[i + 1]["word_start"] = expected
            fixes.append(f"chunk[{i+1}] sequential: word_start {old} -> {expected}")

    return fixes
```

**Integration point in `postprocess_verse()`** — add BEFORE `validate_result()` call:

```python
# Deterministic chunk boundary fix (zero-cost)
chunk_fixes = fix_chunk_boundaries(result)
if chunk_fixes:
    logger.info("CHUNK-FIX %s: %s", verse_id, "; ".join(chunk_fixes))

validation_errors = validate_result(result)  # existing line
```

**Tests needed**: Zero-length isnad chunk, single chunk, already-correct (no-op), sequential gap repair.

---

### Change 2: Fix OPENAI_PRICING

**Why**: GPT-5.4 pricing is wrong (5.00/30.00 should be 2.50/15.00). Missing gpt-5.3-codex entry means cost reports will be wrong during benchmarks.

**File**: `app/pipeline_cli/openai_backend.py` — `OPENAI_PRICING` dict

**What**: Fix gpt-5.4 pricing, add missing models:

```python
# Fix:
"gpt-5.4": (2.50, 15.00),     # was (5.00, 30.00)

# Add:
"gpt-5.3": (1.75, 14.00),
"gpt-5.3-codex": (1.75, 14.00),
```

---

### Change 3: Increase max_output_tokens to 40000

**Why**: Prevents truncation on long verses. You only pay for tokens actually generated, not the limit.

**Files & locations**:
- `app/pipeline_cli/openai_backend.py` — `call_openai()` default param: `max_output_tokens: int = 32768` → `40000`
- `app/pipeline_cli/openai_batch.py` — hardcoded `"max_tokens": 32768` in gen/fix request bodies → `40000`

---

### Change 4: Reasoning Model Support in Batch API

**Why**: `openai_batch.py` always uses `"system"` role and `"max_tokens"`, which is WRONG for GPT-5.x reasoning models. Without this fix, batch benchmarks for GPT-5.4/5.3/5 will fail.

**File**: `app/pipeline_cli/openai_batch.py` — gen request body construction and fix request body construction

**What**: Add reasoning model detection at both locations:

```python
is_reasoning = model.startswith(("gpt-5", "o3", "o4"))
if is_reasoning:
    request_body = {
        "model": model,
        "max_completion_tokens": 40000,
        "messages": [
            {"role": "developer", "content": plan.system_prompt},
            {"role": "user", "content": plan.user_message},
        ],
    }
else:
    request_body = {
        "model": model,
        "temperature": 0.0,
        "max_tokens": 40000,
        "messages": [
            {"role": "system", "content": plan.system_prompt},
            {"role": "user", "content": plan.user_message},
        ],
    }
```

---

### Change 5: Truncation Detection (stop_reason check)

**Why**: If the model's output hits max_output_tokens, the response is truncated silently. Currently no check — truncated JSON parses as error later with a confusing message.

**File**: `app/pipeline_cli/pipeline.py` — `process_verse()` function

**What**: After `call_llm()` returns and the error check, add:

```python
stop = cr.get("stop_reason")
if stop == "length":
    logger.warning("GEN %s: truncated (stop_reason=length, %d output tokens), retrying...",
                    verse_id, cr.get("output_tokens", 0))
    stats.total_cost += cr.get("cost", 0)
    stats.total_output_tokens += cr.get("output_tokens", 0)
    continue  # retry with next attempt
```

---

## Part 2: Benchmark Data Structure

All benchmark data lives in:

```
ThaqalaynDataSources/ai-content/benchmarks/
├── claude-sonnet/          # Baseline (gold standard)
│   ├── responses/          # 11/15 copied from corpus/responses/
│   └── stats/              # 11/15 copied from corpus/stats/
├── gpt-5-mini/             # Prior test baseline
│   ├── responses/          # 5/15 copied from openai-test/responses/
│   └── stats/              # 6/15 copied from openai-test/stats/
├── gpt-5.4/                # Frontier model (to benchmark)
│   ├── responses/
│   └── stats/
├── gpt-5.3-codex/          # Structured generation specialist (to benchmark)
│   ├── responses/
│   └── stats/
└── gpt-5/                  # Full GPT-5 (to benchmark)
    ├── responses/
    └── stats/
```

### Current Data State

| Model | Responses | Stats | Source |
|-------|-----------|-------|--------|
| Claude Sonnet | **11/15** | 11/15 | Copied from `corpus/` |
| GPT-5-mini | **5/15** | 6/15 | Copied from `openai-test/` |
| GPT-5.4 | 0/15 | 0/15 | To benchmark |
| GPT-5.3 Codex | 0/15 | 0/15 | To benchmark |
| GPT-5 | 0/15 | 0/15 | To benchmark |

### Missing Claude Responses (4 verses)

These weren't in the corpus yet — generate them first for comparison baseline:

| Verse ID | Path | Words | Why Missing |
|----------|------|-------|-------------|
| `quran_1_1` | `/books/quran:1:1` | 4 | Quran not in corpus run |
| `nahj-al-balagha_2_1_3` | `/books/nahj-al-balagha:2:1:3` | 52 | Not reached yet |
| `al-kafi_8_1_12_1` | `/books/al-kafi:8:1:12:1` | 54 | Not reached yet |
| `man-la-yahduruhu-al-faqih_1_3_2` | `/books/man-la-yahduruhu-al-faqih:1:3:2` | 73 | Not reached yet |

---

## Part 3: Running the Benchmarks

### Prerequisites

1. Code changes from Part 1 are implemented
2. `OPENAI_API_KEY` environment variable is set
3. Working directory: `ThaqalaynDataGenerator/`
4. Python venv active (`.venv/Scripts/python.exe`)

### Step 0: Generate Missing Claude Baselines (optional but recommended)

Generate the 4 missing Claude responses so we have a complete 15/15 baseline:

```bash
cd /c/Users/TrainingGR03/Documents/Projects/scripture/ThaqalaynDataGenerator

for path in \
  "/books/quran:1:1" \
  "/books/nahj-al-balagha:2:1:3" \
  "/books/al-kafi:8:1:12:1" \
  "/books/man-la-yahduruhu-al-faqih:1:3:2"; do
  echo "=== Generating Claude baseline for $path ==="
  PYTHONPATH="$PWD:$PWD/app" SOURCE_DATA_DIR="../ThaqalaynDataSources/" \
  AI_CONTENT_SUBDIR="benchmarks/claude-sonnet" \
    .venv/Scripts/python.exe -m app.pipeline_cli.pipeline \
    --single "$path"
done
```

**Estimated cost**: ~$5-6 (4 verses × ~$1.39/verse)
**Estimated time**: ~20-30 min

After running, verify: `ls ../ThaqalaynDataSources/ai-content/benchmarks/claude-sonnet/responses/ | wc -l` should be 15.

**Important**: The `AI_CONTENT_SUBDIR` env var tells the pipeline to write to `benchmarks/claude-sonnet` instead of `corpus`. Verify this works with the pipeline's path construction in `config.py`.

### Step 1: Benchmark GPT-5.4 (Frontier — Priority 1)

#### Option A: Sequential (simpler, ~$3-4, ~30 min)

```bash
cd /c/Users/TrainingGR03/Documents/Projects/scripture/ThaqalaynDataGenerator

BENCHMARK_VERSES=(
  "/books/quran:1:1"
  "/books/al-kafi:1:2:8:2"
  "/books/al-kafi:4:1:1:1"
  "/books/al-kafi:3:1:1:1"
  "/books/al-kafi:7:4:2:6"
  "/books/al-kafi:1:2:19:11"
  "/books/nahj-al-balagha:2:1:3"
  "/books/al-kafi:8:1:12:1"
  "/books/man-la-yahduruhu-al-faqih:1:3:2"
  "/books/al-kafi:2:1:1:1"
  "/books/al-amali-saduq:1:16"
  "/books/al-kafi:6:2:8:5"
  "/books/tahdhib-al-ahkam:1:11:5"
  "/books/al-kafi:1:4:41:6"
  "/books/al-kafi:1:3:1:1"
)

for path in "${BENCHMARK_VERSES[@]}"; do
  echo "=== GPT-5.4: $path ==="
  PYTHONPATH="$PWD:$PWD/app" SOURCE_DATA_DIR="../ThaqalaynDataSources/" \
  AI_CONTENT_SUBDIR="benchmarks/gpt-5.4" \
    .venv/Scripts/python.exe -m app.pipeline_cli.pipeline \
    --backend openai --openai-model gpt-5.4 \
    --single "$path"
done
```

#### Option B: Batch API (cheapest — 50% off, ~$1.50-2, but 24h wait)

```bash
cd /c/Users/TrainingGR03/Documents/Projects/scripture/ThaqalaynDataGenerator

# Submit batch
PYTHONPATH="$PWD:$PWD/app" SOURCE_DATA_DIR="../ThaqalaynDataSources/" \
AI_CONTENT_SUBDIR="benchmarks/gpt-5.4" \
  .venv/Scripts/python.exe -m app.pipeline_cli.pipeline batch submit \
  --backend openai --openai-model gpt-5.4 \
  --max-verses 15

# Check status (run periodically)
PYTHONPATH="$PWD:$PWD/app" SOURCE_DATA_DIR="../ThaqalaynDataSources/" \
AI_CONTENT_SUBDIR="benchmarks/gpt-5.4" \
  .venv/Scripts/python.exe -m app.pipeline_cli.pipeline batch status

# Download results when complete
PYTHONPATH="$PWD:$PWD/app" SOURCE_DATA_DIR="../ThaqalaynDataSources/" \
AI_CONTENT_SUBDIR="benchmarks/gpt-5.4" \
  .venv/Scripts/python.exe -m app.pipeline_cli.pipeline batch download

# Submit fixes for any failures
PYTHONPATH="$PWD:$PWD/app" SOURCE_DATA_DIR="../ThaqalaynDataSources/" \
AI_CONTENT_SUBDIR="benchmarks/gpt-5.4" \
  .venv/Scripts/python.exe -m app.pipeline_cli.pipeline batch submit-fixes

# Download fix results
PYTHONPATH="$PWD:$PWD/app" SOURCE_DATA_DIR="../ThaqalaynDataSources/" \
AI_CONTENT_SUBDIR="benchmarks/gpt-5.4" \
  .venv/Scripts/python.exe -m app.pipeline_cli.pipeline batch download-fixes
```

### Step 2: Benchmark GPT-5.2 (Priority 2 — 128K max output)

GPT-5.2 has 128K max output tokens — the largest of any Chat Completions-compatible model. May handle the 300w + 557w verses that GPT-5.4 timed out on.

Same as Step 1 but replace:
- `--openai-model gpt-5.2`
- `AI_CONTENT_SUBDIR="benchmarks/gpt-5.2"`

### ~~Step 2 (old): Benchmark GPT-5.3 Codex~~ — BLOCKED

GPT-5.3 Codex uses the Responses API (`/v1/responses`), not Chat Completions. Incompatible with our pipeline without adding a new endpoint. **Skip.**

GPT-5.3 Chat (`gpt-5.3-chat-latest`) exists but only supports 16K max output — too small for our verses (need 10-25K+). **Skip.**

### Step 3: Benchmark GPT-5 (Priority 3)

Same as Step 1 but replace:
- `--openai-model gpt-5`
- `AI_CONTENT_SUBDIR="benchmarks/gpt-5"`

### Step 4: Re-benchmark GPT-5-mini with Optimizations (Priority 4)

Re-run GPT-5-mini after Phase 1 code changes are applied, to measure improvement from 67% baseline:

Same as Step 1 but replace:
- `--openai-model gpt-5-mini`
- `AI_CONTENT_SUBDIR="benchmarks/gpt-5-mini"`

Note: This overwrites the 5 existing copied responses. That's fine — we want fresh results with optimizations applied.

---

## Part 4: Analysing Results

### Per-Model Summary

After each model finishes, run:

```bash
cd /c/Users/TrainingGR03/Documents/Projects/scripture/ThaqalaynDataGenerator

PYTHONPATH="$PWD:$PWD/app" SOURCE_DATA_DIR="../ThaqalaynDataSources/" \
  .venv/Scripts/python.exe scripts/analyse_run.py \
  --run-dir ../ThaqalaynDataSources/ai-content/benchmarks/MODEL_NAME/responses/ \
  --batch-report
```

Replace `MODEL_NAME` with `gpt-5.4`, `gpt-5.3-codex`, `gpt-5`, `gpt-5-mini`.

### Cross-Model Comparison

After all models are benchmarked, compare:

```bash
cd /c/Users/TrainingGR03/Documents/Projects/scripture/ThaqalaynDataGenerator

.venv/Scripts/python.exe -c "
import json, os, glob

models = ['claude-sonnet', 'gpt-5-mini', 'gpt-5', 'gpt-5.2', 'gpt-5.3-codex', 'gpt-5.4']
base = '../ThaqalaynDataSources/ai-content/benchmarks'

print(f'{'Model':<20} {'Pass':>5} {'Fail':>5} {'Rate':>6} {'Cost':>8}')
print('-' * 50)

for model in models:
    stats_dir = os.path.join(base, model, 'stats')
    if not os.path.exists(stats_dir):
        print(f'{model:<20} (no data)')
        continue
    files = glob.glob(os.path.join(stats_dir, '*.stats.json'))
    total = len(files)
    passed = 0
    cost = 0.0
    for f in files:
        with open(f) as fh:
            d = json.load(fh)
        if d.get('status') == 'pass':
            passed += 1
        cost += d.get('gen_cost', 0) + d.get('fix_cost', 0)
    failed = total - passed
    rate = f'{passed/total*100:.0f}%' if total > 0 else 'N/A'
    print(f'{model:<20} {passed:>5} {failed:>5} {rate:>6} \${cost:>7.2f}')
"
```

### Success Criteria (from BENCHMARK_SAMPLE.md)

1. **Pass rate >= 80%** (12/15 verses)
2. **Short hadith pass rate >= 90%** (9/10 of the <=80w verses)
3. **No systematic failures** (same error on >3 verses)
4. **Chunked verses**: At least 3/5 pass
5. **Quality spot-check**: Narrator IDs correct, Quran refs present, translations faithful

---

## Part 5: AI_CONTENT_SUBDIR Verification

**Critical**: The benchmark approach relies on `AI_CONTENT_SUBDIR` controlling where the pipeline reads/writes data. Verify this works:

```bash
# Test with dry-run first
PYTHONPATH="$PWD:$PWD/app" SOURCE_DATA_DIR="../ThaqalaynDataSources/" \
AI_CONTENT_SUBDIR="benchmarks/gpt-5.4" \
  .venv/Scripts/python.exe -m app.pipeline_cli.pipeline \
  --backend openai --openai-model gpt-5.4 \
  --single "/books/al-kafi:1:2:8:2" --dry-run
```

Check that the pipeline outputs paths like:
- `ai-content/benchmarks/gpt-5.4/responses/al-kafi_1_2_8_2.json`
- `ai-content/benchmarks/gpt-5.4/stats/al-kafi_1_2_8_2.stats.json`

If `AI_CONTENT_SUBDIR` doesn't support nested paths (e.g., `benchmarks/gpt-5.4`), we'll need to adjust — either:
- Use flat names like `AI_CONTENT_SUBDIR="benchmark-gpt54"`, or
- Modify `config.py` to support nested subdirs

---

## Part 6: Post-Benchmark Code Changes (Phase 2)

Only implement these AFTER benchmark results guide which are needed:

| Change | Implement If... |
|--------|----------------|
| **Structured Outputs (JSON Schema)** | Benchmark shows JSON parse errors or missing fields |
| **Narrator template injection** | Benchmark shows wrong narrator IDs in frontier models |
| **Validation severity recalibration** | Benchmark shows frontier models fail on non-critical fields |
| **Prompt caching verification** | Cost per verse is higher than expected (cache miss) |

---

## Implementation Order

```
1. [CODE] Change 1: fix_chunk_boundaries()           DONE (commit 47abbf0)
2. [CODE] Change 2: Fix OPENAI_PRICING               DONE (commit 47abbf0)
3. [CODE] Change 3: max_output_tokens 32768 → 40000  DONE (commit 47abbf0)
4. [CODE] Change 4: Reasoning model in batch API      DONE (commit 47abbf0)
5. [CODE] Change 5: stop_reason truncation check       DONE (commit 47abbf0)
6. [TEST] Run existing tests to verify no breakage     DONE
7. [VERIFY] Dry-run benchmark to check AI_CONTENT_SUBDIR works  DONE
8. [RUN] Generate 4 missing Claude baselines           PENDING (~$6)
9. [RUN] Benchmark GPT-5.4                             DONE (13/15, 2 long verses timed out) $1.46
10. [RUN] Benchmark GPT-5.3 Codex                      BLOCKED — uses Responses API, not Chat Completions
10b.[RUN] Benchmark GPT-5.2 (128K output)              PENDING — may handle long verses GPT-5.4 couldn't
11. [RUN] Benchmark GPT-5                              IN PROGRESS (1/15 done)
12. [RUN] Re-benchmark GPT-5-mini (optimized)          PENDING
13. [ANALYSE] Compare all models                       PENDING
14. [DECIDE] Pick primary model for production         PENDING
```

### Additional fixes applied during benchmarking

- **SDK timeout 15min → 1hr** (commit e546dff) — long verses were timing out
- **Removed double-retry** (SDK retries 3x already, our code no longer retries on top)
- **Fixed logging timestamps** (commit e546dff) — `basicConfig` was no-op, replaced with explicit handler setup
- **Timeout cost estimation** (commit e546dff) — timed-out requests now log estimated cost

### Benchmark progress (2026-03-11)

| Step | Model | Status | Results |
|------|-------|--------|---------|
| 9 | GPT-5.4 | **13/15 done** | 85% pass, $1.46. 300w+557w timed out. |
| 10 | GPT-5.3 Codex | **BLOCKED** | Uses Responses API — incompatible with pipeline |
| 10b | GPT-5.2 | **PENDING** | 128K max output — may handle long verses. Same price as 5.3 ($1.75/$14.00) |
| 11 | GPT-5 | **1/15 done** | quran_1_1 passed, $0.08. Full run needed. |
| 12 | GPT-5-mini | **6/15 (prior data)** | Pre-optimization. Full re-run needed. |

### Remaining work

1. **GPT-5.2**: Run full 15-verse benchmark (128K output — best chance at long verses)
2. **GPT-5**: Run remaining 14 verses
3. **GPT-5.4**: Retry 2 long verses (300w, 557w) — try `--workers 1` or batch API
4. **GPT-5-mini**: Re-run full 15 with optimizations applied
5. **Claude baselines**: Generate 4 missing (optional, for comparison)
6. **Analysis**: Cross-model comparison once all models complete

**Total benchmark cost so far**: ~$1.54
**Total time**: ~4-6 hours (parallelizable — steps 9-12 can overlap)

---

*Update this document with actual benchmark results as they become available.*
