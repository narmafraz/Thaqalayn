# ThaqalaynWords — Per-Word Pages Project Plan

**Status:** Planning. No code yet. Multi-session project (~6-10 sessions estimated).
**Created:** 2026-05-10
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

The single biggest design decision. Three layers:

| Layer | Granularity | Use as page slug? |
|---|---|---|
| **Surface form** | Exact token as written in chunk (e.g. وَقَالَ) | No — too many variants per concept |
| **Lemma** | Dictionary form, normalized inflection (e.g. قَالَ) | **Yes — primary** |
| **Root** | Tri/quadliteral skeleton (e.g. ق-و-ل) | Optional — secondary index page |

**Decision:** lemma is the primary page identity. Surface forms in chunks link
to their lemma's page. Each lemma page lists its root + root-mates. Optionally
a separate `/words/roots/{root}` index page browses all lemmas under that root
(traditional Arabic dictionary navigation pattern).

**Slug format proposal:** `{transliterated-lemma}-{disambiguator}` for URL
friendliness, e.g. `qala`, `kataba`, `salah`. For homographs (multiple lemmas
sharing the same surface), append the root: `qadara-q-d-r` vs `qadara-q-d-y`.
Final slug stable, never reused (same canonical-id rule as narrators).

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

## Repo decision: separate `ThaqalaynWords` repo

**Decision:** create a separate repo + Netlify deployment, mirroring the
`Thaqalayn{DataGenerator,DataSources,Data}` structure.

| Concern | Argument for separate | Argument for inline |
|---|---|---|
| Size | 8-15K JSON files × 5-50KB ≈ 80MB-700MB | Could fit in ThaqalaynData |
| Deployment | Netlify free tier handles either | Either works |
| Conceptual cleanliness | Words are reusable across multiple data sources (Quran, hadith, future Sunni corpus, etc.) — they're not specifically Thaqalayn data | If we never branch out, keeping in one place is simpler |
| Build cadence | Words rebuild rarely, hadith data rebuilds often — different cadences argue for separate | Coupled rebuilds are simpler |
| URL clarity | `words.thaqalayn.com/qala` reads as a separate corpus product | `thaqalayn.com/words/qala` is one site |
| Git repo size | ~700MB max in DataGenerator's view of /Words/ — manageable but separating keeps each repo lean | Risks bloating ThaqalaynData |

The deciding factor is **conceptual reusability**: words are a knowledge graph
that other Islamic-text products could consume. A separate `ThaqalaynData_Words`
or `ThaqalaynWords` makes that explicit. Future API endpoints + downloads
become natural.

**Proposed repos:**

