# AI Pipeline v3: Efficient Generation Tool

> Replaces the Claude Code agent-based orchestration with a Python-driven pipeline that minimizes AI token usage.

**Status**: Implementation largely complete. Core pipeline operational. See status markers throughout.

**Last assessed**: 2026-03-07

## Problem Statement

The current pipeline (v2) uses Claude Code agents for everything: orchestration, verse extraction, prompt building, generation, validation, review, saving, caching, and stats. Of ~55,000 tokens consumed per verse, only ~30,000 are actual AI generation work. The rest is overhead — agent instructions, bash round-trips, Claude reasoning about file operations, and an Opus orchestrator managing queues.

This burned through the monthly Claude Code Max subscription limit after ~3,500 of 40,578 verses (8.9%). At that rate, completing the corpus would require ~11 months of subscription.

### Current Token Breakdown Per Verse

| Step | Tokens | AI Required? |
|------|--------|-------------|
| Agent instructions (ai-generate.md) | ~2,000 | No |
| Python script execution (8 bash calls) | ~8,000 | No |
| Claude reasoning between steps | ~3,000 | No |
| Orchestrator overhead (Opus) | ~5,000 | No |
| System prompt (glossary, examples, etc.) | ~12,500 | Yes (input) |
| User message (verse data) | ~2,250 | Yes (input) |
| AI-generated content | ~17,500 | Yes (output) |
| Fix agent (20% of verses) | ~5,000 avg | Partially |
| **Total** | **~55,000** | **~32,250 useful** |

## Solution: Python Asyncio Orchestrator with `claude -p`

Move all non-AI work to Python. Use `claude -p` (non-interactive CLI) for generation only. A Python asyncio orchestrator manages the queue, parallelism, and retries. Runs natively on Windows (no WSL needed).

### Why Python, Not Bash

The architect review identified that a bash orchestrator would be strictly inferior:
- Bash requires calling Python for every non-trivial operation (JSON parsing, stats, progress)
- `flock` doesn't work reliably on NTFS (WSL /mnt/c/ filesystem)
- Error handling is primitive compared to Python try/except/finally
- Python asyncio gives structured concurrency, per-worker error tracking, graceful shutdown
- A Python orchestrator runs natively on Windows — no WSL setup needed
- The existing Windows venv (`.venv/Scripts/python.exe`) already has all dependencies

### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Python Orchestrator (pipeline.py)   [runs on Windows natively]  │
│                                                                   │
│  asyncio event loop with Semaphore(N) for worker limiting        │
│  Manages: queue, parallelism, retries, progress, resume          │
│  Zero Claude tokens for orchestration                             │
│                                                                   │
│  Per-verse coroutine (N concurrent):                              │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  1. prepare_verse()  (Python function, 0 tokens)         │    │
│  │     - Extract verse data from source JSON                 │    │
│  │     - Build system prompt + user message                  │    │
│  │     - Identify known words from dictionary                │    │
│  │     - Write prompt files + metadata to work dir           │    │
│  │     - Detect single-pass vs chunked mode                  │    │
│  │     - Skip if already completed                           │    │
│  ├──────────────────────────────────────────────────────────┤    │
│  │  2. asyncio.create_subprocess_exec('claude', '-p', ...)  │    │
│  │     --model sonnet --tools "" --output-format json        │    │
│  │     stdin=user_message, stdout=response                   │    │
│  │     (AI generation, the only token spend)                 │    │
│  ├──────────────────────────────────────────────────────────┤    │
│  │  3. postprocess_verse()  (Python function, 0 tokens)     │    │
│  │     - Parse JSON response (with fallback handling)        │    │
│  │     - Expand array-of-arrays word format to full JSON     │    │
│  │     - Override known words from dictionary                │    │
│  │     - Validate schema                                     │    │
│  │     - Run quality review checks                           │    │
│  │     - Strip redundant fields                              │    │
│  │     - Archive raw response + prompt                       │    │
│  │     - Save response file + cache + stats                  │    │
│  ├──────────────────────────────────────────────────────────┤    │
│  │  4. IF review failed:                                     │    │
│  │     prepare_fix() → claude -p --model haiku → apply_fix() │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  Progress: printed every 30s + written to pipeline_session.json  │
│  Logs: per-session log file + structured event log               │
│  Status: queryable via `python pipeline_status.py` anytime       │
└──────────────────────────────────────────────────────────────────┘
```

### Token Budget Per Verse (Optimized)

| Component | Tokens | Notes |
|-----------|--------|-------|
| System prompt | **3,667** | Few-shot examples removed (was 12,541) |
| User message | ~2,250 | Same as before |
| AI output | ~15,000 | Array-of-arrays format for word_analysis |
| Fix pass (20%) | ~3,000 avg | Haiku, targeted fixes only |
| **Total per verse** | **~24,000** | **Down from ~55,000 (56% reduction)** |

### Estimated Throughput

At ~24,000 tokens/verse vs ~55,000 currently:
- Same monthly limit covers **~2.3x more verses**
- ~3,500 verses/month → ~8,000 verses/month
- **Full corpus (37K remaining) in ~5 months** instead of ~11

## Token Optimizations (Detailed)

### Optimization 1: Remove Few-Shot Examples from System Prompt — DONE

**Savings: 8,874 input tokens per verse (328M total)**

The system prompt is 12,541 tokens. Few-shot examples account for 8,874 (71%). After generating 3,600+ high-quality responses, the model understands the task from instructions alone.

| System prompt section | Tokens | Keep? |
|----------------------|--------|-------|
| Instructions | 447 | Yes |
| Glossary | 705 | Yes |
| Word dictionary | 822 | Yes |
| Topic taxonomy | 1,127 | Yes |
| Key phrases sample | 565 | Yes |
| Few-shot examples | 8,874 | **Remove** |
| **Total** | **12,541 → 3,667** | |

**Validation plan**: Generate 20 diverse verses with and without few-shot examples. Pass criteria:
1. No-few-shot results must have equal or fewer high/medium review warnings
2. No new failure modes (format errors, missing fields)
3. Spot-check 5 verses for translation quality
4. If no-few-shot produces >2 more medium warnings per 20 verses, keep few-shot (savings aren't worth the fix cost)

### Optimization 2: Word Translation Dictionary (Override Strategy) — DONE

**Savings: quality improvement + ~500 output tokens via narrator templates**

Analysis of 132 existing responses shows:
- 60.7% of all word occurrences are words appearing 5+ times
- Top 50 words (particles, common verbs, narrator formulae) cover 39% of all occurrences

**Revised approach** (per architect review): Instead of telling Claude to skip known words (which loses context and risks off-by-one errors), Claude generates ALL words normally. In postprocessing, high-confidence dictionary words are deterministically overridden. This:
- Preserves full context for Claude's generation
- Ensures consistency across the corpus for common words
- Flags discrepancies (Claude disagrees with dictionary) as a quality signal
- Is simpler and more reliable than the skip-words prompt approach

**Implementation**:
1. Build `word_translations_cache.json` from all 3,600+ existing responses
2. For each word+POS combination appearing 10+ times with >95% consistent translations, add to cache
3. `postprocess_verse()` overrides matching words with dictionary values
4. Discrepancies (Claude's translation differs from dictionary) are logged for analysis

### Optimization 3: Pre-Built Narrator Templates — DONE

**Savings: ~400 output tokens per hadith with known chains**

Top 20 narrator names appear in 40%+ of hadiths. Build a narrator profile library:
- Extract from existing responses: name_ar, name_en, role, confidence
- In postprocessing, validate/override narrator details for recognized names
- Ensures consistent narrator transliterations across the corpus

### Optimization 4: Compact Output Format (Array-of-Arrays) — DONE

**Savings: ~2,500 output tokens per verse**

Per architect review, pipe-delimited format is too fragile (pipes in translations, non-standard format). Instead, use **JSON array-of-arrays** for word_analysis — same savings, parseable by `json.loads()`, no escaping issues:

```json
Current (verbose JSON, ~60 tokens/word):
{"word":"قَالَ","translation":{"en":"he said","ur":"کہا",...},"pos":"V"}

