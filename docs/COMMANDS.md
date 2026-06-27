# Commands Reference

All user-facing scripts and commands across the Thaqalayn ecosystem, organized by workflow stage.

**Prerequisites for all Python commands:**
```bash
cd ThaqalaynDataGenerator
source .venv/Scripts/activate
export PYTHONPATH="$PWD:$PWD/app"
export SOURCE_DATA_DIR="../ThaqalaynDataSources/"
export DESTINATION_DIR="../ThaqalaynData/"
```

---

## 1. Scraping Source Data

Scrapers fetch raw data into `ThaqalaynDataSources/scraped/`.

| Command | What it does |
|---------|-------------|
| `python app/scrapers/scrape_thaqalayn_api.py` | Scrape all books from ThaqalaynAPI (~18,945 hadiths). `--list` to show slugs. Pass slug names as args for specific books. |
| `python app/scrapers/download_rafed_word.py` | Download Word (.doc) files for Four Books from rafed.net. `--tahdhib`, `--istibsar`, `--kafi`, `--faqih`, `--list`. |
| `python app/scrapers/download_ghbook_html.py` | Download HTML from ghbook.ir for Tahdhib & al-Istibsar. `--tahdhib`, `--istibsar`, `--list`. |
| `python app/scrapers/scrape_rafed_text.py` | Scrape page text from rafed.net SPA (requires Playwright). `--tahdhib`, `--istibsar`, `--vol N`, `--toc-only`. |
| `python app/scrapers/scrape_hubeali_sulaym.py` | Scrape Book of Sulaym from hubeali.com. Note: Arabic extraction has encoding issues. |

---

## 2. Generating JSON Data

Parse scraped sources into structured JSON for the Angular app.

| Command | What it does |
|---------|-------------|
| `./add_data.ps1` | **Full pipeline** — runs all parsers in sequence (books → quran → kafi → sarwar → links → narrators → thaqalayn_api → ghbook → indices → merge AI content). |
| `python app/main_add.py` | Same as above but manual (requires env vars set). |

Output goes to `../ThaqalaynData/`.

---

## 3. AI Content Pipeline

### 3a. Corpus Manifest

Lists every verse path under `ThaqalaynData/books/`. The pipeline reads this to know what verses exist. Currently 57,999 verses across 24 books.

```bash
python -m app.ai_pipeline manifest                    # All books
python -m app.ai_pipeline manifest --book al-kafi     # Specific book
python -m app.ai_pipeline manifest --book al-kafi --volume 1  # Specific volume
```

Output: `ThaqalaynDataSources/ai-pipeline-data/corpus_manifest.json`

**When to regenerate:** only when the *set* of verses changes (after adding a new book parser or re-parsing source data). NOT after AI pipeline runs — those add content to existing verses, not new files.

### 3b. Running the Pipeline

```bash
# Standard run (v4 format, 20 workers, al-kafi only)
AI_CONTENT_SUBDIR=corpus python -m app.pipeline_cli.pipeline \
    --book al-kafi --workers 20 --max-verses 100

# Single verse (debugging)
python -m app.pipeline_cli.pipeline --single /books/al-kafi:1:1:1:1

# Dry run (prepare prompts only, no Claude calls)
python -m app.pipeline_cli.pipeline --book al-kafi --dry-run --max-verses 10

# Skip long hadiths
python -m app.pipeline_cli.pipeline --book al-kafi --workers 20 --max-words 199

# Retry quarantined verses (includes them alongside fresh corpus items)
python -m app.pipeline_cli.pipeline --book al-kafi --attempt-quarantined

# Retry ONLY quarantined (skip fresh corpus items entirely) — preferred for
# focused recovery passes. Implies --attempt-quarantined.
python -m app.pipeline_cli.pipeline --quarantined-only --workers 10

# Use v3 format (legacy, with per-word translations)
python -m app.pipeline_cli.pipeline --book al-kafi --workers 20 --v3

# OpenAI backend (requires OPENAI_API_KEY env var)
export OPENAI_API_KEY=sk-...
python -m app.pipeline_cli.pipeline --backend openai --workers 20 --book al-kafi --volume 1

# OpenAI with specific model
python -m app.pipeline_cli.pipeline --backend openai --openai-model gpt-4.1-nano --max-verses 10
```

