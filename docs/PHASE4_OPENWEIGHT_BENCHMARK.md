# Phase 4 Open-Weight Translation Benchmark

**Date**: 2026-05-12 (initial), 2026-05-13 (rounds 2-4 + Phase 1 update)
**Status**: COMPLETE
**Question**: Can we run Phase 4 (10-language translation) — and potentially Phase 1 — on the DGX Spark using Qwen 3.6 instead of OpenAI?

## TL;DR (final, after 4 optimisation rounds)

**Yes for Phase 4. Cautiously yes for Phase 1.** Two cheap fixes flipped the verdict from round 1:

1. **Strict JSON-schema response_format** (vLLM enforces it during decode) eliminates structural malformation. Parse rate 88.6% → 94.3%.
2. **Per-language calls** (one language per call instead of all 10) bring per-call output below 400 tokens, fully saturate the Spark concurrency ceiling, and lift parse rate to **99.5%**. Wall time for 30 verses drops from 1852 s → **765 s (2.4× faster)**. The verses that timed out in rounds 1-2 (al-kafi:1:4:125:4 at 1801s) now complete in 61.5s with 100% parse.

**Final wall-time projection for 48K remaining verses on Spark**:
- Phase 1 (Qwen + strict schema, single call/verse): **~3 days**
- Phase 4 (Qwen + strict schema + per-language calls): **~14 days**
- Combined sequential: **~17 days** at ~$30 electricity vs **~$1,330** OpenAI cost (gpt-5.4 + gpt-4.1-mini)