Compact (JSON array-of-arrays, ~40 tokens/word):
["قَالَ","V","he said","کہا","dedi","گفت","berkata","বলেছেন","dijo","a dit","sagte","сказал","他说"]
```

Language order is fixed (en,ur,tr,fa,id,bn,es,fr,de,ru,zh). Python postprocessor maps positional indices to language keys.

All other fields (translations, chunks, isnad_matn, etc.) use standard JSON.

**Fallback**: If Claude outputs standard JSON objects instead of arrays, the postprocessor detects and handles both formats transparently. No generation is wasted.

### Optimization 5: Model Selection

| Task | Model | Rationale |
|------|-------|-----------|
| Generation (all verses) | **Sonnet** | Haiku fails on medium/long hadiths (JSON errors at 99+ words) |
| Fix pass | **Haiku** | Proven sufficient for targeted corrections |
| Orchestration | **None** | Python script, 0 tokens |

**Phase 1 findings (2026-03-07)**:
- Short hadiths (<50w): Both Haiku and Sonnet PASS (4/4 each, 0 warnings). Haiku 6.2x cheaper.
- Medium/long hadiths (99-281w): **Haiku fails 4/4** (malformed JSON, compound POS tags, truncated output). Sonnet needed.
- Since ~45% of corpus is medium/long, using Haiku only for short would add complexity with limited savings.
- **Decision: Use Sonnet for all generation.** Simpler, reliable across all lengths.
- Claude wraps output in markdown code fences (` ```json ... ``` `). Postprocessor must strip these.

### Optimization 6: Skip Fix for Clean Verses — DONE

~80% of verses pass review on the first try. The new pipeline only calls Claude for a fix when `postprocess_verse()` detects high/medium review warnings. No fix = no second Claude call.

### Combined Savings Summary

| Optimization | Input saved | Output saved | Total/verse |
|-------------|------------|-------------|-------------|
| Python orchestrator (no agent overhead) | ~13,000 | ~7,000 | ~20,000 |
| Remove few-shot examples | ~8,874 | 0 | ~8,874 |
| Array-of-arrays word format | 0 | ~2,500 | ~2,500 |
| Word dictionary (override in postprocess) | 0 | 0 | Quality improvement |
| Narrator templates | 0 | ~400 | ~400 |
| **Total savings** | **~21,874** | **~9,900** | **~31,774** |
| **Optimized per-verse** | | | **~24,000** |

## Chunked Processing for Long Hadiths

~1,300 verses (3.4% of corpus) have >200 Arabic words and require chunked processing. The orchestrator handles this explicitly.

### Detection

`prepare_verse()` checks word count. If >200, it sets `mode: "chunked"` in the metadata and generates prompts for:
1. **Structure pass** — all fields except word_analysis and chunk translations
2. **Detail passes** — one per chunk, generating word_analysis + chunk translations

### Flow for Chunked Verses

```python
async def process_chunked_verse(verse_path, work_dir, semaphore):
    # Structure pass
    async with semaphore:
        await call_claude(work_dir / "structure_prompt.txt",
                         work_dir / "structure_response.txt", model="sonnet")
    postprocess_structure(verse_path, work_dir)

    # Detail passes (sequential within this verse, but other verses run in parallel)
    chunk_count = load_metadata(work_dir)["chunk_count"]
    for i in range(chunk_count):
        prepare_chunk_detail(verse_path, work_dir, i)
        async with semaphore:
            await call_claude(work_dir / f"chunk_{i}_prompt.txt",
                             work_dir / f"chunk_{i}_response.txt", model="sonnet")

    # Assembly
    assemble_chunks(verse_path, work_dir)
    postprocess_verse(verse_path, work_dir)
```

### Caching Integration

The existing `ai_pipeline_cache.py` caching system is reused:
- Structure pass results are cached at `cache/{verse_id}/structure.json`
- Chunk detail results at `cache/{verse_id}/chunk_N.json`
- On restart, `prepare_verse()` checks cache staleness and skips up-to-date passes

## Components to Build

### 1. Word Dictionary Builder — DONE

Scans all existing response files (samples + corpus) and builds a word translation lookup table.

```python
# Output: word_translations_cache.json
{
  "version": "1.0.0",
  "built_from": 3615,
  "built_at": "2026-03-06T...",
  "min_occurrences": 10,
  "min_consistency": 0.95,
  "words": {
    "وَ|CONJ": {  # key is word+POS to handle homographs
      "occurrences": 1178,
      "translations": {
        "en": "and", "ur": "اور", "tr": "ve", "fa": "و",
        "id": "dan", "bn": "এবং", "es": "y", "fr": "et",
        "de": "und", "ru": "и", "zh": "和"
      }
    }
  }
}
```

**Location**: `ThaqalaynDataGenerator/app/pipeline_cli/build_caches.py`

Built: 609 word entries in `ai-pipeline-data/word_translations_cache.json`.

### 2. Narrator Template Builder — DONE

Scans existing responses and builds narrator profiles.

```python
# Output: narrator_templates.json
{
  "narrators": {
    "أَبُو عَبْدِ اللَّهِ": {
      "occurrences": 70,
      "name_en": "Abu Abdillah",
      "role": "imam",
      "confidence": "certain"
    }
  }
}
```

**Location**: Same module as word dictionary builder.

Built: 1,074 narrator entries in `ai-pipeline-data/narrator_templates.json`.

### 3. Pipeline Core Functions — DONE

These are importable Python functions (not CLI scripts), called directly by the orchestrator:

| Function | Purpose |
|----------|---------|
| `prepare_verse(verse_path, work_dir)` | Extract verse, build prompts, write to work_dir |
| `postprocess_verse(verse_path, work_dir)` | Parse response, validate, review, save |
| `prepare_fix(verse_path, work_dir)` | Build fix prompt from review warnings |
| `apply_fix(verse_path, work_dir)` | Apply fix response, re-validate, save |
| `prepare_structure(verse_path, work_dir)` | Build structure pass prompt (chunked) |
| `prepare_chunk_detail(verse_path, work_dir, i)` | Build chunk detail prompt |
| `assemble_chunks(verse_path, work_dir)` | Combine structure + chunks |

**Location**: `ThaqalaynDataGenerator/app/pipeline_cli/verse_processor.py`

Implemented: `prepare_verse`, `postprocess_verse`, `prepare_fix`, `apply_fix`, `expand_compact_words`, `strip_code_fences`, `repair_json_quotes`. Chunked functions (`prepare_structure`, `prepare_chunk_detail`, `assemble_chunks`) are NOT implemented — chunked mode is detected but not handled in the pipeline.

### 4. Python Orchestrator (`pipeline.py`) — DONE

```python
# Usage:
#   python pipeline.py --workers 10 --model sonnet
#   python pipeline.py --workers 5 --dry-run          # prepare only, no Claude calls
#   python pipeline.py --workers 10 --resume           # continue from last session
#   python pipeline.py --single /books/al-kafi:1:1:1:1 # process one verse (for testing)