**Key flags:**
- `--workers N` — Parallel calls (default: 5)
- `--model sonnet` — Generation model (auto-maps to `--openai-model` when using openai backend)
- `--fix-model sonnet` — Fix pass model
- `--backend {claude,openai}` — LLM backend (default: claude). OpenAI requires `OPENAI_API_KEY` env var.
- `--openai-model gpt-4.1-mini` — OpenAI model (default: gpt-4.1-mini). Only used with `--backend openai`.
- `--book X,Y` — Filter by book(s), comma-separated
- `--volume N` — Filter by volume
- `--max-verses N` — Limit verses processed
- `--max-words N` — Skip verses over N words
- `--max-failures N` — Quarantine threshold (default: 3)
- `--attempt-quarantined` — Include quarantined verses in queue (default: skip)
- `--quarantined-only` — Build queue from quarantine/ only, skip fresh corpus
- `--skip-merge` — Don't auto-merge into ThaqalaynData after the run (saves 1-3 min)
- `--v3` — Use v3 word_analysis format instead of v4 word_tags
- `--dry-run` — Prepare prompts only

**Auto-merge:** when `DESTINATION_DIR` is set, the pipeline runs `merge_ai_content()` after the run, folding new responses into `ThaqalaynData/books/...json` for the UI. Disable with `--skip-merge` for test runs you don't want propagating.

**Auto-clear quarantine:** when a previously-quarantined verse retries successfully, the pipeline now deletes its old quarantine file (commit `06d1f8c`). No manual orphan cleanup needed.

### 3c. Multi-Phase Pipeline (`--phased`)

Splits generation into 4 specialized phases: Structure (LLM) → Enrichment (programmatic) → Scholarly (LLM) → Translation (LLM/API).

**Recommended production setup** (validated 2026-05): mixed model — gpt-5.4 for Phase 1 quality + gpt-4.1-mini for Phase 4 (mechanical translation, ~3.6× cheaper output rate, caching engages reliably):

```bash
export OPENAI_API_KEY=sk-...
AI_CONTENT_SUBDIR=corpus PYTHONPATH="$PWD:$PWD/app" SOURCE_DATA_DIR="../ThaqalaynDataSources/" \
DESTINATION_DIR="../ThaqalaynData/" \
  python -m app.pipeline_cli.pipeline \
    --phased --skip-scholarly --backend openai \
    --phase1-model gpt-5.4 --phase4-model gpt-4.1-mini \
    --workers 20 --book man-la-yahduruhu-al-faqih
```

Cost: ~$0.027/verse with caching savings. Projected full 58K-verse corpus: ~$1,200-1,400.

```bash
# Full phased pipeline (defaults: phase1=gpt-5.4, phase4=gpt-5.4-mini)
python -m app.pipeline_cli.pipeline --phased --book al-kafi --workers 20

# Skip scholarly phase (cost-sensitive — Phase 3 is Claude CLI, expensive)
python -m app.pipeline_cli.pipeline --phased --skip-scholarly --book al-kafi --workers 20

# Custom Phase 1 model
python -m app.pipeline_cli.pipeline --phased --phase1-model gpt-4.1-mini --book al-kafi

# Custom Phase 4 model
python -m app.pipeline_cli.pipeline --phased --phase4-model gpt-4.1-nano --book al-kafi

# Build enrichment maps for Phase 2 (programmatic)
python scripts/build_enrichment_maps.py

# Benchmark Phase 1 quality across models (Claude Sonnet, GPT-5.4, etc.)
python scripts/benchmark_phase1.py

# Benchmark full phased flow on a sample
python scripts/benchmark_phased.py

# Benchmark Phase 2 enrichment accuracy
python scripts/benchmark_phase2.py
```

**Caching behavior:**
- gpt-4.1 family (4.1, 4.1-mini, 4.1-nano), gpt-4o, gpt-5.1: caching reliably engages above 1024 prompt tokens, ~75-90% off cached input rate
- gpt-5.4 family + gpt-5.5: known OpenAI bug — `cached_tokens` returns 0 even on identical prompts. Pipeline still bills correctly when reported.
- Phase 4 system prompt is ~150 tokens — below the 1024 threshold, so Phase 4 caching is workload-dependent (engages when chunks accumulate; not always)
- Watch for `Cache: NN% hit rate` line in pipeline summary