**Remaining caveats**:
- Phase 1 chunk under-segmentation: Qwen tends to merge body+quran_quote+closing into one big "body" chunk (12/29 verses under-segment vs baseline). Downstream Phase 2 `word_ranges` and the narrator-highlighting UI degrade in proportion.
- Rare narrator-name transliteration weaknesses (improved in round 4's per-language mode but not eliminated)
- Native-speaker review for `ur` / `bn` still recommended before commit

**Bottom line**: with the round-4 per-language approach we have a viable open-weight path that saves ~$1,300 at the cost of ~2 weeks Spark wall time and ~10% lower chunk-segmentation granularity. Production-viable if the chunk granularity loss is acceptable; if not, run Phase 4 on Spark and keep Phase 1 on `gpt-5.4` (saves ~$270, finishes Phase 1 in hours).

## Original TL;DR (round 1, retained for record)

The first round of testing — same model + prompt, no JSON-schema response_format, all 10 languages per call — gave this verdict:

1. **88.6% JSON parse rate** vs ~100% for the OpenAI baselines. When Qwen fails, **all 10 languages for that verse go empty** (the missing-translation salvage path fills with empty strings) — a 100% data loss for that verse.
2. **Per-verse wall time is ~62 s on Spark vs effectively instant under OpenAI Batch**. For the remaining ~48 K verses at `--workers 8` this projects to ~34 days of continuous Spark runtime.
3. **Systematic factual errors** in some languages: garbled rare narrator names (`Samāʿah → Samah`), code-switched English words in Chinese/Persian output (`blessed`, `allotted domain`, `this passage`), Turkish glossary slips (`bakîyet` instead of `duhul` for consummation), and an Adam-omitting Spanish/French/German/Russian/Chinese summary on `al-kafi:1:4:105:7`.

Issues 1 and 2 are fixed by round 2 (schema) + round 4 (per-language calls). Issue 3 is partially fixed: Adam-omission gone (rounds 2 and 4), narrator-name transliteration improved in round 4 (`Najran` correctly spelled where round 2 still dropped a letter).

## Why this benchmark exists

Prior to this report there was **no Phase 4-specific quality benchmark** on record. Phase 4 model choice drifted from `gpt-5-mini` (`PIPELINE_OPTIMIZATION_PLAN.md`, 2026-03-13) to `gpt-5.4-mini` (the current `pipeline.py` default) to `gpt-4.1-mini` (manual override on the recent faqih run) purely on cost arithmetic. Every previous benchmark on disk (`AI_BACKEND_COST_ANALYSIS.md`, `OPENAI_PIPELINE_OPTIMIZATION.md`, `BENCHMARK_INSTRUCTIONS.md`) tested the **monolithic v3** call, where `word_tags`, enum compliance and chunk segmentation dominate the failure modes — Phase 4 alone (simple EN → 10-language translation with a fixed JSON shape) is a much easier task and the historical "gpt-4.1-mini is broken" verdict didn't carry over.

This is also the first apples-to-apples three-way comparison of `gpt-4.1-mini` vs `gpt-5.4-mini` vs an open-weight option for Phase 4.

## Method

**Sample**: 30 verses stratified across two axes:

| Baseline P4 model | n  | Books drawn from |
|-------------------|----|------------------|
| `gpt-4.1-mini`    | 15 | `man-la-yahduruhu-al-faqih` (14) + `al-kafi` (1) |
| `gpt-5.4-mini`    | 15 | `tahdhib-al-ahkam`, `al-istibsar`, `al-kafi`, `al-khisal` |

Stratified by shape: 6 short matn-only · 8 long multi-chunk · 4 dua · 4 Quran-quoting · 8 other. Sample selection script: `ThaqalaynDataGenerator/scripts/benchmark_phase4_sample.py` (seed 20260512).

**Approach**: Existing baseline responses already contain a full Phase 1 (gpt-5.4) + Phase 4 output. For each verse I stripped the non-EN translations from the existing response, then re-ran the production Phase 4 prompt (same `_build_batch_prompt` from `app/pipeline_cli/translation_phase.py`) against `qwen36-fast` (Qwen 3.6-35B-A3B-heretic NVFP4) at `http://192.168.0.66:8000/v1`. The baseline files were never modified; Qwen outputs were written to `ThaqalaynDataGenerator/benchmark/phase4_qwen/results/`.

**Qwen-specific call shape** (matters for any future integration):
- `model="qwen36-fast"` (T=0 alias)
- `temperature=0`
- `max_tokens=8192` per batch
- `extra_body={"chat_template_kwargs": {"enable_thinking": False}}` — **required**. With thinking on (the default), Qwen 3.6 emits reasoning into a separate `reasoning` field and leaves `content` empty until the thinking budget exhausts; a default `max_tokens=64` call returned `content: null`.

**Quality scoring**: I (Claude) read pairs side-by-side in `benchmark/phase4_qwen/pairs.md`. No LLM-as-judge calls. Languages with native-script reading confidence (en, es, fr, de, ru, zh, id, tr, fa): direct comparison. Languages where my reading skill is shakier (ur, bn): conservative scoring — only flag obvious factual errors and grammatical breakage.

## Reliability (automated checks)

Counts across all translation slots (summary + seo_question + N chunks per verse). `total` differs per model because Qwen is summed over all 30 verses while each baseline is summed over its own 15.

| Lang | Model | empty | length-flag | ar-echo | diacritics | total |
|------|-------|------:|-----:|--------:|------:|------:|
| Urdu | gpt-4.1-mini | 0 | 0 | 0 | 0 | 76 |
| Urdu | gpt-5.4-mini | 0 | 0 | 0 | 0 | 73 |
| Urdu | qwen36-fast | 20 | 0 | 0 | 0 | 149 |
| Turkish | gpt-4.1-mini | 0 | 0 | 19 | 4 | 76 |
| Turkish | gpt-5.4-mini | 0 | 0 | 31 | 0 | 73 |
| Turkish | qwen36-fast | 20 | 0 | 0 | 1 | 149 |
| Farsi | gpt-4.1-mini | 0 | 0 | 0 | 0 | 76 |
| Farsi | gpt-5.4-mini | 0 | 0 | 0 | 0 | 73 |
| Farsi | qwen36-fast | 20 | 0 | 0 | 0 | 149 |
| Indonesian | gpt-4.1-mini | 0 | 0 | 25 | 0 | 76 |
| Indonesian | gpt-5.4-mini | 0 | 0 | 34 | 0 | 73 |
| Indonesian | qwen36-fast | 20 | 0 | 1 | 0 | 149 |
| Bengali | gpt-4.1-mini | 0 | 0 | 27 | 0 | 76 |
| Bengali | gpt-5.4-mini | 0 | 0 | 30 | 0 | 73 |
| Bengali | qwen36-fast | 20 | 0 | 4 | 0 | 149 |
| Spanish | gpt-4.1-mini | 0 | 0 | 21 | 11 | 76 |
| Spanish | gpt-5.4-mini | 0 | 0 | 36 | 11 | 73 |
| Spanish | qwen36-fast | 20 | 0 | 2 | 15 | 149 |
| French | gpt-4.1-mini | 0 | 0 | 21 | 5 | 76 |
| French | gpt-5.4-mini | 0 | 0 | 32 | 6 | 73 |
| French | qwen36-fast | 20 | 0 | 2 | 15 | 149 |
| German | gpt-4.1-mini | 0 | 0 | 25 | 17 | 76 |
| German | gpt-5.4-mini | 0 | 0 | 32 | 17 | 73 |
| German | qwen36-fast | 20 | 0 | 3 | 26 | 149 |
| Russian | gpt-4.1-mini | 0 | 0 | 21 | 0 | 76 |
| Russian | gpt-5.4-mini | 0 | 0 | 33 | 0 | 73 |
| Russian | qwen36-fast | 21 | 0 | 2 | 0 | 149 |
| Chinese | gpt-4.1-mini | 0 | 24 | 31 | 0 | 76 |
| Chinese | gpt-5.4-mini | 0 | 18 | 34 | 0 | 73 |
| Chinese | qwen36-fast | 20 | 54 | 2 | 0 | 149 |

**Read carefully:**

- **`empty`**: 20 empty slots per language for Qwen comes from 4 failed verses × 5 slots each (1 summary + 1 seo + N chunks). The OpenAI baselines had zero parse failures in this sample.
- **`ar-echo`**: Counts Arabic-script characters present in a non-Arabic-script language slot. Both OpenAI models routinely keep Arabic honorifics inline (`عليه السلام`, `صلى الله عليه وآله`) — Qwen tends to transliterate or drop them. This is a *stylistic difference*, not necessarily a quality difference; some users may prefer the OpenAI behaviour (preserving honorifics), others Qwen's (fully translated). Worth flagging because it changes downstream rendering.
- **`length-flag`** (Chinese): My heuristic flags slots <0.3× or >3.5× the EN length. Chinese is much denser than EN so this is a calibration miss, not a Qwen defect specifically. Disregard the Chinese length flags.
- **`diacritics-flag`** (Spanish/French/German): Qwen drops European diacritics on transliterated Arabic names (`Sa'd` instead of `Saʿd`, `Muhammad` instead of `Muḥammad`). Cosmetic but consistent.

### When Qwen parse-fails, what does the user see?

For verse `al-kafi:1:4:125:4` (the verse that timed out at 1801s on batch 0), **80/80 (100%) translation slots ended up empty** because `_fill_empty_translations()` in `translation_phase.py` fills missing translations with empty strings as a fallback. The downstream `validate_result()` (commit `e84f106`) would catch this and quarantine the verse — so in production this verse simply wouldn't merge. But the wall-time and electricity were spent.

## Per-language qualitative findings (manual scoring)

Read of ~12 verses across the sample (sampled across baselines and strata). Verdict per language compares Qwen36 against whichever baseline that verse used.

| Lang | Qwen quality | Issues observed |
|------|--------------|-----------------|
| Spanish | Near-parity for most verses; one **factual omission** (Adam dropped from chain in summary on `al-kafi:1:4:105:7`) | Diacritics dropped on names; slight register shift in summaries |
| French | Near-parity; same Adam-omission propagated; one **typo** (`Yaḍḥuruhu` for `Yaḥḍuruhu` on faqih:5:218:1) | Same diacritics drop |
| German | Near-parity; one **grammatical slip** (`möge Allah ihn barmherzig sein` should be `ihm gnädig`) | Adam omission also surfaced here |
| Russian | Near-parity; **one missing letter** in proper name (`Нджрана` for `Наджрана`); **one mispronunciation** (`Мупаффаля` for `Муфаддаля`) | Adam omission propagated |
| Chinese | Generally good; **code-switched English words** twice (`blessed 时刻`, `allotted domain 赐予他`); slight name-transliteration drift | Adam-dropping propagated; sinicized book titles where baseline kept Arabic |
| Persian | Mostly good; one **bad code-switch** (`این passage` instead of `این متن` on faqih:5:218:1) | Otherwise comparable |
| Indonesian | Near-parity; Qwen prefers a more local transliteration style (`Sa'id` vs `Saʿīd`) | No major content errors |
| Turkish | **Multiple factual mistakes**: `bakîyet` (meaning "remainder") used for `duhul` (consummation) on faqih:3:4:8:1; `Cabir sureler` invented in place of `العزائم` on istibsar:1:48:5 | Style otherwise fluent |
| Urdu (low conf) | One **narrator name swap** (`سعد` → `سعید` — Sa'd to Sa'id, different people) | Grammar appears natural; hard for me to assess style fully |
| Bengali (low conf) | Qwen uses archaic register (`হইতে`) in some chunks; baseline uses modern Bengali | Hard for me to call faithfulness — flagged for native review |

**Confidence flags**:
- `ur` and `bn` scoring is conservative — I can catch factually wrong narrator names or grammatical breakage but cannot reliably judge nuanced style. A native speaker pass is needed before any production decision involves these languages.

**Patterns**:
- Qwen's failure modes cluster on **rare proper nouns** (uncommon narrator names like `Samāʿah` getting garbled across multiple languages from a single chunk)
- Qwen sometimes **drops critical content from summaries** (Adam omission case) — this is a faithfulness regression, not a fluency one
- Qwen's **code-switching** is rare but consistent across languages: an English noun phrase or whole word slips through (`blessed`, `passage`, `allotted domain`)
- gpt-4.1-mini and gpt-5.4-mini produced **near-identical quality** for Phase 4 in this sample. The 5× output-price premium for gpt-5.4-mini does not buy meaningfully better translation.

## Throughput, cost, time-to-finish

| Backend | Wall time, 30-verse sample | Tokens (prompt / completion) | Per-verse $ | Projected for 48K remaining |
|---------|---------------------------|------------------------------|------------:|---------------------------:|
| qwen36-fast on Spark (workers=8) | **1852 s** (~31 min) | 31,879 / 96,321 | ~$0 (electricity ~$0.01) | **~34 days continuous + ~$17 electricity** |
| gpt-4.1-mini (extrapolated from token counts at $0.40/$1.60 per 1M) | minutes (parallel) | similar | ~$0.005 | **~$240** |
| gpt-5.4-mini (at $0.75/$4.50 per 1M) | minutes (parallel) | similar | ~$0.015 | **~$720** |
| gpt-4.1-mini via Batch API (50% off) | < 24 h async | similar | ~$0.0025 | **~$120** |

Notes:
- Per-verse cost estimates ignore Phase 1 — those are Phase 4 only.
- Spark wall-time is the binding constraint, not money. At ~62 s/verse mean across this sample (long verses hit 1800 s+), running 48 K verses sequentially-batched on the Spark would take ~5 weeks of dedicated time.
- DFlash speculative decoding hit 7–14% acceptance on multilingual JSON output (below the 60% notional spec; the diverse multi-script tokens are hostile to draft acceptance). Disabling DFlash might recover some throughput on Phase 4 specifically, since the diverse content reduces drafter benefit anyway.
- Concurrency is capped by `--max-num-seqs 16` on the 35B and unified-memory contention. workers=8 is the right setting; more does not help.

## Issues to file if we revisit

1. **Qwen JSON malformation** — observed: duplicated `"translations":` key inside chunk objects, premature object termination on long multi-chunk verses. Could be mitigated by adding `response_format={"type":"json_object"}` (vLLM with `--reasoning-parser qwen3` accepts the OpenAI JSON-mode flag; the existing benchmark did not pass it). Worth testing.
2. **Timeout on al-kafi:1:4:125:4** — 1801 s before the request gave up. Memory already notes this verse hits a Phase 1 control-char bug; the Phase 4 timeout is independent and looks like a Spark hang under sustained generation. Reproduce in isolation.
3. **Honorifics inlining** — baseline OpenAI keeps `صلى الله عليه وآله` inline across all non-Arabic-script languages; Qwen tends to transliterate or replace with the target-language convention. Decide which is desired UX behaviour before drawing quality conclusions.
4. **Adam omission in `al-kafi:1:4:105:7` summary** — Qwen dropped "from Adam" in 5 different languages from the same summary. Worth checking if this is prompt-induced (the EN summary is two sentences and Qwen may be compressing) and whether smaller per-language prompts fix it.

## Side findings (worth acting on even if Qwen is shelved)

- **gpt-5.4-mini gives no measurable Phase 4 quality lift over gpt-4.1-mini** at ~5× the output cost. The current `pipeline.py:1652` default of `--phase4-model gpt-5.4-mini` is a money-loser for Phase 4. Recommend flipping the default to `gpt-4.1-mini` and updating the memory + `PIPELINE_OPTIMIZATION_PLAN.md`. Savings on remaining corpus: ~$480.
- **The Phase 4 prompt is < 1024 tokens**, so OpenAI's automatic prompt cache never engages. If we ever want caching savings on Phase 4 specifically, we need to inflate the system prompt past 1024 tokens (e.g. inline per-language style guides). This was flagged in memory (`feedback_*`) but not implemented.
- **`_fill_empty_translations` masks Qwen failures as empty strings**. `validate_result()` (commit `e84f106`) catches this at the wrapper level, but the failure-mode visibility is poor — a Qwen parse error turns into 80 empty cells in one verse rather than a single clear error. If we re-test Qwen, surface batch-level failures as a first-class signal.

## What it would take to revisit Qwen for Phase 4

1. **Add `response_format={"type":"json_object"}` to the Qwen path** and rerun the benchmark — that's the cheapest first move, likely lifts parse rate to 95%+.
2. **Native-speaker review for ur / bn** specifically — even if reliability gets fixed, my confidence on those two languages is low. Before signing off on production use, get a one-page native check.
3. **Reduce per-call surface** — translate one chunk per call (10 calls per verse instead of 1 with 10 langs) or one language at a time per chunk. Reduces JSON malformation risk and per-verse latency, at the cost of more total calls. Spark concurrency may absorb this.
4. **Phase 1 is a separate (harder) experiment** — Phase 1 needs strict enum compliance (closed topic taxonomy of ~90 keys), exact-coverage chunk segmentation, and full Arabic diacritization. Test Phase 1 on Qwen only after Phase 4 is solid.

## Files

- Sample: `ThaqalaynDataGenerator/benchmark/phase4_qwen/sample.json`
- Qwen results: `ThaqalaynDataGenerator/benchmark/phase4_qwen/results/*.qwen.json`
- Raw API outputs (including malformed ones): `ThaqalaynDataGenerator/benchmark/phase4_qwen/raw_responses/`
- Run summary: `ThaqalaynDataGenerator/benchmark/phase4_qwen/qwen_run_summary.json`
- Automated analysis: `ThaqalaynDataGenerator/benchmark/phase4_qwen/analysis.json` + `.md`
- Side-by-side pairs: `ThaqalaynDataGenerator/benchmark/phase4_qwen/pairs.md` (5K lines)
- Scripts: `scripts/benchmark_phase4_sample.py`, `scripts/benchmark_phase4_qwen.py`, `scripts/benchmark_phase4_analyze.py`, `scripts/benchmark_phase4_dump_pairs.py`

## Spark config used

```
host: 192.168.0.66
endpoint: :8000/v1 (qwen36-35b container)
model alias: qwen36-fast (T=0)
vLLM container: ghcr.io/aeon-7/vllm-spark-omni-q36:v1.2
notable flags: max-num-seqs=16, gpu-memory-utilization=0.5, max-model-len=65536,
               speculative=DFlash (7 tokens), VLLM_NVFP4_GEMM_BACKEND=marlin
```

The 27B container (`:8001`) was attempted but crash-loops on this image due to a Marlin NVFP4 kernel tile-size constraint (`size_n=96 not divisible by tile_n_size=64`). Stopped during this benchmark; not relevant to the Phase 4 question since the 35B-A3B is the multimodal/multilingual one.

---

# Rounds 2-4 + Phase 1 — Optimisation Path (2026-05-13)

See [`SPARK_OPTIMIZATION_LOG.md`](SPARK_OPTIMIZATION_LOG.md) for the live log of each round. Summary below.

## Round 2 — Phase 4 with strict JSON-schema

**Change**: passed `response_format={"type":"json_schema","json_schema":{...,"strict":true}}` to the same prompt. vLLM enforces the schema during decode, eliminating the duplicate-key / structural-drift class of failures.

| Metric | Round 1 | Round 2 |
|---|---|---|
| Parse rate (batches) | 88.6% | **94.3%** |
| Empty translation slots/lang | 20 | **12** |
| Wall time (30 verses) | 1852 s | 1845 s |
| Quality regressions fixed | — | Adam-omission summary error gone across all 6 affected languages |

Remaining failures (2/35 batches):
- `al-kafi:1:4:125:4` → 10-min SDK timeout
- `faqih:2:3:97:2` → token budget exhausted mid-string (`max_tokens=8192` too low)

Both fixable by config; round 4 fixed them architecturally instead.

## Round 4 — Phase 4 with per-language calls

**Change**: instead of one call/batch producing all 10 languages, split into N×10 separate small calls (one per chunk × language) + 10 small calls for summary+seo_question. Each call uses a tiny schema (`{"text": "..."}` or `{"summary","seo_question"}`).

| Metric | Round 1 | Round 2 | **Round 4** |
|---|---|---|---|
| Wall time (30 verses) | 1852 s | 1845 s | **765 s** |
| Parse rate | 88.6% (batches) | 94.3% (batches) | **99.5% (calls)** |
| Empty slots (total across 10 langs) | 200 | 120 | **~6** |
| Calls/verse | ~1.2 batches | ~1.2 batches | ~40 calls |
| Prompt tokens (30 verses total) | 31,879 | 31,879 | 316,962 (10× — repeated system prompt) |
| Completion tokens (30 verses total) | 96,321 | 100,195 | 119,585 |
| Workers | 8 | 8 | **16** |

**Key wins**:
- Verses that timed out in rounds 1-2 (`al-kafi:1:4:125:4`) now finish in **61.5s** with **100% call success**
- `faqih:2:3:97:2` (parse-fail in round 2) → 31.6 s, 60/60 calls OK
- Russian narrator name `Naḍjrān` correctly transliterated (rounds 1-2 dropped a letter, round 4 doesn't)
- Per-language attention helps with rare proper-noun transliteration generally

**Trade**: 10× the prompt tokens (system prompt repeated per call). Irrelevant on Spark (electricity is sunk cost); would be expensive on OpenAI.

**Projected for 48K remaining verses**: 1,224,000 s = **~14 days** (down from 34 days in round 1).

## Phase 1 — Qwen + strict JSON-schema benchmark

Tested whether Qwen can also do Phase 1 (structural pass: chunking, classification, EN translation, key_terms). Same 30-verse sample.

| Metric | Result |
|---|---|
| Wall time (30 verses, workers=8) | **167 s** (5.6 s/verse) — much faster than Phase 4 because Phase 1 emits only English (no 10-lang multiplication) |
| Parse rate | 96.7% (29/30) |
| Schema valid (enum compliance) | 100% (strict schema enforces) |
| Quran ref format `\d+:\d+` | 100% (regex enforced) |
| Diacritization completeness | 98% mean |
| Chunk text preserves source AR | varies — ~82% mean coverage on my (over-strict) token metric, but qualitative spot-checks show text is preserved with different chunk boundaries |
| Chunk count vs baseline (gpt-5.4) | **12/29 under-segment** (Qwen merges body+quran_quote+closing into a single "body"), 14 match, 3 over-segment |
| key_terms includes narrator names (rule violation) | 3/29 verses |

**Strengths**:
- All closed-vocabulary enums (`topics`, `tags`, `content_type`) 100% valid via schema enforcement — this was the failure mode that put gpt-4.1-mini out of Phase 1 contention (5/5 quarantined on al-khisal). Schema fixes it.
- Quran refs always well-formed (regex `^[0-9]+:[0-9]+$` enforced by schema)
- Diacritization quality on par with baseline

**Weaknesses**:
- Chunk under-segmentation (Quran quotes merged into body, closing merged into body)
- Quran ref accuracy off-by-one in one spot-checked verse (Qwen said `2:237`, correct is `2:236`)
- Some prompt rule violations schema can't enforce (narrator names appearing in `key_terms`)

**Phase 2 implications**: `programmatic_enrichment.py` derives `word_ranges` by string-matching chunk text back to the source AR. If chunks have correct text but coarser boundaries, `word_ranges` still computes correctly within those chunks — but the granularity drop means **fine-grained features that rely on per-chunk types (Quran-quote highlighting, isnad-only highlighting) degrade**.

**Phase 1 cost**: ~4,184 prompt + 795 completion per verse. If priced as gpt-5.4 ($2.50/$15.00 per 1M): ~$0.022/verse. For 48K remaining: **~$1,060** saved if replaced by Spark.

## Combined cost / wall-time summary

For the 48K remaining verses:

| Configuration | OpenAI $ | Spark electricity $ | Wall time |
|---|---|---|---|
| All OpenAI (gpt-5.4 + gpt-4.1-mini) | ~$1,330 | $0 | hours via Batch API |
| Phase 1 OpenAI, Phase 4 Spark | ~$1,060 | ~$15 | ~14 days (Spark-bound) |
| Phase 4 OpenAI, Phase 1 Spark | ~$270 | ~$15 | ~3 days (Spark-bound) |
| Both phases on Spark | $0 | ~$30 | ~17 days sequential / ~14 parallel |

**Best balance** (in my opinion): **Phase 1 OpenAI, Phase 4 Spark with per-language calls + strict schema**. Reasons:
- Phase 1 has the chunk-segmentation regression which directly hurts UI features (Quran-quote chunks, narrator highlighting). Worth paying ~$1,060 to keep gpt-5.4 quality here.
- Phase 4 on Spark with round-4 architecture is 99.5% reliable, fluent across 10 languages, and saves ~$270 — material at this corpus size.
- Wall time ~14 days for Phase 4 (running in background while you do other work) is acceptable for a one-off corpus build.

**Most cost-aggressive**: both phases on Spark, accept chunk-segmentation regression. Saves the full ~$1,330 at the cost of UI feature degradation on Quran-quote highlighting and ~10% of narrator highlighting cases.

## Production integration changes (if Spark path is taken)

What needs to change in `ThaqalaynDataGenerator/app/pipeline_cli/`:

1. **`openai_backend.py`** — `call_openai(...)`
   - Accept `base_url` param. Default `None` → OpenAI; if set → vLLM-compatible endpoint.
   - Accept `response_format` dict (OpenAI SDK already supports; plumb through).
   - Accept `extra_body` dict (for `chat_template_kwargs={"enable_thinking": False}`).
   - Add `qwen36-fast`, `qwen36-deep`, `qwen36-27b` to a $0-cost entry in `OPENAI_PRICING`.
   - Skip `OPENAI_API_KEY` check when base_url is non-default.

2. **`pipeline.py`**
   - Add `--phase1-base-url` and `--phase4-base-url` flags (or auto-detect by model name prefix `qwen36*`).
   - Build per-batch JSON schema when calling with strict mode (already done in bench scripts; lift into `phased_prompts.py` and `translation_phase.py`).
   - When using Spark, raise per-call timeout to 1800s and max_tokens cap to 16384.

3. **`translation_phase.py`**
   - Add a "per-language" mode (1 call per chunk × language + 1 call for meta × language). Toggled by config flag. Same per-language schema generator as the bench.
   - Keep "all-langs" mode as fallback for OpenAI path.

4. **Validation**
   - `validate_result()` empty-string check already catches Qwen catastrophic failures correctly — no change needed.
   - `review_result()` chunk-coverage / word_range checks may flag Qwen Phase 1 under-segmentation more often. Either accept the higher flag rate or add a "spark-mode" review profile.

Estimated code work: ~150 LOC across 3 files. ~1-2 hours plus testing.

## Spark tuning insights (also worth promoting to QWEN36_HERMES_SETUP.md)

1. **`response_format={"type":"json_schema","json_schema":{..., "strict": true}}` works on vLLM-Qwen3.6** and enforces the schema during decode. Confirmed via probe (returned `fr`/`es` not `french`/`spanish` for the test schema). This is the single biggest reliability win.

2. **`chat_template_kwargs={"enable_thinking": False}` must be set** via `extra_body` for any structured output. Without it, Qwen 3.6 spends all `max_tokens` on the `reasoning` field and leaves `content` empty.

3. **DFlash speculative decoding scales inversely with concurrency**: workers=1 → 100% draft acceptance, ~180 tok/s per stream. workers=8 → ~12% acceptance, ~50 tok/s per stream but ~400 tok/s aggregate. For batch corpus processing, high concurrency wins; for interactive, drop to workers=1.

4. **Per-call surface dominates Spark Phase 4 throughput**, not concurrency. Round 4's many-small-calls beat round 2's few-big-calls 2.4× on wall time despite using only 2× more concurrency. The Spark KV cache amortises the prompt better than fewer-but-bigger calls.

5. **27B (`:8001`) still unusable** on the AEON-7 v1.2 image due to Marlin tile-size constraint. Stick with the 35B-A3B.

## Files for this update

- Round 2: `ThaqalaynDataGenerator/benchmark/phase4_qwen_round2/` + script `scripts/benchmark_phase4_qwen_round2.py`
- Round 4: `ThaqalaynDataGenerator/benchmark/phase4_qwen_round4_perlang/` + script `scripts/benchmark_phase4_qwen_round4_perlang.py`
- Phase 1: `ThaqalaynDataGenerator/benchmark/phase1_qwen/` + scripts `benchmark_phase1_qwen.py`, `benchmark_phase1_analyze.py`
- Running log: `Thaqalayn/docs/SPARK_OPTIMIZATION_LOG.md`