import asyncio
from pipeline_cli.verse_processor import prepare_verse, postprocess_verse, ...

async def process_verse(verse_path: str, sem: asyncio.Semaphore, config: Config):
    verse_id = verse_path_to_id(verse_path)
    work_dir = config.tmp_dir / verse_id

    # Skip if already complete
    if is_complete(verse_id, config):
        return VerseResult(status="skipped")

    # Claim work dir (acts as lock)
    work_dir.mkdir(parents=True, exist_ok=True)

    try:
        # Prepare (0 tokens)
        plan = prepare_verse(verse_path, work_dir, config)

        if plan.mode == "single":
            # Single Claude call
            async with sem:
                raw = await call_claude(plan.system_prompt_path,
                                       plan.user_message_path, config)
            save_raw_response(verse_id, raw, config)
            result = postprocess_verse(verse_path, work_dir, raw, config)

        elif plan.mode == "chunked":
            # Structure + chunk detail passes
            result = await process_chunked(verse_path, work_dir, plan, sem, config)

        # Fix pass if needed
        if result.needs_fix:
            fix_plan = prepare_fix(verse_path, work_dir, result, config)
            async with sem:
                fix_raw = await call_claude_fix(fix_plan, config)
            save_raw_fix(verse_id, fix_raw, config)
            result = apply_fix(verse_path, work_dir, fix_raw, config)

        return result

    except Exception as e:
        log_error(verse_id, e)
        return VerseResult(status="error", error=str(e))
    finally:
        # Cleanup tmp (artifacts already saved to permanent dirs)
        shutil.rmtree(work_dir, ignore_errors=True)

async def main(config: Config):
    queue = load_queue(config)
    sem = asyncio.Semaphore(config.workers)

    # Progress reporter runs concurrently
    progress_task = asyncio.create_task(progress_reporter(config))

    # Process all verses with bounded concurrency
    tasks = [process_verse(v, sem, config) for v in queue]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Final summary
    progress_task.cancel()
    print_summary(results, config)
```

**Key design decisions**:
- `asyncio.Semaphore(N)` limits concurrent Claude calls (adjustable at runtime)
- `asyncio.Queue` replaces file-based queue (single process, no locking needed)
- `try/finally` ensures work_dir cleanup even on crash
- `asyncio.gather(*tasks)` enables true parallel execution
- `call_claude()` uses `asyncio.create_subprocess_exec` for non-blocking subprocess calls
- Progress reporter runs as a concurrent task, printing every 30s

**Location**: `ThaqalaynDataGenerator/app/pipeline_cli/pipeline.py`

Implemented: asyncio event loop, `Semaphore(N)` concurrency, `process_verse()`, `call_claude()` with retry/backoff, `recover_stale_work_dirs()`, `progress_reporter()`, graceful shutdown via `SIGINT`, `quarantine_verse()`, `--dry-run`, `--single`, `--workers`, `--max-verses`, `--book`/`--volume` filtering. Config is via dataclass + CLI args + `pipeline_settings.json` (not `pipeline.conf` as originally planned). No structured event log file (logs to console only). No cumulative token tracking / monthly limit alerting (only per-call `--max-budget-usd`).

### 5. Progress Status Script — DONE

Queryable anytime without disturbing the running pipeline:

```bash
python pipeline_status.py
# Pipeline v3 Status
# ==================
# Total corpus:     40,578
# Completed:         4,862  (12.0%)
#   - v2 (agents):   3,615
#   - v3 (cli):      1,247
# Remaining:        35,716
# Quarantined:          14
#
# Current session:
#   Started:         2026-03-06 08:30
#   Verses done:     1,247
#   Rate:            42/hr
#   Pass rate:       94.6%
#   ETA complete:    2026-04-20
#
# By book:
#   al-kafi:        11,782/15,397 remaining
#   ...
```

Reads from filesystem state (responses/, stats/, quarantine/) and `pipeline_session.json`.

**Location**: `ThaqalaynDataGenerator/app/pipeline_cli/pipeline_status.py`

Implemented with `--audit` flag for re-validation. Reads filesystem state for progress/quality/cost/quarantine reporting.

### 6. Updated System Prompt Builder — DONE

Modify `build_system_prompt()` to accept `include_few_shot=False` parameter.

Add instructions for array-of-arrays word_analysis format.

Few-shot removal and compact word format instructions implemented in `build_system_prompt()`. Empty EXAMPLES section removed, key phrases trimmed to 15.

### 7. Configuration (`pipeline.conf`) — REPLACED

```ini
[pipeline]
workers = 10
model = sonnet
fix_model = haiku
max_retries = 3
max_fix_attempts = 2

