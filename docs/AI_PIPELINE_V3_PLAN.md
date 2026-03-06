# AI Pipeline v3: Efficient Generation Tool

> Replaces the Claude Code agent-based orchestration with a shell-driven pipeline that minimizes AI token usage.

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

## Solution: Shell-Driven Pipeline with Python Pre/Post Processing

Move all non-AI work to Python scripts. Use `claude -p` (non-interactive CLI) for generation only. The shell orchestrator manages the queue, parallelism, and retries.

### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Shell Orchestrator (pipeline.sh)   [runs in WSL/bash]          │
│                                                                  │
│  Manages: queue, parallelism, retries, progress, resume         │
│  Zero Claude tokens for orchestration                            │
│                                                                  │
│  Per-verse loop (parallelized across N workers):                 │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  1. prepare_verse.py  (Python, 0 tokens)                 │   │
│  │     - Extract verse data from source JSON                 │   │
│  │     - Look up pre-built word dictionary                   │   │
│  │     - Build system prompt + user message                  │   │
│  │     - Write prompt files to tmp dir                       │   │
│  │     - Skip if already completed                           │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  2. claude -p --model sonnet (AI, ~20K tokens)           │   │
│  │     - Reads system prompt + user message                  │   │
│  │     - Generates structured JSON response                  │   │
│  │     - No tools, no agent instructions, no bash            │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  3. postprocess_verse.py  (Python, 0 tokens)             │   │
│  │     - Parse JSON response                                 │   │
│  │     - Merge AI output with pre-filled known words         │   │
│  │     - Validate schema                                     │   │
│  │     - Run quality review checks                           │   │
│  │     - Strip redundant fields                              │   │
│  │     - Save response file                                  │   │
│  │     - Back-fill cache                                     │   │
│  │     - Write stats                                         │   │
│  │     - Exit 0 (clean) or exit 1 (needs fix)               │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  4. IF needs fix:                                         │   │
│  │     prepare_fix.py → claude -p --model haiku → apply_fix  │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Token Budget Per Verse (Optimized)

| Component | Tokens | Notes |
|-----------|--------|-------|
| System prompt | **3,667** | Few-shot examples removed (was 12,541) |
| User message | ~2,250 | Same as before |
| AI output | ~12,000 | Compact format + known words excluded |
| Fix pass (20%) | ~3,000 avg | Haiku, targeted fixes only |
| **Total per verse** | **~21,000** | **Down from ~55,000 (62% reduction)** |

### Estimated Throughput

At ~21,000 tokens/verse vs ~55,000 currently:
- Same monthly limit covers **~2.6x more verses**
- ~3,500 verses/month → ~9,100 verses/month
- **Full corpus (37K remaining) in ~4 months** instead of ~11

## Token Optimizations (Detailed)

### Optimization 1: Remove Few-Shot Examples from System Prompt

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

**Validation plan**: Generate 20 verses with and without few-shot examples, compare quality scores.

### Optimization 2: Pre-Built Word Translation Dictionary

**Savings: ~3,000 output tokens per verse (111M total)**

Analysis of 132 existing responses shows:
- 60.7% of all word occurrences are words appearing 5+ times
- Top 50 words (particles, common verbs, narrator formulae) cover 39% of all occurrences
- These words always translate identically: وَ = "and", عَنْ = "from", قَالَ = "he said"

**Implementation**:
1. Build `word_translations_cache.json` from all 3,600 existing responses
2. For each word appearing 10+ times with >95% consistent translations, add to cache
3. `prepare_verse.py` pre-fills word_analysis for cached words
4. Prompt tells Claude: "The following words are pre-filled. Generate word_analysis ONLY for the remaining words: [list]"
5. `postprocess_verse.py` merges AI output with pre-filled words

**Expected coverage**: ~50-60% of words pre-filled per average hadith.

### Optimization 3: Pre-Built Narrator Templates

**Savings: ~400 output tokens per hadith with known chains (15M total)**