### 3e. OpenAI Batch API (50% Discount)

Asynchronous batch processing via OpenAI Batch API. Requests are queued and completed within 24 hours at half price. State persists across machine restarts.

```bash
export OPENAI_API_KEY=sk-...

# Step 1: Submit generation batch
python -m app.pipeline_cli.pipeline batch submit --book al-kafi --volume 1

# Step 2: Check status (safe to close terminal between checks)
python -m app.pipeline_cli.pipeline batch status

# Step 3: Download and postprocess results
python -m app.pipeline_cli.pipeline batch download

# Step 4: Submit fix batch (for verses needing fixes)
python -m app.pipeline_cli.pipeline batch submit-fixes

# Step 5: Check fix status, then download
python -m app.pipeline_cli.pipeline batch status
python -m app.pipeline_cli.pipeline batch download-fixes
```

### 3f. Batch Self-Improving Run

```bash
# Run 1000 verses in batches of 100, with auto-improvement between batches
python scripts/batch_improve.py --total-verses 1000 --batch-size 100 --workers 20

# Without improvement step
python scripts/batch_improve.py --total-verses 500 --batch-size 100 --no-improve

# Custom model for improvement agent
python scripts/batch_improve.py --total-verses 1000 --improve-model opus

# Use v3 format
python scripts/batch_improve.py --total-verses 100 --batch-size 20 --v3

# OpenAI backend
python scripts/batch_improve.py --total-verses 1000 --batch-size 100 --backend openai

# OpenAI with specific model
python scripts/batch_improve.py --total-verses 500 --batch-size 100 --backend openai --openai-model gpt-4.1-nano
```

### 3g. Word Dictionary (v4)

```bash
# Extract unique (word, POS) pairs from all responses
python -m app.pipeline_cli.pipeline word-dict extract

# Find words not yet in the dictionary
python -m app.pipeline_cli.pipeline word-dict missing

# Show dictionary coverage statistics
python -m app.pipeline_cli.pipeline word-dict stats

# Override responses directory
python -m app.pipeline_cli.pipeline word-dict extract \
    --responses-dir ../ThaqalaynDataSources/ai-content/corpus/responses
```

### 3h. Build Consistency Caches

```bash
# Build word translations cache + narrator templates (1,074 entries)
python -m app.pipeline_cli.build_caches
```

### 3i. Words Project — Path B Spark Translation

Separate from the hadith content pipeline. Translates every lemma + surface form in `ThaqalaynWords/` into 11 languages using DGX Spark / Qwen 3.6-35B at $0. See `WORDS_PROJECT_PLAN.md` (plan), `PATH_B_SPARK_LOG.md` (round-by-round results), `PATH_B_STATUS.md` (runbook).

All stages are idempotent — per-slug response files in `ThaqalaynWordSources/translation/{lemma,surface}_responses/{slug}.json` act as resume checkpoints. Re-running the chain after a crash/sleep skips completed slugs.

**Full end-to-end** (~12 h Spark, $0):
```bash
# Easiest path — chains every stage. Off by default; switch enables it.
cd ThaqalaynDataGenerator
./regen_words.ps1 -IncludeTranslations
```

**Or run stages individually**:
```bash
# 1. Extract lemma prompts (walks ../ThaqalaynWords/lemmas/)
python scripts/extract_lemma_translation_prompts.py

# 2. Spark lemma pass (~1-3 h, 13K lemmas)
python -u scripts/run_path_b_translations.py --pass lemma --workers 12 --include-classical

# 3. Extract ±10-word corpus context windows from ../ThaqalaynData/
python scripts/extract_corpus_contexts.py

# 4. Extract surface prompts (joins lemma anchors + contexts)
python scripts/extract_surface_translation_prompts.py \
    --corpus-contexts ../ThaqalaynWordSources/translation/surface_contexts.json

# 5. Spark surface pass (~6-9 h at 12 workers, 102K surfaces)
python -u scripts/run_path_b_translations.py --pass surface --workers 12

# 6. Merge translations into ThaqalaynWords/{lemmas,surfaces}/*.json
python scripts/merge_translations_into_pages.py --pass both

# 7. Rebuild indexes (lemmas index gains 11-lang `glosses` map)
python scripts/build_word_indexes.py
```