| Repo | Purpose |
|---|---|
| `ThaqalaynWordsSources` | Scraped raw data (Lane's Lexicon dumps, Quranic Arabic Corpus, Wiktionary, classical lexicons) + LLM responses per lemma |
| `ThaqalaynWords` | Generated lean `/words/{slug}.json` files served to UI |
| `ThaqalaynWordsGenerator` | Pipeline: extract → enrich → scrape → LLM-synthesize → write |
| (existing) `Thaqalayn` | Angular UI, gains a `WordsService` and word-page route |

OR — a lighter touch — keep the generator inside `ThaqalaynDataGenerator`
since most of the pipeline infrastructure already exists there and we'd just
add a `app/words/` module. Decide in Session 1.

## Pipeline architecture

```
┌─────────────────────────┐
│ Existing v4 corpus      │
│ (chunks[].arabic_text)  │
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│ Phase A: Extract        │  Walk all chunks, tokenize, dedup
│ extract_unique_words()  │  → list of (surface, count) pairs
│ (already exists ✓)      │
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│ Phase B: Lemmatize+POS  │  Run CAMeL Tools morphological analyzer
│ camel_tools             │  on each surface form → (surface, lemma,
│ (new module)            │  root, POS, form, …)
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│ Phase C: Source scrape  │  For each lemma:
│ (new scrapers per src)  │   - Wiktionary entry (kaikki.org JSONL)
│                         │   - Lane's Lexicon entry (XML)
│                         │   - Mufradat al-Quran (when applicable)
│                         │   - Lisan al-Arab entry
│                         │  Persist raw scraped data per lemma
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│ Phase D: LLM synthesis  │  For each lemma, send to LLM:
│ (new prompt + module)   │   - lemma + root + POS + scraped sources
│                         │     + corpus usage examples
│                         │   - Get back: 11-language translations,
│                         │     definition prose, usage notes,
│                         │     hadith-specific commentary, etc.
│                         │  Persist response per lemma in
│                         │  ThaqalaynWordsSources/lemmas/{slug}.json
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│ Phase E: Build pages    │  Merge scrape + LLM + computed (corpus
│ (new merger)            │  occurrences, frequency, surface forms)
│                         │  → write lean /words/{slug}.json
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│ Phase F: Index page     │  Build /words/index.json (browse/search list:
│                         │   slug, lemma_ar, root, en_gloss, freq, POS)
└─────────────────────────┘
```

**One-shot per lemma**, like the canonical narrator registry. New corpus
additions only generate work for *new* lemmas (extract_unique_words diffs
against existing index).

**Quarantine + retry** mirroring the verse pipeline: each lemma's LLM step
gets up to 3 attempts. Validate LLM output (required fields, language
coverage, definition non-empty).

## Schema sketch

### `/words/{slug}.json` (served lean format)

```json
{
  "index": "qala",
  "kind": "word_content",
  "data": {
    "lemma": "قَالَ",
    "lemma_normalized": "قال",
    "transliteration": "qāla",
    "root": "ق-و-ل",
    "root_slug": "q-w-l",
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
    "conjugation": {
      "past_3ms": "قَالَ",
      "present_3ms": "يَقُولُ",
      "imperative_2ms": "قُلْ",
      "verbal_noun": "قَوْل",
      "active_participle": "قَائِل",
      "passive_participle": "مَقُول",
      ...
    },
    "surface_forms_in_corpus": [
      {"form": "قَالَ", "count": 8421},
      {"form": "قُلْتُ", "count": 1247},
      {"form": "يَقُولُ", "count": 982},
      ...
    ],
    "frequency": 12850,
    "frequency_rank": 3,
    "example_occurrences": [
      {"verse_path": "/books/al-kafi:1:1:1:1", "chunk_excerpt": "..."},
      ...
    ],
    "related_lemmas": [
      {"slug": "qawl", "lemma": "قَوْل", "relationship": "verbal_noun"},
      {"slug": "qaaim", "lemma": "قَائِل", "relationship": "active_participle"},
      ...
    ],
    "classical_lexicon": {
      "lanes_lexicon": {
        "raw_text": "...",
        "scraped_from": "https://lanelexicon.com/..."
      },
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

### `/words/index.json` (browse / search index)

```json
{
  "kind": "word_list",
  "data": {
    "total_lemmas": 12847,
    "lemmas": [
      {
        "slug": "qala", "lemma": "قَالَ", "root": "ق-و-ل",
        "pos": "V", "en": "to say, speak", "freq": 12850
      },
      ...
    ]
  }
}
```

## Angular UX

### New routes

- `/words` → browse index (alphabetic A-Z by transliteration, filter by POS, search box)
- `/words/{slug}` → individual word page
- `/words/roots/{root_slug}` → optional secondary index of all lemmas under a
  root

### Word page sections (rendered top-to-bottom)

1. **Header card**: lemma + transliteration + audio play button + POS chip
2. **Quick meaning**: 1-line gloss, root with click-through
3. **Translations**: language selector, full translations.{lang}
4. **Definition**: synthesized prose definition
5. **Conjugation table** (verbs) or **declensions** (nouns)
6. **Surface forms in corpus**: paginated list of forms + occurrence counts
7. **Example occurrences**: scrolling card list of verses, each linking to
   `/books/...`
8. **Related lemmas**: pills with same root
9. **Classical lexicon entries**: collapsible Lane's, Lisan, Mufradat sections
10. **Hans Wehr link**: outbound
11. **Etymology + cognates**: collapsible

### Verse-page integration (the big UX win)

In `verse-text.component`:
- Each word in `chunks[].arabic_text` becomes a clickable span
- On click → navigate to `/words/{slug}`
- On hover (desktop) → tooltip card with mini-summary (lemma + EN gloss + root)
- The slug is derived: surface form → normalized form → lookup in
  `/words/index.json` (cached) → slug
- For unmatched surface forms (rare classical words not yet processed),
  fall back to "Look up word →" link to Hans Wehr or skip the link
- Lazy-loaded: full word JSON only fetched when the user clicks (mirrors
  the `VerseLoaderService` pattern already in use)

This is the path that makes per-narration `word_analysis` obsolete (per
your request) — every renderable word data lives in `/words/{slug}.json`,
fetched on demand, not embedded per narration.

### Discovery surfaces

- Bottom nav addition: "Words" item alongside Books, Narrators
- Search integration: extend Orama index to include lemmas (slug, lemma,
  root, en gloss) so the global search bar finds words
- From Quran verses: each Quranic word also links to its word page (extra
  rich because we have the Quranic Arabic Corpus data for those)

## Roadmap (proposed sessions)

| Session | Deliverable | Notes |
|---|---|---|
| **0 (this)** | Plan + research doc | This document |
| **1** | Decision finalize: separate repo y/n; CAMeL Tools setup; lemma-extraction PoC on 100 corpus verses | First Python with CAMeL Tools install, run on a sample, sanity-check coverage |
| **2** | Schema lock-in + scraper for Wiktionary + Lane's Lexicon + Quranic Arabic Corpus | Persist raw data per lemma in WordsSources |
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

## Open questions to resolve in Session 1

1. **Single repo or separate?** Concrete decision needed. Default proposal:
   start in `ThaqalaynDataGenerator` for simplicity, plan to extract to a
   separate repo if size grows past Netlify-free-tier comfort. Avoids upfront
   repo-juggling cost.

2. **CAMeL Tools coverage on classical Arabic.** The library is trained on
   modern + classical mix. Need to PoC on a sample of 100 corpus surface forms
   and measure: % returning a lemma+root+POS, % accuracy spot-check. If
   coverage is poor, fallback to LLM-driven lemmatization (more expensive).

3. **Slug stability for homographs.** Same surface form, different lemmas
   (e.g. أَمَرَ "to command" vs أَمْرٌ "matter"). Disambiguator strategy:
   `{translit}-{root}` if collision, else just `{translit}`. Need to lock
   the rule.

4. **Classical lexicon scraping legality.** Lane's Lexicon is public domain
   — confirmed. Lisan al-Arab is public domain — confirmed. Mufradat al-Quran
   is public domain — confirmed. Hans Wehr is NOT — link out only. Wiktionary
   is CC-BY-SA — must include attribution. Need to verify each source's
   licensing before scraping at scale.

5. **Audio pronunciation.** TTS via Google Cloud / Amazon Polly / OpenAI TTS.
   Cost: ~$0.001-0.004 per lemma for synthesis + storage. Defer to Tier 4.

6. **Plural / irregular forms.** CAMeL Tools generator can produce conjugations.
   For irregular nouns the LLM is more reliable. Probably hybrid.

7. **Shia-specific scholarly content.** Beyond Mufradat al-Quran, are there
   Imami-specific lexicons we should source from? Need to ask scholarly contacts
   or research further (Iqraonline link from sources is a starting point).

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