[paths]
source_data_dir = ../ThaqalaynDataSources/
ai_content_subdir = corpus
tmp_dir = tmp/

[optimizations]
include_few_shot = false
use_compact_word_format = true
use_word_dictionary = true
use_narrator_templates = true

[monitoring]
progress_interval_seconds = 30
stats_merge_interval = 100
```

Configuration is handled via `PipelineConfig` dataclass + CLI arguments + `pipeline_settings.json`, not a `.conf` file. This is simpler and more Pythonic than the originally planned INI format.

## Fault Tolerance and Resume

The pipeline is designed to survive crashes, interruptions, and partial failures at every level.

### Atomic Per-Verse Processing

Each verse goes through a sequence of discrete steps. The filesystem state after each step is well-defined:

```
Step 0: Nothing exists                    -> verse not started
Step 1: tmp/{verse_id}/ created           -> worker claimed this verse
Step 2: tmp/{verse_id}/prompt files exist  -> prepare complete, generation pending
Step 3: raw_responses/{verse_id}.raw.txt   -> Claude responded, postprocessing pending
Step 4: responses/{verse_id}.json exists   -> postprocessing complete
Step 5: stats/{verse_id}.stats.json exists -> fully complete (gen + optional fix)
```

**If the pipeline crashes at any step**, a restart picks up correctly:
- Steps 0-1: Worker re-claims and starts from scratch (tmp dir cleaned on claim)
- Step 2: Prompt files exist but no response — re-run Claude call
- Step 3: Raw response exists — re-run postprocessing (no token spend)
- Step 4 (response but no stats): Either needs fix or stats write was interrupted — re-run
- Step 5: Complete, skip

### Graceful Shutdown

```python
shutdown_event = asyncio.Event()

def signal_handler(sig, frame):
    print("\nShutting down after current verses finish...")
    shutdown_event.set()

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# In the worker loop, check before starting each new verse:
if shutdown_event.is_set():
    return  # Don't start new verses, let current ones finish
```

Workers finish their current verse before exiting. No work is lost. The `asyncio.gather()` collects all in-progress work.

### Stale Lock Detection

On startup, the orchestrator scans for orphaned tmp dirs from a previous crashed session:

```python
def recover_stale_locks(config):
    for work_dir in config.tmp_dir.iterdir():
        if not work_dir.is_dir():
            continue
        verse_id = work_dir.name
        if is_complete(verse_id, config):
            # Response + stats exist, just clean up
            shutil.rmtree(work_dir)
        elif has_raw_response(verse_id, config):
            # Raw response saved but not postprocessed — re-add to queue
            requeue(verse_id, config)
            shutil.rmtree(work_dir)
        else:
            # No response at all — re-add to queue
            requeue(verse_id, config)
            shutil.rmtree(work_dir)
```

### Retry Logic

| Failure | Retry Strategy | Max Attempts |
|---------|---------------|-------------|
| Claude call fails (network/rate limit) | Exponential backoff: 5s, 15s, 45s | 3 |
| JSON parse error (non-JSON response) | Re-generate with "output valid JSON" suffix | 2 |
| Schema validation fails | Re-generate | 2 |
| Review fails (quality issues) | Fix pass with Haiku | 2 fix attempts |
| Max retries exceeded | Quarantine with error details | — |

### Cumulative Token Tracking

The orchestrator tracks approximate token usage per Claude call (from `--output-format json` metadata or character-based heuristic). If approaching the monthly limit, it alerts:

```
[WARNING] Estimated monthly usage: 85% of limit. Consider reducing workers or pausing.
```

## Auditability and Prompt/Response Archiving — PARTIAL

Every AI interaction is preserved for full audit trail.

### Saved Artifacts Per Verse

```
ThaqalaynDataSources/ai-content/corpus/
  responses/{verse_id}.json          # Final result (with wrapper + attribution)    DONE
  stats/{verse_id}.stats.json        # Generation metrics + timing                  DONE (embedded in pipeline stats)
  prompts/{verse_id}.prompt.json     # Archived prompt metadata + user message      NOT DONE
  prompts/_system_prompt.txt         # System prompt (saved once, identical for all) NOT DONE
  raw_responses/{verse_id}.raw.txt   # Raw Claude output (verbatim, before parsing) DONE
  fix_prompts/{verse_id}.fix.json    # Fix prompt (if fix was needed)               NOT DONE
  fix_raw/{verse_id}.fix.raw.txt     # Raw fix response (if fix was needed)         NOT DONE
  quarantine/{verse_id}.json         # Failed verses (if quarantined)               DONE