Top 20 narrator names appear in 40%+ of hadiths. Build a narrator profile library:
- Extract from existing responses: name_ar, name_en, role, confidence
- Pre-fill isnad_matn.narrators for recognized names
- Claude only needs to confirm/adjust the chain structure

### Optimization 4: Compact Output Format

**Savings: ~2,100 output tokens per verse (78M total)**

Instead of full JSON for word_analysis, use pipe-delimited format:

```
Current (verbose JSON, ~60 tokens/word):
{"word":"قَالَ","translation":{"en":"he said","ur":"کہا",...},"pos":"V"}

Compact (pipe-delimited, ~35 tokens/word):
قَالَ|V|he said|کہا|dedi|گفت|berkata|বলেছেন|dijo|a dit|sagte|сказал|他说
```

Python postprocessor expands to full JSON. Language order is fixed (en,ur,tr,fa,id,bn,es,fr,de,ru,zh).

This applies to word_analysis only (the largest output field at ~5,000 tokens). Other fields remain standard JSON.

### Optimization 5: Model Selection

Use the cheapest model that produces acceptable quality:

| Task | Model | Rationale |
|------|-------|-----------|
| Generation (all verses) | **Sonnet** | Proven identical to Opus for this task |
| Fix pass | **Haiku** | Proven sufficient for targeted corrections |
| Orchestration | **None** | Shell script, 0 tokens |

Sonnet is likely metered more generously than Opus on Max subscription, giving better throughput per monthly limit.

**Future**: Test Haiku for short verses (<50 words, ~45% of corpus). If quality holds, another major savings.

### Optimization 6: Skip Fix for Clean Verses

The current pipeline always spawns a fix agent. The skip-fix optimization (already implemented in v2) skips it for ~80% of verses. The new pipeline makes this the default path — no fix call unless `postprocess_verse.py` exits with code 1.

### Combined Savings Summary

| Optimization | Input saved | Output saved | Total/verse |
|-------------|------------|-------------|-------------|
| Shell runner (no agent overhead) | ~13,000 | ~7,000 | ~20,000 |
| Remove few-shot examples | ~8,874 | 0 | ~8,874 |
| Pre-fill known words | ~500 | ~3,000 | ~3,500 |
| Compact output format | 0 | ~2,100 | ~2,100 |
| Narrator templates | ~200 | ~400 | ~600 |
| **Total savings** | **~22,574** | **~12,500** | **~35,074** |
| **Optimized per-verse** | | | **~20,000** |

## Components to Build

### 1. Word Dictionary Builder (`build_word_dictionary.py`)

Scans all existing response files (samples + corpus) and builds a comprehensive word translation lookup table.

```python
# Input: existing response files
# Output: word_translations_cache.json
{
  "version": "1.0.0",
  "built_from": 3615,  # number of responses analyzed
  "built_at": "2026-03-06T...",
  "min_occurrences": 10,
  "min_consistency": 0.95,
  "words": {
    "وَ": {
      "occurrences": 1178,
      "pos": "CONJ",
      "translations": {
        "en": "and", "ur": "اور", "tr": "ve", "fa": "و",
        "id": "dan", "bn": "এবং", "es": "y", "fr": "et",
        "de": "und", "ru": "и", "zh": "和"
      }
    },
    ...
  }
}
```

**Location**: `ThaqalaynDataGenerator/app/ai_pipeline_tools.py`

### 2. Narrator Template Builder (`build_narrator_templates.py`)

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
    },
    ...
  }
}
```

**Location**: Same module as above.

### 3. Verse Preparation Script (`prepare_verse.py`)

Extracts verse data, builds optimized prompts, pre-fills known content.

```bash
python prepare_verse.py /books/al-kafi:1:1:1:1 --work-dir tmp/al-kafi_1_1_1_1/
# Creates:
#   tmp/al-kafi_1_1_1_1/system_prompt.txt
#   tmp/al-kafi_1_1_1_1/user_message.txt
#   tmp/al-kafi_1_1_1_1/prefilled.json  (known words + narrators)
#   tmp/al-kafi_1_1_1_1/metadata.json   (verse path, word count, etc.)
# Exit codes:
#   0 = ready to generate
#   2 = already completed (skip)
#   1 = error
```

**Location**: `ThaqalaynDataGenerator/app/pipeline_cli/prepare_verse.py`

### 4. Postprocess Script (`postprocess_verse.py`)

Handles everything after Claude generates the response.

```bash
python postprocess_verse.py /books/al-kafi:1:1:1:1 \
  --work-dir tmp/al-kafi_1_1_1_1/ \
  --response tmp/al-kafi_1_1_1_1/response.txt