**Pilot rounds** (100 lemmas + 100 surfaces stratified, for prompt iteration):
```bash
# Build the locked pilot set (random.seed=20260514, idempotent)
python scripts/build_path_b_pilot_set.py

# Round N pilot — outputs to {lemma,surface}_responses/round-N/ instead of top-level
python -u scripts/run_path_b_translations.py --pass lemma \
    --pilot-set ../ThaqalaynWordSources/translation/pilot_set.json \
    --round 1 --workers 8 --include-classical
```

**Resume / restart**:
```bash
# After machine sleep / crash, just re-run. Resume skips already-translated slugs:
python -u scripts/run_path_b_translations.py --pass lemma --workers 12 --include-classical
python -u scripts/run_path_b_translations.py --pass surface --workers 12

# Force-redo all (bypass resume):
python -u scripts/run_path_b_translations.py --pass lemma --workers 12 --include-classical --force
```

**Chain script for unattended completion** (waits for lemma → triggers everything else):
```bash
# Launch detached so it survives terminal close. Already inside regen_words.ps1
# -IncludeTranslations, but can be run on its own:
powershell -NoProfile -File scripts/path_b_continue_after_lemmas.ps1
```

**Validation / quality check on translated outputs**:
```bash
# Validator sweep across all lemma responses — counts script-leak issues etc.
python -c "
import sys; sys.stdout.reconfigure(encoding='utf-8')
import json, glob
from app.words.spark_translation import validate_translations
dir_ = '../ThaqalaynWordSources/translation/lemma_responses'
files = [f for f in glob.glob(dir_+'/*.json') if '/round-' not in f]
clean = sum(1 for f in files if not validate_translations(json.load(open(f, encoding='utf-8')).get('parsed', {})))
print(f'{clean}/{len(files)} clean ({100*clean/len(files):.1f}%)')
"
```

**Coverage reports** — where are the gaps in `ThaqalaynWords/`?

```bash
# Per-lemma lexicon coverage: % of lemmas that have lanes_definition /
# classical_definitions (hawramani) / qac / wiktextract / Path-B translations
# populated. Shows top-N highest-corpus-frequency lemmas with each field null
# (so you can prioritise filling the gaps that matter most).
python scripts/report_lemma_coverage.py            # default top 20
python scripts/report_lemma_coverage.py --top 0    # only headline percentages
python scripts/report_lemma_coverage.py --top 50 > lemma_coverage.txt

# Corpus surface → words coverage: of every unique surface in
# corpus_surface_set.json, do we have a surfaces/{slug}.json + a
# resolvable lemma_link? Catches build_word_pages.py filtering bugs.
python scripts/report_surface_coverage.py
python scripts/report_surface_coverage.py --top 30
```

Both run on the already-built `ThaqalaynWords/` output — invoke them after `regen_words.ps1` finishes. Read-only, fast (a few seconds).

---

## 4. Pipeline Monitoring & Analysis

### 4a. Overall Pipeline Progress

The go-to command to check where you are. Requires the standard env vars (set in the prerequisites at the top of this doc):

```bash
cd ThaqalaynDataGenerator
AI_CONTENT_SUBDIR=corpus PYTHONPATH="$PWD:$PWD/app" SOURCE_DATA_DIR="../ThaqalaynDataSources/" \
  .venv/Scripts/python.exe -m app.pipeline_cli.pipeline_status
```

Output sections:
- **Top line**: total progress (e.g. `Progress: 12,824 / 57,999 (22.1%)`)
- **Per book**: verses done / total per book
- **Cumulative stats**: gen cost, fix cost, avg cost/verse, tokens, gen/fix time
- **Status counts**: pass / needs_fix / error / unknown
- **Warnings** by severity, projected cost for remaining verses
- **Session history**: last 5 sessions with verses, cost, rate
- **Quarantine list**: first 20 entries