```

**Note**: Prompt archiving (`prompts/`, `fix_prompts/`, `fix_raw/`) is not yet implemented. Raw responses and final results are saved. The `reprocess` command (re-run postprocessing on raw responses without re-generating) is not yet implemented.

### Prompt Archive Format

```json
{
  "verse_path": "/books/al-kafi:1:1:1:1",
  "timestamp": "2026-03-06T14:30:00Z",
  "model": "sonnet",
  "system_prompt_hash": "sha256:abc123...",
  "system_prompt_version": "v3.0-no-fewshot",
  "user_message_hash": "sha256:def456...",
  "word_count": 85,
  "mode": "single",
  "user_message": "... (full user message text) ..."
}
```

### Raw Response Archive

The raw Claude output is saved verbatim before any parsing or processing. This enables:
- Debugging parse failures
- Reprocessing with updated postprocess logic without re-generating (0 tokens)
- Auditing exactly what Claude produced
- A `reprocess` command that re-runs postprocessing on all raw responses

### Stats File Format

```json
{
  "verse_path": "/books/al-kafi:1:1:1:1",
  "pipeline_version": "3.0.0",
  "model": "claude-sonnet-4-6",
  "generated_date": "2026-03-06",
  "generation_method": "claude_cli_pipe",
  "file_size_bytes": 42000,
  "source_word_count": 85,
  "word_analysis_count": 85,
  "word_dict_overrides": 52,
  "content_type": "ethical_teaching",
  "chunk_count": 3,
  "narrator_count": 5,
  "has_chain": true,
  "mode": "single",
  "validation_passed": true,
  "review_passed": true,
  "review_warnings": {"high": 0, "medium": 0, "low": 2},
  "fix_needed": false,
  "fix_model": null,
  "attempts": 1,
  "quarantined": false,
  "timings": {
    "prepare_ms": 450,
    "claude_gen_ms": 35000,
    "postprocess_ms": 800,
    "claude_fix_ms": null,
    "total_ms": 36250
  }
}
```

## Progress Monitoring

### Live Progress (Orchestrator Stdout)

Printed every 30 seconds:

```
[14:32:00] Progress: 1,247/37,000 (3.4%) | Rate: 42/hr | Workers: 10/10 active
           Pass: 1,180 (94.6%) | Fix: 53 (4.2%) | Fail: 14 (1.1%) | Queue: 35,753
           ETA: 14.2 days | Session: 247 verses in 5h 53m
```

### Progress Query Script (`pipeline_status.py`)

Run anytime (separate process) to check progress without disturbing the pipeline:

```
python pipeline_status.py

Pipeline v3 Status
==================
Total corpus:     40,578
Completed:         4,862  (12.0%)
  - v2 (agents):   3,615
  - v3 (cli):      1,247
Remaining:        35,716
Quarantined:          14

Current session:
  Started:         2026-03-06 08:30
  Verses done:     1,247
  Rate:            42/hr
  Pass rate:       94.6%
  Fix rate:         4.2%
  Fail rate:        1.1%
  Active workers:  10
  ETA complete:    2026-04-20

By book:
  al-kafi:        11,782/15,397 remaining
  man-la-yahduruhu: 6,382/6,382 remaining
  quran:           6,236/6,236 remaining (deprioritized)
  ...