# Does:
#   1. Parse JSON from response text (handles markdown fences, etc.)
#   2. Expand compact format to full JSON
#   3. Merge pre-filled words back into word_analysis
#   4. Validate schema
#   5. Run quality review
#   6. Strip redundant fields
#   7. Save to responses/ dir with wrapper
#   8. Back-fill cache
#   9. Write per-verse stats
# Exit codes:
#   0 = clean, fully complete
#   1 = needs fix (review found high/medium issues)
#   3 = parse error (response was not valid JSON)
#   4 = schema validation failed after retries
```

**Location**: `ThaqalaynDataGenerator/app/pipeline_cli/postprocess_verse.py`

### 5. Fix Preparation Script (`prepare_fix.py`)

Builds a targeted fix prompt for verses that failed review.

```bash
python prepare_fix.py /books/al-kafi:1:1:1:1 --work-dir tmp/al-kafi_1_1_1_1/
# Creates:
#   tmp/al-kafi_1_1_1_1/fix_prompt.txt
# Exit codes:
#   0 = fix prompt ready
#   2 = no fix needed (passes review)
```

### 6. Fix Application Script (`apply_fix.py`)

Applies fix response to the existing result.

```bash
python apply_fix.py /books/al-kafi:1:1:1:1 \
  --work-dir tmp/al-kafi_1_1_1_1/ \
  --fix-response tmp/al-kafi_1_1_1_1/fix_response.txt
# Does:
#   1. Parse fix JSON
#   2. Merge fixes into existing result
#   3. Re-validate
#   4. Re-review
#   5. Save + strip + cache + stats
# Exit codes:
#   0 = fixed and clean
#   1 = still has issues (quarantine after max retries)
```

### 7. Shell Orchestrator (`pipeline.sh`)

Bash script that manages the full pipeline. Runs in WSL.

```bash
#!/bin/bash
# Usage: ./pipeline.sh [--workers N] [--lane fast|slow|both] [--dry-run]
#
# Manages parallel verse processing through the pipeline.
# All AI work is done via `claude -p`, all other work via Python.
#
# Queue management:
#   - Reads lane_queues.json for verse ordering
#   - Tracks progress via filesystem (same as v2)
#   - Supports resume (skips completed verses)
#   - Supports Ctrl+C graceful shutdown
#
# Worker model:
#   - N parallel background workers (default: 10)
#   - Each worker processes one verse at a time
#   - Workers pull from a shared queue file
#   - File-based locking prevents duplicate processing
#
# Logging:
#   - Per-worker log files in logs/worker_N.log
#   - Summary progress to stdout every 30 seconds
#   - Errors to stderr
```

**Key design decisions**:
- Workers use `flock` for queue dequeue atomicity
- Each worker creates `tmp/{verse_id}/` as a lock (same convention as v2)
- Progress derived from filesystem state (response + stats files)
- Graceful shutdown: trap SIGINT, wait for active workers to finish current verse
- Resume: on restart, scan filesystem for state, skip completed verses

### 8. Updated System Prompt Builder

Modify `build_system_prompt()` to accept a `include_few_shot` parameter (default False for v3).

Add a `build_compact_system_prompt()` that:
- Excludes few-shot examples
- Adds compact output format instructions
- Adds instructions for handling pre-filled words

## Modified Prompt Design

### System Prompt (Trimmed)

Same as current minus few-shot examples, plus new instructions:

```
[existing instructions, glossary, word dictionary, taxonomy, key phrases]