```bash
# Detailed audit report
python -m app.pipeline_cli.pipeline_status --audit

# Quick filtered views
python -m app.pipeline_cli.pipeline_status | grep "^Progress"
python -m app.pipeline_cli.pipeline_status | grep -E "al-kafi:|tahdhib-al-ahkam:|al-istibsar:|man-la-yahduruhu-al-faqih:"

# Quarantine count (much faster than running pipeline_status)
ls ../ThaqalaynDataSources/ai-content/corpus/quarantine/ | wc -l
```

### 4b. Per-Session Analysis

| Command | What it does |
|---------|-------------|
| `python scripts/analyse_run.py` | Analyze latest session — pass rates, costs, error breakdown. |
| `python scripts/analyse_run.py --session 20260308T001946Z` | Analyze specific session. |
| `python scripts/analyse_run.py --format llm` | Output in LLM-consumable format (for batch_improve). |

### 4c. Quarantine Salvage

Local auto-fix for common quarantine patterns — free, non-destructive (only moves to `responses/` if validation passes after fix).

```bash
# Dry-run first to preview recovery rate
python scripts/salvage_quarantine.py

# Apply fixes
python scripts/salvage_quarantine.py --apply
```

What it can fix:
- Diacritics on common tokens (`صلى الله عليه وآله وسلم`, `السلام`, `ما`, `لا`)
- Quran "mysterious letters" (`الم`, `حم`, etc.)
- `has_chain=true` with empty narrators → flip to `false`
- Invalid topic enums (`family`→`marriage_family_law`, `theology`→`tawhid`, etc.)
- Invalid tag enums (`community`→`social_relations`, `ritual_purity`→`worship`, etc.)
- `key_phrases` array > 5 items → truncate

What it can't fix (need `--quarantined-only` retry instead):
- Phase 4 silent-swallow → empty translation strings
- Phase 1 JSON parse failures (raw saved as `phase1_raw`)
- Diacritics on tokens not in `DIACRITICS_FIXES` (e.g. `في`, `ذا`)

### 4d. Manual JSON Repair

```bash
# Repair quote/escape issues in a specific raw response file
python scripts/fix_json_quotes.py path/to/raw.txt
```

---

## 5. Validation & Repair

| Command | What it does |
|---------|-------------|
| `python -m app.ai_pipeline validate` | Validate all AI response files against schema. |
| `python -m app.ai_pipeline repair` | Repair malformed JSON in response files. |
| `python -m app.ai_pipeline remaining` | Show verses still needing generation. `--sort` to sort by complexity. |
| `python -m app.ai_pipeline merge-stats` | Merge per-verse stats into generation_stats.json. |
| `python -m app.ai_pipeline estimate` | Estimate pipeline cost for remaining corpus. |

---

## 6. Testing

### Generator Tests (1,627+ tests, pytest)

```bash
cd ThaqalaynDataGenerator
source .venv/Scripts/activate
PYTHONPATH="$PWD:$PWD/app" SOURCE_DATA_DIR="../ThaqalaynDataSources/" \
    .venv/Scripts/python.exe -m pytest --no-cov -q

# Specific test file
.venv/Scripts/python.exe -m pytest tests/test_ai_pipeline.py --no-cov -q

# With coverage
.venv/Scripts/python.exe -m pytest --cov=app --cov-report=html
```

### Angular Unit Tests (367 tests, Karma/Jasmine)

```bash
cd Thaqalayn
CHROME_BIN="/c/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe" \
    npx ng test --watch=false --browsers=ChromeHeadless
```

### Angular E2E Tests (187 tests, Playwright)

```bash
cd Thaqalayn    # MUST be in Thaqalayn dir, not root
npx playwright test                     # All tests (headless)
npx playwright test --headed            # With visible browser
npx playwright test accessibility       # Specific test file
npx playwright test --reporter=html     # HTML report
```

### Pipeline-Specific Tests

| Command | What it does |
|---------|-------------|
| `python scripts/test_e2e_flow.py` | End-to-end test: prepare → claude -p → postprocess on one hadith. |
| `python scripts/test_quality_comparison.py` | Haiku vs Sonnet quality comparison. |
| `python scripts/test_concurrency.py` | Tests claude -p concurrency and token overhead. |

---

## 7. Local Development Stack

```bash
# Terminal 1: Data server
cd ThaqalaynData
python serve.py                     # http://localhost:8888

# Terminal 2: Angular dev server
cd Thaqalayn
npm start                           # http://localhost:4200
```

