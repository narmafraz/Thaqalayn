# ThaqalaynWords — Per-Word Pages Project Plan

**Status:** **Sessions 1 + 2 complete.** Per-word data API live at <https://thaqalaynwords.netlify.app/>. Full Angular UI shipped (`/words` browse, surface/lemma/root pages, in-verse word-by-word view on every hadith with lazy-loaded morphology + clickable popups). Free-data enrichment partly done (Lane's body parsing complete; hawramani multi-lexicon aggregator covers top ~15% of lemmas; rest blocked on rate-limiting). Temporary English-only gloss-on-index ("Path C") rolled out 2026-05-13 so every word card shows a translation; it is explicitly throwaway and reverts when Path B (LLM translations) lands. **Outstanding:** Path B (10-language LLM translation of lemmas), the gloss tooltip-truncation issue (deferred), and the small Track D polish items.
**Created:** 2026-05-10
**Last updated:** 2026-05-13 (Track A complete + Path C temporary glosses + UI polish round)
**Owner:** Sadegh Shahrbaf

## Vision

Build a per-word Arabic dictionary for the Thaqalayn corpus where every unique
word that appears in any narration has its own page with rich, scholarly content
— similar in spirit to the existing `/people/narrators/{id}` pages but for
vocabulary rather than people. Every word in a verse becomes clickable, taking
the reader to a dedicated page covering definition, etymology, root, derivations,
example usages, classical lexicon entries, and multilingual translations.

This resurrects and substantially expands the dormant word-dictionary
infrastructure described in `ThaqalaynDataGenerator/scripts/V4_PIPELINE_PLAN.md`
"Phase 7 step 3" (translations only) into a full per-word knowledge system.

## Why this is worth doing

1. **Lazy-loaded word data.** Per-narration `word_analysis` becomes obsolete:
   the chunk renderer derives a word's slug, fetches the word's JSON on demand,
   shows whatever is needed in-context. Removes per-narration duplication of
   word-level data while making each word's content dramatically richer than
   what we ever embedded inline.

2. **One-shot processing economics.** ~50K unique surface forms across the
   current corpus (~686K tokens total). After lemmatization ~8-15K unique
   lemmas. Process each lemma once via LLM batch + scrape from public-domain
   sources, then any number of narrations that use the lemma get the same data
   for free. Mirrors how the canonical narrator registry works.

3. **Strong learner UX.** A reader hovering or clicking on وَقَالَ in a hadith
   instantly gets: lemma قَالَ, root ق-و-ل, "to say (Form I verb)", classical
   definitions from Lane/Lisan, conjugation table, Quranic parallel usages, etc.

4. **SEO win.** ~10K dictionary pages per major lemma → significant indexable
   content, search-engine entry points for users searching for Arabic words.

## Scale (measured, 2026-05-10)

Counted across all v4 corpus responses:
- **686,003** total tokens (with duplicates)
- **71,437** unique diacritized surface forms
- **49,099** unique normalized forms (alif/ya unified, diacritics stripped)
- **Estimated 8,000–15,000 unique lemmas** after CAMeL Tools lemmatization
  (typical compression: ~5× from surface forms to lemmas for Arabic)
- **Estimated 2,000–3,000 unique tri/quadliteral roots** (the historical
  lexicon-organization unit; multiple lemmas per root)

Corpus will grow when Bihar al-Anwar, Mir'at al-Uqul, etc. land — the unique-
lemma count grows sublinearly because most new narrations reuse vocabulary.

## Word identity model

Two-tier identity (locked 2026-05-10):

| Tier | Granularity | URL | Slug |
|---|---|---|---|
| **Surface form** | Exact token as written in chunk (e.g. وَقَالَ) | `/words/{surface}` | The diacritized Arabic surface form itself, NFC-normalized |
| **Lemma** | Dictionary form (e.g. قَالَ) | `/words/lemmas/{lemma}` | The diacritized Arabic lemma itself, NFC-normalized |

**Decision:** every unique surface form gets its own page (~50K pages,
lightweight). Each surface page references its constituent lemma(s) and
lazy-loads their full content from `/words/lemmas/{lemma}.json`. Heavy
content (definitions, etymology, classical lexicon entries, conjugation
table, etc.) lives once per lemma; surface pages are small composition
views.

**Slug = the diacritized Arabic word itself.** Filenames and URLs use the
Arabic text directly (UTF-8 on disk, percent-encoded in HTTP). The UI
derives the slug trivially from any chunk's surface form by applying
NFC Unicode normalization — no lookup, no transliteration coordination
needed. Same function on generator and UI sides:

- Python (generator): `unicodedata.normalize('NFC', surface_form)`
- TypeScript (UI): `surface_form.normalize('NFC')`

A shared 1000-form fixture test asserts both implementations produce
byte-identical output. NFC is required because Arabic Unicode allows
multiple representations of the same character (e.g. `لا` as a ligature
vs the two-codepoint sequence `ل + ا`; shadda+vowel as combined codepoint
vs sequence). Without normalization, the same word might miss its own page.

**Compound surfaces** (Arabic clitics — e.g. `وَبِالْعَهْدِ` = wa- + bi- + al-
+ stem `عَهْد`) are decomposed by CAMeL Tools at generation time. The
surface page lists each component as a card linking to its respective
lemma page; each card lazy-loads the lemma JSON when displayed.

## Per-word page content

Every lemma page includes:

### Tier 1 — Always present, low cost

| Field | Source |
|---|---|
| Lemma (diacritized) | CAMeL Tools / corpus extraction |
| Surface forms list | Computed from corpus occurrences |
| Transliteration | LLM or rule-based (Buckwalter from CAMeL) |
| Root (Arabic letters) | CAMeL Tools |
| POS | CAMeL Tools (real, not placeholder) |
| Verb form (I-X) / noun pattern | CAMeL Tools |
| 11-language translations | LLM batch (one-shot per lemma) |
| Frequency in corpus | Computed |
| Example occurrences | Computed (top N narrations using the lemma, with chunk excerpts) |

### Tier 2 — Rich content, medium cost

| Field | Source |
|---|---|
| Definition / sense paragraph (English) | LLM, with context of corpus usage |
| Conjugation table (verbs) | CAMeL Tools generator + LLM polish |
| Plural forms (nouns) | CAMeL Tools |
| Synonyms / antonyms | LLM + Wiktionary cross-reference |
| Idioms / collocations | LLM extraction from corpus + general knowledge |
| Related lemmas (same root) | Computed from extraction |

### Tier 3 — Scholarly, high cost

| Field | Source |
|---|---|
| Lane's Lexicon entry | Scrape from public-domain digital editions |
| Mufradat al-Quran entry (when applicable) | Scrape from arabiclexicon.hawramani.com |
| Lisan al-Arab entry | Scrape from public-domain text |
| Hans Wehr entry | Licensing-sensitive — link out only |
| Classical Quranic concordance | Quranic Arabic Corpus dataset |
| Hadith-specific usage commentary | LLM with corpus context |
| Shia scholarly notes (Imami lexicons) | LLM + curated sources where available |
| Etymology / cognates in Semitic family | LLM + Wiktionary |

### Tier 4 — Advanced, optional

| Field | Source |
|---|---|
| Audio pronunciation | TTS service, one-shot |
| Stress / phonetic IPA | CAMeL Tools `caphi` field |
| Statistical co-occurrences | Computed from corpus |
| Cross-references to /people/narrators/ where word appears in chains | Computed |

## Data sources audit (researched)

### Free + machine-readable + permissive license