OUTPUT FORMAT:
Generate a JSON object with the standard fields. For word_analysis, use COMPACT FORMAT:
Each word on its own line, pipe-delimited:
  diacritized_word|POS|en|ur|tr|fa|id|bn|es|fr|de|ru|zh

Example:
  قَالَ|V|he said|کہا|dedi|گفت|berkata|বলেছেন|dijo|a dit|sagte|сказал|他说

All other fields (translations, chunks, isnad_matn, etc.) use standard JSON.
```

### User Message (With Pre-filled Words)

```
[existing verse data]

PRE-FILLED WORDS (do not regenerate these):
The following words have been pre-filled from the dictionary. They are
already in the final output. Generate word_analysis ONLY for words NOT
in this list.

Pre-filled word indices: 0,1,4,6,7,10,11,15,18,20
(These correspond to: وَ, عَنْ, بْنِ, قَالَ, عَنْ, مِنْ, فِي, عَلَى, اللَّهِ, إِنَّ)

Generate word_analysis for the remaining words at indices: 2,3,5,8,9,12,13,14,16,17,19
```

## Queue and Parallelism

### Worker Count

The `claude -p` command is a synchronous blocking call. Each worker blocks until Claude responds (~30-60 seconds per verse). Running N workers means N concurrent Claude calls.

Recommended starting point: **10 workers** (adjustable based on observed rate limits).

### Queue Structure

Reuse existing `lane_queues.json`. The orchestrator reads it and creates a `queue.txt` file with one verse path per line. Workers atomically dequeue (read + delete first line using `flock`).

### Filesystem State (Same as v2)

| State | Meaning |
|-------|---------|
| `tmp/{verse_id}/` exists, no response | Worker is actively processing |
| Response file exists, no stats file | Needs fix pass |
| Both response + stats file exist | Fully complete |
| Neither exists | Not started |

## WSL Environment Setup

The user will run `pipeline.sh` in WSL. Required setup:

```bash
# 1. Install Python 3.10+ and create venv
sudo apt update && sudo apt install python3 python3-venv python3-pip
cd /mnt/c/Users/TrainingGR03/Documents/Projects/scripture/ThaqalaynDataGenerator
python3 -m venv .venv-wsl
source .venv-wsl/bin/activate
pip install -r requirements.txt  # or: pip install pydantic beautifulsoup4

# 2. Install Claude Code CLI (npm)
# (Claude CLI must be accessible in WSL PATH)
# Option A: Use Windows claude.exe via WSL interop
# Option B: Install claude natively in WSL

# 3. Authenticate claude
claude auth

# 4. Test
claude -p --model sonnet "Hello, respond with just 'OK'"
```

## File Layout

```
ThaqalaynDataGenerator/
  app/
    pipeline_cli/           # NEW: CLI scripts for v3 pipeline
      __init__.py
      prepare_verse.py      # Step 1: extract + build prompt
      postprocess_verse.py  # Step 3: validate + review + save
      prepare_fix.py        # Step 4a: build fix prompt
      apply_fix.py          # Step 4b: apply fix + re-validate
      build_caches.py       # One-time: build word dict + narrator templates
      common.py             # Shared utilities (paths, JSON helpers)
    ai_pipeline.py          # Existing (add build_compact_system_prompt)
    ai_pipeline_review.py   # Existing (no changes)
    ai_pipeline_cache.py    # Existing (no changes)
  pipeline.sh               # NEW: Shell orchestrator (WSL)
  pipeline.conf             # NEW: Configuration (workers, model, paths)
