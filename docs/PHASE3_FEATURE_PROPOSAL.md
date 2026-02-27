# Phase 3 Feature Proposal

> This document proposes new features for the Thaqalayn project's Phase 3 (expansion and enhancement). All proposals adhere to the project's core architecture philosophy: **zero ongoing costs, static-only hosting, build-time computation, and progressive enhancement** (see [ARCHITECTURE.md](ARCHITECTURE.md)).

---

## Table of Contents

1. [Word-by-Word Translation System](#1-word-by-word-translation-system)
2. [AI-Powered Multi-Language Translations](#2-ai-powered-multi-language-translations)
3. [Narrator Page Improvements](#3-narrator-page-improvements)
4. [Searchable Expandable Navigation](#4-searchable-expandable-navigation)
5. [Breadcrumb Fix (Quran)](#5-breadcrumb-fix-quran) -- DONE
6. [Arabic Text Cross-Validation](#6-arabic-text-cross-validation)
7. [Full Internationalization (i18n)](#7-full-internationalization-i18n)
8. [SEO Strategy](#8-seo-strategy)
9. [Implementation Priority and Dependencies](#9-implementation-priority-and-dependencies)
10. [Appendix: Data Sources Reference](#appendix-data-sources-reference)

---

## 1. Word-by-Word Translation System

### 1.1 Overview

Add word-by-word Arabic analysis for Quran verses, allowing users to tap/click any Arabic word to see its translation, root, morphological breakdown, and occurrences across the corpus. This addresses a common need for Arabic learners and scholars studying the Quran.

### 1.2 Data Sources

Five data sources were evaluated. QUL is the recommended primary source.

#### 1.2.1 QUL -- Quranic Universal Library by Tarteel AI (RECOMMENDED)

> **DataGatherer research finding:** This is the best single source for word-by-word data.

The QUL dataset provides comprehensive word-level data for the entire Quran in a ready-to-use format:

**Available data:** 77,429 word-level entries with:
- Arabic text with full diacritics
- Root and lemma
- Part-of-speech tags
- **16 word-level translations** (including English, Urdu, and more)
- Morphological annotations

**Download format:** SQLite database and JSON. Open license.

**Advantages over alternatives:**
- **Single source** covers translations + morphology + roots (others require combining multiple sources)
- **SQLite/JSON format** -- no XML parsing or API scraping needed, lowest processing effort
- **16 translations** included -- we get multi-language word glosses without calling quran.com API
- **Actively maintained** by Tarteel AI (qul.tarteel.ai)

**Processing:** A build-time Python script reads the SQLite/JSON, groups by surah:ayah:word, and generates per-ayah JSON files.

#### 1.2.2 Quranic Arabic Corpus (corpus.quran.com) -- Alternative

Licensed under GNU GPL, provides full morphological annotation (~77,430 tokens) including dependency grammar and syntactic roles. More detailed morphological features than QUL (gender, number, case, person, voice, mood, state, derivation). Useful as a supplement for the root exploration pages where deep grammar analysis is shown.

**Download format:** Plain text and XML (corpus.quran.com/download/).

#### 1.2.3 mustafa0x/quran-morphology (GitHub) -- Alternative

A cleaned-up fork of the Quranic Arabic Corpus data with corrections. Uses `quran-morphology.txt` format. Useful as a cross-reference or if the Corpus download changes.

#### 1.2.4 Tanzil.net Word-by-Word XML -- Alternative

Provides `quran-wordbyword.xml` with word-level English translations. Simpler than QUL (no morphology, just word-translation pairs). Redundant if using QUL.

#### 1.2.5 Quran.com API v4 (api-docs.quran.foundation) -- Alternative

REST API with `words=true` parameter for word-by-word translations. Requires API scraping at build time. Redundant if using QUL (which already includes 16 translations).

#### 1.2.6 MASAQ Dataset -- Alternative

Academic dataset with multiple formats. Available for research use. Less practical than QUL for production use.

#### 1.2.7 Hadith Word-by-Word: Not Feasible Yet

> **DataGatherer finding:** No ready-made word-by-word dataset exists for hadith Arabic text. Would require running Arabic NLP tools (CAMeL, Farasa, Buckwalter morphological analyzer) on raw hadith text. This is an NLP pipeline problem, not a data source problem. **Recommend Quran-only for Phase 3/4.**

### 1.3 Proposed Schema

> **Design decision (DataGen2 assessment):** Use separate word files loaded lazily (Option B), NOT inline word data in verse files. This keeps existing verse JSON unchanged and only loads word data when the user activates word-by-word mode.

#### 1.3.1 New JSON files: `words/quran/{surah}/{ayah}.json`

Per-ayah granularity allows the Angular app to lazy-load word data for just the verse being viewed, rather than an entire surah at once:

```json
{
  "index": "words:quran:1:1",
  "kind": "word_list",
  "data": {
    "words": [
      {
        "position": 1,
        "arabic": "بِسْمِ",
        "translation": "In (the) name",
        "transliteration": "bismi",
        "root": "س م و",
        "lemma": "ٱسْم",
        "pos": "N",
        "features": {
          "case": "GEN",
          "gender": "M",
          "number": "S"
        }
      }
    ]
  }
}
```

File count: 6,236 files (one per ayah). Total size estimate: ~77,430 words at ~200 bytes each = ~14 MB raw, ~3 MB gzipped. Individual files are tiny (1-50 words each), ideal for CDN caching.

#### 1.3.2 New JSON file: `words/index/roots.json` (Root Index)

A single index file mapping roots to their summary data, loaded once when entering word exploration mode:

```json
{
  "index": "words:roots:index",
  "kind": "root_index",
  "data": {
    "ر ح م": { "meaning": "mercy, compassion", "count": 339 },
    "ع ل م": { "meaning": "knowledge", "count": 854 }
  }
}
```

Approximately ~1,700 unique roots. Size: ~200 KB.

#### 1.3.3 New JSON files: `words/roots/{root}.json` (Root Detail Pages)

```json
{
  "index": "words:root:رحم",
  "kind": "root_detail",
  "data": {
    "root": "ر ح م",
    "meaning": "mercy, compassion",
    "occurrences": 339,
    "lemmas": [
      {
        "lemma": "رَحْمَة",
        "pos": "N",
        "meaning": "mercy",
        "count": 145,
        "locations": ["2:157", "3:107", "6:12"]
      }
    ],
    "by_book": {
      "quran": {
        "count": 339,
        "locations": ["1:1:3", "1:3:2"]
      }
    },
    "related_roots": ["ر ح ب", "ر ح ل"]
  }
}
```

~1,700 root detail files. Total size: ~5 MB.

### 1.4 Angular Changes

#### 1.4.1 New Components

| Component | Purpose |
|-----------|---------|
| `word-by-word-verse` | Renders Quran verse with clickable words in a grid/table layout |
| `word-popover` | Tooltip/popover showing word translation, root, morphology on click |
| `root-page` | Dedicated page for exploring a root: all derivations, occurrences by book, frequency chart |

#### 1.4.2 Route Additions

```
/#/words/root/{root}        -> root-page component
```

#### 1.4.3 Verse Display Enhancement

The existing `verse-text.component.html` renders `verse.text` as raw HTML strings. For Quran verses (identifiable by path prefix `quran:`), the component would add an alternative "Word-by-Word" view mode:

```html
<!-- Toggle between reading view and word-by-word view -->
<div class="view-toggle">
  <button (click)="viewMode = 'reading'">Reading</button>
  <button (click)="viewMode = 'word-by-word'">Word by Word</button>
</div>

<!-- Word-by-word grid -->
<div *ngIf="viewMode === 'word-by-word'" class="word-grid" dir="rtl">
  <div *ngFor="let word of words" class="word-cell" (click)="showWordDetail(word)">
    <span class="arabic">{{word.arabic}}</span>
    <span class="translation">{{word.translation}}</span>
    <span class="transliteration">{{word.transliteration}}</span>
  </div>
</div>
```

#### 1.4.4 New Service

`WordsService`: Fetches `words/quran/{surah}/{ayah}.json` lazily per-ayah when the user activates word-by-word mode on a verse. Also loads `words/index/roots.json` once for root exploration navigation.

### 1.5 Generator Changes

New build step in `main_add.py`:
1. `init_word_data()` -- Load QUL SQLite/JSON, generate per-ayah word files (`words/quran/{surah}/{ayah}.json`)
2. `init_word_roots()` -- Aggregate root data across all words, generate root index + root detail files
3. (Optional) `enrich_word_morphology()` -- Supplement QUL data with deep morphological features from Quranic Arabic Corpus

### 1.6 Effort Estimate

| Task | Team Member | Effort |
|------|-------------|--------|
| Corpus data parser + Tanzil XML parser | DataGen | Medium |
| Per-ayah file generation (6,236 files) | DataGen | Medium |
| Root index + root detail generation | DataGen | Medium |
| Angular word grid component | UIdev | Medium |
| Root exploration page | UIdev | Medium |
| Quran.com API scraper (optional) | DataGatherer | Low |
| **Total** | | **HIGH** |

> **DataGen2 assessment:** This feature has the highest complexity of all Phase 3 proposals. It involves new data sources, a new file hierarchy, new Angular components, and new routing. **Recommended for Phase 4** unless word-by-word is a top user-facing priority.

### 1.7 Hadith Word-by-Word (Future Extension)

> **DataGatherer research confirmed:** No ready-made word-by-word dataset exists for hadith text.

Word-by-word analysis for hadith text is significantly harder than Quran because:
- No equivalent morphological corpus exists for hadith Arabic text
- Hadith texts are much more varied (not a fixed, curated text like the Quran)
- Would require running Arabic NLP tools on raw text -- an NLP pipeline problem, not a data source problem

**Potential NLP tools for future hadith word analysis:**
- **CAMeL Tools** (NYU Abu Dhabi) -- Arabic morphological analyzer and disambiguator
- **Farasa** -- Arabic text processing toolkit (segmentation, POS tagging, NER)
- **Buckwalter Morphological Analyzer** -- Standard Arabic morphological analysis

Recommended: Quran-only for Phase 3/4. Hadith word analysis deferred until NLP pipeline is evaluated.

---

## 2. AI-Powered Multi-Language Translations

### 2.1 Overview

> **Status (2026-02-27):** An AI content pipeline has been built using Claude Code agents (not Batch API). It supports 11 languages with word-by-word analysis, diacritized text, isnad/matn analysis, and content tagging. Structure pass caching is implemented. See `ThaqalaynDataGenerator/CLAUDE.md` for full details. The pipeline below remains valid for bulk Batch API translation as an alternative/complement to the agent-based approach.

Use Claude (Anthropic's AI) to translate Arabic hadith and Quran texts into languages beyond those currently available. The current data has English translations for most content and French for some ThaqalaynAPI books. AI translation could add: Urdu, Turkish, Farsi/Persian, Malay/Indonesian, Bengali, Spanish, and more.

### 2.2 Translation Strategy

#### 2.2.1 Direct Arabic-to-Target vs. Arabic+English-to-Target

**Recommended: Arabic + English as dual input.**

Rationale:
- Arabic alone risks hallucination of religious meaning (Claude trained primarily on English text)
- English alone loses Arabic nuance (especially for idiomatic expressions, literary Arabic)
- Dual input lets the model cross-reference: Arabic text for accuracy, English translation for context and established scholarly interpretation
- This approach mirrors how human translators of religious texts work

#### 2.2.2 Prompt Template

```
You are translating Islamic religious hadith (sayings of the Prophet and Imams).

Arabic source text:
{arabic_text}

English reference translation:
{english_text}

Translate this hadith into {target_language}.

Rules:
- Preserve the religious and scholarly tone of the original
- Keep proper nouns in their established transliterations for {target_language}
- Do not add commentary or interpretation
- Break the translation into natural paragraphs matching the source structure
- Use formal/literary register appropriate for religious scripture
```

#### 2.2.3 Paragraph Breaking

The team lead specifically requested that AI translations be broken into sentences/paragraphs for readability, not delivered as a wall of text. The prompt template above instructs the model to match the source structure. Post-processing can also:
1. Split on sentence-ending punctuation in the target language
2. Insert paragraph breaks at narrator chain boundaries (where sanad meets matn)
3. Use the same `string[]` format as existing translations (array of paragraph strings)

### 2.3 Cost Analysis

#### 2.3.1 Corpus Size

| Book | Hadiths | Est. Arabic tokens | Est. English tokens |
|------|---------|-------------------|-------------------|
| Al-Kafi | ~16,000 | ~3.2M | ~4.8M |
| Quran | 6,236 ayat | ~78K | ~120K |
| ThaqalaynAPI books (17) | ~7,228 | ~1.4M | ~2.2M |
| **Total** | ~29,464 | ~4.7M | ~7.1M |

Note: Arabic tokenization is roughly 1.5-2x English for the same content (more tokens per word).

#### 2.3.2 Per-Language Cost (Claude Haiku 4.5 Batch API)

Using the cheapest model suitable for translation (Claude Haiku 4.5 with Batch API 50% discount):

| Item | Tokens | Rate | Cost |
|------|--------|------|------|
| Input (Arabic + English + prompt) | ~14M | $0.50/1M | $7.00 |
| Output (target language) | ~7M | $2.50/1M | $17.50 |
| **Per language** | | | **~$24.50** |

For 10 languages: ~$245 total. For 20 languages: ~$490 total.

With prompt caching (system prompt reused across hadiths in same batch), input costs drop further: ~$0.30/1M effective rate brings total per language to ~$20.

#### 2.3.3 Quality Tier Strategy

| Tier | Model | Cost/lang | Use Case |
|------|-------|-----------|----------|
| Standard | Haiku 4.5 Batch | ~$24 | Most languages, good quality |
| Premium | Sonnet 4.6 Batch | ~$95 | Major languages (Urdu, Turkish, Farsi) |
| Verified | Opus 4.6 Batch | ~$375 | Critical/flagship translations |

**Recommendation:** Use Haiku for all languages initially ($245 for 10 languages), then upgrade specific high-traffic languages to Sonnet if quality review shows deficiencies.

### 2.4 Proposed Schema Changes

> **DataGen2 assessment:** AI translations fit naturally into the existing translation system. The current `List[str]` storage format already supports multi-paragraph output (each paragraph as a separate string in the array). No verse/chapter schema changes needed -- only the translation metadata index needs new fields.

#### 2.4.1 Translation ID Convention

AI translation IDs follow the pattern `{lang}.ai-{model}`:
- `ur.ai-haiku-4.5` -- Urdu via Claude Haiku 4.5
- `tr.ai-sonnet-4.5` -- Turkish via Claude Sonnet 4.5

This convention makes AI translations sort together in the dropdown per language, visually distinguishable from human translations (`en.hubeali`, `en.sarwar`, `en.qarai`).

#### 2.4.2 Translation Metadata Extension

Current `index/translations.json` stores `{ name, id, lang }`. Add:

```json
{
  "id": "ur.ai-haiku-4.5",
  "name": "Urdu (AI: Claude Haiku 4.5)",
  "lang": "ur",
  "source": "ai",
  "model": "claude-haiku-4-5-20251001",
  "generated_date": "2026-02-21",
  "base_translations": ["ar", "en.hubeali"],
  "disclaimer": "This translation was generated by AI and may contain inaccuracies. The original Arabic text is authoritative."
}
```

New fields: `source` ("human" or "ai"), `model` (exact model ID), `generated_date`, `base_translations` (source texts used as input), `disclaimer` (displayed to user when this translation is selected).

#### 2.4.3 Translation TypeScript Interface Update

```typescript
export interface Translation {
  name: string;
  id: string;
  lang: string;
  source?: 'human' | 'ai';    // new
  model?: string;              // new
  generated_date?: string;     // new
  disclaimer?: string;         // new
}
```

#### 2.4.4 API Call Volume

~21,000 API calls per language (Quran ayat + Al-Kafi hadiths + ThaqalaynAPI hadiths). Using the Batch API, these are submitted as a single batch job that processes asynchronously with 50% cost discount.

#### 2.4.3 UI Indicator

The translation dropdown should visually distinguish AI translations from human ones. A small icon or "(AI)" suffix in the dropdown option text, with a tooltip explaining: "This translation was generated by AI and may contain inaccuracies. The original Arabic text is authoritative."

### 2.5 Quality Assurance

1. **Build-time validation:** After batch translation, run automated checks:
   - Output is valid UTF-8 in the target language script
   - Output length is within 0.5x-3x of English translation length
   - No English text leaked into non-English output
   - Proper nouns (Allah, Muhammad, etc.) are transliterated correctly
2. **Human review sample:** For each language, manually review 50 random hadiths for accuracy
3. **User feedback:** Add a "Report translation issue" link on AI-translated content, storing feedback for batch review
4. **Versioning:** Store model version in translation ID so translations can be regenerated with improved models

### 2.6 Implementation Steps

| Step | Team Member | Description |
|------|-------------|-------------|
| 1 | DataGen | Create batch translation script using Claude Batch API |
| 2 | DataGen | Add `source`/`model`/`generated_date` fields to Translation model |
| 3 | DataGen | Generate translations for 5 priority languages |
| 4 | UIdev | Update translation dropdown to show AI indicator |
| 5 | UIdev | Add "Report issue" link for AI translations |
| 6 | QATester | Review 50 hadiths per language for quality |

### 2.7 Priority Languages

Based on global Muslim population and internet usage:

| Priority | Language | Script | Speakers (millions) |
|----------|----------|--------|-------------------|
| 1 | Urdu | Arabic script | 230 |
| 2 | Turkish | Latin | 80 |
| 3 | Farsi/Persian | Arabic script | 110 |
| 4 | Indonesian/Malay | Latin | 270 |
| 5 | Bengali | Bengali script | 230 |
| 6 | Spanish | Latin | 560 |
| 7 | French | Latin | 320 |
| 8 | German | Latin | 130 |
| 9 | Russian | Cyrillic | 260 |
| 10 | Chinese (Simplified) | CJK | 1,100 |

Note: French human translations already exist for some ThaqalaynAPI books. AI French translations would fill gaps.

---

## 3. Narrator Page Improvements

### 3.1 Overview

The current narrator pages show: Arabic name, list of narrated hadith paths (as colon-separated indices like `al-kafi:1:2:3:4`), and co-narrator subchains. Three improvements are proposed:

1. **Replace path indices with readable breadcrumb text** on narrator pages
2. **Add narrator biographies** (birth/death, teachers, students, reliability)
3. **Design narrator timeline visualization** (future)

### 3.2 Readable Hadith References

#### 3.2.1 Current Problem

On narrator detail pages, hadith references display as raw path indices:

```
Al-Kafi:1:1:1:1      (meaningless to users)
```

The `path-link` component (`path-link.component.html`) does `removeBookPrefix(path)` which strips `/books/` but still shows the numeric path. Users cannot tell which book, volume, chapter, or hadith a reference points to without clicking through.

#### 3.2.2 Options Analysis

> **DataGen2 assessment:** Three options were evaluated. Option B (client-side) is recommended.

**Option A: Build-time pre-computed titles in narrator files (REJECTED)**

Add `verse_path_titles` map to each narrator JSON file, pre-computed from `index/books.en.json`. Size impact: ~19 MB additional (4,860 files x ~50 paths x ~80 chars). **Rejected** due to excessive data bloat for a display-only improvement.

**Option B: Client-side resolution from IndexState (RECOMMENDED)**

The Angular app already loads `index/books.{lang}.json` on init via `IndexState`. The `path-link` component resolves titles at render time by walking up the path hierarchy -- the same logic used by `getCurrentNavigatedCrumbs` in `books.state.ts`.

- Zero data size increase
- Angular-only change: create a `PathTitleService` that caches resolved titles
- Update `path-link` component to inject `PathTitleService` and display resolved title

```typescript
// PathTitleService (new)
@Injectable({ providedIn: 'root' })
export class PathTitleService {
  private cache = new Map<string, string>();

  constructor(private store: Store) {}

  resolveTitle(path: string): string {
    if (this.cache.has(path)) return this.cache.get(path)!;
    // Walk path segments via lastIndexOf(':'), look up each in IndexState
    const title = this.buildBreadcrumbTitle(path);
    this.cache.set(path, title);
    return title;
  }
}
```

**Option C: Pre-computed path-titles lookup file (FALLBACK)**

If Option B causes performance issues with virtual scrolling (hundreds of paths resolving simultaneously), generate a single `index/path-titles.json` file with all path-to-title mappings:

```json
{
  "/books/al-kafi:1:2:3:4": "Al-Kafi > Vol 1 > Book of Intelligence > Ch. 2 > H. 4",
  "/books/quran:2:255": "Quran > Al-Baqarah > 255"
}
```

- Size: ~1.2 MB (all paths with abbreviated titles, one shared file)
- Loaded lazily on first narrator page visit
- Much smaller than Option A (one file vs. embedded in 4,860 narrator files)

**Recommendation:** Implement Option B first (zero cost, Angular-only). If performance testing shows jank with virtual scrolling, fall back to Option C.

### 3.3 Narrator Biographies

#### 3.3.1 Data Sources

> **Key finding (DataGatherer, Feb 2026):** No free, structured, downloadable Shia narrator dataset exists as JSON, CSV, or a database. All sources require scraping, API querying, or manual digitization.

| Source | Type | Content | Format | Accessibility | Coverage |
|--------|------|---------|--------|---------------|----------|
| **en.wikishia.net** | Wiki | Detailed bios: birth/death, lineage, teachers, students, works, reliability | HTML via MediaWiki API | Free, scrapeable | Hundreds to low thousands of narrators |
| **Noor Software Rijal DB** | Digital library | 15,706+ narrator entries from Mu'jam Rijal al-Hadith (al-Khoei), 38 volumes digitized | Proprietary application | **Paid/proprietary** -- not freely scrapeable | Most comprehensive (15K+ narrators) |
| **Mu'jam Rijal al-Hadith** (print) | Book | Same 15,706 entries as Noor Software, with reliability gradings (thiqah, da'if, majhul) | Not digitized as structured data | Manual digitization needed | Complete |
| **thaqalayn.net** narrator profiles | Web | Brief bios linked from hadith pages | HTML | Already partially scraped | Limited metadata |

**Source evaluation:**
- **WikiShia is the best free source** for this project: English-language, Shia-focused, scrapeable, and covers the most important narrators. Its Shia perspective aligns with the project's hadith collections (all Four Books are Shia sources).
- **Noor Software** is the most comprehensive digitized source (15K+ narrators from the authoritative Mu'jam Rijal al-Hadith by Ayatollah al-Khoei), but it is proprietary software, not a free web resource. Licensing would need investigation for any use.
- **No other source** provides a structured, downloadable narrator database. This is a gap in the Islamic digital humanities space.

#### 3.3.2 WikiShia Scraping Plan

WikiShia (en.wikishia.net) runs MediaWiki and exposes a standard API:

```
GET https://en.wikishia.net/api.php?action=query&titles=Zurara_b._A'yan&prop=extracts&exintro=true&format=json
```

**Scraping approach:**
1. Build a mapping of our 4,860 narrator Arabic names to WikiShia article titles (fuzzy matching needed -- see Section 3.3.2.1)
2. For each matched narrator, fetch the article extract via MediaWiki API
3. Parse infobox data (birth, death, era, teachers, students) from the HTML
4. Store structured biography data in narrator JSON files

**Expected coverage:** WikiShia has articles for major narrators (companions of Imams, prominent scholars). Estimated ~500-1,000 of our 4,860 narrators will have articles. Minor narrators mentioned once in a chain likely will not.

#### 3.3.2.1 Name Matching Challenge

The biggest technical challenge for narrator biographies is **matching our 4,860 Arabic narrator names to external source entries**. There is no shared ID system across sources.

**Problems:**
- Different transliteration conventions: "Zurara b. A'yan" vs "Zurarah ibn A'yan" vs "Zuraarah bin A'yan"
- Different diacritization levels: full tashkeel vs partial vs none
- Name variants: kunya (Abu X), laqab (title), nasab (lineage) used inconsistently across sources
- Patronymic chains: "Muhammad b. Ali b. al-Husayn" may appear as "Muhammad b. Ali" or with different chain lengths

**Recommended approach:**
1. **Arabic normalization first:** Strip tashkeel, normalize hamza/teh marbuta/alef maksura (same function as Section 4.3.4)
2. **Fuzzy matching:** Use Levenshtein distance or Jaccard similarity on normalized Arabic names
3. **Multi-pass matching:** Exact match first, then fuzzy, then AI-assisted matching for the remainder
4. **Manual review:** Top 100-200 most-referenced narrators should be manually verified
5. **Confidence scoring:** Store match confidence in metadata so low-confidence matches can be flagged for review

#### 3.3.3 Proposed Schema Addition

```json
{
  "index": "1",
  "path": "/people/narrators/1",
  "titles": { "ar": "زرارة بن أعين", "en": "Zurara b. A'yan" },
  "biography": {
    "birth_year": null,
    "death_year": "150 AH / 767 CE",
    "era": "Companion of Imam al-Baqir and Imam al-Sadiq",
    "location": "Kufa, Iraq",
    "reliability": "Thiqah (trustworthy)",
    "teachers": ["/people/narrators/42", "/people/narrators/88"],
    "students": ["/people/narrators/15", "/people/narrators/103"],
    "summary": "One of the most prominent companions of Imam al-Baqir...",
    "source_url": "https://en.wikishia.net/view/Zurara_b._A'yan"
  },
  "verse_paths": [...],
  "subchains": {...}
}
```

#### 3.3.4 Angular Changes

| Component | Change |
|-----------|--------|
| `people-content` | Add biography section above narrated ahadith: era, reliability badge, birth/death, summary |
| `people-content` | Add "Teachers" and "Students" sections with links to their narrator pages |
| `people-list` | Add reliability column to narrator index table, filterable |
| New: `narrator-timeline` | (Future) SVG timeline showing narrator life span relative to Imams |

#### 3.3.5 English Transliterations for Narrator Names

Currently, narrator `titles.en` is empty for all 4,860 narrators -- only Arabic names exist. Two approaches:

1. **AI transliteration:** Use Claude to transliterate Arabic names to English following standard Islamic studies conventions. Cost: negligible (~$2 for 4,860 short names via Haiku Batch API).
2. **WikiShia cross-reference:** Where articles exist, use the WikiShia article title as the canonical English transliteration.

**Recommendation:** Use WikiShia titles where available, AI for the remainder, with manual review of the top 100 most-narrated names.

### 3.4 Effort Estimate

| Task | Team Member | Effort | Notes |
|------|-------------|--------|-------|
| WikiShia scraper | DataGatherer | Medium | MediaWiki API, ~500-1,000 narrators |
| Name matching algorithm | DataGen | **Medium-High** | Fuzzy Arabic matching, multi-pass (see 3.3.2.1) |
| Biography schema + parser | DataGen | Medium | Structured fields from WikiShia HTML |
| AI name transliteration | DataGen | Low | ~$2 via Haiku Batch for 4,860 names |
| Biography display component | UIdev | Medium | New biography section in people-content |
| Reliability filtering | UIdev | Low | New column + filter in people-list |
| Teacher/student graph | UIdev | High (future) | SVG timeline, deferred |
| **Total** | | **High** | Name matching is the critical-path risk |

---

## 4. Searchable Expandable Navigation

### 4.1 Overview

Replace the current homepage table layout with an expandable/collapsible tree navigation that shows the full hierarchical structure of all books, searchable by Arabic or English text.

### 4.2 Current State

The homepage (`chapter-list` component) displays a Material table of top-level books. Navigation requires drilling down through multiple levels (Book -> Volume -> Book -> Chapter) with full page loads at each level. Users cannot see the full structure at a glance or search within it.

### 4.3 Proposed Design

#### 4.3.1 Component: Angular CDK Flat Tree + Virtual Scroll

**Why CDK Flat Tree (not mat-tree or mat-accordion):**
- `mat-tree` has known performance issues with large datasets (Angular issue #15960)
- `mat-accordion` supports only 1-2 nesting levels
- CDK Flat Tree provides the primitives (expand/collapse, indentation) without opinionated rendering, allowing custom performance optimizations
- Virtual scrolling keeps DOM at 12-15 visible nodes regardless of total dataset size

**Data source:** The existing `index/books.{lang}.json` files already loaded by `IndexState` on app init. These contain `{ path -> { title, local_index, part_type } }` for every node in the hierarchy. A path like `al-kafi:1:2:3` encodes the tree structure directly (parent = `al-kafi:1:2`).

#### 4.3.2 Tree Structure

```
[v] The Holy Quran                    (114 suras)
    [ ] Al-Fatiha (The Opening)
    [ ] Al-Baqarah (The Cow)
    ...
[v] Al-Kafi                           (8 volumes)
    [v] Volume One
        [v] Book of Intelligence and Ignorance
            [ ] Chapter 1: ...
            [ ] Chapter 2: ...
        [>] Book of the Virtue of Knowledge
        ...
[>] Man La Yahduruhu al-Faqih         (5 volumes)
[>] Tahdhib al-Ahkam                  (10 volumes)
...
```

Expand/collapse icons: `[v]` = expanded, `[>]` = collapsed, `[ ]` = leaf (no children).

#### 4.3.3 Search Behavior

| Feature | Implementation |
|---------|---------------|
| Search box | `mat-form-field` with `matInput`, debounced 300ms |
| Arabic normalization | Strip tashkeel, normalize hamza/teh marbuta/alef maksura, remove tatweel |
| Match display | Matching nodes highlighted, parent path auto-expanded |
| Breadcrumb in results | Each match shows full path: "Al-Kafi > Vol 1 > Book of Intelligence > Ch. 2" |
| Performance | `<15ms` tree build, `<5ms` filter for 10,000+ entries (string matching on pre-normalized text) |

#### 4.3.4 Arabic Normalization Function

```typescript
function normalizeArabic(text: string): string {
  return text
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670]/g, '')  // strip tashkeel
    .replace(/[إأآ]/g, 'ا')    // normalize hamza
    .replace(/ة/g, 'ه')        // normalize teh marbuta
    .replace(/ى/g, 'ي')        // normalize alef maksura
    .replace(/ـ/g, '');         // remove tatweel
}
```

This normalization is applied at build time to create a `normalized_title` field in the index, and at query time to the user's search input. Exact same normalization used as proposed in [FEATURE_PROPOSALS.md](FEATURE_PROPOSALS.md) Section 1 (Search).

#### 4.3.5 Mobile Layout

On narrow screens (`<768px`), the tree navigation appears in a slide-out drawer triggered by a hamburger menu icon, or as a bottom sheet. Uses Angular CDK `Overlay` (already available, no new dependencies).

### 4.4 Design Decisions

Four open questions were raised during design review. Architect recommendations:

#### Q1: Replace homepage table entirely, or sidebar/drawer alongside?

**Recommendation: Replace the homepage table entirely.**

Rationale:
- The current table shows only the top level (Quran, Al-Kafi). The tree shows the full hierarchy at a glance -- strictly more useful.
- Maintaining two navigation views (table + tree) doubles the UI surface area and testing burden.
- The tree's collapsed default state (see Q2) provides the same visual simplicity as the current table when first loaded.
- The search box is the key new affordance. Putting it in a sidebar risks it being overlooked.
- On mobile, a full-page tree is simpler than a table-plus-drawer combo.

**Alternative considered:** A sidebar tree alongside the content area (like VS Code's explorer). Rejected because the homepage IS the navigation -- there is no "content" to show alongside it until the user selects a chapter.

#### Q2: Default collapsed or show 1-2 levels expanded?

**Recommendation: Default collapsed (just book names), with one exception.**

- Show only top-level book names when the page loads: "The Holy Quran", "Al-Kafi", etc.
- **Exception:** If the user navigated back to the homepage from a specific book (e.g., they were reading Al-Kafi), auto-expand that book's branch to their last visited level. This provides continuity and makes "resume reading" natural.
- This keeps the initial view clean and fast (only ~5-10 visible nodes with current book count, ~30 with full expansion).
- Users who want to explore expand manually; users who want to search use the search box.

#### Q3: Search results: navigate immediately on click, or highlight in tree first?

**Recommendation: Highlight in tree first, navigate on second click (or Enter).**

- Immediate navigation on click is jarring when users are exploring search results and may want to compare multiple matches.
- First click: scroll the tree to the matched node, highlight it, auto-expand its ancestors to show context.
- Second click (or Enter key): navigate to the chapter/verse page.
- This two-step interaction matches familiar patterns (file explorers, IDE search results).
- **Mobile exception:** On touch devices, a single tap navigates immediately (no hover state available, and two taps feels sluggish on mobile).

#### Q4: Keyboard navigation?

**Recommendation: Yes, full keyboard support.**

- Arrow Up/Down: move focus between visible tree nodes
- Arrow Right: expand a collapsed node (or move to first child if already expanded)
- Arrow Left: collapse an expanded node (or move to parent if already collapsed)
- Enter: navigate to the focused node's page
- Home/End: jump to first/last visible node
- Type-ahead: typing characters while tree is focused filters to matching nodes (same as search box)

This is standard `role="tree"` ARIA behavior and required for WCAG 2.1 AA compliance. CDK Flat Tree provides keyboard handling primitives (`cdkTreeNodeToggle`, focus management).

### 4.5 Implementation

| Step | Team Member | Description |
|------|-------------|-------------|
| 1 | DataGen | Add `normalized_title` (ar + en) to `index/books.{lang}.json` entries |
| 2 | UIdev | Create `book-tree` component with CDK Flat Tree + Virtual Scroll |
| 3 | UIdev | Add search input with Arabic normalization |
| 4 | UIdev | Add mobile drawer/sheet layout |
| 5 | UIdev | Integrate into homepage, replacing or augmenting current table |
| 6 | QATester | Test performance with full 30+ book dataset, RTL, mobile |

### 4.5 Dependencies

- No new npm packages needed (`@angular/cdk` already installed)
- Requires `index/books.{lang}.json` to contain entries for ALL books (see Section 5: Breadcrumb Fix)
- Performance testing with the target 10,000+ entry dataset should be done before shipping

---

## 5. Breadcrumb Fix (Quran-Specific Index Bug)

> **Clarification (UIdev investigation):** Breadcrumbs are working correctly on Al-Kafi pages. The full trail `Home >> Al-Kafi >> Volume One >> ...` renders properly at all hierarchy levels. The issue was **Quran-specific** -- caused by missing Quran entries in the book index, not a component or selector bug. User may want breadcrumbs more prominent (currently 13px font size) -- this is a styling consideration, not a bug.

### 5.1 Problem

Breadcrumbs were not showing on Quran pages specifically. On `https://thaqalayn.netlify.app/#/books/quran:1`, only "Home" was displayed -- no "The Holy Quran > Al-Fatiha" trail. Al-Kafi breadcrumbs worked correctly.

### 5.2 Root Cause

The breadcrumb component (`breadcrumbs.component.ts`) subscribes to `BooksState.getCurrentNavigatedCrumbs`, which walks the path hierarchy by looking up each path segment in `index/books.en.json`. **The index file has 2,368 Al-Kafi entries but zero Quran entries.** Therefore, the selector finds no matches for any Quran path and returns an empty crumbs array.

The issue is in the index generation pipeline (`create_indices.py`), which builds the index from `books/complete/{book}.json` files. The Quran complete file exists (`books/complete/quran.json`, 47 MB) but its entries are not being included in the index -- likely a filtering or path format mismatch.

### 5.3 Fix Plan

**Generator fix (`create_indices.py` or `lib_index.py`):**
1. Verify that `collect_indexes()` traverses `books/complete/quran.json` correctly
2. Ensure Quran paths (e.g., `quran:1`, `quran:2`) are included in the output index
3. Regenerate `index/books.en.json` and `index/books.ar.json`

**Regression test:**
Add to `test_data_validation.py`:
```python
def test_quran_entries_in_books_index():
    with open(index_en_path) as f:
        index = json.load(f)
    quran_entries = [k for k in index if k.startswith('/books/quran:')]
    assert len(quran_entries) >= 114, f"Expected 114+ Quran entries, got {len(quran_entries)}"
```

### 5.4 Status -- FIXED

**Resolved.** The root cause was found in `lib_index.py`: `update_index_files()` used a raw path instead of `get_dest_path()` for the existence check when loading existing index data. The second call (Al-Kafi) always started with an empty dict, overwriting all Quran entries. A 2-line fix resolved this.

- Generator commit: `005cd49` (fix in `lib_index.py`)
- Data commit: `12a3de17` (regenerated `index/books.en.json` with 115 Quran + 2,368 Al-Kafi entries)
- Regression test `test_sequential_updates_preserve_all_books` added to prevent recurrence

### 5.5 Impact on Other Features

This fix is a **prerequisite** for Feature 4 (Searchable Expandable Navigation), which relies on `index/books.{lang}.json` containing entries for all books.

---

## 6. Arabic Text Cross-Validation

### 6.1 Overview

Cross-validate Arabic scripture text from multiple independent sources to build confidence that the text matches the original manuscripts. When discrepancies are found, inform the user with clear visualization -- unless the differences are negligible (diacritics-only) or too numerous (would ruin the reading experience).

Having the same Arabic text confirmed by 2-3 independent sources provides much stronger textual confidence than relying on a single source.

### 6.2 Available Sources for Cross-Validation

| Book | Source 1 (Primary) | Source 2 | Source 3 |
|------|----------|----------|----------|
| **Quran** | tanzil.net (verified text, XML) | corpus.quran.com | quran.com API |
| **Al-Kafi** | hubeali.com (current) | ThaqalaynAPI | rafed.net (HTML) |
| **Man La Yahduruhu** | ThaqalaynAPI (5 vols) | rafed.net (HTML) | lib.eshia.ir |
| **Tahdhib al-Ahkam** | rafed.net (HTML) | lib.eshia.ir | Jafri Library (PDF) |
| **al-Istibsar** | rafed.net (HTML) | lib.eshia.ir | Jafri Library (PDF, 4 vols + complete) |
| **Nahj al-Balagha** | ThaqalaynAPI | rafed.net (HTML) | al-islam.org |
| **Other hadith books** | ThaqalaynAPI | thaqalayn.net mirror | -- |

**Key source: rafed.net** -- Machine-readable HTML + Word downloads for ALL Four Books (Arabic). Selectable text suitable for scraping.

**Key source: lib.eshia.ir** -- Searchable text database covering all Four Books.

**Key source: Jafri Library (jafrilibrary.com)** -- PDF library with 100+ Arabic hadith books including al-Istibsar complete (1,938 pages), Mu'jam Rijal al-Hadith by al-Khoei (24 volumes -- definitive narrator biographical reference), Rijal books by Tusi, Najashi, and Kashi. Content is downloadable PDFs.

### 6.3 Cross-Validation Pipeline

Cross-validation runs at **build time** (during data generation), NOT at runtime.

```
Source A (primary)  ─┐
Source B (secondary) ─┼──> Normalize ──> Compare ──> Annotate JSON
Source C (tertiary)  ─┘
```

#### 6.3.1 Arabic Text Normalization

Before comparison, normalize all Arabic text:
- Strip all tashkeel/diacritics (fatha, damma, kasra, shadda, sukun, tanwin)
- Normalize hamza forms (أ إ آ ء → ا)
- Normalize teh marbuta (ة → ه)
- Normalize alef maksura (ى → ي)
- Remove tatweel (ـ)
- Collapse whitespace

This is the same normalization used for search (Section 4.3.4).

#### 6.3.2 Difference Classification

| Category | Example | Action |
|----------|---------|--------|
| **Identical** | Normalized texts match exactly | Mark as "verified" (green checkmark) |
| **Diacritics-only** | Same consonantal text, different vowel marks | Suppress -- not meaningful for textual integrity |
| **Minor spelling** | ـة vs ـت, hamza placement | Log but don't display (common manuscript variations) |
| **Word-level difference** | Different word in same position | **Display to user** with side-by-side comparison |
| **Phrase-level difference** | Extra or missing phrase | **Display to user** with highlighted additions/deletions |
| **Structural difference** | Different hadith segmentation | Log for manual review, don't display |

**Smart threshold:** If >20% of a hadith's text differs between sources, treat as an alignment error (not a genuine variant) and flag for manual review.

#### 6.3.3 Confidence Scoring

```
confidence = sources_matching / total_sources
```

| Score | Label | Display |
|-------|-------|---------|
| 1.0 | "Verified" | Green checkmark + "Verified across N sources" |
| 0.5-0.99 | "Partial match" | Yellow indicator + diff viewer available |
| < 0.5 | "Unverified" | Grey indicator + "Single source" |
| N/A | "No comparison" | No indicator (only one source exists) |

### 6.4 Proposed Schema

Add optional `validation` field to each verse:

```json
{
  "text": ["بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"],
  "validation": {
    "confidence": 1.0,
    "sources": ["tanzil.net", "corpus.quran.com", "quran.com"],
    "status": "verified"
  }
}
```

For verses with differences:

```json
{
  "validation": {
    "confidence": 0.67,
    "sources": ["hubeali.com", "thaqalayn-api.net", "rafed.net"],
    "status": "partial_match",
    "variants": [
      {
        "source": "rafed.net",
        "diff_type": "word",
        "position": 23,
        "primary_text": "عَلِيٌّ",
        "variant_text": "عَلِيُّ"
      }
    ]
  }
}
```

**Size impact:** ~100 bytes per verified verse, ~300 bytes per variant. Total across ~35,000 verses: ~3.5-7 MB. Negligible.

### 6.5 Angular UI

#### 6.5.1 Verification Badge (Unobtrusive)

- **Green checkmark** near verse reference number for verified texts
- **Yellow indicator** for partial matches (click to expand diff viewer)
- **No badge** for single-source texts

#### 6.5.2 Diff Viewer (Collapsible, On-Demand)

```
┌─────────────────────────────────────────┐
│ Text Comparison (2 of 3 sources agree)  │
├─────────────────────────────────────────┤
│ ✓ hubeali.com   : ...قال [عَلِيٌّ]...  │
│ ✓ thaqalayn-api : ...قال [عَلِيٌّ]...  │
│ ✗ rafed.net     : ...قال [عَلِيُّ]...  │
└─────────────────────────────────────────┘
```

#### 6.5.3 UX Safeguards

1. **Default off:** Badges hidden by default. Enabled via Settings: "Show text verification badges"
2. **Suppress noise:** Diacritics-only variants never shown in UI
3. **Collapse by default:** Diff panels require click to expand
4. **Threshold gate:** If >30% of hadiths on a page have variants, show page-level summary instead of per-hadith badges

### 6.6 Implementation Steps

| Step | Team Member | Description |
|------|-------------|-------------|
| 1 | DataGatherer | Scrape rafed.net Arabic text for all Four Books |
| 2 | DataGatherer | Scrape lib.eshia.ir for additional comparison text |
| 3 | DataGen | Build Arabic normalization + comparison engine |
| 4 | DataGen | Implement hadith-level text alignment algorithm |
| 5 | DataGen | Add `validation` field to verse output |
| 6 | UIdev | Add verification badge + diff viewer components |
| 7 | UIdev | Add settings toggle for verification display |
| 8 | QATester | Verify cross-validation accuracy on sample hadiths |

---

## 7. Full Internationalization (i18n)

### 7.1 Overview

Make the site fully multilingual with these core principles:
- **Arabic text is always displayed** (it is the authoritative source text)
- **A second language** (English by default, user-selectable) is displayed alongside Arabic
- **User language preference persists** across sessions
- **UI chrome** (navigation labels, buttons, headings) is translated to the user's chosen language

### 7.2 Current State

The app currently has:
- Arabic text hardcoded as the primary display language
- English translations selected via a dropdown (`translation-selection` component)
- Translation IDs like `en.qarai`, `en.sarwar` stored in `verse_translations`
- `index/translations.json` stores metadata for all available translations
- URL query parameter `?translation=en.qarai` is used to switch translations (NGXS Navigate action)
- No UI chrome translation (all labels, headings, breadcrumbs are hardcoded English)

### 7.3 Language Preference Persistence

#### 7.3.1 Recommended: URL Query Parameter + localStorage Fallback

**Why not URL path prefix (`/ur/books/quran:1`)?** Path-based locale prefixes require server-side routing changes, duplicate all routes, and break existing bookmarks/links. The app already uses query parameters for translation selection, so extending this pattern is consistent.

**Why not cookies?** Cookies add GDPR consent requirements for EU visitors. localStorage has no such requirement.

**Implementation:**

```typescript
// User navigates to: /books/quran:1?lang=ur
// Or: /books/quran:1?lang=ur&translation=ur.claude-haiku-4.5

// 1. On app init, check sources in priority order:
//    a. URL query param ?lang=XX (highest priority, shareable)
//    b. localStorage 'preferred_lang' (session persistence)
//    c. Browser Accept-Language header (first-visit default)
//    d. Fallback: 'en'

// 2. When user changes language:
//    a. Update URL query param
//    b. Save to localStorage
//    c. Reload UI chrome translations
//    d. Auto-select best available translation for new language
```

#### 7.3.2 Language Selection Component

Extend the existing `translation-selection` component (or add a sibling `language-selection` component) that:
1. Shows a language picker (flag icons or language names in native script)
2. On selection: updates `?lang=` query param, saves to localStorage, triggers UI chrome reload
3. The translation dropdown then filters to show only translations in the selected language

### 7.4 UI Chrome Translation (i18n)

#### 7.4.1 Approach: Static JSON Translation Files (Not Angular i18n)

Angular's built-in i18n (`@angular/localize`) requires separate builds per locale and is designed for compile-time localization. This is impractical for 10+ languages (10 separate builds, 10 separate deployments).

**Instead: Runtime i18n with JSON translation files.** This matches the project's static-JSON-as-API philosophy.

```
index/ui-strings/{lang}.json
```

Example `index/ui-strings/en.json`:
```json
{
  "nav.home": "Home",
  "nav.about": "About",
  "nav.download": "Download",
  "nav.support": "Support",
  "nav.narrators": "Narrators",
  "search.placeholder": "Search books...",
  "verse.reference": "Reference",
  "verse.narrator_chain": "Narrator Chain",
  "breadcrumb.home": "Home",
  "translation.select": "Select Translation",
  "settings.language": "Language",
  "settings.show_verification": "Show text verification badges",
  "pagination.next": "Next",
  "pagination.prev": "Previous",
  "pagination.up": "Up"
}
```

Example `index/ui-strings/ur.json`:
```json
{
  "nav.home": "ہوم",
  "nav.about": "بارے میں",
  "nav.narrators": "راوی",
  "search.placeholder": "کتابیں تلاش کریں...",
  "verse.reference": "حوالہ",
  "pagination.next": "اگلا",
  "pagination.prev": "پچھلا"
}
```

#### 7.4.2 Translation Pipe

```typescript
// translate.pipe.ts
@Pipe({ name: 'translate' })
export class TranslatePipe implements PipeTransform {
  constructor(private i18nService: I18nService) {}

  transform(key: string): string {
    return this.i18nService.get(key);
  }
}

// Usage in templates:
// {{ 'nav.home' | translate }}
// {{ 'pagination.next' | translate }}
```

#### 7.4.3 Angular Changes

| Component | Change |
|-----------|--------|
| All templates | Replace hardcoded English strings with `{{ 'key' | translate }}` |
| `app.component` | Load UI strings JSON on language change |
| `translation-selection` | Add language picker above translation dropdown |
| `breadcrumbs` | Use translated "Home" label |
| `chapter-list` | Translate column headers |
| `verse-text` | Translate "Narrator Chain" label |

#### 7.4.4 RTL Support

The app already handles Arabic RTL text. When the UI language is Arabic, Urdu, or Farsi (RTL scripts), the entire page layout should flip:

```typescript
// In app.component.ts, when language changes:
document.documentElement.dir = isRtlLanguage(lang) ? 'rtl' : 'ltr';
document.documentElement.lang = lang;
```

The existing CSS uses `dir="rtl"` on Arabic text containers. Full RTL layout requires:
- Flex direction reversal (handled by `dir="rtl"` on `<html>`)
- Margin/padding adjustments (use logical properties: `margin-inline-start` instead of `margin-left`)
- Icon mirroring for directional icons (arrows)

### 7.5 AI-Generated UI Translations

The ~50 UI string keys can be translated into all target languages using Claude at negligible cost (~$0.01 per language). However, these should be human-reviewed for religious context accuracy before deployment.

### 7.6 Dual-Language Display

The core display principle: **Arabic is always shown. The user's selected language appears alongside.**

```
┌────────────────────────────────────┐
│ بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ │  ← Arabic (always)
│                                    │
│ Tanrı'nın adıyla, Rahman ve Rahim │  ← User's language (Turkish)
└────────────────────────────────────┘
```

If no translation exists for the user's language in a given chapter, fall back to English, then show Arabic-only with a note: "No {language} translation available for this text."

The existing `getTranslationIfInBookOrDefault` selector in BooksState already implements this fallback logic. It just needs to be extended to consider the user's language preference (currently only considers the selected translation ID).

---

## 8. SEO Strategy

### 8.1 Overview

The site is currently invisible to search engines due to two critical issues:
1. **Hash-based routing (`#/`)** -- Google treats hash fragments as optional; most other search engines ignore them entirely
2. **No server-side rendering** -- The `index.html` shell contains no content; bots see an empty page

### 8.2 Priority 1: Migrate from Hash to Path Routing

**Change in `app-routing.module.ts`:**
```typescript
const routerConfig: ExtraOptions = {
    useHash: false,  // changed from true
    scrollPositionRestoration: 'enabled',
    anchorScrolling: 'enabled',
    onSameUrlNavigation: 'reload'
};
```

**Add Netlify SPA fallback** (`src/_redirects`):
```
/*    /index.html    200
```

This "rewrite" (status 200, NOT redirect) serves `index.html` at every URL path so Angular handles routing client-side.

**Backward compatibility** for old `/#/` bookmarks -- add redirect handler in `app.component.ts`:
```typescript
// Convert /#/books/quran:1 -> /books/quran:1
if (window.location.hash.startsWith('#/')) {
  this.router.navigateByUrl(window.location.hash.substring(1));
}
```

### 8.3 Priority 2: Netlify Prerender Extension

Install the **Netlify Prerender Extension** (free) from the Netlify extensions marketplace. When a bot/crawler requests a page, Netlify runs a headless browser to render the full JavaScript output and returns it as static HTML. Human visitors get the normal SPA. This fixes bot visibility without any code changes.

**Setup:** Netlify dashboard > Extensions > Install "Prerender" > Enable for project > Redeploy.

### 8.4 Priority 3: Meta Tags and Structured Data

#### 8.4.1 Default Meta Tags in `index.html`

```html
<meta name="description" content="Thaqalayn — Quran and hadith collection with Arabic text and English translations.">
<meta property="og:title" content="Thaqalayn">
<meta property="og:description" content="Islamic texts: Quran and hadith collections with translations.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://thaqalayn.netlify.app/">
<meta property="og:site_name" content="Thaqalayn">
<link rel="canonical" href="https://thaqalayn.netlify.app/">
```

#### 8.4.2 Dynamic Meta Tags via `SeoService`

Create an `SeoService` that updates title, description, Open Graph, Twitter Card, canonical URL, and JSON-LD structured data per page:

| Route | Title | Description |
|-------|-------|-------------|
| `/books` | "Thaqalayn" | "Browse Quran and hadith collections with translations" |
| `/books/quran:N` | "{Surah name}" | "Read Surah {name} ({N} verses) in Arabic with English translation" |
| `/books/al-kafi:V:B:C` | "{Chapter name} - Al-Kafi" | "Hadith from Al-Kafi Vol. {V}" |
| `/people/narrators/:id` | "{Narrator name}" | "Biography and hadiths of {name}" |

#### 8.4.3 JSON-LD Structured Data

```json
{
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "name": "Al-Fatiha (The Opening)",
  "alternateName": "الفاتحة",
  "isPartOf": {
    "@type": "Book",
    "name": "The Holy Quran",
    "alternateName": "القرآن الكريم"
  },
  "inLanguage": ["ar", "en"],
  "url": "https://thaqalayn.netlify.app/books/quran:1"
}
```

### 8.5 Priority 4: robots.txt and Sitemap

**`src/robots.txt`:**
```
User-agent: *
Allow: /
Sitemap: https://thaqalayn.netlify.app/sitemap.xml
```

**`src/sitemap.xml`:** Generate at build time from the data, covering:
- Homepage, about, download, support (4 static pages)
- 114 Quran surahs
- Al-Kafi top-level volumes (8 entries)
- Al-Kafi books and chapters (~2,300 entries)
- Narrator index + top narrators
- All other book top-level entries

Total: ~2,500+ URLs. Generated by a Python script during data generation.

### 8.6 Priority 5: Google Search Console

1. Add `<meta name="google-site-verification" content="..." />` to `index.html`
2. Submit sitemap URL
3. Request indexing for key pages

### 8.7 Future: Custom Domain

A custom domain (`thaqalayn.net`, `thaqalayn.org`) significantly improves SEO:
- Domain authority accumulation from backlinks
- Trust signals for search ranking
- Better social media previews
- Cost: ~$10-12/year (the only ongoing cost in the project)

Netlify provisions free Let's Encrypt SSL certificates automatically.

### 8.8 Future: Angular SSG (Prerendering)

Angular 19 supports build-time prerendering via `@angular/ssr` with `outputMode: "static"`. This generates real HTML files at build time for the most important pages, giving the best possible Core Web Vitals scores (a Google ranking factor). `@angular/ssr` is installed. The app currently uses NgModule-based architecture; standalone component migration would simplify SSG integration.

### 8.9 Implementation Steps

| Priority | Step | Team Member | Effort |
|----------|------|-------------|--------|
| 1 | Migrate hash to path routing + `_redirects` | UIdev | Low |
| 2 | Install Netlify Prerender Extension | UIdev | Trivial |
| 3 | Add meta tags to `index.html` + create `SeoService` | UIdev | Medium |
| 4 | Add JSON-LD structured data per page type | UIdev | Medium |
| 5 | Create `robots.txt` | UIdev | Trivial |
| 6 | Generate `sitemap.xml` at build time | DataGen | Low |
| 7 | Google Search Console setup | UIdev | Trivial |
| 8 | Custom domain (optional) | Architect | Trivial |

---

## 9. Implementation Priority and Dependencies

### 9.1 Priority Order

| Priority | Feature | Effort | Impact | Dependencies | Status |
|----------|---------|--------|--------|-------------|--------|
| **1** | **Breadcrumb Fix** (Section 5) | Low | High | None | **DONE** |
| **2** | **SEO: Hash→Path routing** (Section 8.2) | Low | **Critical** -- invisible to search engines | None | Ready |
| **3** | **SEO: Prerender + Meta + Sitemap** (Section 8.3-8.6) | Medium | **Critical** -- enables indexing | Path routing | Ready |
| **4** | **Searchable Navigation** (Section 4) | Medium | High -- core UX improvement | Breadcrumb fix | Ready |
| **5** | **Full i18n** (Section 7) | Medium | High -- unlocks multilingual audience | None | Ready |
| **6** | **AI Translations** (Section 2) | Medium | High -- 10x language coverage | i18n + Schema changes | Pipeline built (agents) |
| **7** | **Cross-Validation** (Section 6) | High | High -- scholarly integrity | Additional data scraping | Ready |
| **8** | **Narrator Improvements** (Section 3) | High | Medium-High -- scholarly value | WikiShia scraper | Ready |
| **9** | **Word-by-Word** (Section 1) | **Very High** | Medium -- learning/study tool | Corpus data processing | **Phase 4** |

### 9.2 Dependency Graph

```
Breadcrumb Fix (DONE)
    |
    +---> Searchable Navigation (#4) ---> Performance testing
    |
    +---> SEO: Hash→Path routing (#8.2) ---> Prerender (#8.3) ---> Meta + Sitemap (#8.4-8.6)

i18n (#7): Language selection + UI strings + RTL
    |
    +---> AI Translations (#2) ---> Translation Quality Review
    |
    +---> Cross-Validation (#6) ---> UI badges (needs i18n for translated labels)

Data Scraping (rafed.net, lib.eshia.ir)
    |
    +---> Cross-Validation (#6) ---> Comparison engine ---> UI
    |
    +---> New Book Parsers (ThaqalaynAPI books)

WikiShia Scraper + Name Matching
    |
    v
Narrator Biographies (#3) ---> Teacher/Student graph

Corpus Data Processing
    |
    v
Word-by-Word (#1) ---> Root Exploration Pages [Phase 4]
```

### 9.3 Recommended Implementation Phases

#### Phase 3A: Foundation & SEO (1-2 weeks)
- ~~Fix breadcrumb index bug (Section 5)~~ **DONE**
- **Migrate hash→path routing** with `_redirects` fallback (Section 8.2) -- **highest priority**
- **Install Netlify Prerender Extension** (Section 8.3)
- **Add meta tags, robots.txt, sitemap.xml** (Section 8.4-8.6)
- **Create `SeoService`** with dynamic meta + JSON-LD per page (Section 8.4)
- Submit to **Google Search Console** (Section 8.6)
- Implement searchable navigation (Section 4)

#### Phase 3B: Internationalization & Content (2-4 weeks)
- **Implement full i18n framework** -- language picker, runtime JSON translation files, translate pipe (Section 7)
- **Generate AI translations** for 5 priority languages: Urdu, Turkish, Farsi, Indonesian, Bengali (Section 2)
- **Scrape rafed.net and lib.eshia.ir** for cross-validation Arabic text (Section 6.2)
- Begin **WikiShia scraper** development (Section 3.3)
- Add narrator English transliterations (Section 3.3.5)

#### Phase 3C: Scholarly Features (2-4 weeks)
- **Build cross-validation pipeline** -- normalization, comparison, confidence scoring (Section 6.3-6.5)
- Complete **narrator biographies** for matched narrators (Section 3.3)
- Implement readable hadith references on narrator pages (Section 3.2)
- Generate AI translations for remaining 5 languages (Section 2)
- Quality review of AI translations (Section 2.5)
- Add verification badges + diff viewer to Angular UI (Section 6.5)

#### Phase 4 (future)
- Word-by-word Quran display (Section 1) -- deferred due to very high complexity
- Root exploration pages (Section 1.3.3)
- Hadith word analysis via NLP (Section 1.7)
- Angular SSG/prerendering for best Core Web Vitals (Section 8.8)
- Custom domain acquisition (Section 8.7)

### 9.4 Cost Summary

| Item | One-Time Cost |
|------|--------------|
| AI translations (10 languages, Haiku Batch) | ~$245 |
| AI name transliteration (4,860 names) | ~$2 |
| AI UI string translations (~50 keys x 10 langs) | ~$0.10 |
| Corpus.quran.com data | Free (GPL) |
| WikiShia data | Free (MediaWiki API) |
| CDK components | Free (already installed) |
| Netlify Prerender Extension | Free |
| Google Search Console | Free |
| Custom domain (optional, annual) | ~$10-12/year |
| **Total (one-time)** | **~$247** |

All infrastructure remains free (Netlify static hosting, build-time computation).

---

## Appendix: Data Sources Reference

### Quran Word-by-Word

| Source | URL | License | Data Format | Recommendation |
|--------|-----|---------|-------------|----------------|
| **QUL (Tarteel AI)** | https://qul.tarteel.ai/ | Open | **SQLite, JSON** | **PRIMARY** |
| Quranic Arabic Corpus | https://corpus.quran.com/ | GNU GPL | Plain text, XML | Supplement (deep morphology) |
| mustafa0x/quran-morphology | https://github.com/mustafa0x/quran-morphology | Open source | Text | Cross-reference |
| Quran.com API v4 | https://api-docs.quran.foundation/ | Free API | JSON REST | Redundant with QUL |
| Tanzil.net | https://tanzil.net/download | Open | XML | Redundant with QUL |
| MASAQ Dataset | Academic | Research | Multiple | Academic alternative |

### Arabic Text Sources (Cross-Validation)

| Source | URL | Content | Format | Books Covered |
|--------|-----|---------|--------|---------------|
| **rafed.net** | https://rafed.net/ | Machine-readable Arabic text | Word download | ALL Four Books |
| **ghbook.ir** | https://www.ghbook.ir/ | Qaimiyyah Digital Library | HTML/EPUB | Tahdhib (10 vols), al-Istibsar (4 vols) |
| **lib.eshia.ir** | https://lib.eshia.ir/ | Searchable Arabic text | HTML | ALL Four Books |
| **ThaqalaynAPI** | https://thaqalayn-api.net/ | Structured JSON (Arabic + English) | REST API | 23 books incl. Man La Yahduruhu |
| **tanzil.net** | https://tanzil.net/download/ | Verified Quran text | XML | Quran |
| **hubeali.com** | https://hubeali.com/ | Al-Kafi HTML (current primary) | HTML | Al-Kafi |
| **Jafri Library** | https://jafrilibrary.com/ | 100+ Arabic hadith book PDFs | PDF download | al-Istibsar (complete, 1,938p), Rijal books |

### Narrator Biographies

| Source | URL | License | Access Method | Coverage |
|--------|-----|---------|--------------|----------|
| **WikiShia (English)** | https://en.wikishia.net/ | CC-BY-SA | MediaWiki API | **Best free source** -- hundreds to low thousands |
| **Mu'jam Rijal al-Hadith (al-Khoei)** | https://jafrilibrary.com/ (24 vol PDF) | Free download | PDF extraction | Complete (15,706 entries) |
| **Rijal al-Kashi** | https://jafrilibrary.com/books/2580 | Free download | PDF (219 pages) | Classical narrator science |
| **Rijal al-Najashi** | https://jafrilibrary.com/books/30235 | Free download | PDF (737 pages) | Classical narrator science |
| Noor Software Rijal DB | Proprietary application | Paid/proprietary | License investigation needed | Most comprehensive (15K+ narrators) |
| thaqalayn.net profiles | https://thaqalayn.net/ | Web | Already partially scraped | Limited metadata |

### AI Translation

| Service | URL | Pricing |
|---------|-----|---------|
| Claude Batch API (Haiku 4.5) | https://docs.anthropic.com/en/docs/about-claude/pricing | $0.50/$2.50 per 1M tokens (batch) |
| Claude Batch API (Sonnet 4.6) | Same | $1.50/$7.50 per 1M tokens (batch) |

### Data Availability for Remaining Four Books

> **Research finding (DataGatherer, Feb 2026):** All Four Books now have at least one structured (non-PDF) Arabic source identified. English translations remain limited for Tahdhib and al-Istibsar.

| Book | Primary Source | Cross-Validation Source | English Translation | Status |
|------|---------------|------------------------|-------------------|--------|
| **Al-Kafi** | Already in system (hubeali.com HTML) | rafed.net (Word download) | HubeAli + Sarwar | Complete |
| **Man La Yahduruhu al-Faqih** | ThaqalaynAPI (JSON, 5 vols) | rafed.net (Word download) | Bab Ul Qaim (5 vols) | Ready for parser |
| **Tahdhib al-Ahkam** | **ghbook.ir** (HTML/EPUB, 10 vols) | **rafed.net** (Word download, 10 vols) | Vols 1-3 only (almuntazar.ca PDF) | Arabic sources ready |
| **al-Istibsar** | **ghbook.ir** (HTML/EPUB, 4 vols) | **rafed.net** (Word download, 4 vols) | **None available** | Arabic sources ready |

Tahdhib and al-Istibsar Arabic text is available from ghbook.ir (Qaimiyyah Digital Library, free HTML/EPUB) and rafed.net (Word download via API). Both sources have structured, selectable text -- not scanned PDFs. Parsing these HTML/EPUB/Word formats is significantly easier than PDF extraction. English translations remain limited: Tahdhib has partial coverage (Vols 1-3), al-Istibsar has none. See [IMPROVEMENT_ROADMAP.md](IMPROVEMENT_ROADMAP.md) Section 3.1.2-3.1.3 for details and DataGatherer task log for source URLs and download APIs.

### Related Project Documents

| Document | Path | Relevance |
|----------|------|-----------|
| Architecture | [ARCHITECTURE.md](ARCHITECTURE.md) | Core constraints all features must respect |
| Schema Proposal | [SCHEMA_PROPOSAL.md](SCHEMA_PROPOSAL.md) | Data model changes enabling new features |
| Parser Architecture | [PARSER_ARCHITECTURE.md](PARSER_ARCHITECTURE.md) | How to add new data sources |
| Feature Proposals | [FEATURE_PROPOSALS.md](FEATURE_PROPOSALS.md) | Search, PWA, bookmarks (complementary features) |
| Optimization Plan | [OPTIMIZATION_PLAN.md](OPTIMIZATION_PLAN.md) | Data size reduction (partially outdated, see SCHEMA_PROPOSAL.md for corrections) |
