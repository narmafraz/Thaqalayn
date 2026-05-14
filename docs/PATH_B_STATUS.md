# Path B Status Runbook

> Live state of the Path B Spark word translation. Re-written every
> major milestone. **Last updated:** 2026-05-14 ~02:25 (autonomous session).

## TL;DR

Path B pilot rounds 1-4 are complete and locked. Full-corpus runs are
in progress on Spark Qwen 3.6-35B at $0.

| Background task | Status | ETA |
|---|---|---|
| Lemma full pass (13K lemmas) | **running** | ~3.7 h total, ~3.5 h remaining as of 02:20 |
| Corpus context extraction (102K surfaces) | **running** | ~10-20 min |
| Surface prompt extraction (full corpus) | **pending** — blocked on contexts | ~5 min after contexts done |
| Surface full pass (~102K surfaces) | **pending** — blocked on lemma pass + surface prompts | ~9-11 h |
| Merge translations into pages | **pending** — last step | ~2 min |
| Rebuild word indexes | **pending** — emits the 11-lang `glosses` map | ~10 s |

## Resumability

Every stage is resumable. If the machine sleeps or a background dies,
just re-issue the same command — the per-slug response files in
`ThaqalaynWordSources/translation/{lemma,surface}_responses/` are the
checkpoint, and the runner's `--resume` (default) skips them.

```powershell
# Re-issue the full Path B pipeline (any stage past the existing state
# gets resumed; completed stages no-op):
.\regen_words.ps1 -IncludeTranslations
```

## What was decided in the pilot rounds

See `PATH_B_SPARK_LOG.md` for the round-by-round details.

| Round | Decision |
|---|---|
| 1 (lemma baseline) | passes — 100% parse, ≥4.8/5 quality |
| 2 (+classical_definitions) | **adopt** — `--include-classical` is the production flag for the lemma pass |
| 3 (surface baseline) | passes — 100% parse, ≥4.6/5 quality. Enhanced validator added (cross-script leak detection) |
| 4 (surface + corpus contexts) | **adopt** — `--corpus-contexts surface_contexts.json` for production surface pass. Big win: آجُرَّةٍ recovered from CAMeL mis-lemmatization |
| 5 (tough-case spot check) | **deferred** — no remaining systematic issue worth a dedicated round |

## What to do if you return mid-pass

### If lemma pass is still running:
```powershell
# Check progress
Get-ChildItem ..\ThaqalaynWordSources\translation\lemma_responses\ -Filter *.json | Measure-Object | Select-Object Count
# Target: ~13086 files total
```

### If lemma pass finished but surface pass hasn't started:
```bash
# 1. Confirm contexts ready
test -f ../ThaqalaynWordSources/translation/surface_contexts.json && \
    echo "ready" || echo "NOT ready — run extract_corpus_contexts.py first"

# 2. Extract surface prompts for the full 102K
.venv/Scripts/python.exe scripts/extract_surface_translation_prompts.py \
    --corpus-contexts ../ThaqalaynWordSources/translation/surface_contexts.json

# 3. Kick off the surface pass
.venv/Scripts/python.exe -u scripts/run_path_b_translations.py --pass surface --workers 8
```

### If both passes finished:
```bash
# 1. Merge translations into per-page JSONs
.venv/Scripts/python.exe scripts/merge_translations_into_pages.py --pass both

# 2. Rebuild indexes (so `glosses` map appears in index/lemmas.json)
.venv/Scripts/python.exe scripts/build_word_indexes.py

# 3. Commit ThaqalaynWords (new translations + indexes)
cd ../ThaqalaynWords && git add . && git commit -m "Path B: 11-lang translations on all lemmas + surfaces"

# 4. Commit ThaqalaynWordSources (new response files)
cd ../ThaqalaynWordSources && git add translation/ && git commit -m "Path B full corpus translation outputs"

# 5. Push (waited until owner is back — don't push during AFK)
```

## UI revert (Path C → Path B)

Once translations are merged + indexes rebuilt + ThaqalaynWords deployed,
the Path C temporary English gloss can come out:

```bash
cd ../Thaqalayn
git revert d0ce4a9   # generator: drop Path C gloss in index
git revert 34ff19c   # UI: switch from gloss → translations[lang]
# Build, test, deploy.
```

## Known issues to watch in the full output

| Issue | Found in Round | Frequency | Severity |
|---|---|---|---|
| Cross-script leak (e.g. Bengali in Spanish slot) | R3 | 2/100 pilot = 2% | low — validator flags |
| CAMeL mis-lemmatization → bad lemma anchor | R3, mitigated R4 | not measured at scale | mostly fixed by R4 corpus context |
| Proper-noun localization weak on rare names (دانِيال in fa/ur) | R1 | 1/5 pilot proper nouns = 20% | low — affects only rare proper nouns |
| `}` infinite loop on cap-exceeding outputs | designed-around | 0/100 in any round | none observed |

Validator catches the cross-script leaks but doesn't trigger an automatic
retry — they pass through to merge with `issues:` set on the response file.
The merger skips items with non-empty `issues` (so the page just doesn't
get translations for those slugs; UI gracefully degrades to Path C-style
empty state).

If we ever want to be aggressive about retries, add a one-shot retry on
validation issue (vs the current "retry only on parse error") to the
runner. Defer until production output shows it matters.

## File locations

| Path | What |
|---|---|
| `ThaqalaynDataGenerator/app/words/spark_translation.py` | Engine |
| `ThaqalaynDataGenerator/app/words/clitic_labels.py` | CAMeL clitic → label |
| `ThaqalaynDataGenerator/scripts/extract_lemma_translation_prompts.py` | Step 1 |
| `ThaqalaynDataGenerator/scripts/extract_surface_translation_prompts.py` | Step 4 |
| `ThaqalaynDataGenerator/scripts/extract_corpus_contexts.py` | Step 3 |
| `ThaqalaynDataGenerator/scripts/run_path_b_translations.py` | Steps 2, 5 |
| `ThaqalaynDataGenerator/scripts/merge_translations_into_pages.py` | Step 6 |
| `ThaqalaynDataGenerator/scripts/build_path_b_pilot_set.py` | Pilot sampler |
| `ThaqalaynDataGenerator/regen_words.ps1` | Orchestrator (`-IncludeTranslations`) |
| `ThaqalaynWordSources/translation/lemma_prompts.jsonl` | All 13K lemma prompts |
| `ThaqalaynWordSources/translation/surface_prompts.jsonl` | Pilot subset (regen for full) |
| `ThaqalaynWordSources/translation/pilot_set.json` | Locked 100+100 pilot |
| `ThaqalaynWordSources/translation/surface_contexts.json` | ±10-word windows per surface |
| `ThaqalaynWordSources/translation/lemma_responses/{slug}.json` | One file per translated lemma |
| `ThaqalaynWordSources/translation/lemma_responses/round-{N}/` | Per-round pilot outputs |
| `ThaqalaynWordSources/translation/surface_responses/{slug}.json` | One file per translated surface |