```

## Phased Rollout

### Phase 1: Foundation (build tools, validate quality)
1. Build word dictionary from existing 3,600 responses
2. Build narrator templates from existing responses
3. Build `prepare_verse.py` and `postprocess_verse.py`
4. Test quality: generate 20 verses with trimmed prompt, compare to originals
5. Validate compact format parsing works reliably

### Phase 2: Shell Orchestrator
1. Build `pipeline.sh` with single-worker mode
2. Test end-to-end: prepare → claude -p → postprocess for 10 verses
3. Add parallel worker support
4. Add resume/restart logic
5. Add progress reporting

### Phase 3: Fix Pipeline
1. Build `prepare_fix.py` and `apply_fix.py`
2. Test on known failing verses from existing corpus
3. Integrate into orchestrator (automatic fix after failed review)

### Phase 4: Production Run
1. Set optimal worker count based on rate limit testing
2. Run on a batch of 100 verses, verify quality
3. Begin full corpus generation
4. Monitor and adjust

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Quality degrades without few-shot examples | Wrong output format, bad translations | Phase 1 validation: compare 20 verses side-by-side |
| Compact format causes parsing errors | Lost output, wasted tokens | Robust parser with fallback to standard JSON |
| `claude -p` has different behavior than agents | Missing capabilities | Test thoroughly in Phase 2; agents aren't using tools anyway for generation |
| Rate limiting with N parallel workers | Slowdown, errors | Start with N=5, increase gradually; add backoff logic |
| WSL/Windows path issues | File access errors | Use /mnt/c/ paths consistently; test early |
| Pre-filled word quality drift | Wrong translations for context-dependent words | Only pre-fill words with >95% consistency; include POS tag in matching |
| Claude CLI auth expires | Workers fail mid-run | Add auth check at startup; workers retry with backoff |

## Fault Tolerance and Resume

The pipeline is designed to survive crashes, interruptions, and partial failures at every level.

### Atomic Per-Verse Processing

Each verse goes through a sequence of discrete steps. The filesystem state after each step is well-defined:

```
Step 0: Nothing exists                    → verse not started
Step 1: tmp/{verse_id}/ created           → worker claimed this verse
Step 2: tmp/{verse_id}/prompt files exist  → prepare complete, generation pending
Step 3: tmp/{verse_id}/response.txt exists → Claude responded, postprocessing pending
Step 4: responses/{verse_id}.json exists   → postprocessing complete
Step 5: stats/{verse_id}.stats.json exists → fully complete (gen + optional fix)
```

**If the pipeline crashes at any step**, a restart picks up correctly:
- Steps 0-1: Worker re-claims and starts from scratch (tmp dir cleaned on claim)
- Step 2-3: Worker sees tmp dir with partial files, re-runs from prepare
- Step 4 (response but no stats): Needs fix pass, or stats write was interrupted — re-run postprocess
- Step 5: Complete, skip

### Worker Crash Recovery

Each worker wraps the per-verse loop in error handling:

```bash
process_verse() {
  local verse_path="$1"
  local verse_id=$(echo "$verse_path" | sed 's|/books/||; s/:/_/g')
  local work_dir="$TMP_DIR/$verse_id"

  # Claim: create work dir (acts as lock)
  mkdir -p "$work_dir" || return 0  # another worker got it

  # Prepare (Python)
  python prepare_verse.py "$verse_path" --work-dir "$work_dir"
  local prep_rc=$?
  [ $prep_rc -eq 2 ] && { rm -rf "$work_dir"; return 0; }  # already done
  [ $prep_rc -ne 0 ] && { log_error "$verse_id" "prepare failed"; rm -rf "$work_dir"; return 1; }

  # Generate (Claude)
  claude -p --model sonnet --tools "" \
    --system-prompt "$(cat "$work_dir/system_prompt.txt")" \
    < "$work_dir/user_message.txt" > "$work_dir/response.txt" 2>"$work_dir/claude_stderr.txt"
  local claude_rc=$?
  [ $claude_rc -ne 0 ] && { log_error "$verse_id" "claude failed (rc=$claude_rc)"; rm -rf "$work_dir"; return 1; }

  # Postprocess (Python)
  python postprocess_verse.py "$verse_path" --work-dir "$work_dir" --response "$work_dir/response.txt"
  local post_rc=$?

  if [ $post_rc -eq 1 ]; then
    # Needs fix
    python prepare_fix.py "$verse_path" --work-dir "$work_dir"
    claude -p --model haiku --tools "" \
      < "$work_dir/fix_prompt.txt" > "$work_dir/fix_response.txt" 2>"$work_dir/fix_stderr.txt"
    python apply_fix.py "$verse_path" --work-dir "$work_dir" --fix-response "$work_dir/fix_response.txt"
  fi

  # Cleanup tmp (response is already saved to responses/)
  rm -rf "$work_dir"
}
```

### Graceful Shutdown

```bash
SHUTDOWN=0
trap 'SHUTDOWN=1; echo "Shutting down after current verses finish..."' INT TERM

