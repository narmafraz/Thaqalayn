# Path B Status Runbook

> **Updated 2026-05-19: ALL PATH B PIPELINE STAGES COMPLETE.** See "Final state" section below for the locked-in numbers; the historical "in flight" tables further down record how it ran.

## TL;DR — Path B is done

All four pilot rounds and the full-corpus runs completed on Spark Qwen 3.6-35B at **$0** compute. Translations are merged into ThaqalaynWords; the lemmas index now carries the 11-language `glosses` map; both source and shipped repos have been committed locally (not yet pushed).

| Stage | Outcome |
|---|---|
| Lemma full pass (13,086 lemmas) | **DONE** — 12,985 (99.2%) with full 11-lang translations |
| Surface full pass (102,003 surfaces) | **DONE** — 100,675 (98.7%) with full 11-lang translations |
| Merge translations into pages | **DONE** — 12,808 lemma pages + 100,576 surface pages updated |
| Rebuild word indexes | **DONE** — `index/lemmas.json` 2.8 MB → 5.6 MB (gains 11-lang `glosses` per entry) |

Final-state commits:
- `ThaqalaynDataGenerator @ 86d3349` — build_word_indexes emits `glosses` map
- `ThaqalaynWords @ b6bc78697a` — 113,661 page updates + new index
- `ThaqalaynWordSources @ 62616ef56` — full Path B archive (~115K files, ~430 MB)

**What's left:**
- Push the three repos (waited for owner approval per AFK rule)
- Once `ThaqalaynWords` is deployed to Netlify, **revert Path C** in Thaqalayn UI:
  ```bash
  cd Thaqalayn
  git revert d0ce4a9   # generator: drop Path C English-only gloss in index
  git revert 34ff19c   # UI: switch from gloss → translations[lang]
  ```
  After Path C revert, every word card in the UI reads the active language gloss from the new 11-lang `glosses` field instead of the temporary English-only `gloss`.

## Critical fix during the run

The runner was persisting all results AFTER `asyncio.gather` returned, so a 13K-item run that died mid-way lost everything. Fixed at 02:38 on 2026-05-14 by persisting per-item via the progress callback. Resume on re-launch works correctly. The fix cost ~25 min of recompute on the lemma pass.

## How it ran — wall-time receipts

| Phase | Wall-clock | Compute | Notes |
|---|---|---|---|
| Lemma full pass | 2026-05-14 02:40 → 08:14 | ~5.5h (includes 1 sleep period) | 100% parse, $0 |
| Corpus context extraction | 2026-05-16 ~21:00 → 21:57 | ~20 min CPU | Walked all 102K surfaces × occurrence_paths |
| Surface full pass | 2026-05-16 22:00 → 2026-05-18 23:31 | ~50 h wall (includes multiple sleeps) | 100% parse, $0 |
| Merge + index rebuild | 2026-05-18 23:32 → 23:37 | ~5 min | All in one chain-script handoff |

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