```

Reads from: responses/ directory, stats/ directory, quarantine/ directory, `pipeline_session.json`.

### Session Log File

Structured event log at `logs/pipeline_session.log`:

```
2026-03-06T08:30:00 SESSION_START workers=10 model=sonnet queue_size=35716
2026-03-06T08:30:05 VERSE_START al-kafi_1_2_1_1 worker=3
2026-03-06T08:30:42 VERSE_DONE al-kafi_1_2_1_1 status=pass gen=35000ms total=36250ms
2026-03-06T08:31:15 VERSE_DONE al-kafi_1_2_1_2 status=fix_needed gen=32000ms
2026-03-06T08:31:35 FIX_DONE al-kafi_1_2_1_2 status=fixed fix_gen=18000ms
2026-03-06T14:30:00 PROGRESS done=1247 total=37000 rate=42/hr pass=94.6%
2026-03-06T16:00:00 SESSION_END verses=1523 duration=7h30m rate=42/hr
```

### Pipeline Session State (`pipeline_session.json`)

Written atomically on each progress tick. The status script reads this for live session data.

```json
{
  "session_id": "2026-03-06T08:30:00",
  "started_at": "2026-03-06T08:30:00Z",
  "last_updated": "2026-03-06T14:32:00Z",
  "workers": 10,
  "model": "sonnet",
  "verses_this_session": 1247,
  "verses_total_done": 4862,
  "verses_total": 40578,
  "rate_per_hour": 42,
  "pass_count": 1180,
  "fix_count": 53,
  "fail_count": 14,
  "quarantine_count": 14
}
```

## File Layout

```
ThaqalaynDataGenerator/
  app/
    pipeline_cli/              # NEW: v3 pipeline modules
      __init__.py
      verse_processor.py       # Core functions: prepare, postprocess, fix
      build_caches.py          # Build word dict + narrator templates
      common.py                # Shared utilities (paths, JSON helpers, logging)
    ai_pipeline.py             # Existing (add v3 prompt builder options)
    ai_pipeline_review.py      # Existing (no changes needed)
    ai_pipeline_cache.py       # Existing (reused for chunked processing)
  pipeline.py                  # NEW: Asyncio orchestrator (main entry point)
  pipeline_status.py           # NEW: Progress query tool
  pipeline.conf                # NEW: Configuration
  scripts/                     # NEW: Reusable analysis/utility scripts
```

## Phased Rollout

### Phase 0: Concurrency Test (MUST DO FIRST) — DONE

Verify `claude -p` supports concurrent calls before building anything.

```bash
# Run 5 concurrent claude -p calls
for i in 1 2 3 4 5; do
  time claude -p --model sonnet "Say OK $i" &