# In worker loop:
while [ $SHUTDOWN -eq 0 ]; do
  verse=$(dequeue)
  [ -z "$verse" ] && break  # queue empty
  process_verse "$verse"
done
```

Workers finish their current verse before exiting. No work is lost.

### Queue Dequeue Atomicity

Workers use `flock` to atomically read-and-remove from the queue file:

```bash
dequeue() {
  local verse=""
  (
    flock 200
    verse=$(head -1 "$QUEUE_FILE" 2>/dev/null)
    if [ -n "$verse" ]; then
      sed -i '1d' "$QUEUE_FILE"
      echo "$verse"
    fi
  ) 200>"$QUEUE_FILE.lock"
}
```

This prevents two workers from claiming the same verse.

### Stale Lock Detection

If a worker crashes without cleaning up its tmp dir, the next restart detects it:

```bash
# On startup: clean stale tmp dirs (no process holding them)
for dir in "$TMP_DIR"/*/; do
  [ -d "$dir" ] || continue
  verse_id=$(basename "$dir")
  # If response exists but was already saved, clean up
  if [ -f "$RESPONSES_DIR/${verse_id}.json" ]; then
    rm -rf "$dir"
  else
    # Stale lock — re-add to queue
    verse_path=$(cat "$dir/metadata.json" 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin)['verse_path'])" 2>/dev/null)
    if [ -n "$verse_path" ]; then
      echo "$verse_path" >> "$QUEUE_FILE"
    fi
    rm -rf "$dir"
  fi
done
```

### Retry Logic

- **Claude call fails** (network error, rate limit, auth): Retry up to 3 times with exponential backoff (5s, 15s, 45s)
- **JSON parse error** (Claude returned non-JSON): Retry generation once; if still fails, quarantine
- **Schema validation fails**: Retry generation once with a "please output valid JSON" suffix
- **Review fails** (quality issues): Run fix pass (Haiku); if fix also fails, quarantine
- **Max retries exceeded**: Move to `quarantine/{verse_id}.json` with error details

## Auditability and Prompt/Response Archiving

Every step is logged and every AI interaction is preserved for full audit trail.

### Saved Artifacts Per Verse

After processing, each verse has these artifacts on disk:

```
ThaqalaynDataSources/ai-content/corpus/
  responses/{verse_id}.json          # Final result (with wrapper + attribution)
  stats/{verse_id}.stats.json        # Generation metrics
  prompts/{verse_id}.prompt.json     # Archived prompt (system + user message)
  raw_responses/{verse_id}.raw.txt   # Raw Claude output (before parsing)
  fix_prompts/{verse_id}.fix.json    # Fix prompt (if fix was needed)
  fix_raw/{verse_id}.fix.raw.txt     # Raw fix response (if fix was needed)
  quarantine/{verse_id}.json         # Failed verses (if quarantined)
```

### Prompt Archive Format

```json
{
  "verse_path": "/books/al-kafi:1:1:1:1",
  "timestamp": "2026-03-06T14:30:00Z",
  "model": "sonnet",
  "system_prompt_hash": "sha256:abc123...",
  "system_prompt_version": "v3.0-no-fewshot",
  "user_message_hash": "sha256:def456...",
  "prefilled_word_count": 52,
  "total_word_count": 85,
  "user_message": "... (full user message text) ..."
}
```

The system prompt is saved once (it's identical for all verses) at `prompts/_system_prompt.txt`. Each verse's prompt archive references it by hash.

### Raw Response Archive

The raw Claude output is saved verbatim before any parsing or processing. This enables:
- Debugging parse failures
- Reprocessing with updated postprocess logic without re-generating
- Auditing exactly what Claude produced
- Cost/quality analysis

### Stats File Format (Extended)

```json
{
  "verse_path": "/books/al-kafi:1:1:1:1",
  "pipeline_version": "3.0.0",
  "model": "claude-sonnet-4-6",
  "generated_date": "2026-03-06",
  "generation_method": "claude_cli_pipe",
  "file_size_bytes": 42000,
  "source_word_count": 85,
  "prefilled_word_count": 52,
  "ai_generated_word_count": 33,
  "word_analysis_count": 85,
  "content_type": "ethical_teaching",
  "chunk_count": 3,
  "narrator_count": 5,
  "has_chain": true,
  "validation_passed": true,
  "review_passed": true,
  "review_warnings_high": 0,
  "review_warnings_medium": 0,
  "review_warnings_low": 2,
  "fix_needed": false,
  "fix_model": null,
  "fix_passed": null,
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

The orchestrator prints a progress line every 30 seconds:

```
[14:32:00] Progress: 1,247/37,000 (3.4%) | Rate: 42/hr | Workers: 10/10 active
           Pass: 1,180 (94.6%) | Fix: 53 (4.2%) | Fail: 14 (1.1%) | Queue: 35,753
           ETA: 14.2 days | Session: 247 verses in 5h 53m
```

### Progress Query Script (`pipeline_status.py`)

Run anytime to check progress without disturbing the pipeline:

```bash
python pipeline_status.py
# Output:
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
#   Fix rate:         4.2%
#   Fail rate:        1.1%
#   Active workers:  10
#   ETA complete:    2026-04-20
#
# By book:
#   al-kafi:        11,782/15,397 remaining
#   man-la-yahduruhu: 6,382/6,382 remaining
#   quran:           6,236/6,236 remaining (deprioritized)
#   ...
```

**Location**: `ThaqalaynDataGenerator/app/pipeline_cli/pipeline_status.py`

This script reads from:
- `lane_queues.json` (total queue)
- `responses/` directory (completed count)
- `stats/` directory (stats for completed verses)
- `quarantine/` directory (failed count)
- `pipeline_session.json` (current session timing)

### Session Log File

The orchestrator writes a session log to `logs/pipeline_session.log`:

```
2026-03-06T08:30:00 SESSION_START workers=10 model=sonnet queue_size=35716
2026-03-06T08:30:05 VERSE_START al-kafi_1_2_1_1 worker=3
2026-03-06T08:30:42 VERSE_DONE al-kafi_1_2_1_1 worker=3 status=pass prep=450ms gen=35000ms post=800ms
2026-03-06T08:30:43 VERSE_START al-kafi_1_2_1_2 worker=3
2026-03-06T08:31:15 VERSE_DONE al-kafi_1_2_1_2 worker=3 status=fix_needed prep=380ms gen=32000ms post=750ms
2026-03-06T08:31:16 FIX_START al-kafi_1_2_1_2 worker=3
2026-03-06T08:31:35 FIX_DONE al-kafi_1_2_1_2 worker=3 status=fixed fix_gen=18000ms
...
2026-03-06T14:30:00 PROGRESS done=1247 total=37000 rate=42/hr pass=94.6% eta=14.2d
...
2026-03-06T16:00:00 SESSION_END verses=1523 duration=7h30m rate=42/hr
```

### Pipeline Session State File

Written atomically on each progress tick (`pipeline_session.json`):

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
  "quarantine_count": 14,
  "errors": []
}

## Comparison: v2 vs v3

| Metric | v2 (Current) | v3 (Proposed) |
|--------|-------------|--------------|
| Tokens per verse | ~55,000 | ~20,000 |
| Orchestration cost | Opus agent | 0 (bash) |
| Validation cost | Claude reads Python output | 0 (Python) |
| Workers | ~200 agents (via Claude Code) | ~10 `claude -p` calls |
| Resume | Filesystem + agent restart | Filesystem (simpler) |
| Monthly throughput | ~3,500 verses | ~9,100 verses |
| Time to complete | ~11 months | ~4 months |
| Quality | Opus generation | Sonnet generation (proven equal) |