Both must be running for the Angular app to load data.

---

## 8. Query & Utility Scripts

Run from `ThaqalaynDataGenerator/` with env vars set.

| Command | What it does |
|---------|-------------|
| `python app/queries/dump_verse.py` | Dump specific verse/hadith data and narrators. Edit PATH constant in file. |
| `python app/queries/find_text.py` | Full-text search across all chapters. Edit SEARCH_TERM in file. |
| `python app/queries/kitab_hujjat_narrators.py` | Generate narrator graph visualization (HTML output). |
| `python app/queries/kitab_hujjat_verses.py` | Analyze Quran verse references in Kitab al-Hujjat. |
| `python app/queries/cross_validate_ghbook_rafed.py` | Cross-validate Tahdhib/Istibsar text between ghbook.ir and rafed.net sources. |
| `python scripts/measure_prompt.py` | Measure system prompt size vs Windows CreateProcess limit. |
| `python scripts/build_canonical_registry.py` | Build/rebuild `canonical_narrators.json` (4,629 entries) from the narrator index + AI templates. Run after major changes to narrator data. |
| `python scripts/scrape_thaqalayn_arabic_titles.py` | Pull Arabic chapter titles from thaqalayn.net for books missing them. |
| `python scripts/translate_chapter_titles.py` | LLM-translate chapter titles to other languages (planned: ~$6 batch via gpt-5-mini for the 62K backlog). |

---

## 9. Build & Deploy

### Angular Production Build

```bash
cd Thaqalayn
ng build --configuration=production     # Output: dist/Thaqalayn/
```

### Mobile (Capacitor)

```bash
cd Thaqalayn
npm run cap:build       # Angular build + Capacitor sync
npm run cap:android     # Open Android project
npm run cap:ios         # Open iOS project
```

### Deployment

Both **ThaqalaynData** and **Thaqalayn** auto-deploy to Netlify on push:
- Data: `https://thaqalayndata.netlify.app/`
- App: `https://thaqalayn.netlify.app/`

---

## Environment Variables Reference

| Variable | Default | Purpose |
|----------|---------|---------|
| `PYTHONPATH` | — | Must include project root + `app/` |
| `SOURCE_DATA_DIR` | `../ThaqalaynDataSources/` | Raw data, AI config, AI content |
| `DESTINATION_DIR` | `../ThaqalaynData/` | Output JSON files. Required for the auto-merge step after a pipeline run; without it the pipeline prints `Skipping merge: DESTINATION_DIR not set or not found.` |
| `AI_CONTENT_SUBDIR` | `samples` | AI content subdirectory (`samples` or `corpus`). Set to `corpus` for production runs. |
| `OPENAI_API_KEY` | — | Required only for `--backend openai`. Read from env only — never persist to files. |
| `CHROME_BIN` | — | Path to Chromium browser for Angular unit tests |

---

## Useful One-Liners

```bash
# Extract verse paths for all currently-quarantined items (e.g. for --single)
.venv/Scripts/python.exe -c "
import json, os, glob
qdir = '../ThaqalaynDataSources/ai-content/corpus/quarantine'
for fp in sorted(glob.glob(f'{qdir}/*.json')):
    d = json.load(open(fp, encoding='utf-8'))
    print(d.get('verse_path') or '/books/' + os.path.basename(fp).replace('.json','').replace('_', ':', 1).replace('_', ':'))
"

# Manually clean orphaned quarantine entries (no longer needed after commit 06d1f8c
# but kept here for reference)
.venv/Scripts/python.exe -c "
import os, glob
qdir = '../ThaqalaynDataSources/ai-content/corpus/quarantine'
rdir = '../ThaqalaynDataSources/ai-content/corpus/responses'
removed = sum(os.remove(fp) or 1 for fp in glob.glob(f'{qdir}/*.json') if os.path.exists(f'{rdir}/{os.path.basename(fp)}'))
print(f'Cleaned {removed} orphans')
"

# Per-book Faqih breakdown (quick progress check)
ls ../ThaqalaynDataSources/ai-content/corpus/responses/man-la-yahduruhu-al-faqih_*.json | wc -l
```
