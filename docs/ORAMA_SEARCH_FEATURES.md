# Orama Search Engine Features Reference (v3.1.18)

Comprehensive reference for all features and capabilities of the Orama search engine as installed in this project. Each section documents what the feature does, whether it is currently used, how hard it would be to adopt, and whether it would benefit the Thaqalayn project.

**Installed version:** `@orama/orama@3.1.18`
**Current usage file:** `src/app/services/search.service.ts`

---

## Table of Contents

1. [Search Parameters](#1-search-parameters)
2. [Index Features (Schema Types)](#2-index-features-schema-types)
3. [Tokenizer, Stemming, and Language Support](#3-tokenizer-stemming-and-language-support)
4. [Plugin System](#4-plugin-system)
5. [Faceted Search](#5-faceted-search)
6. [Geosearch](#6-geosearch)
7. [Vector Search and Hybrid Search](#7-vector-search-and-hybrid-search)
8. [Grouping](#8-grouping)
9. [Sorting](#9-sorting)
10. [Filters (Where Clause)](#10-filters-where-clause)
11. [Serialization (Save/Load)](#11-serialization-saveload)
12. [Custom Components](#12-custom-components)
13. [Results Pinning (Merchandising)](#13-results-pinning-merchandising)
14. [Answer Sessions (RAG)](#14-answer-sessions-rag)
15. [Preflight Queries](#15-preflight-queries)
16. [Recommendations for Thaqalayn](#16-recommendations-for-thaqalayn)

---

## 1. Search Parameters

All parameters available on the `search()` function for full-text mode (`SearchParamsFullText`).

### `term` (string)
- **What it does:** The search query string. Words are tokenized, normalized, and matched against the index.
- **Currently used:** Yes. Both `searchTitles()` and `searchFullText()` pass `term: normalizedQuery`.
- **Notes:** If omitted or empty, Orama returns all documents (useful for browse/filter-only queries).

### `properties` (string[] | '*')
- **What it does:** Restricts which schema fields are searched. Defaults to all string properties if omitted. Pass `'*'` to search all.
- **Currently used:** Yes. Titles search uses `['en', 'ar', 'arn', 'pt']`; full-text uses `['ar', 'en', 't']`.
- **Benefit:** Already well-used. Could be refined to boost relevance by searching fewer properties for specific query types.

### `limit` (number, default: 10)
- **What it does:** Maximum number of hits to return.
- **Currently used:** Yes. Titles default to 20, full-text defaults to 30.

### `offset` (number, default: 0)
- **What it does:** Skips the first N results. Used for pagination.
- **Currently used:** No.
- **Benefit:** **High.** Enables "load more" or paginated search results. Implementation is trivial -- just pass `offset` alongside `limit`.
- **Difficulty:** Easy.

### `threshold` (number, 0-1, default: 1)
- **What it does:** Controls AND vs OR behavior for multi-word queries.
  - `threshold: 0` = strict AND -- only documents containing **all** search terms are returned.
  - `threshold: 1` = permissive OR -- documents containing **any** search term are returned (default).
  - `threshold: 0.6` = returns all AND-matching documents, plus 60% of OR-only matches.
- **Currently used:** No (uses the default of 1, which is OR behavior).
- **Benefit:** **High.** Setting `threshold: 0` for full-text hadith search would dramatically improve precision. A user searching "Prophet Muhammad" would only get hadiths mentioning both words, not every hadith mentioning "Prophet" separately. Could also be exposed as a UI toggle ("Match all words" / "Match any word").
- **Difficulty:** Easy -- single parameter addition.

### `tolerance` (number, default: 0)
- **What it does:** Maximum Levenshtein distance for fuzzy/typo-tolerant matching. A tolerance of 1 means one character can differ (e.g., "headpones" matches "headphones").
- **Currently used:** No.
- **Benefit:** **Medium.** Useful for English transliteration typos (e.g., "Muhammed" vs "Muhammad"). Less useful for Arabic since the project already normalizes diacritics. A tolerance of 1 is a good conservative default.
- **Difficulty:** Easy -- single parameter addition.
- **Caution:** Higher tolerance values (2+) can slow search and produce false positives, especially on large indexes.

### `exact` (boolean, default: false)
- **What it does:** When true, only returns documents where the search term appears as an exact word boundary match (case-sensitive in v3.1.18). Orama internally filters by regex `\b{term}\b` on the original document text.
- **Currently used:** No.
- **Benefit:** **Low-Medium.** Could be useful for precise hadith number lookups or exact phrase matching in English translations.
- **Difficulty:** Easy.

### `boost` (Record<string, number>)
- **What it does:** Multiplies the relevance score of specific properties. A boost of 2 on `title` means title matches count double.
- **Currently used:** No.
- **Benefit:** **High.** The current title search treats `en`, `ar`, `arn`, and `pt` equally. Boosting `en` and `ar` (the actual title fields) over `pt` (part type) would improve result quality. For full-text, boosting `en` (English translation) over `ar` (Arabic) for English queries -- or vice versa -- would be very effective. Example:
  ```typescript
  boost: { en: 2, ar: 1, t: 0.5 }
  ```
- **Difficulty:** Easy -- single parameter addition.

### `relevance` / BM25 Parameters (`{ k, b, d }`)
- **What it does:** Tunes the BM25 ranking algorithm:
  - `k` (default 1.2): Term frequency saturation. Higher = more weight on repeated terms. Range: 1.2-2.0.
  - `b` (default 0.75): Document length normalization. Higher = longer documents penalized more. Range: 0-1.
  - `d` (default 0.5): Frequency normalization lower bound.
- **Currently used:** No (uses defaults).
- **Benefit:** **Medium.** Hadith texts vary greatly in length (a one-line hadith vs a multi-paragraph one). Lowering `b` to ~0.5 would reduce the penalty on longer hadiths. Tuning `k` upward could help for very common terms in Arabic.
- **Difficulty:** Medium -- requires empirical testing to find good values for this corpus.

### `sortBy` (SorterParams | CustomSorterFunction)
- **What it does:** See [Sorting](#9-sorting) section.

### `facets` (FacetsParams)
- **What it does:** See [Faceted Search](#5-faceted-search) section.

### `groupBy` (GroupByParams)
- **What it does:** See [Grouping](#8-grouping) section.

### `where` (WhereCondition)
- **What it does:** See [Filters](#10-filters-where-clause) section.

### `distinctOn` (string)
- **What it does:** Returns only one result per unique value of the specified property. For example, `distinctOn: 'category'` returns at most one result per category.
- **Currently used:** No.
- **Benefit:** **Medium.** Could be used to show one result per book/volume in search results, avoiding a wall of results from a single chapter.
- **Difficulty:** Easy -- single parameter addition.

### `preflight` (boolean)
- **What it does:** See [Preflight Queries](#15-preflight-queries) section.

### `includeVectors` (boolean, default: false)
- **What it does:** Whether to include vector embeddings in results. Not relevant unless using vector search.
- **Currently used:** No. Not applicable to current setup.

---

## 2. Index Features (Schema Types)

Orama supports 10 schema types for indexing documents:

| Type | Description | Searchable (full-text) | Filterable (where) | Sortable |
|------|-------------|----------------------|-------------------|----------|
| `string` | Text field, tokenized and indexed | Yes | Yes (exact token match) | Yes |
| `number` | Numeric value (int or float) | No | Yes (gt, gte, lt, lte, eq, between) | Yes |
| `boolean` | True/false | No | Yes (exact match) | Yes |
| `enum` | Categorical value (string or number) | No | Yes (eq, in, nin) | No |
| `geopoint` | Latitude/longitude `{ lat, lon }` | No | Yes (radius, polygon) | No |
| `string[]` | Array of strings | Yes | Yes | No |
| `number[]` | Array of numbers | No | Yes | No |
| `boolean[]` | Array of booleans | No | Yes | No |
| `enum[]` | Array of enums | No | Yes (containsAll, containsAny) | No |
| `vector[N]` | N-dimensional vector (Float32Array) | No (vector search only) | No | No |

### Nested objects
Orama supports nested schemas:
```typescript
const db = await create({
  schema: {
    title: 'string',
    meta: {
      category: 'enum',
      rating: 'number',
    }
  }
});
```
Nested properties are accessed via dot notation in search params: `properties: ['meta.category']`.

### Current usage in Thaqalayn
- **Title index:** `p: 'string', pt: 'string', en: 'string', ar: 'string', arn: 'string'` -- all strings.
- **Full-text index:** `p: 'string', t: 'string', ar: 'string', en: 'string', i: 'number'` -- 4 strings + 1 number.

### Opportunities
- **Add `enum` for book name:** Adding `book: 'enum'` to the full-text schema would enable filtering by book (where clause), faceted counts by book, and grouping by book -- all without changing the search logic. This is a **high-value, medium-effort** change because it requires updating the data generator to include a book field in each document.
- **Add `enum` for part type:** Adding `pt: 'enum'` to the title schema enables filtering titles by type (book/volume/chapter).

---

## 3. Tokenizer, Stemming, and Language Support

### Built-in Language Support (30 languages)
Orama ships with tokenizer splitters for 30 languages including **Arabic**. The Arabic splitter regex is:
```
/[^a-z0-9أ-ي]+/gim
```
This splits on non-Arabic-letter, non-Latin-letter, non-digit characters.

**Currently used:** No. The project creates indexes without specifying a `language`, so Orama defaults to `'english'`. This means Arabic text is tokenized with the English splitter regex (`/[^A-Za-z...0-9_'-]+/gim`), which **does not recognize Arabic characters** -- it treats Arabic words as a single undivided token unless separated by spaces.

### Stemming
- **Built-in stemmer:** Only English (Porter stemmer) is built-in.
- **External stemmers:** The `@orama/stemmers` package provides stemmers for all 30 languages including Arabic. Install with `npm i @orama/stemmers`.
- **Currently used:** No. Stemming is disabled by default.
- **Benefit:** **High for English, medium for Arabic.**
  - English stemming would match "narrators" when searching "narrator", "books" when searching "book", etc.
  - Arabic stemming would match root-based variations, though the project's existing diacritics normalization handles part of this.
- **Difficulty:** Medium. Requires separate indexes for Arabic vs English content, or a custom tokenizer.

### Stop Words
- **Built-in:** None by default. The `@orama/stopwords` package provides stop words for 30 languages including Arabic.
- **Currently used:** No.
- **Benefit:** **Medium.** Filtering common English words ("the", "a", "of", "and") and Arabic particles would reduce index size and improve relevance.
- **Difficulty:** Easy -- pass `stopWords` array to tokenizer config.

### Custom Tokenizer Configuration
```typescript
const db = await create({
  schema: { ... },
  language: 'arabic',
  components: {
    tokenizer: {
      language: 'arabic',
      stemming: true,
      stemmer: arabicStemmer,  // from @orama/stemmers
      stopWords: arabicStopWords,  // from @orama/stopwords
      stemmerSkipProperties: ['p'],  // don't stem path fields
      tokenizeSkipProperties: ['p'],  // don't tokenize path fields
      allowDuplicates: false,  // default: deduplicate tokens
    }
  }
});
```

### Diacritics Handling
Orama has built-in diacritics replacement for Latin characters (e.g., e with accent to e). It does **not** handle Arabic diacritics natively -- the project's `normalizeArabic()` function handles this before passing the query to Orama.

### Key Issue: Bilingual Search
The project indexes both Arabic and English text in the same Orama instance. Since Orama only supports one language per index, the options are:
1. **Current approach:** Use English tokenizer (works for English; Arabic is space-tokenized only).
2. **Dual-index approach:** Create one index with `language: 'arabic'` and another with `language: 'english'`, search both, merge results. This is what the project already does per-book; it could be extended per-language.
3. **Custom tokenizer:** Write a tokenizer that detects the script (Arabic vs Latin) and applies the appropriate splitter.

---

## 4. Plugin System

Orama has a plugin architecture with lifecycle hooks. Plugins can intercept insert, remove, update, search, and creation events.

### Plugin Interface
```typescript
const myPlugin: OramaPlugin = {
  name: 'my-plugin',
  beforeInsert: (orama, id, doc) => { /* modify doc before indexing */ },
  afterInsert: (orama, id, doc) => { /* side effects after indexing */ },
  beforeSearch: (orama, params, language) => { /* modify search params */ },
  afterSearch: (orama, params, language, results) => { /* modify results */ },
  afterCreate: (orama) => { /* post-creation setup */ },
  // Also: beforeRemove, afterRemove, beforeUpdate, afterUpdate,
  //       beforeInsertMultiple, afterInsertMultiple, etc.
};

const db = await create({
  schema: { ... },
  plugins: [myPlugin]
});
```

### Official Plugins

| Plugin | Package | Description | Relevance to Thaqalayn |
|--------|---------|-------------|----------------------|
| **Data Persistence** | `@orama/plugin-data-persistence` | Save/restore index to JSON or dpack binary format | **High** -- see [Serialization](#11-serialization-saveload) |
| **Match Highlight** | `@orama/plugin-match-highlight` | Returns match positions for highlighting in results (deprecated in favor of `@orama/highlight`) | **High** -- would let us highlight search terms in snippets |
| **Embeddings** | `@orama/plugin-embeddings` | Auto-generate text embeddings using TensorFlow.js | **Low** -- too heavy for client-side Islamic text search |
| **Secure Proxy** | `@orama/plugin-secure-proxy` | Proxy OpenAI/embedding API calls securely from client | **Low** -- requires paid API keys |
| **Analytics** | `@orama/plugin-analytics` | Track search queries and click-through | **Low** -- requires Orama Cloud |
| **QPS** | `@orama/plugin-qps` | Replace BM25 with Quantum Proximity Scoring algorithm | **Medium** -- could improve short query relevance |
| **PT15** | `@orama/plugin-pt15` | Replace BM25 with Positional Token 15 algorithm | **Medium** -- better for position-sensitive matches |
| **Vitepress/Docusaurus/Astro/Nextra** | Various | Framework integrations for docs sites | Not applicable |

### Currently used plugins
None.

---

## 5. Faceted Search

### What It Does
Facets provide aggregate counts of search results by category. For example, searching "Prophet" and requesting a facet on `book` would return: `{ "Al-Kafi": 45, "Quran": 12 }`.

### Configuration

**String facets:**
```typescript
const results = await search(db, {
  term: 'Prophet',
  facets: {
    book: {
      limit: 10,     // max number of facet values to return
      offset: 0,     // skip first N facet values
      sort: 'DESC',  // sort by count: 'ASC' or 'DESC'
    }
  }
});
// results.facets = {
//   book: {
//     count: 2,
//     values: { 'Al-Kafi': 45, 'Quran': 12 }
//   }
// }
```

**Number facets (ranges):**
```typescript
facets: {
  hadithNumber: {
    ranges: [
      { from: 1, to: 100 },
      { from: 101, to: 500 },
      { from: 501, to: 1000 },
    ]
  }
}
```

**Boolean facets:**
```typescript
facets: {
  hasEnglishTranslation: {
    true: true,
    false: true,
  }
}
```

Facets work on `string`, `number`, `boolean`, `enum`, and their array variants (`string[]`, `number[]`, `boolean[]`, `enum[]`).

### Currently used
No.

### Benefit
**Very High.** This is one of the most impactful features for the project. If a `book` enum field is added to the search documents, facets would enable:
- "Found 45 results in Al-Kafi, 12 in Quran" -- displayed as filter chips or a sidebar
- Let users narrow results to a specific book after searching
- Show volume-level breakdowns within a book

### Implementation difficulty
**Medium.** Requires:
1. Adding a `book: 'enum'` field to each search document in the data generator
2. Passing `facets: { book: {} }` in the search call
3. Building a UI component to display facet counts and handle filter selections

---

## 6. Geosearch

### What It Does
Orama supports geographic point filtering using the `geopoint` schema type. Documents with `{ lat: number, lon: number }` can be filtered by:
- **Radius:** Find all points within X km/mi/m of a center point.
- **Polygon:** Find all points inside a polygon defined by coordinates.

Distance units: `'cm'`, `'m'`, `'km'`, `'ft'`, `'yd'`, `'mi'`.

### Currently used
No.

### Relevance to Thaqalayn
**None.** The project deals with textual religious content, not geographic data. Mentioned here for completeness only.

---

## 7. Vector Search and Hybrid Search

### Vector Search
Orama supports vector similarity search using the `vector[N]` schema type, where N is the embedding dimension. Vectors are stored as `Float32Array` internally and compared using cosine similarity.

```typescript
const db = await create({
  schema: {
    title: 'string',
    embedding: 'vector[384]'  // dimension must match your embedding model
  }
});

const results = await search(db, {
  mode: 'vector',
  vector: {
    value: [0.1, 0.2, ...],  // pre-computed query embedding
    property: 'embedding',
  },
  similarity: 0.8,  // minimum cosine similarity (default: 0.8)
});
```

### Hybrid Search
Combines full-text BM25 scoring with vector similarity. Results from both are normalized and merged using configurable weights.

```typescript
const results = await search(db, {
  mode: 'hybrid',
  term: 'mercy of Allah',
  vector: {
    value: [0.1, 0.2, ...],
    property: 'embedding',
  },
  hybridWeights: {
    text: 0.7,   // 70% weight on full-text relevance
    vector: 0.3, // 30% weight on semantic similarity
  },
});
```

Default hybrid weights are 50/50 if not specified.

### Currently used
No. Only full-text search mode is used.

### Benefit
**Low-to-Medium for now, potentially High in the future.** Semantic search could enable queries like "hadith about patience during hardship" to find relevant hadiths even if the exact words are not present. However:
- Generating embeddings requires an embedding model (either server-side or via TensorFlow.js client-side)
- The embedding model needs to handle Arabic text well
- Embeddings significantly increase index size (384 dimensions x 4 bytes x N documents)
- A bilingual embedding model (Arabic + English) would be needed

### Implementation difficulty
**Hard.** Requires: choosing an embedding model, generating embeddings for all documents at build time, storing them in the search index files, and managing the larger download size. Would likely need a server-side pipeline.

---

## 8. Grouping

### What It Does
Groups search results by one or more properties, returning results organized into buckets.

```typescript
const results = await search(db, {
  term: 'patience',
  groupBy: {
    properties: ['book'],  // group by book name
    maxResult: 5,          // max results per group
  }
});
// results.groups = [
//   {
//     values: ['Al-Kafi'],
//     result: [
//       { id: '...', score: 0.95, document: { ... } },
//       { id: '...', score: 0.88, document: { ... } },
//     ]
//   },
//   {
//     values: ['Quran'],
//     result: [
//       { id: '...', score: 0.91, document: { ... } },
//     ]
//   }
// ]
```

Grouping works on `string`, `number`, and `boolean` properties. Multi-property grouping creates all combinations (cartesian product).

### Custom Reduce Function
Groups support a custom reduce function for aggregation:
```typescript
groupBy: {
  properties: ['book'],
  maxResult: 10,
  reduce: {
    getInitialValue: (count) => ({ count: 0, topScore: 0 }),
    reducer: (values, acc, result, index) => {
      acc.count++;
      acc.topScore = Math.max(acc.topScore, result.score);
      return acc;
    }
  }
}
```

### Currently used
No.

### Benefit
**High.** Grouping results by book would create a much better search UX:
- "5 results in Al-Kafi, 3 results in Quran" with expandable sections
- Limit results per book to prevent one book from dominating
- Combined with `maxResult: 3`, show top 3 per book with "Show more" links

### Implementation difficulty
**Medium.** Requires adding a groupable field (e.g., `book: 'string'`) to the search documents and building a grouped results UI component.

---

## 9. Sorting

### What It Does
By default, Orama sorts results by relevance score (descending). `sortBy` provides alternatives.

### Property-Based Sort
```typescript
const results = await search(db, {
  term: 'prayer',
  sortBy: {
    property: 'hadithNumber',
    order: 'ASC',    // or 'DESC'
  }
});
```
Sortable types: `string`, `number`, `boolean`. The sorter must be enabled (it is by default).

### Custom Sort Function
```typescript
const results = await search(db, {
  term: 'prayer',
  sortBy: (a, b) => {
    // a, b are [internalId, score, document] tuples
    return a[2].hadithNumber - b[2].hadithNumber;
  }
});
```

### Sorter Configuration
```typescript
const db = await create({
  schema: { ... },
  sort: {
    enabled: true,
    unsortableProperties: ['longTextField'],  // exclude from sort index to save memory
  }
});
```

### Currently used
No. Results are sorted by relevance score (default behavior), then manually re-sorted in `searchFullText()` by `score` descending.

### Benefit
**Medium.** Users might want to sort search results by:
- Book order (path-based sort)
- Hadith number within a chapter
- Alphabetical by title

### Implementation difficulty
**Easy** for property-based sorts (just add the parameter). **Medium** for a user-facing sort dropdown in the UI.

---

## 10. Filters (Where Clause)

### What It Does
Filters restrict search results to documents matching structured conditions, independent of the search term. Filters are applied **before** scoring, so they are very efficient.

### Operators by Type

**Number fields (`gt`, `gte`, `lt`, `lte`, `eq`, `between`):**
```typescript
where: {
  hadithNumber: { gte: 100, lte: 500 },
  // or: hadithNumber: { between: [100, 500] }
}
```

**String fields (exact token match):**
```typescript
where: {
  title: 'patience'  // exact match on tokenized value
  // or array: title: ['patience', 'mercy']
}
```
Note: String filters match on **tokenized** values. It is recommended to disable stemming on properties used for string filtering, or use `enum` type instead.

**Boolean fields:**
```typescript
where: { hasTranslation: true }
```

**Enum fields (`eq`, `in`, `nin`):**
```typescript
where: {
  book: { eq: 'al-kafi' },
  // or: book: { in: ['al-kafi', 'quran'] },
  // or: book: { nin: ['quran'] }  // NOT in
}
```

**Enum array fields (`containsAll`, `containsAny`):**
```typescript
where: {
  tags: { containsAll: ['fiqh', 'prayer'] },
  // or: tags: { containsAny: ['fiqh', 'aqidah'] }
}
```

**Geopoint fields (`radius`, `polygon`):**
```typescript
where: {
  location: {
    radius: {
      coordinates: { lat: 40.71, lon: -74.00 },
      value: 10,
      unit: 'km',
      inside: true,
    }
  }
}
```

### Boolean Logic (AND, OR, NOT)
```typescript
where: {
  and: [
    { book: { eq: 'al-kafi' } },
    { volume: { eq: 1 } }
  ]
}

where: {
  or: [
    { book: { eq: 'al-kafi' } },
    { book: { eq: 'quran' } }
  ]
}

where: {
  not: { book: { eq: 'quran' } }
}
```

### Currently used
No.

### Benefit
**Very High.** This is the second most impactful unused feature. If the search documents include metadata fields, filters would enable:
- Filter by book: "Search only in Al-Kafi"
- Filter by volume: "Search only in Volume 1"
- Combined with facets: Click a facet to apply a filter
- Filter by part type: "Only show chapters" vs "Only show hadiths"

### Implementation difficulty
**Medium.** Requires:
1. Adding `enum` or `string` fields to search documents (book, volume, partType)
2. Passing `where` clause based on UI filter selections
3. Building filter UI components (dropdowns, checkboxes)

---

## 11. Serialization (Save/Load)

### Built-in Save/Load
Orama has built-in `save()` and `load()` functions that serialize/deserialize the entire index state to/from a JSON-compatible object:

```typescript
import { create, insert, save, load } from '@orama/orama';

// Save
const db = await create({ schema: { ... } });
await insert(db, { ... });
const rawData = save(db);
// rawData is a plain object: { internalDocumentIDStore, index, docs, sorting, pinning, language }

// Load
const newDb = await create({ schema: { ... } });
load(newDb, rawData);
// newDb is now fully hydrated -- no need to re-insert documents
```

The `RawData` interface:
```typescript
interface RawData {
  internalDocumentIDStore: unknown;
  index: unknown;
  docs: unknown;
  sorting: unknown;
  pinning: unknown;
  language: Language;
}
```

### Plugin Data Persistence (`@orama/plugin-data-persistence`)
The plugin wraps save/load with format support:
- **JSON format:** `persist(db, 'json')` / `restore('json', data)`
- **dpack format:** Binary format for smaller payloads (requires the dpack dependency)

### Currently used
**No.** The project currently:
1. Fetches raw document arrays as JSON from the API
2. Creates a fresh Orama instance
3. Inserts documents one by one in a loop

This means every page load re-builds the entire index from scratch, which is the most expensive part of search initialization.

### Benefit
**Very High -- this is the single most impactful optimization available.** Pre-building the Orama index at data-generation time and serving the serialized index as a static file would:
- **Eliminate cold-start indexing time:** Currently, inserting thousands of documents takes several seconds. Loading a pre-built index is near-instant.
- **Reduce client CPU usage:** No tokenization, stemming, or index building at runtime.
- **Enable larger indexes:** Could index more content without worrying about browser insertion time.

### Implementation plan
1. In `ThaqalaynDataGenerator`, after generating search documents, create an Orama instance, insert all documents, and call `save()`.
2. Write the `RawData` object to a JSON file (e.g., `index/search/titles-index.json`, `index/search/quran-index.json`).
3. In `SearchService`, fetch the pre-built index file and call `load()` instead of creating + inserting.
4. The schema must match between build-time and load-time `create()` calls.

### Implementation difficulty
**Medium.** The data generator is Python, so the index must either be built with a Node.js script run after generation, or the Python code outputs the document JSON and a separate build step creates the Orama index.

---

## 12. Custom Components

Orama allows replacing core components at creation time.

### Custom Tokenizer
```typescript
const db = await create({
  schema: { ... },
  components: {
    tokenizer: {
      language: 'arabic',
      stemming: true,
      stemmer: customStemmerFunction,
      stopWords: ['في', 'من', 'على', 'إلى'],
      stemmerSkipProperties: ['path', 'id'],
      tokenizeSkipProperties: ['path'],
      allowDuplicates: false,
    }
  }
});
```

### `tokenizeSkipProperties`
Prevents tokenization of specific properties -- the entire value is treated as a single token. Useful for ID/path fields that should be searchable but not split.

### `stemmerSkipProperties`
Prevents stemming on specific properties while still tokenizing them. Useful for proper nouns or codes.

### `allowDuplicates`
By default, duplicate tokens within a document are removed. Setting `true` preserves frequency information (useful for TF-IDF/BM25 accuracy).

### Custom Index, Document Store, Sorter
Advanced users can replace the entire index, document store, or sorter implementation:
```typescript
const db = await create({
  schema: { ... },
  components: {
    index: myCustomIndex,
    documentsStore: myCustomDocStore,
    sorter: myCustomSorter,
  }
});
```

### Custom Document ID Function
```typescript
const db = await create({
  schema: { ... },
  components: {
    getDocumentIndexId: (doc) => doc.myCustomId,
  }
});
```

### Custom Schema Validation
```typescript
components: {
  validateSchema: (doc, schema) => {
    // return undefined if valid, or error string
  }
}
```

### Currently used
No custom components.

### Benefit for Arabic Support
**High.** A custom tokenizer configuration with `language: 'arabic'` and the Arabic stemmer from `@orama/stemmers` would significantly improve Arabic search quality. The project could:
1. Use `language: 'arabic'` for Arabic-specific indexes
2. Provide a custom stemmer that handles Arabic morphology
3. Add Arabic stop words for common particles
4. Use `tokenizeSkipProperties` to prevent path fields from being tokenized

### Implementation difficulty
**Medium.** The tokenizer config is straightforward. The challenge is handling bilingual content (Arabic + English) in the same search flow.

---

## 13. Results Pinning (Merchandising)

### What It Does
Pins specific documents to specific positions in search results based on the search term. Useful for promoting important content.

```typescript
import { create, insert, insertPin } from '@orama/orama';

insertPin(db, {
  id: 'promote-fatiha',
  conditions: [
    { anchoring: 'contains', pattern: 'fatiha' }
  ],
  consequence: {
    promote: [
      { doc_id: 'quran:1', position: 0 }  // Always show Surah Al-Fatiha first
    ]
  }
});
```

### Anchoring Modes
- `'is'`: Exact match on the full search term
- `'starts_with'`: Search term starts with the pattern
- `'contains'`: Search term contains the pattern

### Available Methods
- `insertPin(db, rule)` -- add a pinning rule
- `updatePin(db, rule)` -- update an existing rule
- `deletePin(db, ruleId)` -- remove a rule
- `getPin(db, ruleId)` -- get a rule by ID
- `getAllPins(db)` -- list all rules

Pinning rules are applied **after sorting but before pagination**, so pinned items appear at their specified positions regardless of relevance score.

### Currently used
No.

### Benefit
**Medium.** Could be used to:
- Pin Surah Al-Fatiha when searching "opening" or "fatiha"
- Pin the Book of Tawhid chapter when searching "oneness" or "tawhid"
- Pin important/famous hadiths for common search terms

### Implementation difficulty
**Easy** to implement technically. **Medium** to curate good pinning rules.

---

## 14. Answer Sessions (RAG)

### What It Does
Since v3.0.0, Orama supports Retrieval-Augmented Generation (RAG) via the `AnswerSession` class. This performs a search, feeds results as context to an LLM, and generates a conversational answer.

```typescript
import { AnswerSession } from '@orama/orama';

const session = new AnswerSession(db, {
  systemPrompt: 'You are an Islamic studies assistant...',
  events: {
    onStateChange: (state) => { /* update UI reactively */ }
  }
});

const response = await session.ask({ term: 'mercy in Islam' });
```

### Requirements
- Requires an LLM backend (typically OpenAI via `@orama/plugin-secure-proxy`)
- Needs vector search or hybrid search to find semantically relevant context
- Requires API keys and ongoing costs

### Currently used
No.

### Benefit
**Low for now.** While an AI assistant for Islamic texts is an interesting future feature, it requires:
- An LLM API (ongoing cost, against the project's zero-cost philosophy)
- Careful theological review of AI-generated answers about religious texts
- Vector embeddings for semantic retrieval

Not recommended for the current project phase.

---

## 15. Preflight Queries

### What It Does
A preflight query returns only the **count** of matching documents (and optionally facets) without fetching the actual documents. Much faster than a full search.

```typescript
const results = await search(db, {
  term: 'patience',
  preflight: true,
});
// results = { count: 42, elapsed: { raw: 18120, formatted: '18us' } }
```

When combined with facets, preflight returns facet counts without document hits.

### Currently used
No.

### Benefit
**Medium.** Useful for:
- Showing "42 results found" before loading the actual results
- Validating that a query has results before committing to a full search
- Building a "search suggestions" feature that shows result counts

### Implementation difficulty
**Easy** -- single parameter addition.

---

## 16. Recommendations for Thaqalayn

### Priority 1: Quick Wins (Easy, High Impact)

These can be implemented with minimal code changes to `search.service.ts`:

| Feature | Change | Expected Impact |
|---------|--------|-----------------|
| **threshold: 0** | Add `threshold: 0` to full-text search | Much better precision for multi-word queries |
| **boost** | Add `boost: { en: 2, t: 0.5 }` or similar | Better ranking -- title matches weighted higher |
| **tolerance: 1** | Add `tolerance: 1` to search calls | Handles common English typos |
| **offset** | Expose offset for pagination | Enables "load more" results |

### Priority 2: Schema Enrichment (Medium Effort, Very High Impact)

Requires changes to the data generator and search service:

| Feature | What to add | Enables |
|---------|-------------|---------|
| **Add `book` enum field** | Add `book: 'enum'` to full-text schema | Facets by book, filters by book, grouping by book |
| **Faceted search** | Request facets on `book` field | "45 results in Al-Kafi, 12 in Quran" sidebar |
| **Where filters** | Pass `where: { book: { eq: 'al-kafi' } }` | Filter search to a specific book |
| **GroupBy** | Group results by `book` | Organized result display |

### Priority 3: Performance (Medium Effort, High Impact)

| Feature | What to change | Expected Impact |
|---------|---------------|-----------------|
| **Pre-built index (save/load)** | Build Orama index at data-gen time, serve serialized index | Eliminate multi-second cold start on first search |
| **Unified index** | Merge per-book indexes into one with a `book` enum field | Simpler code, proper cross-book relevance ranking |

### Priority 4: Arabic Search Quality (Medium-Hard Effort, High Impact)

| Feature | What to change | Expected Impact |
|---------|---------------|-----------------|
| **Arabic tokenizer** | Set `language: 'arabic'` on Arabic-focused indexes | Correct word splitting for Arabic text |
| **Arabic stemmer** | Install `@orama/stemmers`, use Arabic stemmer | Root-based matching for Arabic queries |
| **Arabic stop words** | Install `@orama/stopwords`, add Arabic stop words | Filter common particles, reduce noise |

### Priority 5: Future Considerations (Hard Effort)

| Feature | Notes |
|---------|-------|
| **Vector/hybrid search** | Powerful but requires embedding model and infrastructure |
| **Match highlighting** | Use `@orama/highlight` to highlight search terms in snippets |
| **Alternative algorithms (QPS/PT15)** | May improve relevance for short queries; needs testing |
| **RAG/Answer sessions** | Interesting but requires LLM costs and theological review |

---

## Appendix A: Complete Search Parameter Reference

```typescript
// Full-text search (default mode)
search(db, {
  term: 'search query',                    // search string
  mode: 'fulltext',                        // 'fulltext' | 'vector' | 'hybrid'
  properties: ['en', 'ar'],               // fields to search (* = all)
  limit: 10,                              // max results
  offset: 0,                              // skip N results
  threshold: 1,                           // 0=AND, 1=OR, 0.5=mixed
  tolerance: 0,                           // Levenshtein distance for typos
  exact: false,                           // exact word boundary match
  boost: { en: 2, ar: 1 },               // per-field score multiplier
  relevance: { k: 1.2, b: 0.75, d: 0.5 }, // BM25 tuning
  sortBy: { property: 'score', order: 'DESC' }, // or custom function
  distinctOn: 'book',                     // one result per unique value
  preflight: false,                       // count-only mode
  includeVectors: false,                  // include vector data in results
  where: {                                // structured filters
    book: { eq: 'al-kafi' },
    volume: { gte: 1, lte: 3 },
    and: [{ ... }, { ... }],
    or: [{ ... }, { ... }],
    not: { ... },
  },
  facets: {                               // aggregate counts
    book: { limit: 10, sort: 'DESC' },
    volume: { ranges: [{ from: 1, to: 3 }] },
  },
  groupBy: {                              // group results
    properties: ['book'],
    maxResult: 5,
    reduce: { reducer: fn, getInitialValue: fn },
  },
});
```

## Appendix B: Available Lifecycle Hooks

| Hook | Timing | Use Case |
|------|--------|----------|
| `beforeInsert` / `afterInsert` | Single document insert | Validation, logging |
| `beforeRemove` / `afterRemove` | Single document remove | Cleanup |
| `beforeUpdate` / `afterUpdate` | Single document update | Validation |
| `beforeUpsert` / `afterUpsert` | Single document upsert | Validation |
| `beforeInsertMultiple` / `afterInsertMultiple` | Batch insert | Progress tracking |
| `beforeRemoveMultiple` / `afterRemoveMultiple` | Batch remove | Cleanup |
| `beforeUpdateMultiple` / `afterUpdateMultiple` | Batch update | Validation |
| `beforeSearch` / `afterSearch` | Search execution | Query rewriting, result post-processing |
| `afterCreate` | Database creation | Initial setup |

## Appendix C: Supported Languages

Orama supports tokenization and splitting for these 30 languages:

| Language | Code | Stemmer Available | Stop Words Available |
|----------|------|-------------------|---------------------|
| **Arabic** | ar | Yes (`@orama/stemmers`) | Yes (`@orama/stopwords`) |
| Armenian | am | Yes | Yes |
| Bulgarian | bg | Yes | Yes |
| Chinese (Mandarin) | -- | No stemmer | Yes |
| Czech | cz | Yes | Yes |
| Danish | dk | Yes | Yes |
| Dutch | nl | Yes | Yes |
| **English** | en | Yes (built-in) | Yes |
| Finnish | fi | Yes | Yes |
| French | fr | Yes | Yes |
| German | de | Yes | Yes |
| Greek | gr | Yes | Yes |
| Hindi | in | Yes | Yes |
| Hungarian | hu | Yes | Yes |
| Indonesian | id | Yes | Yes |
| Irish | ie | Yes | Yes |
| Italian | it | Yes | Yes |
| Lithuanian | lt | Yes | Yes |
| Nepali | np | Yes | Yes |
| Norwegian | no | Yes | Yes |
| Portuguese | pt | Yes | Yes |
| Romanian | ro | Yes | Yes |
| Russian | ru | Yes | Yes |
| Sanskrit | sk | Yes | Yes |
| Serbian | rs | Yes | Yes |
| Slovenian | ru | Yes | Yes |
| Spanish | es | Yes | Yes |
| Swedish | se | Yes | Yes |
| Tamil | ta | Yes | Yes |
| Turkish | tr | Yes | Yes |
| Ukrainian | uk | Yes | Yes |

**Note:** Only the English stemmer is bundled with `@orama/orama`. All other stemmers require installing `@orama/stemmers` separately. Stop words for all languages require `@orama/stopwords`.

---

*Document generated: 2026-02-22*
*Orama version analyzed: 3.1.18*
*Based on source code analysis of `node_modules/@orama/orama/` and [official Orama documentation](https://docs.orama.com/).*