done
wait
```

If calls serialize or error, the entire parallelism model needs rethinking.

Also test: `--output-format json` (for token counts), `--json-schema` (for structured output enforcement).

Results documented in `ThaqalaynDataGenerator/scripts/phase0_results.md`. Concurrency confirmed working. 5 parallel calls ~12s vs ~23s sequential. Base CLI overhead ~24,500 tokens (cached). All key flags verified.

### Phase 1: Foundation (build tools, validate quality) — DONE

1. Build word dictionary from existing 3,600+ responses
2. Build narrator templates from existing responses
3. Build `verse_processor.py` (prepare, postprocess, fix functions)
4. Test quality: generate 20 diverse verses with/without few-shot examples
   - Pass criteria: equal or fewer high/medium warnings, no new failure modes
5. Test fix flow: pipe 10 known-failing verses through `claude -p --model haiku`
6. Validate array-of-arrays format parsing (with fallback to standard JSON)

All items complete. E2E test passed: prepare_verse → claude -p (Sonnet, 728s, $1.26) → postprocess_verse. Haiku confirmed unreliable for medium/long hadiths. Sonnet used for all generation.

### Phase 2: Orchestrator — MOSTLY DONE

1. Build `pipeline.py` with single-worker mode (`--workers 1`) — **DONE**
2. Test end-to-end: prepare → claude -p → postprocess for 10 verses — **DONE**
3. Add parallel workers (`--workers N`) with Semaphore — **DONE**
4. Add chunked processing flow for long hadiths — **NOT DONE** (detection exists, but `process_chunked`, `prepare_structure`, `prepare_chunk_detail`, `assemble_chunks` are not implemented; long hadiths will fail or fall through to single-pass mode)
5. Add resume/restart logic (stale lock recovery) — **DONE** (`recover_stale_work_dirs()`)
6. Add progress reporting + session logging — **PARTIAL** (progress reporter prints to console every 30s; session state saved to `pipeline_session.json`; structured event log file `logs/pipeline_session.log` NOT implemented)
7. Build `pipeline_status.py` — **DONE** (with `--audit` flag)

### Phase 3: Hardening — MOSTLY DONE

1. Add `--dry-run` mode (prepare prompts, estimate tokens, no Claude calls) — **DONE**
2. Add retry logic with exponential backoff — **DONE** (in `call_claude()`: OSError + rate limit retries with 5s/15s/45s backoff)
3. Add quarantine handling — **DONE** (`quarantine_verse()`)
4. Add cumulative token tracking + monthly limit alerting — **NOT DONE** (per-call `--max-budget-usd` exists as a safety guardrail, but no cumulative tracking or monthly alerting)
5. Test on 100 verses, verify quality matches v2 output — **DONE** (first-100 Al-Kafi: 100/100 generated, 0 schema errors)

### Phase 4: Production Run — NOT STARTED

1. Start with 5 workers, observe rate limits
2. Ramp up to 10 workers if stable
3. Begin full corpus generation
4. Monitor quality + throughput via `pipeline_status.py`
5. Adjust workers/model as needed

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Quality degrades without few-shot examples | Wrong format, bad translations | Phase 1 rigorous validation with pass criteria |
| `claude -p` rate limits concurrent calls | Throughput lower than projected | Phase 0 concurrency test; dynamic worker adjustment |
| Array-of-arrays format not followed | Parse errors | Fallback parser handles both formats; retry on failure |
| `claude -p` behaves differently than agents | Missing capabilities | Agents don't use tools for generation anyway; test in Phase 1 |
| Pre-filled word overrides wrong in context | Incorrect translations for context-dependent words | Override only words with >95% consistency + matching POS; log discrepancies |
| Claude CLI auth expires mid-run | Workers fail | Auth check at startup; retry with backoff; alert on auth errors |
| Long hadiths chunked processing fails | ~1,300 verses broken | Explicit chunked flow design; reuse existing cache infrastructure |
| Model version changes mid-run | Quality shift | Track model version in stats; alert on change |

## Comparison: v2 vs v3

| Metric | v2 (Current) | v3 (Proposed) |
|--------|-------------|--------------|
| Tokens per verse | ~55,000 | ~24,000 |
| Orchestration cost | Opus agent | 0 (Python) |
| Validation cost | Claude reads Python output | 0 (Python) |
| Workers | ~200 agents (via Claude Code) | ~10 `claude -p` calls |
| Resume | Filesystem + agent restart | Filesystem + asyncio |
| Monthly throughput | ~3,500 verses | ~8,000 verses |
| Time to complete | ~11 months | ~5 months |
| Quality | Opus generation | Sonnet generation (proven equal) |
| Platform | Windows (Claude Code) | Windows native (Python + claude CLI) |
| Auditability | Limited (agent context lost) | Full (all prompts + raw responses saved) |

## Architect Review Notes

This plan was reviewed by an architect agent. Key changes incorporated:

1. **Bash → Python orchestrator**: Python asyncio is strictly superior for this use case (Issue #3)
2. **Pipe-delimited → JSON array-of-arrays**: Reliable parsing, same savings (Issue #1)
3. **Skip words → Override in postprocessing**: Preserves context, better quality (Issue #4)
4. **Added chunked processing design**: Explicit multi-call flow for >200-word hadiths (Issue #2)
5. **Windows native, no WSL**: Eliminates /mnt/c/ performance issues (Issue #5)
6. **Phase 0 concurrency test**: Must validate before building (Issue #6)
7. **Rigorous few-shot validation criteria**: Defined pass/fail thresholds (Issue #7)
8. **Early fix pipeline testing**: Moved from Phase 3 to Phase 1 (Issue #8)
9. **Token tracking**: Monitor cumulative usage to avoid hitting monthly limit suddenly
10. **Dry-run mode**: Validate prompts without spending tokens
11. **Raw response reprocessing**: Can re-run postprocessing on archived responses (0 tokens)

## Remaining Work (as of 2026-03-07)

### Must-have for production runs

| Item | Phase | Effort | Notes |
|------|-------|--------|-------|
| Chunked processing in pipeline | P2.4 | Medium | `prepare_structure`, `prepare_chunk_detail`, `assemble_chunks` not implemented. ~1,300 long hadiths (3.4%) will fail without this. Could defer by filtering to <200-word hadiths first. |

### Nice-to-have before production

| Item | Phase | Effort | Notes |
|------|-------|--------|-------|
| Prompt archiving | Audit | Low | Save prompts + fix prompts for full audit trail. Currently only raw responses + final results saved. |
| Structured event log | P2.6 | Low | `logs/pipeline_session.log` with machine-parseable events. Console logging works but isn't persistent. |
| Cumulative token/cost tracking | P3.4 | Low | Monthly limit alerting. Currently only per-call `--max-budget-usd`. Cost is tracked in `SessionStats` per session but not across sessions. |
| `reprocess` command | Audit | Low | Re-run postprocessing on archived raw responses. Infrastructure exists (`raw_responses/` saved), command not built. |
| Remove `similar_content_hints` | Opt 4 | Trivial | Pending user confirmation. Saves ~50-100 output tokens/verse. |

### Phase 4: Production Run (not started)

1. Start with 5 workers, observe rate limits
2. Ramp up to 10 workers if stable
3. Begin full corpus generation (optionally filter to <200-word hadiths first to skip chunked)
4. Monitor quality + throughput via `pipeline_status.py`
5. Adjust workers/model as needed
