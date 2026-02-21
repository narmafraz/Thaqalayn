# Phase 3 Feature Proposal

> This document proposes new features for the Thaqalayn project's Phase 3 (expansion and enhancement). All proposals adhere to the project's core architecture philosophy: **zero ongoing costs, static-only hosting, build-time computation, and progressive enhancement** (see [ARCHITECTURE.md](ARCHITECTURE.md)).

---

## Table of Contents

1. [Word-by-Word Translation System](#1-word-by-word-translation-system)
2. [AI-Powered Multi-Language Translations](#2-ai-powered-multi-language-translations)
3. [Narrator Page Improvements](#3-narrator-page-improvements)
4. [Searchable Expandable Navigation](#4-searchable-expandable-navigation)
5. [Breadcrumb Fix (Quran)](#5-breadcrumb-fix-quran)
6. [Arabic Text Cross-Validation](#6-arabic-text-cross-validation)
7. [Implementation Priority and Dependencies](#7-implementation-priority-and-dependencies)
8. [Appendix: Data Sources Reference](#appendix-data-sources-reference)

---

## 1. Word-by-Word Translation System

### 1.1 Overview

Add word-by-word Arabic analysis for Quran verses, allowing users to tap/click any Arabic word to see its translation, root, morphological breakdown, and occurrences across the corpus. This addresses a common need for Arabic learners and scholars studying the Quran.

### 1.2 Data Sources

Four complementary open data sources provide the word-level data needed:

#### 1.2.1 Quranic Arabic Corpus (corpus.quran.com)

The primary source for morphological analysis. Licensed under GNU GPL, it provides morphological annotation for every word in the Quran (~77,430 tokens).

**Available data per word:**
- **Position**: Surah:Ayah:Word index (e.g., 1:1:1)
- **Arabic text**: The word with full diacritics
- **Transliteration**: Buckwalter transliteration
- **Part of speech**: N (noun), V (verb), P (particle), etc.
- **Root**: 3-letter Arabic root (e.g., ر ح م)
- **Lemma**: Dictionary form
- **Morphological features**: Gender, number, case, person, voice, mood, state, derivation
- **Dependency grammar**: Syntactic role in the ayah

**Download format:** Plain text and XML (available at corpus.quran.com/download/).

**Processing:** A build-time Python script parses the morphology file, groups by surah:ayah:word position, and generates per-surah JSON files.

#### 1.2.2 mustafa0x/quran-morphology (GitHub)

A cleaned-up fork of the Quranic Arabic Corpus data with corrections. Uses `quran-morphology.txt` format that maps directly to the corpus data. Useful as a cross-reference or alternative if the corpus download format changes.

#### 1.2.3 Tanzil.net Word-by-Word XML

Tanzil provides `quran-wordbyword.xml` with pre-tokenized word-level English translations for every Quran word. This is a simpler data source than the Corpus (no morphology, just word-translation pairs) but provides the core word gloss data needed for the UI grid. Can be combined with Corpus morphology for the full picture.

**Download:** Available from tanzil.net/download as XML.

#### 1.2.4 Quran.com API v4 (api-docs.quran.foundation)

Provides word-by-word translation via REST API with `words` field parameter. Can be used to obtain pre-translated word glosses in multiple languages. The API endpoint `verses/by_chapter/{chapter_number}` accepts a `words=true` parameter and a `word_fields` parameter for morphology.

**Usage:** Scrape word-by-word translations at build time (respecting rate limits), store as static JSON alongside the morphology data. This adds human-curated English word glosses without manual translation effort.

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
1. `init_word_morphology()` -- Parse corpus.quran.com morphology file, generate per-surah word files
2. `init_word_roots()` -- Aggregate root data across all words, generate root detail files
3. `init_word_translations()` -- (Optional) Fetch word glosses from quran.com API at build time

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

Word-by-word analysis for hadith text is significantly harder than Quran because:
- No equivalent morphological corpus exists for hadith Arabic text
- Hadith texts are much more varied (not a fixed, curated text like the Quran)
- Would require AI-powered morphological analysis (NLP problem, not just data mapping)

Recommended: Start with Quran only, extend to hadith later using Claude API for morphological tagging.

---

## 2. AI-Powered Multi-Language Translations

### 2.1 Overview

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
| Premium | Sonnet 4.5 Batch | ~$95 | Major languages (Urdu, Turkish, Farsi) |
| Verified | Opus 4.5 Batch | ~$375 | Critical/flagship translations |

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

| Source | Type | Content | Format | Accessibility |
|--------|------|---------|--------|---------------|
| **en.wikishia.net** | Wiki | Detailed bios for major narrators: birth/death, lineage, teachers, students, works, reliability assessments | HTML via MediaWiki API | Free, scrapeable via `api.php?action=query` |
| **Mu'jam Rijal al-Hadith** (al-Khoei) | Book | 15,706 narrator entries with reliability gradings (thiqah, da'if, majhul) | Not digitized as structured data | Would need manual digitization |
| **thaqalayn.net** narrator profiles | Web | Brief bios linked from hadith pages | HTML | Already partially scraped |

#### 3.3.2 WikiShia Scraping Plan

WikiShia (en.wikishia.net) runs MediaWiki and exposes a standard API:

```
GET https://en.wikishia.net/api.php?action=query&titles=Zurara_b._A'yan&prop=extracts&exintro=true&format=json
```

**Scraping approach:**
1. Build a mapping of our 4,860 narrator Arabic names to WikiShia article titles (fuzzy matching needed due to transliteration variations)
2. For each matched narrator, fetch the article extract via MediaWiki API
3. Parse infobox data (birth, death, era, teachers, students) from the HTML
4. Store structured biography data in narrator JSON files

**Expected coverage:** WikiShia has articles for major narrators (companions of Imams, prominent scholars). Estimated ~500-1,000 of our 4,860 narrators will have articles. Minor narrators mentioned once in a chain likely will not.

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

| Task | Team Member | Effort |
|------|-------------|--------|
| WikiShia scraper | DataGatherer | Medium |
| Name matching algorithm | DataGen | Medium |
| Biography schema + parser | DataGen | Medium |
| AI name transliteration | DataGen | Low |
| Biography display component | UIdev | Medium |
| Reliability filtering | UIdev | Low |
| Teacher/student graph | UIdev | High (future) |
| **Total** | | **High** |

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

## 7. Implementation Priority and Dependencies

### 7.1 Priority Order

| Priority | Feature | Effort | Impact | Dependencies | Status |
|----------|---------|--------|--------|-------------|--------|
| **1** | **Breadcrumb Fix** (Section 5) | Low | High | None | **DONE** (commit `005cd49`) |
| **2** | **Searchable Navigation** (Section 4) | Medium | High -- core UX improvement | Breadcrumb fix | Ready |
| **3** | **AI Translations** (Section 2) | Medium | High -- 10x language coverage | Schema changes from SCHEMA_PROPOSAL.md | Ready |
| **4** | **Narrator Improvements** (Section 3) | High | Medium-High -- scholarly value | WikiShia scraper | Ready |
| **5** | **Word-by-Word** (Section 1) | **HIGH** | Medium -- learning/study tool | Corpus data processing | **Phase 4 recommended** |

> **Note from DataGen2:** Word-by-Word is the highest complexity feature (new data sources, new file hierarchy, new routes). Consider deferring to Phase 4 unless it is a top user-facing priority.

### 7.2 Dependency Graph

```
Breadcrumb Fix (#5)
    |
    v
Searchable Navigation (#4)
    |
    v
[Can proceed independently from here]

Schema Changes (SCHEMA_PROPOSAL.md Phase 1)
    |
    +---> AI Translations (#2) ---> Translation Quality Review
    |
    +---> Narrator Biographies (#3) ---> WikiShia Scraper ---> Name Matching

Corpus Data Processing
    |
    v
Word-by-Word (#1) ---> Root Exploration Pages
```

### 7.3 Recommended Implementation Phases

#### Phase 3A: Foundation (1-2 weeks)
- ~~Fix breadcrumb index bug (Section 5)~~ **DONE**
- Implement searchable navigation (Section 4)
- Begin WikiShia scraper development (Section 3.3)

#### Phase 3B: Content Expansion (2-4 weeks)
- Generate AI translations for 5 priority languages (Section 2)
- Complete narrator biographies for matched narrators (Section 3.3)
- Add narrator English transliterations (Section 3.3.5)
- Implement readable hadith references on narrator pages (Section 3.2)

#### Phase 3C: Polish (1-2 weeks)
- Generate AI translations for remaining 5 languages (Section 2)
- Add reliability filtering to narrator list (Section 3.3.4)
- Quality review of AI translations (Section 2.5)
- Performance testing of navigation with full dataset

#### Phase 4 (future)
- Word-by-word Quran display (Section 1) -- deferred due to high complexity
- Root exploration pages (Section 1.3.3)
- Hadith word analysis via NLP (Section 1.7)

### 7.4 Cost Summary

| Item | One-Time Cost |
|------|--------------|
| AI translations (10 languages, Haiku Batch) | ~$245 |
| AI name transliteration (4,860 names) | ~$2 |
| Corpus.quran.com data | Free (GPL) |
| WikiShia data | Free (MediaWiki API) |
| CDK components | Free (already installed) |
| **Total** | **~$247** |

All infrastructure remains free (Netlify static hosting, build-time computation).

---

## Appendix: Data Sources Reference

### Quran Word-by-Word

| Source | URL | License | Data Format |
|--------|-----|---------|-------------|
| Quranic Arabic Corpus | https://corpus.quran.com/ | GNU GPL | Plain text, XML |
| mustafa0x/quran-morphology | https://github.com/mustafa0x/quran-morphology | Open source | Text (morphology annotations) |
| Quran.com API v4 | https://api-docs.quran.foundation/ | Free API | JSON REST |
| QuranMorphology.com | https://quranmorphology.com/ | Open source | Web (roots, lemmas, grammar) |

### Narrator Biographies

| Source | URL | License | Access Method |
|--------|-----|---------|--------------|
| WikiShia (English) | https://en.wikishia.net/ | CC-BY-SA | MediaWiki API |
| Mu'jam Rijal al-Hadith | N/A (print) | N/A | Manual digitization needed |
| thaqalayn.net profiles | https://thaqalayn.net/ | Web | Already partially scraped |

### AI Translation

| Service | URL | Pricing |
|---------|-----|---------|
| Claude Batch API (Haiku 4.5) | https://platform.claude.com/docs/en/about-claude/pricing | $0.50/$2.50 per 1M tokens (batch) |
| Claude Batch API (Sonnet 4.5) | Same | $1.50/$7.50 per 1M tokens (batch) |

### Related Project Documents

| Document | Path | Relevance |
|----------|------|-----------|
| Architecture | [ARCHITECTURE.md](ARCHITECTURE.md) | Core constraints all features must respect |
| Schema Proposal | [SCHEMA_PROPOSAL.md](SCHEMA_PROPOSAL.md) | Data model changes enabling new features |
| Parser Architecture | [PARSER_ARCHITECTURE.md](PARSER_ARCHITECTURE.md) | How to add new data sources |
| Feature Proposals | [FEATURE_PROPOSALS.md](FEATURE_PROPOSALS.md) | Search, PWA, bookmarks (complementary features) |
| Optimization Plan | [OPTIMIZATION_PLAN.md](OPTIMIZATION_PLAN.md) | Data size reduction (partially outdated, see SCHEMA_PROPOSAL.md for corrections) |
