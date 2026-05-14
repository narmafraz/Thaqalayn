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