1. **Wiktextract / Kaikki.org** ([kaikki.org/dictionary/Arabic](https://kaikki.org/dictionary/Arabic/index.html)).
   Wiktionary Arabic dump in JSONL format. Includes lemmas, inflected forms,
   translations, etymology, usage examples, pronunciation. Updated weekly.
   **Best primary source for translations + etymology + cognates.**

2. **Quranic Arabic Corpus** ([corpus.quran.com](https://corpus.quran.com/download/)).
   Free download (email required). Word-by-word morphology for the entire
   Quran: root, lemma, POS, form, gender, number, case, gloss. ~78K word
   tokens covering most of the high-frequency Quranic vocabulary that overlaps
   with hadith corpus. Schema is documented; a fork on GitHub
   ([mustafa0x/quran-morphology](https://github.com/mustafa0x/quran-morphology))
   has v0.4.

3. **Lane's Arabic-English Lexicon** ([Lane Lexicon](https://lanelexicon.com/),
   [arabiclexicon.hawramani.com](https://arabiclexicon.hawramani.com/william-edward-lane-arabic-english-lexicon/)).
   **Public domain.** XML source from Perseus Digital Library. Multiple
   digitized text versions on Internet Archive. ~47K entries on
   [laneslexicon.com](https://www.laneslexicon.com/). Classical, scholarly,
   THE canonical English-language Arabic lexicon for traditional usage.
   **Best primary source for classical definitions.**

4. **Mufradat al-Quran (al-Raghib al-Isfahani)**.
   Available digitised on [arabiclexicon.hawramani.com](https://arabiclexicon.hawramani.com/).
   ~121 specifically-Quranic terms with exegetical interpretation. **Apply
   selectively — only ~120 lemmas have an entry, but those are high-value
   theological/Quranic-specific words.**

5. **Lisan al-ʿArab (Ibn Manẓūr)**.
   Public domain. Available as Word/PDF on
   [archive.org](https://archive.org/details/lisanal-arab) and other sources.
   The most comprehensive classical Arabic dictionary. Tens of thousands of
   entries. Organized by root.

6. **CAMeL Tools** ([camel-tools on PyPI](https://pypi.org/project/camel-tools/)).
   Python package, MIT/Apache. Local morphological analyzer. Outputs:
   `diac, lex, caphi, gloss, bw, pos, root, pattern, gen, num, cas, ...`.
   This is THE local-compute primary source for POS / lemma / root /
   morphology / phonology — replaces the placeholder "N" POS entirely.
   Real POS unlocks correct downstream behaviour (key_terms filter, etc.).

### Free but copyright-sensitive

7. **Hans Wehr Modern Written Arabic Dictionary**.
   Copyrighted (1979/1994). Multiple unofficial digital versions exist
   ([hanswehr.app](https://hanswehr.app/),
   [GibreelAbdullah/HansWehrDictionary GitHub](https://github.com/GibreelAbdullah/HansWehrDictionary)).
   **Approach:** link out (e.g. `Look up in Hans Wehr →`) rather than embed.
   Don't redistribute the data ourselves.

8. **Almaany.com**.
   Multilingual Arabic dictionary with 11+ languages. No public API.
   ToS likely prohibits scraping. **Skip — use Wiktionary's translations
   instead, which serves the same multilingual need with permissive licensing.**

### LLM-synthesized

9. **GPT-5.4 / Claude** for synthesized scholarly prose.
   When we want a sense-disambiguating definition specific to hadith corpus
   usage, an LLM summarizing the scraped sources + corpus example usages is
   the best fit. Cost: ~$0.05-0.20 per lemma for rich synthesis = $400-1500
   for 8K-15K lemmas.

### Sources to investigate later

- **OpenITI** (Open Islamicate Texts Initiative) — large corpus project, may
  have classical lexicon data in TEI XML.
- **Ejtaal.net** — combined Mawrid Reader interface to Hans Wehr + Lane + others.
- **Iqraonline.net** — Shia-perspective Quranic studies, has a list of
  [important Arabic dictionaries](https://iqraonline.net/list-of-important-arabic-dictionaries-for-quran-and-hadith-studies/)
  that may name additional Imami lexicons worth scraping.

## Repo decisions (locked 2026-05-10)

Five-repo ecosystem: existing three plus two new (`ThaqalaynWords` and
`ThaqalaynWordsSources`). Words project keeps DataSources untouched.

| Concern | Decision |
|---|---|
| **Generator** | **Reuse `ThaqalaynDataGenerator`.** Add an `app/words/` module. Reuses existing config, logging, OpenAI backend, JSON encoders, narrator-registry pattern. One Python venv covers everything. |
| **Raw data + LLM responses** | **New `ThaqalaynWordsSources` repo.** Holds raw scraped lexicon dumps + LLM responses per lemma. Keeps the existing `ThaqalaynDataSources` (2.5 GB) untouched — the hadith corpus and word corpus grow independently and have very different cadences. |
| **Generated served output** | **New `ThaqalaynWords` repo + Netlify deployment.** Cleanly separates the words content product (~250-700 MB) from the existing ThaqalaynData. The Angular app fetches from `https://thaqalaynwords.netlify.app/...` for word data, the same way it fetches from `thaqalayndata.netlify.app` for verse data today. |
| **UI** | (existing) `Thaqalayn` — gains a `WordsService` + word-page route + verse-link integration. |

### `ThaqalaynWords` repo layout

```
ThaqalaynWords/
├── surfaces/
│   ├── وَقَالَ.json        ← /words/{surface} navigates here (~50K files)
│   ├── قَالَ.json
│   └── ...
├── lemmas/
│   ├── قَالَ.json          ← lazy-loaded by surface pages (~10K files)
│   ├── عَهْد.json
│   └── ...
├── index/
│   ├── surfaces.json       ← browse/search index for /words listing
│   └── lemmas.json         ← optional: lemma-side browse
├── serve.py                ← local dev server (mirrors ThaqalaynData)
├── netlify.toml
└── README.md
```

No `/words/` prefix inside the repo — the repo *is* words. Subfolders
reflect content type (surfaces, lemmas, indexes), not namespace.

**URLs:**
- `https://thaqalaynwords.netlify.app/surfaces/{surface}.json`
- `https://thaqalaynwords.netlify.app/lemmas/{lemma}.json`

**Angular data fetch paths:**
- `WordsService.getSurface(surface)` → `${WORDS_API}/surfaces/${surface}.json`
- `WordsService.getLemma(lemma)` → `${WORDS_API}/lemmas/${lemma}.json`

**Angular user-facing routes** (independent of fetch paths):
- `/words/{surface}` — surface page (the route a clicked word in a chunk navigates to)
- `/words/lemmas/{lemma}` — lemma page (linked to from a surface card or browse index)

### `ThaqalaynWordsSources` repo layout

```
ThaqalaynWordsSources/
├── lemmas/
│   ├── قَالَ.json          ← raw LLM response per lemma (the canonical
│   └── ...                   sacred output, never stripped — mirrors
│                              ThaqalaynDataSources/ai-content/corpus/responses/)
├── surfaces/               ← optional: persist CAMeL Tools morphological
│   └── ...                   analysis per surface form for reuse + audit
└── sources/                ← raw third-party data we depend on
    ├── lanes-lexicon/      ← raw scraped XML/text from Lane's Lexicon
    ├── wiktextract-arabic/ ← Wiktionary Arabic JSONL dump (Kaikki.org)
    ├── quranic-arabic-corpus/  ← v0.4 morphology data (one-time download)
    └── lisan-al-arab/      ← raw scraped/downloaded classical entries
```

Mirrors the `ThaqalaynDataSources/ai-content/` persistence pattern:
LLM responses + scraped data are sacred; lean shipped data is built from
them and lives in `ThaqalaynWords`. The strip-and-reconstruct contract
established for hadith content (`build_lean_ai_content` etc.) carries
over to words (a `build_lean_word_content` will trim Phase-2-derivable
fields when writing to ThaqalaynWords).

## Pipeline architecture

```
┌─────────────────────────┐
│ Existing v4 corpus      │
│ (chunks[].arabic_text)  │
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│ Phase A: Extract        │  Walk all chunks, tokenize, dedup, NFC-normalize
│ extract_unique_words()  │  → corpus_surface_set: dict mapping surface →
│ (already exists ✓)      │    {count, first_path, all_paths[]}
│                         │  This dict is the single source of truth that
│                         │  Phases B & E look up against.
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│ Phase B: Morph analysis │  For each surface form in corpus_surface_set:
│ camel_tools.analyzer    │    Run CAMeL Tools morphological analyzer
│ + .generator            │    → (surface, lemma, root, POS, clitics, …)
│ (new module)            │  Aggregate analyses by lemma to find unique
│                         │  lemmas + their surface form mapping.
│                         │
│                         │  For each unique lemma:
│                         │    Run CAMeL Tools morphological *generator*
│                         │    → full paradigm (~30-50 forms): every
│                         │      conjugation/declension form the lemma
│                         │      could produce, regardless of corpus.
│                         │    For each generated form, look up against
│                         │    corpus_surface_set →
│                         │      in_corpus: bool, count: int|None
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│ Phase C: Source scrape  │  For each lemma:
│ (new scrapers per src)  │   - Wiktionary entry (kaikki.org JSONL)
│                         │   - Lane's Lexicon entry (XML)
│                         │   - Mufradat al-Quran (when applicable)
│                         │   - Lisan al-Arab entry
│                         │  Persist raw scraped data per lemma in
│                         │  ThaqalaynWordsSources/sources/...
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│ Phase D: LLM synthesis  │  For each lemma, send to LLM:
│ (new prompt + module)   │   - lemma + root + POS + paradigm + scraped
│                         │     sources + corpus usage examples
│                         │   - Get back: 11-language translations,
│                         │     definition prose, usage notes, per-form
│                         │     labels (e.g. "he said" / "she said"),
│                         │     hadith-specific commentary, etc.
│                         │  Persist response per lemma in
│                         │  ThaqalaynWordsSources/lemmas/{lemma}.json
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│ Phase E: Build pages    │  For each lemma:
│ (new merger)            │    Merge LLM + scraped + paradigm (with
│                         │    in_corpus/count from Phase B set lookup)
│                         │    → write ThaqalaynWords/lemmas/{lemma}.json
│                         │
│                         │  For each surface in corpus_surface_set:
│                         │    Compute decomposition + occurrence_paths
│                         │    + morphology
│                         │    → write ThaqalaynWords/surfaces/{surface}.json
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│ Phase F: Index pages    │  Build ThaqalaynWords/index/surfaces.json and
│                         │  index/lemmas.json (browse lists with frequency)
└─────────────────────────┘
```

**One-shot per lemma**, like the canonical narrator registry. New corpus
additions only generate work for *new* lemmas (extract_unique_words diffs
against existing index).

**Quarantine + retry** mirroring the verse pipeline: each lemma's LLM step
gets up to 3 attempts. Validate LLM output (required fields, language
coverage, definition non-empty).

## Schema sketch

### `surfaces/{surface}.json` (light, deterministic-slug page)

```json
{
  "index": "وَبِالْعَهْدِ",
  "kind": "word_surface",
  "data": {
    "surface": "وَبِالْعَهْدِ",
    "transliteration": "wa-bi-al-ʿahd",
    "frequency": 47,
    "frequency_rank": 8214,
    "decomposition": [
      {"role": "proclitic", "form": "وَ",   "lemma": "وَ",   "label": "and"},
      {"role": "proclitic", "form": "بِ",   "lemma": "بِ",   "label": "by/with"},
      {"role": "definite_article", "form": "ال", "lemma": "ال", "label": "the"},
      {"role": "stem",      "form": "عَهْدِ", "lemma": "عَهْد", "label": "pact, covenant"}
    ],
    "morphology": {
      "case": "genitive",
      "definite": true,
      "stem_pos": "N",
      "stem_form": "عَهْد"
    },
    "occurrence_paths": [
      "/books/al-kafi:2:5:3:1",
      "/books/al-kafi:1:7:2:4",
      "/books/man-la-yahduruhu-al-faqih:3:2:21:88",
      ...
    ]
  }
}
```

`occurrence_paths` is the **complete** list of narration paths where this
exact diacritized surface form appears (no truncation, no frequency cap).
For the highest-frequency surfaces (e.g. `قَالَ` at ~8400 occurrences), this
gives a ~250 KB raw / ~25 KB gzipped file — acceptable. Snippets are NOT
embedded; the UI fetches `verse_detail` JSONs lazily for the few occurrences
the user wants to preview.

The `lemma` field in each decomposition entry is the lemma's slug (= the
diacritized lemma Arabic itself). UI fetches `/lemmas/{lemma}.json`
to render each card on the surface page.

### `lemmas/{lemma}.json` (heavy, lazy-loaded content)

```json
{
  "index": "قَالَ",
  "kind": "word_lemma",
  "data": {
    "lemma": "قَالَ",
    "transliteration": "qāla",
    "root": "ق-و-ل",
    "pos": "V",
    "pos_label": "Verb",
    "verb_form": "I",
    "pattern": "1a2a3a",
    "translations": {
      "en": "to say, to speak, to declare",
      "ur": "کہنا، فرمانا",
      "fa": "گفتن",
      ...
    },
    "definitions": {
      "en": "Form I verb meaning 'to say' or 'to speak'. The most common verb of speech in Classical Arabic, used for both ordinary speech and authoritative declarations (esp. of Allah, Prophets, and Imams). Frequently introduces direct speech in narrations.",
      "ur": "...",
      ...
    },
    "forms": [
      {"role": "past_3ms",          "form": "قَالَ",   "label": "he said",         "in_corpus": true,  "count": 8421},
      {"role": "past_3fs",          "form": "قَالَتْ",  "label": "she said",        "in_corpus": true,  "count": 124},
      {"role": "past_2ms",          "form": "قُلْتَ",   "label": "you (m) said",    "in_corpus": true,  "count": 892},
      {"role": "past_2fs",          "form": "قُلْتِ",   "label": "you (f) said",    "in_corpus": false},
      {"role": "past_1cs",          "form": "قُلْتُ",   "label": "I said",          "in_corpus": true,  "count": 1247},
      {"role": "present_3ms",       "form": "يَقُولُ",  "label": "he says",         "in_corpus": true,  "count": 982},
      {"role": "imperative_2ms",    "form": "قُلْ",    "label": "say! (m sg)",      "in_corpus": true,  "count": 312},
      {"role": "verbal_noun",       "form": "قَوْل",   "label": "saying, speech",  "in_corpus": true,  "count": 2034},
      {"role": "active_participle", "form": "قَائِل",  "label": "speaker",         "in_corpus": true,  "count": 187},
      {"role": "passive_participle","form": "مَقُول",  "label": "(thing) said",   "in_corpus": false},
      ...
    ],
    "frequency": 12850,
    "frequency_rank": 3,
    "related_lemmas": [
      {"lemma": "قَوْل",   "relationship": "verbal_noun"},
      {"lemma": "قَائِل", "relationship": "active_participle"},
      ...
    ],
    "classical_lexicon": {
      "lanes_lexicon": { "raw_text": "...", "scraped_from": "https://lanelexicon.com/..." },
      "mufradat_al_quran": null,
      "lisan_al_arab": "..."
    },
    "hans_wehr_link": "https://hanswehr.app/?q=قال",
    "etymology": "From Proto-Semitic *q-w-l 'to speak'. Cognate with Hebrew קוֹל (qōl), Aramaic קלא (qālā), Akkadian qālum.",
    "ai_attribution": {
      "model": "gpt-5.4",
      "generated_date": "2026-06-01",
      "pipeline_version": "1.0.0"
    }
  }
}
```

**Note: lemma pages do not carry `occurrence_paths`.** Path data lives only
on surface pages (the canonical occurrence index). Lemma pages are the
cross-form aggregation view (`surface_forms_in_corpus` shows each form +
count). This avoids duplicating thousands of paths across both layers and
keeps lemma pages comparatively lean. To see actual narrations, the user
drills `lemma → click a surface form → surface page → click a path →
narration` (3 clicks). Direct `surface → narration` is 2 clicks.

### `index/surfaces.json` (browse list)

```json
{
  "kind": "word_surface_list",
  "data": {
    "total_surfaces": 49099,
    "surfaces": [
      {"surface": "قَالَ",   "transliteration": "qāla",     "freq": 8421},
      {"surface": "وَقَالَ", "transliteration": "wa-qāla",  "freq": 2113},
      ...
    ]
  }
}
```

### `index/lemmas.json` (browse list)

```json
{
  "kind": "word_lemma_list",
  "data": {
    "total_lemmas": 12847,
    "lemmas": [
      {"lemma": "قَالَ", "root": "ق-و-ل", "pos": "V", "en": "to say, speak", "freq": 12850},
      ...
    ]
  }
}
```

## Word highlighting on narrations

When a user clicks a path on a surface page, they navigate to a narration with
the matching word visually highlighted. Convention:

```
/books/al-kafi:1:1:1:1?highlight=وَقَالَ
```

The narration component (`verse-text` and `chapter-content` in the existing
Angular app) reads `?highlight=` from the route once on init and:

1. **NFC-normalizes** the param (same `s.normalize('NFC')` call used at
   slug-derivation time — both sides apply the identical normalization
   so a copy-paste mismatch can't break highlighting).
2. **Walks each chunk's `arabic_text`**, splits on whitespace, normalizes
   each token, compares to the param.
3. **Wraps matching tokens** in `<mark class="highlighted-word">` at render
   time. Uses an Angular pipe or a small renderer helper — non-invasive
   change to the chunk rendering.
4. **Scrolls to the first highlighted occurrence** on page load (using
   `scrollIntoView({behavior: 'smooth', block: 'center'})`).

CSS for `.highlighted-word`: a soft background fill (e.g. `background:
rgba(255, 215, 0, 0.4)` — gold-ish), maybe a brief flash animation to draw
the eye on initial scroll.

**Surface pages emit `?highlight={surface}` query param when linking to a
path.** Each `occurrence_paths` entry is rendered as a link with the
surface form pre-injected:

```html
<a [routerLink]="['/books', verse_path]" [queryParams]="{highlight: surface}">
  {{ verse_path }}
</a>
```

**Multiple matches in a narration**: all are highlighted (same surface form
can appear several times). Scroll-to lands on the first.

**Lemma → narration is two-step** (per the path-duplication policy above):
the user picks a surface form first, then navigates from there. The
`?highlight=` param always carries an *exact diacritized surface form* —
never a lemma. This keeps the highlight match precise rather than
fuzzy-matching across all forms of a lemma.

## Angular UX

### New routes

- `/words` → browse index (alphabetic A-Z by transliteration, filter by POS, search box) — paired data file `index/surfaces.json`
- `/words/{surface}` → surface page (e.g. `/words/وَقَالَ`)
- `/words/lemmas/{lemma}` → lemma page (e.g. `/words/lemmas/قَالَ`)
- `/words/roots/{root}` → optional secondary index of all lemmas under a root

### Surface page sections (rendered top-to-bottom)

1. **Header card**: surface form + transliteration + audio (lazy from primary lemma)
2. **Decomposition**: cards for each constituent lemma (`وَ`, `بِ`, `ال`, `عَهْد`), each lazy-loaded from `/lemmas/{lemma}.json`
3. **Surface-specific morphology**: case, definiteness, etc. (CAMeL Tools output for THIS form)
4. **Occurrences**: paginated list of `occurrence_paths` linking to narrations with `?highlight={surface}` query param

### Lemma page sections (rendered top-to-bottom)

1. **Header card**: lemma + transliteration + audio play button + POS chip
2. **Quick meaning**: 1-line gloss, root with click-through
3. **Translations**: language selector, full translations.{lang}
4. **Definition**: synthesized prose definition
5. **Paradigm table**: one row per `forms[]` entry — full conjugation
   (verbs) or declension (nouns) generated by CAMeL Tools, **regardless
   of corpus presence**. Each row shows the role label (e.g. "he said",
   "you f said"), the diacritized form, and a count column. Forms with
   `in_corpus: true` render as a hyperlink to their surface page +
   show the corpus count; forms with `in_corpus: false` render as
   gray plain text with no link (a `—` in the count column). Gives
   the reader the complete linguistic paradigm at a glance and lets
   them click through any attested form.
6. **Related lemmas**: pills with same root
7. **Classical lexicon entries**: collapsible Lane's, Lisan, Mufradat sections
8. **Hans Wehr link**: outbound
9. **Etymology + cognates**: collapsible

### Verse-page integration (the big UX win)

In `verse-text.component`:
- Each word in `chunks[].arabic_text` becomes a clickable span
- On click → navigate to `/words/{NFC-normalized surface form}`
- On hover (desktop) → tooltip card with mini-summary fetched from the
  surface page (constituent lemmas + each lemma's en gloss)
- **No index lookup**: the slug is the NFC-normalized surface form itself
  (`s.normalize('NFC')`). Generator and UI use the identical normalization
  function — locked by a 1000-form unit test.
- For surface forms not yet processed (e.g. when corpus grows but words
  haven't been re-built yet): the surface page returns 404; component
  shows a "Look up word →" outbound link to Hans Wehr as fallback.
- Lazy-loaded: surface JSON fetched only on click; lemma cards lazy-load
  in turn (mirrors the `VerseLoaderService` pattern already in use).

This is the path that makes per-narration `word_analysis` obsolete — every
renderable word data lives in `/words/{surface}.json` + `/words/lemmas/{lemma}.json`,
fetched on demand, not embedded per narration.

### Click-flow narrative

| Goal | Steps | Highlight |
|---|---|---|
| See a word's full lemma data from a chunk | click word → surface page → click lemma card → lemma page | n/a |
| Find narrations using a specific surface form | navigate to `/words/{surface}` → see `occurrence_paths` list | n/a |
| Read a narration with the word context-highlighted | click a path on surface page → narration loads with `?highlight={surface}` → matched words wrapped in `<mark>` + first occurrence scrolled into view | yes |
| See narrations using any form of a lemma | lemma page → click a specific surface form → surface page → click a path | yes (per chosen surface) |
| Browse all words alphabetically | `/words` index → paginated list, filter by POS or root | n/a |
| Free-text search | existing search bar; results show narrations (existing) + suggested word pages (new) | n/a |

`?highlight=` always carries an exact diacritized surface form, never a
lemma. Lemma → narration goes via a surface form first; this keeps the
highlight matching precise rather than fuzzy across all inflections.

### Discovery surfaces

- Bottom nav addition: "Words" item alongside Books, Narrators
- Search integration: extend Orama index to include surfaces and lemmas
  (surface, lemma, root, en gloss) so the global search bar finds words
  alongside narrations
- From Quran verses: each Quranic word also links to its surface page
  (extra rich because we have the Quranic Arabic Corpus data for those)

## Roadmap (proposed sessions)

| Session | Deliverable | Notes |
|---|---|---|
| **0 (this)** | Plan + research doc + locked decisions | This document; key decisions finalized 2026-05-10 |
| **1** | CAMeL Tools setup; lemma+clitic-extraction PoC on 100 corpus verses; NFC normalization parity test; **paradigm-correctness spot-check on 50 random lemmas** (manually compare CAMeL Tools generator output against Hans Wehr / Lane's for 10-15 of them — measures coverage on classical forms before scaling) | Python with CAMeL Tools install, run on a sample, sanity-check analyzer coverage, generator paradigm fidelity, and clitic decomposition for compound surfaces |
| **2** | Scrapers for Wiktionary + Lane's Lexicon + Quranic Arabic Corpus + Lisan al-Arab | Persist raw data per lemma in `ThaqalaynWordsSources/sources/` |
| **3** | LLM synthesis prompt + batch pipeline on 100 sample lemmas, validate | Probably gpt-5.4 batch like main pipeline |
| **4** | Generator: build `/words/{slug}.json` + `/words/index.json` writers | Mirrors `ai_content_merger.py` pattern |
| **5** | Full corpus run on all ~10K lemmas | Cost projection $400-2000 depending on tier |
| **6** | Angular: `WordsService`, route, word page component | Basic content rendering |
| **7** | Verse → word linkage (chunk Arabic clickable) + hover cards | The big UX integration |
| **8** | Browse index + search integration + bottom-nav addition | |
| **9** | Audio pronunciation, polish, SEO sitemap, screenshots | |
| **10** | Cleanup: deprecate per-narration word_analysis emission | Optional — per your request: leave existing data for now, just stop generating new |

Sessions 1-5 are pipeline-side; 6-9 are UI-side. They can mostly run independently
once the schema is locked in Session 2.

## Cost projection

| Scope | LLM cost (one-shot per lemma) | Storage |
|---|---|---|
| Tier 1 + 2 only (translations + basic definitions) | ~$0.03-0.08/lemma × 10K = **$300-800** | ~10-30KB/lemma × 10K ≈ 100-300MB |
| Tier 1+2+3 (add classical lexicon synthesis) | ~$0.08-0.20/lemma × 10K = **$800-2000** | ~30-80KB/lemma × 10K ≈ 300-800MB |
| Tier 1-4 (everything including audio) | ~$0.20-0.40/lemma + TTS = **$2000-4000+** | ~50-150KB/lemma × 10K ≈ 500MB-1.5GB |

Recommendation: start with Tier 1+2 in Session 5. Decide on Tier 3 expansion
based on quality of the synthesized prose; Tier 4 strictly optional.

## Open questions for Session 1

1. **CAMeL Tools coverage on classical Arabic.** The library is trained on
   modern + classical mix. Need to PoC on a sample of 100 corpus surface forms
   and measure: % returning a lemma+root+POS, % accuracy spot-check, % handling
   clitic decomposition correctly for compound surfaces. If coverage is poor,
   fallback to LLM-driven lemmatization (more expensive).

2. **Classical lexicon scraping legality.** Lane's Lexicon is public domain
   — confirmed. Lisan al-Arab is public domain — confirmed. Mufradat al-Quran
   is public domain — confirmed. Hans Wehr is NOT — link out only. Wiktionary
   is CC-BY-SA — must include attribution. Verify each source's terms before
   scraping at scale.

3. **NFC normalization parity.** Build the shared normalization function in
   Python and TypeScript; unit-test on a 1000-form fixture that the two produce
   byte-identical output. Lock that fixture into both repos (generator + UI)
   so future divergence is caught.

4. **Audio pronunciation.** TTS via Google Cloud / Amazon Polly / OpenAI TTS.
   Cost: ~$0.001-0.004 per lemma for synthesis + storage. Defer to Tier 4.

5. **Plural / irregular forms.** CAMeL Tools generator can produce conjugations.
   For irregular nouns the LLM is more reliable. Probably hybrid.

6. **Shia-specific scholarly content.** Beyond Mufradat al-Quran, are there
   Imami-specific lexicons we should source from? Need to research further
   (Iqraonline link in sources is a starting point).

## Storage projection

| Repo | Today | After Words project | Notes |
|---|---|---|---|
| `ThaqalaynDataSources` | 2.5 GB | **unchanged** | Words project doesn't touch this; new repo `ThaqalaynWordsSources` instead |
| `ThaqalaynWordsSources` (new) | n/a | ~500 MB - 1.5 GB | ~10K lemma raw responses (30-100KB each) + scraped third-party sources (Lane's ~50MB + Wiktextract Arabic ~50MB + QAC ~10MB + Lisan ~200MB+ depending on scope) |
| `ThaqalaynWords` (new) | n/a | 250-700 MB | 50K surface JSONs (typical 3-5KB each, top-frequency surfaces up to ~250KB raw / ~25KB gzipped due to full `occurrence_paths` lists) + 10K lemma JSONs (~20-50KB each) + indexes |
| `ThaqalaynData` | 919 MB | unchanged | Words deployment is separate |
| `ThaqalaynDataGenerator` | small | small | Source code; gains an `app/words/` module |
| `Thaqalayn` (Angular) | <100 MB | unchanged | Source code only, gains a `WordsService` and a few components |

Total ecosystem footprint goes from ~3.5 GB to ~4.5-5.7 GB across six
repos. Each repo stays in the comfortable range for git/GitHub; the
biggest one (`ThaqalaynDataSources`) stays at 2.5 GB rather than growing
because words live in their own dedicated source repo.

### Surface page size at the high end

Per-surface page size is dominated by `occurrence_paths` for the highest-
frequency surfaces. The most common surface (`قَالَ`, ~8,400 occurrences)
projects to:

- ~8,400 paths × ~30 bytes/path = ~250 KB raw JSON
- After gzip (Netlify serves gzipped): ~25 KB over the wire
- Page metadata (decomposition, morphology) adds ~1 KB

Worst-case load is comparable to a single hadith verse_detail. Median
surface page is much smaller (most surfaces have <50 occurrences ≈ 2-3 KB).
No frequency cap or pagination needed — the static-file delivery path
handles the asymmetry naturally.

## Sources (research, 2026-05-10)

Linguistic resources:
- [Quranic Arabic Corpus](https://corpus.quran.com/) — root/lemma/POS/morphology for the Quran
- [Quranic Arabic Corpus — download](https://corpus.quran.com/download/)
- [mustafa0x/quran-morphology — GitHub fork v0.4](https://github.com/mustafa0x/quran-morphology)
- [Lane's Arabic-English Lexicon — laneslexicon.com](https://www.laneslexicon.com/)
- [Lane Lexicon — lanelexicon.com](https://lanelexicon.com/)
- [The Arabic Lexicon — arabiclexicon.hawramani.com](https://arabiclexicon.hawramani.com/)
- [Mawrid Reader — ejtaal.net](https://ejtaal.net/aa/readme.html)
- [Lisan al-Arab on Internet Archive](https://archive.org/details/lisanal-arab)
- [Hans Wehr Dictionary on Internet Archive](https://archive.org/details/dictionary-of-modern-written-arabic-hans)
- [hanswehr.app](https://hanswehr.app/)

Tooling:
- [CAMeL Tools — PyPI](https://pypi.org/project/camel-tools/)
- [CAMeL Tools — GitHub](https://github.com/CAMeL-Lab/camel_tools)
- [CAMeL Tools morphology features docs](https://camel-tools.readthedocs.io/en/stable/reference/camel_morphology_features.html)
- [Wiktextract — GitHub](https://github.com/tatuylonen/wiktextract)
- [Kaikki.org — Wiktextract Arabic dictionary data](https://kaikki.org/dictionary/Arabic/index.html)

Scholarly references:
- [Hadith Terminology — Wikipedia](https://en.wikipedia.org/wiki/Hadith_terminology)
- [Iqraonline — list of Arabic dictionaries for Quran/Hadith studies](https://iqraonline.net/list-of-important-arabic-dictionaries-for-quran-and-hadith-studies/)
- [Glossary on al-islam.org](https://al-islam.org/inquiries-about-shia-islam-sayyid-moustafa-al-qazwini/glossary)
- [A Rich Arabic WordNet Resource for Al-Hadith Al-Shareef (paper)](https://www.researchgate.net/publication/320972227_A_Rich_Arabic_WordNet_Resource_for_Al-Hadith_Al-Shareef)

Existing dormant infrastructure (Thaqalayn-side):
- `ThaqalaynDataGenerator/app/pipeline_cli/word_dictionary.py` — extraction +
  dictionary management module (currently dormant — see module docstring)
- `ThaqalaynDataGenerator/scripts/V4_PIPELINE_PLAN.md` Phase 7 — original
  translation-only plan, this doc supersedes it for full per-word scope

## Next session

Pick this back up in Session 1 above: install CAMeL Tools, lemmatize a 100-verse
sample, sanity-check coverage and quality, then lock the schema and repo
decision before any production code is written.

---

## Implementation log (autonomous session, 2026-05-10)

Running unattended — owner is AFK and a parallel pipeline is generating new
v4 corpus responses in `ThaqalaynDataSources/`. Status appended after each
phase. No LLM calls. No pushes. Local commits only.

### Repo state at session start

| Repo | Latest commit | Status |
|---|---|---|
| `ThaqalaynDataGenerator` | `5952278` Preamble strip | clean; untracked files unrelated |
| `Thaqalayn` | `52e7060` forms[] paradigm | clean |
| `ThaqalaynWordSources` | `da571bf` README | clean |
| `ThaqalaynWords` | `460f7d7` Initial commit | clean |

Both new repos exist + git-init'd. My earlier-session commits intact.

### Phase progress

| Phase | Status | Started | Finished | Commits | Notes |
|---|---|---|---|---|---|
| 0 — scaffolding + NFC util | **done** | 2026-05-10 | 2026-05-10 | `e637286` | `app/words/{__init__,normalize}.py` + 1000-form fixture + 18 tests. Slug = NFC only. `normalize_for_match` for fuzzy lookups (adds ta-marbuta unification to match the existing search service). 1745 total tests pass. |
| 1 — CAMeL Tools wrapper | **done** | 2026-05-10 | 2026-05-10 | `5ca802c` | Install worked cleanly (pip + `camel_data -i defaults`). `app/words/morphology.py` with analyzer + generator + paradigm-by-role + POS translator. 26 tests. **Corpus coverage: 96.5%** on 200 random surface forms — gap is proper nouns (tribal nisbas like الْقَزْوِينِيُّ) which we'll handle as no-lemma surface pages. |
| 2 — corpus extraction | **done** | 2026-05-10 | 2026-05-10 | Gen `66e0c8e`, Sources `70754df` | `app/words/corpus_extract.py` — format-aware (v3 word_analysis OR v4 chunks.arabic_text). 15 tests. **Real corpus: 102K unique surfaces, 1.1M tokens, 9.6s extraction.** Output committed to `ThaqalaynWordSources/extracted/corpus_surface_set.json` (39MB, 1.3M lines pretty-printed). |
| 3 — bulk downloaders | **done** | 2026-05-10 | 2026-05-10 | Gen `e2a3c14`, `7c4e1b8`, `1a23a47`; Sources `f34c825`, `acea60e` | Three bulk sources captured: (3a) **QAC v0.4** — `download_quranic_arabic_corpus.py` parses 130K Quran morphology rows into lemma_index (4,776 lemmas), root_index (1,651 roots), parsed_rows.json. (3b) **Wiktextract Arabic** — `download_wiktextract_arabic.py` pulled 499MB JSONL from kaikki.org; full slim (221MB) stays in `tmp/wiktextract_cache/` (gitignored, exceeds GitHub 100MB), `summary_index.json` (5MB) committed to WordSources. (3c) **Lane's Lexicon** — `download_lanes_lexicon.py` downloaded 36 TEI XML files + parsed into 48,103 entries / 5,187 roots / 46,924 head-forms. Buckwalter-encoded — bw2ar conversion deferred to Phase 5 builder. (3d) Lisan al-Arab — deferred per D048. |
| 4 — scrapers (if needed) | **skipped** | 2026-05-10 | 2026-05-10 | | Bulk sources covered the planned third-party data. No throttling-risk scraping needed for the PoC. |
| 5 — page builders | **done** | 2026-05-11 | 2026-05-11 | Gen `7b6488a`, `7d256e4` | `app/words/builders.py`: `WordPageBuilder` produces surface + lemma pages from CAMeL + 4 source indexes (corpus, QAC, Wiktextract, Lane's). Helpers: `perseus_bw_to_arabic` (handles Perseus's ^/digits BW extensions), `build_lanes_arabic_index` (reverse-maps Lane's orth from BW to Arabic NFC keys), `canonical_diacritized_lemma` (derives past_3ms citation form so surface→lemma slug stays consistent), normalized fallback lookups across all 4 indexes. 29 new tests, 88 total words tests pass. `scripts/build_word_pages.py` CLI: `--sample N` / `--top-n N` / `--full`. PoC on top-100 most-frequent: 100/100 analyzed, 67 unique lemmas, cross-ref hits 73% QAC, 96% Wiktextract, 87% Lane's. |
| 6 — validation | **done** | 2026-05-11 | 2026-05-11 | Gen `f61c4ff` | `scripts/validate_word_pages.py` walks per-file (schema, slug↔filename, frequency consistency, cross-ref payload sanity) + cross-file (surface→lemma link integrity). `--strict` exits non-zero on any issue for future CI wiring. Mid-build check showed 0 surface issues, 0 lemma issues, only link "breaks" being lemmas not yet written (race condition; resolves on completion). |
| 7 — index builders | **done** | 2026-05-11 | 2026-05-11 | Gen `53c41b0` | `scripts/build_word_indexes.py` walks output and produces `index/surfaces.json` (slug, count, lemma, pos) + `index/lemmas.json` (slug, root, pos, frequency, paradigm_size, in_corpus_forms, has_qac, has_wiktextract, has_lanes) — sorted by descending frequency for UI defaults. |
| 8 — NFC parity (TS side) | **done** | 2026-05-11 | 2026-05-11 | UI `925befe` | `Thaqalayn/src/app/services/word-normalize.ts` mirrors Python `app/words/normalize.py`: `slug()` = trim+NFC, `normalizeForMatch()` strips diacritics + unifies alif/ya/ta-marbuta variants. Spec replays the same 1000-form fixture committed in the generator repo and asserts byte-identical output (11/11 tests pass). Required `resolveJsonModule` in `tsconfig.spec.json`. |
| 9 — PoC dry run | **done** | 2026-05-11 | 2026-05-11 | Words `f0508b9` (scaffold) + bulk-output commit | **Full corpus built**: 102,003 surfaces analyzed (6,156 = 6.0% with no morphology — proper nouns/Latin chars), 13,686 unique lemmas (within the 8-15K projected). Cross-reference hits: QAC 32.1%, Wiktextract 77.0%, Lane's 68.1%. **Validation: 0 issues** across all files (only 6,156 no_link entries, matching the no_morph count). Output size: 232 MB (172 MB surfaces + 50 MB lemmas + 9.5 MB indexes). Within projected 250-700 MB range. |
| 10 — PoC review & polish (lemma dedup + roots) | **done** | 2026-05-11 | 2026-05-11 | Gen `34867aa`, Words second-rebuild, UI `72e86b7` | User-driven review surfaced (a) **lemma dedup bug**: `get_best_analysis` was using the unpopulated `pos_freq` field, picking the first analysis arbitrarily → 581 spurious lemma pages. Fixed by switching to `lex_logprob` + exact-diac match (D058). (b) **Root pages**: the "lemmas sharing a root" sibling list was originally going to be inlined per-lemma; refactored to `roots/{slug}.json` as single source of truth, lemmas store only `root_link` (D056). Root slugs use `_` as URL-safe weak-radical placeholder (D057). (c) **Dropped redundant fields**: `paradigm[].diacritized` (= `form` after NFC) and `surface.morphology.lex` (unused by UI) (D059). Validation extended for `root_slug`/`root_link` + new lemma→root link integrity check. **Rebuild stats: 102,003 surfaces; 13,105 lemmas (-581); 2,769 roots.** 9 new tests, total 97 words tests pass. |
| 11 — Wiktextract content merge (definition/etymology/IPA) | **done** | 2026-05-11 | 2026-05-11 | Gen `a26d75b`, Sources `093a97a`, Words third-rebuild | User feedback: "use what's available, augment with LLM only if necessary". `WordPageBuilder` extended to consume the 221 MB Wiktextract slim. `_build_definition_from_wiktextract` extracts senses (gloss + tags + 2 examples per sense, tagged by POS). `_build_etymology_from_wiktextract` extracts `etymology_text` with dedup across multi-POS entries. `_build_ipa_from_wiktextract` returns deduped IPA list. **Coverage on full corpus: 9,975 lemmas (76.1%) got Wiktextract definitions merged in.** translations field stays null (Wiktionary's Arabic-side entries don't carry foreign-language translations; LLM phase still needed for the 10 non-English target languages). Corpus-filtered slim is 154 MB — exceeds GitHub's 100MB/file limit — so it's gitignored too (regenerable). 19 new tests, total 116 words tests pass. Validation: 0 issues. |
| 12 — Deployment | **done** | 2026-05-11 | 2026-05-11 | Words `de3e111` (final config) | All 4 repos pushed to GitHub. **ThaqalaynWords deployed to Netlify at <https://thaqalaynwords.netlify.app/>.** Verified live: `/index/roots.json` returns 200 (206 KB, 2,769 roots), `/lemmas/قالَ.json` returns 200 (9.3 KB, full paradigm + root_link), `/roots/ق-_-ل.json` returns 200 (985 B, 17 lemmas under that root). CORS headers `Access-Control-Allow-Origin: *` confirmed; immutable cache on `/surfaces/*.json` `/lemmas/*.json` `/roots/*.json`, 24h cache on `/index/*.json` per `netlify.toml`. |
| 13 — Track B1 (Lane's body parsing) | **done** | 2026-05-12 | 2026-05-12 | Gen (this commit), Sources (lanes_entries.json) | New `app/words/lanes.py` module parses 36 Perseus TEI XML files into 44,826 structured entries with typed body segments (italic_en/arabic/text/quote/page_break), Buckwalter→Arabic conversion on embedded Arabic, and source-citation code extraction. New `scripts/build_lanes_structured.py` builds `sources/lanes-lexicon/lanes_entries.json` (78.8 MB, fits under GitHub limit). WordPageBuilder accepts the structured index and emits `lanes_definition` on lemma pages. `cross_references.lanes` gains `search_url` (WordPress search on lanelexicon.com — no per-entry deep linking exists). **No truncation** per user direction — full body content preserved. README expanded with `lanes_definition` field reference, body-segment-kind guide, and source-citation legend covering the most-common ~30 codes. 12 new tests, 120 total words tests pass. |
| 14 — Track B2+ (hawramani multi-lexicon aggregator) | **partial — high-frequency lemmas covered; mid/low-freq scrape blocked by 429 rate-limits** | 2026-05-12 | 2026-05-13 | Gen `c650d19`, Sources `c667ac2`, Words (rebuild commit) | Originally B2 was "Mufradat only" (~120 entries). Discovery: hawramani.com aggregates **38–40 classical Arabic lexicons** per page (al-Mufradat, Lisan al-Arab, Taj al-'Arus, Sihah, Asas al-Balagha, Misbah al-Munir, al-Mughrib, Mufradat (Farahi), etc. — collapses B2 + B3 into one source). New modules: `scripts/scrape_hawramani.py` (concurrent fetch with adaptive 429-backoff, dedup by diacritic-stripped form, resumable), `app/words/hawramani.py` (BeautifulSoup parser + allowlist HTML sanitizer + LEXICON_LEGEND covering all 38 lexicons), `scripts/build_hawramani_structured.py`. WordPageBuilder gains `classical_definitions` field. **Pre-flight: 95% hit rate on top-100 after diacritic-strip fix**. Scrape paused at **1,366 pages** (top-frequency lemmas, ~10% of corpus) because hawramani's rate-limiting becomes severe past the top tier — 429s exhaust retries, masking hit/miss classification. Eventually CDN issued an HTTP 436 block. **Output: 1,922 lemmas (14.7%) have `classical_definitions` merged** (more than 1,366 because hawramani's per-stripped-form page serves multiple diacritization-variant lemmas). Raw HTML dump gitignored (~140 MB, regenerable); structured `hawramani_entries.json` (98.8 MB) committed to WordSources. Re-run `scripts/scrape_hawramani.py --full` later to extend coverage — script is resumable, skips files already on disk. 28 new tests, 148 total words tests pass. |
| 15 — Track A (Angular UI integration) | **done** | 2026-05-12 | 2026-05-13 | UI A1–A9 commits + perf/UX iteration commits (see Phase 17) | Full UI shipped end-to-end. **A1–A3:** `environment.wordsApiBaseUrl` plumbing (`http://localhost:8889/` dev, `https://thaqalaynwords.netlify.app/` prod), `WordsService` with `shareReplay(1)` cache mirroring `VerseLoaderService`, full TypeScript models in `models/word.ts`. **A4 lazy module:** `features/words/words.module.ts` registers `/words`, `/words/{surface}`, `/words/lemmas/{slug}`, `/words/roots/{slug}` via `RouterModule.forChild` (132 KB lazy chunk). **A5 components:** `words-list` (CDK virtual scroll for 102K-row browse list with mode toggle for surfaces/lemmas/roots), `word-surface` (clickable root, decomposition cards, occurrence list), `word-lemma` (paradigm table with corpus-attestation flags, sibling lemmas under same root, accordion-collapsed classical lexicon entries, sanitized HTML rendering via `DomSanitizer.bypassSecurityTrustHtml`), `word-root` (lemma-family browser). **A6 in-verse linkage:** `verse-text` chunk renderer makes every word in v3 `word_analysis` OR v4 `chunks[].arabic_text` a clickable card. v4-only verses (no `word_analysis`) get fallback tokenization on whitespace + Arabic punctuation strip; clicking a card opens a popup with morphology + translation, lazy-loading the surface page + lemma page on demand. **A7 cross-cutting:** `verse-detail` toggle now uses `vt.hasWordByWord` so every hadith page (not just v3 ones) shows the word-by-word toggle. **A8 E2E:** `e2e/tests/words.spec.ts` covers routing, lemma-link integrity, paradigm rendering. **A9 cross-links:** lemma pages link Quran/hadith refs back to existing `/books/...` paths via `cross_references.qac` location info. |
| 16 — Path C (temporary English glosses on lemmas index) | **done — to be reverted when Path B lands** | 2026-05-13 | 2026-05-13 | Gen `d0ce4a9`, UI `34ff19c` | Word cards rendered Arabic + POS but no inline translation, because the lemma index didn't carry a gloss. Quick stopgap: extract the first POS-aligned Wiktextract sense gloss per lemma at index-build time and stash it in `lemma.gloss`. `_pick_aligned_gloss` in `scripts/build_word_indexes.py` uses a CAMeL→Wiktextract POS-family map (e.g. `prep`→`{prep, preposition}`) so إِلَى returns its preposition sense rather than the homograph verb sense ("to promise"). Function-word POS skips the senses[0] fallback so we never surface a wrong-POS gloss for them; content-word POS (verb/noun/adj/adv) falls back. **Index grew 2.4 → 2.8 MB.** UI: `LemmaIndexEntry.gloss` typed in `models/word.ts`, `WordsService.getLemmaGlossMap()` builds a session-cached `Map<lemmaSlug, gloss>`, `VerseTextComponent.cardTranslation()` reads from inline v3 entry → gloss map → lazy-loaded lemma. **This is throwaway**: it's English-only (Wiktextract is English-only), the 80-char truncation crops some glosses (deliberately not addressed per user direction 2026-05-13), and Path B will produce higher-quality, all-language coverage. Tracked for revert in memory `project-path-c-temporary-glosses` with the exact commits and revert recipe. |
| 17 — UI polish round (popup correctness + perf) | **done** | 2026-05-13 | 2026-05-13 | UI `c6816d3`, `20cd672`, `875451a`, `6893af7`, `99dbf9e` | Round of bug fixes against the production UI. **(a) Popup empty until click race**: `setActiveWord` ran `loadPopupLemma` after laying out the popup, and the document:click HostListener fired before stopPropagation could short-circuit it. Fixed with explicit `$event.stopPropagation()` on card click + eager `prefetchSurfaceData()` so POS lit up per-card on toggle-on. **(b) Clickable root on surface page**: root chip now navigates to `/words/roots/{slug}`. **(c) WBW toggle on verse-detail**: gated on `vt.hasWordByWord` (was `hasWordAnalysis`) so v4-only hadiths show the toggle. **(d) Prefetch on saved-pref boot**: only `toggleWordAnalysis()` was calling `prefetchSurfaceData()`, so users whose `viewMode` preference was `word-by-word` landed on a page of empty cards (no POS, no translation) until they flipped the toggle off-and-on. `applyViewMode()` now also triggers the prefetch when WBW becomes active via the preference subscription. **(e) Click-scroll-to-top + popup spinner regression**: `wordTokens` was a getter recomputing a fresh `WordAnalysisEntry[]` on every change-detection tick — Angular's `*ngFor` identity diff was tearing down + rebuilding all 20 word cards on every popup open/close. Symptom in small viewports: visible layout jump. Fix: cache per-verse + `trackBy` on the *ngFor. Same commit also rewired `popupTranslation`/`popupPos` getters to fall back to `lemmaGlossMap`/`surfaceCardData` so the popup hydrates instantly from the cards' own caches instead of spinning while we re-fetch the lemma. Native `[title]` on the truncated translation span shows the full text on hover (until Path B lands and broadens it). |

### Final state (2026-05-13, end of Session 2 — UI + free-data enrichment complete)

**Data API** (deployed at `https://thaqalaynwords.netlify.app/`):
- **102,003** surface pages
- **13,102** lemma pages
  - 76.1% with Wiktextract-merged definitions, etymology, IPA
  - 14.7% with hawramani `classical_definitions` (top-frequency lemmas)
  - All carry Lane's `lanes_definition` body where attested (~68% have a Lane's entry)
  - ~99.x% carry the throwaway Path C English `gloss` field in `index/lemmas.json` (Wiktextract first-aligned-sense, ≤ 80 chars)
- **2,769** root pages
- **3** index files (`surfaces`, `lemmas`, `roots` — sorted by descending frequency)
- **~330 MB** total output (grew from 248 MB after Lane's body parsing + hawramani; index added ~400 KB for Path C glosses)
- **0 validation issues** across all files
- **148 words tests** passing on the generator side + **11 TS parity tests** on the UI side

**Angular UI** (live at `https://thaqalayn.netlify.app/`):
- `/words`, `/words/{surface}`, `/words/lemmas/{slug}`, `/words/roots/{slug}` routes — lazy-loaded 132 KB chunk
- Browse list uses CDK virtual scroll over all 102K rows
- Lemma pages render paradigm table with corpus-attestation flags, sibling-lemma list, accordion-collapsed Lane's + classical-definition entries (sanitized HTML)
- **Every hadith** (v3 OR v4) gets a word-by-word toggle in `verse-text`; clicking any word opens a popup with lazy-loaded morphology + translation; clicking "Full word page →" navigates to the surface/lemma pages
- `cdkVirtualScrollViewport` + `shareReplay(1)` caches throughout — repeat fetches of the same slug within a session don't hit the network
- 43/43 verse-text unit tests pass; full Angular suite 367+ tests pass

**Known temporary state:**
- Path C (English gloss-on-index) lives until Path B replaces it — see "Path B" section below for the revert recipe and commit list.

## Outstanding work (as of 2026-05-13)

Tracks A (UI), B1 (Lane's), and B2-partial (hawramani) are **done** (see Implementation log Phases 13–17). What remains:

### Track A status — DONE ✓

| # | Item | Status |
|---|---|---|
| A1–A3 | env config + `WordsService` + TS models | done (Phase 15) |
| A4–A5 | routes + surface/lemma/root components | done (Phase 15) |
| A6 | clickable words in `verse-text` | done (Phase 15) |
| A7 | `/words` browse list with virtual scroll | done (Phase 15) |
| A8 | Playwright E2E | done (Phase 15) — covered by `e2e/tests/words.spec.ts` |
| A9 | Quran/hadith cross-links on lemma pages | done (Phase 15) |

### Track B status — partly done

| # | Item | Status | Notes |
|---|---|---|---|
| B1 | Lane's Lexicon body parsing | **done** (Phase 13) | All 44,826 entries structured + merged |
| B2 | Mufradat al-Quran | **superseded by hawramani aggregator** | hawramani.com serves Mufradat alongside 37 other lexicons per page; B2 collapsed into B2+ |
| B2+ | hawramani multi-lexicon scrape | **partial — 1,922 lemmas (14.7%)** | Blocked on hawramani rate-limit/CDN. Resumable: rerun `scripts/scrape_hawramani.py --full` after waiting it out, eventually expect ~80%+ coverage. |
| B3 | Lisan al-Arab direct scrape | not started | Lisan IS one of the 38 lexicons hawramani aggregates, so B3 is largely covered by B2+. Direct-scrape only worth doing if hawramani permanently blocks us. |
| B4 | Multi-language Wiktionary dumps | not started | A "free" alternative path to Track C C1 (LLM translation); each target language's Wiktionary has Arabic→that-language entries. Worth piloting on one language (e.g. Persian) before committing to LLM. |

### Track C status — Path B (LLM translation) is the next paid spend

`Path B` is what users actually call the C1 step. **The plan for it is below ("Path B detailed plan").** C2–C5 are deferred until the UI surfaces real demand.

### Track D status — small polish

| # | Item | Status | Notes |
|---|---|---|---|
| D1 | Path interning to shrink surface pages | not needed | Output is 330 MB, well within Netlify limits |
| D2 | Display `ق-و-ل` instead of `ق-_-ل` slugs | not started | Pure UI substitution; pull weak letter from the canonical lemma form |
| D3 | Verify Netlify free-tier headroom | not started | Confirm after first traffic spike |
| D4 | `?highlight={surface}` deep links on paradigm forms | not started | Lemma → click form → narration with the word highlighted |
| D5 | Rebuild after Bihar / Mir'at land | not started | Incremental via `seen_lemmas` dedup |

---

## Path B — LLM translation of lemmas (the next major spend)

**Goal:** every lemma gets a high-quality short gloss + sense-paragraph in all 11 supported app languages (`en, ar, fa, ur, tr, id, bn, es, fr, de, ru, zh`), so every word card in `verse-text` and every lemma page shows the correct translation in whatever `wordAnalysisLang` the user selected. The English gloss comes from Wiktextract already; the other 10 languages are what we're paying the LLM to produce.

**Why "Path B" not "C1":** the user calls it Path B in conversation (Path A = WBW UI, Path B = LLM translations, Path C = temporary English glosses on the index). C1 is the same scope under the original roadmap naming.

### Scope

- **13,105 lemmas** to translate (the count after the dedup fix in Phase 10)
- Per lemma we send the LLM: lemma Arabic + Wiktextract English gloss + POS + optional Lane's first-sentence context
- Per lemma we get back: an object `{en, ar, fa, ur, tr, id, bn, es, fr, de, ru, zh}` of short noun-phrase / verb-phrase glosses (≤ 80 chars each) plus an optional longer `definition` paragraph in each language
- Surfaces inherit their lemma's translations (we do NOT pay to translate each of the 102K surface forms — that's combinatorially worse and most surfaces are inflections of the same lemma)
- For verbs we DO want per-paradigm-role label translation eventually (so card for `قَالَتْ` reads "she said" not "to say") — but that's mechanical (we have the role: `past_3fs`, we just need the per-language role-label table). Treat this as a one-time fixed-asset translation table loaded by the UI, not an LLM call per form.

### Cost

Using **gpt-4.1-mini** via Batch API (50% off list, matches the Phase 4 production model):
- Input per lemma ≈ 150 tokens (system prompt cached + lemma data + few-shot)
- Output per lemma ≈ 200 tokens (11 langs × ~15 tokens each, JSON overhead)
- Pricing 2026: `$0.40/1M input` / `$1.60/1M output` × 0.5 batch
- Per-lemma: `(150 × 0.20 + 200 × 0.80) / 1M = $0.000190` ≈ **2 hundredths of a cent**
- **13,105 lemmas total: ~$2.50**, plus a few dollars overhead for retries

That's the cheap-and-good band. We could pay more for gpt-5.4 ($1.25/$10 per 1M, ~30× cost: $75) if quality on rarer lemmas suffers — recommend running gpt-4.1-mini first, spot-checking the worst-quality lemmas (likely classical religious terminology + foreign loanwords), and re-running only those on gpt-5.4 if needed.

### Pipeline architecture

Mirrors the verse pipeline's batch flow (`app/pipeline_cli/openai_batch.py`). New module: `app/words/translation.py`.

```
┌────────────────────────────┐
│ 1. Extract                 │  Walk ThaqalaynWords/lemmas/*.json
│ scripts/extract_lemma_     │  → emit (slug, lemma_ar, pos, en_gloss,
│ translation_prompts.py     │     lane_snippet) tuples for every lemma
│                            │  → write to
│                            │  ThaqalaynWordSources/translation/
│                            │  prompts.jsonl
└────────────────────────────┘
            │
            ▼
┌────────────────────────────┐
│ 2. Submit batch            │  OpenAI Batch API: 13K requests, 1 file.
│ scripts/submit_lemma_      │  System prompt asks for strict JSON object
│ translations_batch.py      │  {lemma_ar: ..., glosses: {en, ar, fa, ...},
│                            │   definitions: {en, ar, fa, ...}}.
│                            │  State persisted to
│                            │  WordSources/translation/batch_state.json
└────────────────────────────┘
            │
            ▼
┌────────────────────────────┐
│ 3. Poll until completed    │  ~3-24 h depending on OpenAI queue
│ scripts/poll_lemma_        │  Resumable across reboots (state file holds
│ translations_batch.py      │  batch ID).
└────────────────────────────┘
            │
            ▼
┌────────────────────────────┐
│ 4. Download + validate     │  Parse responses, validate JSON, check each
│ scripts/download_lemma_    │  language's gloss is non-empty and not
│ translations.py            │  Latin chars in non-Latin script (basic
│                            │  garbage filter).
│                            │  Quarantine failures, retry up to 3× via
│                            │  fix batch (same shape as verse pipeline).
│                            │  Persist responses to
│                            │  ThaqalaynWordSources/translation/
│                            │  responses/{slug}.json
└────────────────────────────┘
            │
            ▼
┌────────────────────────────┐
│ 5. Merge into lemma pages  │  WordPageBuilder gains:
│ (rebuild)                  │   - `translations: {en, ar, fa, ...}`
│                            │     short glosses on the lemma JSON
│                            │   - `definitions: {en, ar, fa, ...}`
│                            │     longer paragraph (replaces or
│                            │     augments existing English-only
│                            │     `definition` field)
│                            │  Rebuild surfaces + lemma indexes (lemmas
│                            │  index gets `glosses: {en, ar, fa, ...}`
│                            │  per-entry for word-card display).
└────────────────────────────┘
            │
            ▼
┌────────────────────────────┐
│ 6. UI                      │  Revert Path C commits (`34ff19c` UI +
│                            │  `d0ce4a9` generator) and replace with:
│                            │    - `WordsService.getLemmaGlossMap(lang)`
│                            │      returning Observable<Map<slug, gloss>>
│                            │      for the active lang
│                            │    - `cardTranslation(entry)` reads the
│                            │      lang-specific map
│                            │    - lemma page renders all 11 langs in
│                            │      the translations selector
└────────────────────────────┘
```

### Prompt sketch (Phase 1)

```
You are translating an Arabic lemma into 11 languages for an Islamic
hadith study app. The lemma's Wiktextract English gloss + Lane's
first-sentence context are provided. Return a strict JSON object.

Lemma:       {{lemma_ar}}
POS:         {{pos}}    (e.g. verb, noun, prep, conj)
English:     {{en_gloss}}
Lane's:      {{lane_snippet | first sentence | ""}}

Return:
{
  "glosses": {
    "en": "short noun/verb-phrase gloss, ≤ 80 chars",
    "ar": "Arabic equivalent or short synonym (often same lemma or root family)",
    "fa": "...",
    "ur": "...",
    "tr": "...",
    "id": "...",
    "bn": "...",
    "es": "...",
    "fr": "...",
    "de": "...",
    "ru": "...",
    "zh": "..."
  },
  "definitions": {
    "en": "1-2 sentence definition explaining nuance, classical usage, theological connotations if applicable",
    ...same 11 langs...
  }
}

For function words (prepositions, conjunctions, particles), keep glosses
literal and short ("to/toward", "and", "indeed"). For verbs, give the
infinitive ("to say"). For nouns, give the singular ("speech, saying").
Do NOT include diacritics on Latin-script languages. Do NOT translate
proper nouns (return the transliteration).
```

### Schema additions

**`lemmas/{slug}.json`** gains:
```json
{
  ...existing fields...
  "translations": {
    "en": "to say, speak",
    "ar": "نطق، تكلم",
    "fa": "گفتن",
    "ur": "کہنا",
    "tr": "söylemek",
    "id": "berkata",
    "bn": "বলা",
    "es": "decir",
    "fr": "dire",
    "de": "sagen",
    "ru": "сказать",
    "zh": "说"
  },
  "definitions_multilang": {
    "en": "Form I verb of the root ق-و-ل, the most common verb of speech in classical Arabic. Used for ordinary speech, authoritative declarations, and citation of Quranic verses or hadith narrations.",
    "ar": "...",
    ...
  },
  "translations_attribution": {
    "model": "gpt-4.1-mini",
    "generated_date": "2026-06-01",
    "pipeline_version": "words.translation.v1"
  }
}
```

**`index/lemmas.json`** entry gains a compact per-language map (replaces the single `gloss` field added in Phase 16):
```json
{
  "slug": "قَالَ",
  "root": "ق.و.ل",
  ...
  "glosses": {
    "en": "to say, speak",
    "ar": "نطق",
    "fa": "گفتن",
    ...
  },
  "frequency": 8421,
  ...
}
```

**Index size estimate:** going from one `gloss` field (avg ~30 chars) to 11 glosses (avg ~25 chars each) takes the index from 2.8 MB to ~5-6 MB. Worth verifying after a small pilot batch — if the size becomes uncomfortable, split into per-language index files (`index/lemmas.{lang}.json`) so the UI fetches only the active language.

### Sessions / execution plan

| Step | Effort | Cost |
|---|---|---|
| Build extraction + prompt module + Pydantic schema | 0.5 session | $0 |
| **Pilot batch: 100 lemmas across all POS classes**; eyeball output quality, tweak prompt | 0.25 session | ~$0.02 |
| Pilot batch with gpt-5.4 (same 100 lemmas) for comparison | 0.25 session | ~$0.50 |
| Full batch on 13,105 lemmas (gpt-4.1-mini) | 1 session wall time, ~3-24 h batch | ~$2.50 |
| Quarantine retry passes | 0.25 session | ~$0.10 |
| Merge into lemma pages + rebuild indexes | 0.25 session | $0 |
| Revert Path C, wire UI to multilingual maps, lang-switcher integration test | 0.5 session | $0 |
| **Total** | **~3 sessions** | **~$3-4** |

### Validation checklist

- [ ] Every lemma has non-empty glosses for all 11 langs
- [ ] No Latin chars in Arabic/Persian/Urdu/Russian/Chinese/Bengali glosses (basic script check)
- [ ] Gloss length ≤ 80 chars (truncation discipline matches Path C's UI assumption)
- [ ] Spot-check 50 random lemmas + 20 high-frequency lemmas + 20 function-word lemmas manually
- [ ] Spot-check إِلَى (the canonical homograph that broke Path C without POS-alignment) returns the correct "to/toward" preposition gloss, not the verb sense
- [ ] Diff index size against pre-Path-B index (~2.8 MB) — should land in 5-6 MB range
- [ ] Verify revert commits land cleanly: `git revert 34ff19c d0ce4a9` should produce no merge conflicts

### What to do about surface pages

Surfaces don't need their own LLM translation. The card on a surface page already lazy-loads the lemma's translations via `WordsService.getLemma`. For the verse-page word-by-word view, the translation shown on each card comes from `lemmaGlossMap` (post-Path-B: from the multilingual version of the same map).

**Future work — paradigm-role-aware translation:** the card for `قَالَتْ` (3fs past) ideally reads "she said" rather than "to say". CAMeL Tools already gives us the role (`past_3fs`). We have a finite role taxonomy (~50 roles × 11 langs = ~550 strings). One-time human-curated or LLM-batch translation of that table, loaded into the UI as `assets/role-labels.{lang}.json`, would let the card combine `glosses.{lang} + role-label.{lang}` to produce "she said" / "you (m) said" / "I will say". This is Track D-ish — defer until users ask for it.

### Open questions before kicking Path B off

1. **gpt-4.1-mini vs gpt-5.4 quality on classical religious terminology.** Pilot will answer this. If gpt-4.1-mini's translations for words like تقوى, إيمان, تسبيح, ركوع are weak, run them through gpt-5.4 selectively (still cheap because we're talking 100-200 lemmas of the 13K).
2. **Do we want a separate definitions paragraph per language, or just the gloss?** Definitions multiply output tokens by ~10×. Recommend gloss-only on the first pass to minimize cost, then add definitions as a follow-up pass once Path B is shipped and we know users want them.
3. **Index per-language splitting threshold.** If the all-langs `index/lemmas.json` lands above 8 MB, split per language.




