# Path B — Spark Translation Round Log

> Tracks each experiment round of the Spark Qwen36-fast translation of
> lemmas + surfaces (`Thaqalayn/docs/WORDS_PROJECT_PLAN.md` "Path B").
> One section per round; mirrors `SPARK_OPTIMIZATION_LOG.md` Rounds A-J
> pattern.

**Pilot set** (locked in `ThaqalaynWordSources/translation/pilot_set.json`,
`random.seed(20260514)`):
- 100 lemmas across 6 strata (30 hi-freq content / 30 mid / 20 low /
  10 function words / 5 classical religious / 5 proper nouns)
- 100 surfaces across 6 strata (30 hi / 30 mid / 20 low /
  10 with clitics / 5 inflections of religious lemmas / 5 proper-noun surfaces)

**Scoring rubric** (per round):
- Parse rate (automated)
- Validation issues by category (automated: script sanity, length, missing langs)
- Gloss quality 5-point eyeball on ~20 random items across 4-5 languages
- Homograph correctness (إِلَى and similar)
- Lemma-surface consistency (surfaces compose from lemma's translations)

---

## Round 1 — Lemma baseline

**Date:** 2026-05-14
**Pass:** lemma
**Prompt:** Wiktextract en_gloss + POS + Lane's body (full, truncated to first 1500 chars in the renderer). No classical_definitions, no corpus context.
**Backend:** Spark Qwen 3.6-35B (`qwen36-fast`), strict json_schema with named ASCII language properties, `max_output_tokens=300`, concurrency 8, `chat_template_kwargs.enable_thinking=False`.
**Output dir:** `ThaqalaynWordSources/translation/lemma_responses/round-1/`

### Headline metrics

| Metric | Value |
|---|---|
| Items | 100 |
| Parse rate | **100%** (100/100) |
| Validation issues | **0** |
| Mean latency | 5.0 s/item |
| Wall time | 75 s end-to-end |
| Tokens | 77.5K in / 12.2K out (avg 775/122 per lemma) |

### Quality scoring (eyeball, 23 items)

| Stratum | Sampled | Score | Notes |
|---|---|---|---|
| Classical religious | 5 | **5/5** | وِلايَةٌ→guardianship, زَكاةٌ→almsgiving (transliterated correctly in non-Latin: زکات/زکوٰۃ/zekât/закят/天课), جِهادٌ→struggle, صَلاةٌ→prayer (localized as نماز in fa/ur — culturally accurate), إِيمانٌ→faith |
| Function words | 5 | **5/5** | ماذا→what, كَأَنَّما→as if, فِيما→in what, ذٰلِكَ→that, لَوْلا→if not for |
| Hi-freq content | 5 | **5/5** | قَالَ→to say, رَجُلٌ→man, وَلَدٌ→child, أَتَى→to come, رَكْعَةٌ→prayer unit |
| Low-freq content | 3 | **5/5** | سَكِينَةٌ→tranquility (correctly catches the Quranic sense), تَشَمَّمَ→to sniff, مُشْرِفٌ→supervisor |
| Proper nouns | 5 | **4/5** | كَعْبَةٌ→Kaaba ✓; عامِر→Aamir (transliterated, correct); حَزِيران→June (Levantine month name, correct); دانِيال→Daniel ✓ in en/tr/de/ru/zh but **wrong** in fa ("دانیه" instead of دانیال) and ur ("دانیاں" instead of دانیال); كابُل→Kabul ✓ |

Overall mean: **≥4.8 / 5**. Substantially above the ≥3.5 go/no-go threshold.

### Issues found

1. **Whitespace leakage**: a few outputs have a leading space (e.g. tr=" sanki" for كَأَنَّما). Cosmetic — will be `.strip()`-ed by the merger before persistence.
2. **Proper-noun localization on rare names**: دانِيال (Daniel) returned an abbreviated/wrong Arabic-script spelling in Persian + Urdu. Same name was correct in 5 other languages. Suggests Qwen has weaker knowledge of rare proper-noun transliteration into related-script languages — Round 2 could try adding Wiktextract proper-noun hints or a few-shot exemplar.

### Decision

**PASS.** Lock the Round 1 prompt as the baseline. Two follow-ups:
- Wire `.strip()` into the merger to absorb the whitespace cosmetic issue.
- Defer proper-noun localization fix to Round 2 (low-impact issue; 0.4% of pilot).

Proceeding to Round 2 (lemma prompt A/B: + classical_definitions on the
14.7% of lemmas that have it).

### Sample outputs (full glosses for review)

**Classical religious — وِلايَةٌ:**
```
en: guardianship    fa: ولایت        ur: ولایت
tr: velayet         id: kepemimpinan bn: অভিভাবকত্ব
es: tutela          fr: tutelle      de: Herrschaft
ru: попечительство  zh: 监护
```

**Function word — لَوْلا:**
```
en: if not for      fa: اگر نه       ur: اگر نہ
tr: olmasaydı       id: jika tidak   bn: যদি না হয়
es: si no fuera     fr: sinon        de: wäre nicht
ru: если бы не      zh: 若非
```

**Hi-freq verb — قَالَ:**
```
en: to say          fa: گفتن         ur: کہنا
tr: söylemek        id: berkata      bn: বলা
es: decir           fr: dire         de: sagen
ru: говорить        zh: 说
```

---

## Round 2 — Lemma prompt + classical_definitions

**Date:** 2026-05-14
**Pass:** lemma (A/B against Round 1)
**Prompt change:** appended hawramani `classical_summary` (top-3 classical-lexicon entries, HTML-stripped, capped at 3,000 chars) to lemmas that have it. Same 11-lang ASCII-key schema otherwise.
**Output dir:** `ThaqalaynWordSources/translation/lemma_responses/round-2/`

### Headline metrics

| Metric | Round 1 | Round 2 | Δ |
|---|---|---|---|
| Items | 100 | 100 | — |
| Parse rate | 100% | **100%** | flat |
| Validation issues | 0 | 0 | flat |
| Mean latency | 5.0 s/item | 5.3 s/item | +6% |
| Wall time | 75 s | 77 s | +3% |
| Input tokens | 77.5 K | **105.7 K** | +36% (extra Lane's-style context) |
| Output tokens | 12.2 K | 12.2 K | flat |

### A/B differences

Out of 100 pilot lemmas, 31 have hawramani classical content (the other 69 produce byte-identical prompts in R1/R2 by construction).

| Class | Count |
|---|---|
| Lemmas where R2 == R1 (no meaningful change) | 83 |
| Lemmas where some language differs | **17** |
| Regressions (R1 was clearly better than R2) | **0** |

**All 5 classical-religious pilot lemmas are R1==R2** because they were in the top-frequency tier the hawramani scrape paused before reaching (14.7% coverage is concentrated mid-tier, not at the absolute top). Future hawramani re-scrape would change this.

### Notable R1→R2 quality shifts

| Lemma | Lang | R1 | R2 | Verdict |
|---|---|---|---|---|
| ذَكَرَ | fa | ذکر کردن | یاد کردن | **R2 better** — corpus uses dhikr in the "remember/invoke" sense |
| ذَكَرَ | id | menyebut | mengingat | **R2 better** — same rationale |
| ذَكَرَ | bn | উল্লেখ করা | স্মরণ করা | **R2 better** — same rationale |
| عُمْرٌ | en | "long life" | "life" | **R2 better** — simpler, more idiomatic |
| خَلْقٌ | tr | yaratma (act of creating) | yaratılış (creation/nature) | **R2 better** — noun form aligns with خَلْقٌ as noun |
| لَسْنَ | en | "to not be" | "not to be" | tie — both idiomatic |
| وَلَدٌ | bn | শিশু (child) | সন্তান (offspring) | tie — both correct |

### Decision

**Adopt Round 2** (`--include-classical` is now the default for the lemma pass). The improvement is modest but real — ~5 of 100 lemmas got a meaningfully better translation in one or more languages — and there are no regressions. The 36% input-token cost is $0 on Spark and only adds 2-3 seconds per item in latency, which scales fine to the 13K-lemma corpus run.

### Outstanding from Round 1 (still open)

- **Proper-noun localization** (دانِيال→Daniel weak in fa/ur): R2 didn't address it because the affected lemmas don't have classical content. Deferred to **Round 5** (tough-case spot check + targeted prompt patch).

### Next: Round 3 — surface baseline.

---

## Round 3 — Surface baseline

**Date:** 2026-05-14
**Pass:** surface (first surface run)
**Inputs per item:**
- `surface_ar` + lemma_ar + pos_label
- `clitic_breakdown` (rendered via `CLITIC_CODE_LABELS`)
- `lemma_translations` — anchor pulled from Round 2 lemma responses
- lemma's en_gloss + lane_body
- (no corpus context windows yet — that's Round 4)
**Pre-pass:** translated 78 supplementary lemmas (the lemma_slugs the 100 pilot surfaces reference but weren't in the original 100-lemma pilot) so 100/100 surfaces had a lemma anchor.

### Headline metrics

| Metric | Value |
|---|---|
| Items | 100 |
| Parse rate | **100%** |
| Validation issues (original validator) | 0 |
| Validation issues (enhanced validator — see below) | **2** (cross-script leaks) |
| Mean latency | 4.56 s/item |
| Wall time | 70 s |
| Tokens | 81.6 K in / 12.5 K out |

### Quality scoring (eyeball, 24 items across strata)

| Stratum | Sampled | Score | Notes |
|---|---|---|---|
| Compounds with clitics | 5 | **4/5** | يَمِينُكَ→your right side ✓, الْهَارِبِ→the fugitive ✓, لَنَسِيٌّ→indeed forgetful ✓, فَكَظَمْتُ→so I restrained ✓. آجُرَّةٍ wrongly translated as "to run to him" — root cause is upstream CAMeL mis-lemmatization (آجُرَّةٌ "brick" got mapped to lemma جَرَى "to run"); Qwen translated faithfully against the bad anchor. Garbage-in/garbage-out, not Spark's fault. |
| Inflections of religious lemmas | 5 | **5/5** | Outstanding consistency: لِوَلَايَةِ→for guardianship, بِوِلَايَتِنَا→by our guardianship, وِلَايَتِهِ→his guardianship, وَالصلاة→and the prayer, أَيْمَاناً→faiths. Surface composes from the lemma anchor cleanly across all 11 langs. |
| Proper-noun surfaces | 5 | **5/5** | لِلْكَعْبَةِ→to the Kaaba, عَامِرٍ→Amir (genitive correctly mapped to base name), حَزِيرَانَ→June, all transliterated correctly |
| Hi-freq | 3 | **2/3** | ثُمَّ→then ✓, حَدَّثَنَا→he narrated to us ✓. **وَ→Spanish slot has Bengali "এবং"** — cross-language leak found. Validator caught it after enhancement (see below). |
| Low-freq | 3 | **3/3** | بِثَوَابٍ→with reward, رُطَبٌ→fresh ripe dates, وَشَاهِدَهُ→and his witness — all correct |

Overall mean ≥4.6/5.

### Two real bugs found + validator enhancement

The original validator (Latin-letters-in-non-Latin-script check) missed two cross-language leaks. **Enhanced** to also assert each gloss contains characters of its expected primary script:

```python
# new check: each gloss must contain at least one char from
# {Latin (en/tr/id/es/fr/de), Arabic (fa/ur), Bengali (bn),
#  Cyrillic (ru), CJK (zh)}.
# Exempts digit-only outputs (e.g. surface "٤٤٩٣" → "4493")
```

After the fix, full Round 3 re-validation found **2 cross-script leaks**:

| Surface | Lang | Bad gloss | Correct should be |
|---|---|---|---|
| وَ (~50K occurrences) | es | "এবং" (Bengali) | "y" |
| وَالْحَبَشَةُ (1 occurrence) | tr | "حبش" (Arabic) | "ve Habeşistan" or similar |

3 new tests added to guard regression. 26/26 spark_translation tests pass.

### Lemma-surface consistency

For the 5-item religious-inflection stratum (perfectly homogeneous lemmas), surfaces consistently share root vocabulary with their lemma across all 11 languages. Example: every form of وِلَايَة → guardianship/ولایت/velayet/tutela/etc. The lemma anchor is doing its job.

### Decision

**PASS** with caveats: surfaces baseline quality is high (≥4.6/5), parse rate is perfect, and lemma-anchoring works as intended. Two real cross-script leaks at 2/100 = 2% rate, now detected by the validator. Lock the Round 3 prompt as the surface baseline; proceed to Round 4 (corpus context A/B).

The CAMeL mis-lemmatization issue (آجُرَّةٌ→جَرَى) is upstream and out of scope for Path B — it would need a re-build of `ThaqalaynWords/surfaces/*.json` with improved morphological analysis. Filed as a Track D issue.

### Next: Round 4 — surface + corpus context windows A/B.

---

## Round 4 — Surface + corpus context windows

**Date:** 2026-05-14
**Pass:** surface (A/B against Round 3)
**Prompt change:** appended up to 3 ±10-word corpus windows per surface, pre-extracted from `ThaqalaynData/books/{path}.json` for each surface's `occurrence_paths`. Pipeline: `scripts/extract_corpus_contexts.py` writes `surface_contexts.json`; the surface-extractor's new `--corpus-contexts` flag feeds it into the JSONL.
**Output dir:** `ThaqalaynWordSources/translation/surface_responses/round-4/`

### Headline metrics

| Metric | Round 3 | Round 4 | Δ |
|---|---|---|---|
| Items | 100 | 100 | — |
| Parse rate | 100% | **100%** | flat |
| Mean latency | 4.6 s | 4.5 s | -2% |
| Wall time | 70 s | 66 s | -6% |
| Input tokens | 81.6 K | 94.3 K | **+16%** (extra context) |
| Output tokens | 12.5 K | 12.4 K | flat |
| Validator issues | 2 | **1** | -1 |
| Corpus context coverage | n/a | 76/100 | — |

### A/B differences (R3 → R4)

100 pilot surfaces. **33 differ** in at least one language; 67 are identical. Of the 33, the differences split:

| Outcome | Count | Examples |
|---|---|---|
| **Clear improvement** (R4 fixes a real bug) | ~10 | آجُرَّةٍ "to run to him" → "brick" (corpus context overrode bad CAMeL lemma anchor جَرَى "to run") · قَطُّ "cat" → "ever" (Arabic particle, was lemmatized to قِطّ "cat") · أَيْمَاناً "faiths" → "oaths" (Quranic/classical sense) · وَ Spanish "এবং" → "y" (cross-script leak resolved) · وَالْحَبَشَةُ Turkish "حبش" → "ve Habesh" (script-leak resolved) |
| **Stylistic refinement** (both valid; R4 slightly better phrasing) | ~20 | وَشَاهِدَهُ Persian "و شاهدش" → "و شاهد او" (more formal) · فَدَعَاهُمْ Urdu "بلایا" → "دعوت دی" · لِلْكَعْبَةِ Chinese 向 → 到 (preposition variation) |
| **Regression** | 1 | وَالْحَبَشَةُ Chinese "和哈巴什" → "zh" (literal lang code — Qwen glitch) |
| Roughly equivalent / undetermined | ~2 | minor word-order differences |

### Standout: آجُرَّةٍ recovery

This is the headline finding for Round 4. The surface آجُرَّةٍ ("brick", genitive of آجُرَّةٌ) was upstream mis-lemmatized by CAMeL Tools to جَرَى ("to run") — likely a pattern-similarity false positive. Round 3 dutifully translated against that bad anchor and produced "to run to him" in all 11 languages (consistent and wrong). Round 4's corpus context windows showed the surface actually appearing in brick-related contexts, and Qwen overrode the lemma anchor to produce **"brick"** in all 11 langs (الإيت/tuğla/bata/Ziegel/кирпич/砖). This is exactly what corpus context was supposed to fix — and validates it as a generally useful technique for handling upstream morphological-analysis errors, which we expected (the lemma_slug references on `morphology` are CAMeL's best guess, not ground truth).

### Quality scoring delta vs Round 3

| Stratum | R3 | R4 | Δ |
|---|---|---|---|
| Compounds with clitics | 4/5 | **5/5** | +1 (آجُرَّةٍ recovered) |
| Inflections of religious | 5/5 | 4-5/5 | small drift on أَيْمَاناً ("oaths" vs "faiths" — Quranic context-dependent; corpus-anchored translation is arguably more accurate to actual usage) |
| Proper-noun surfaces | 5/5 | 5/5 | flat |
| Hi-freq | 2/3 | **3/3** | +1 (وَ Spanish fixed) |
| Low-freq | 3/3 | 3/3 | flat |

Overall mean: ≥4.7 / 5, up from R3's ~4.6.

### Decision

**Adopt Round 4 prompt** (corpus contexts ON) as the locked surface-pass prompt. The wins on polysemous lemmas and upstream-mis-lemmatized surfaces (آجُرَّةٍ, قَطُّ) significantly outweigh the one Chinese regression (which is a rare Qwen JSON-emit glitch we can either retry or filter at merge time).

For the full corpus run: extract corpus contexts for **all 102K surfaces** (a one-time ~10 min walk over ThaqalaynData), then run the surface pass.

### Next

- Round 5 spot-check **deferred** — Rounds 1-4 already identified all the systematic issues and the validator now catches script leaks. Remaining open issue (proper-noun localization on rare names like دانِيال) is too narrow to warrant a dedicated round; it'll be revisited if/when we see it at scale.
- Build the merger script (folds round-2 lemma responses + round-4 surface responses back into `ThaqalaynWords/{lemmas,surfaces}/{slug}.json`).
- Kick off full corpus runs: lemmas (~1 h Spark), surfaces (~9-11 h Spark).

---
