# Per-Language Verse File Split

**Status:** ACTIVE (proposed; not yet implemented)
**Created:** 2026-06-12
**Owner:** Sadegh Shahrbaf

## Why

Today every verse_detail JSON bundles **all 11 language translations** of every AI-generated field into a single file. A user reading in any one language fetches all 11 langs of data even though they only need one. For the ~52K AI-enriched verses, the per-language data is ~10 KB inside a ~30 KB JSON — so roughly **two-thirds of every fetch is wasted bytes**.

Splitting into a **base file + one sister file per language** cuts per-user bandwidth by ~60% with no quality loss, and as a side effect makes lang-only updates surgically invalidate the CDN cache.

## Naming convention (decided)

**Symmetric** — no language is privileged. Every language including English is in its own sister file.

| File | Contents |
|---|---|
| `1.json` | base (language-agnostic content + per-language registry) |
| `1.en.json` | all English AI content for this verse |
| `1.fa.json` | all Persian AI content for this verse |
| `1.ur.json` | all Urdu AI content for this verse |
| … | …one sister per supported language |

A loaded verse = `1.json` + `1.{activeLang}.json` in parallel. Lang switch = fetch one new sister (~2 KB), no re-fetch of base.

## Field assignment

The decision is per-field: does this field's value vary by AI-translation language? If yes → sister files. If no → base.

### Goes in `1.json` (base, language-agnostic)

Everything that isn't a per-language AI output:

| Field | Why base |
|---|---|
| `data.chapter_path`, `data.chapter_title` | Chapter metadata. `chapter_title` has its own per-language form but is small (3 strings) and read once per page; cheaper to keep here than split |
| `data.nav` | Path strings, no language |
| `data.verse.index`, `data.verse.local_index`, `data.verse.path`, `data.verse.part_type` | Identity |
| `data.verse.text` | The original source-translator text (e.g. Qarai's English, Tanzil Arabic). Already small and multi-lang in source data; not AI output |
| `data.verse.narrator_chain` | Arabic chain text + narrator ID refs |
| `data.verse.relations` | Cross-references (Quran ↔ Hadith) — path-based, no language |
| `data.verse.ai.ai_attribution` | Model name, generation date — once per verse |
| `data.verse.ai.diacritics_status`, `diacritics_changes` | Phase 1 metadata about Arabic diacritization |
| `data.verse.ai.chunks[i].chunk_type`, `arabic_text`, `word_start`, `word_end` | Arabic structure of the verse |
| `data.verse.ai.isnad_matn` | Narrator chain extraction |
| `data.verse.ai.related_quran` | Quran refs — language-agnostic |
| `data.verse.ai.topics` | Topic enum from canonical taxonomy (English keys, used as IDs) |
| `data.verse.ai.tags` | POS-style enum tags |
| `data.verse.ai.key_phrases` | Arabic phrases extracted from the verse |
| `data.verse.ai.content_type` | Enum (`hadith`, `quranic_commentary`, `legal_ruling`, ...) |

### Goes in `1.{lang}.json` (per-language sister)

Everything that varies by AI-translation language:

| Field | Shape today | Shape in sister |
|---|---|---|
| `data.verse.ai.summaries.{lang}` | `{summaries: {en: "...", fa: "...", ...}}` | `{summary: "..."}` (no lang dimension) |
| `data.verse.ai.seo_questions.{lang}` | `{seo_questions: {en: "...", fa: "...", ...}}` | `{seo_question: "..."}` |
| `data.verse.ai.chunks[i].translations.{lang}` | per-chunk per-lang | `{chunks: ["...", null, "..."]}` (flat string array, index-aligned with base.chunks; `null` where this lang has no translation for that chunk) |
| `data.verse.ai.word_analysis[i].translation.{lang}` (v3) | per-word per-lang | `{word_analysis: ["...", null, "..."]}` (flat string array, index-aligned with base.word_analysis) |
| `data.verse.ai.key_terms.{lang}.{ar_term}` | nested by lang then Arabic term | `{key_terms: {ar_term: "..."}}` (no lang dimension) |

### Concrete before/after schemas

**Before** (current `quran/2/107.json`, abbreviated):

```json
{
  "data": {
    "chapter_path": "/books/quran:2",
    "chapter_title": {"ar": "البقرة", "en": "The Cow", "ent": "Al-Baqara"},
    "nav": {"next": "/books/quran:2:108", "prev": "/books/quran:2:106", "up": "/books/quran:2"},
    "verse": {
      "index": 107, "local_index": 107, "path": "/books/quran:2:107",
      "part_type": "Verse",
      "text": {"ar": "أَلَمْ تَعْلَمْ...", "en": "Do you not know..."},
      "ai": {
        "ai_attribution": {"model": "...", "generated_date": "..."},
        "chunks": [{
          "arabic_text": "أَلَمْ تَعْلَمْ...",
          "chunk_type": "body",
          "word_start": 0, "word_end": 17,
          "translations": {
            "en": "Do you not know that God's is the kingdom...",
            "fa": "آیا نمی‌دانی که پادشاهی آسمان‌ها...",
            "ur": "...", "tr": "...", "id": "...", "bn": "...",
            "es": "...", "fr": "...", "de": "...", "ru": "...", "zh": "..."
          }
        }],
        "content_type": "quranic_commentary",
        "diacritics_status": "corrected",
        "isnad_matn": {"has_chain": false, "narrators": []},
        "key_phrases": [],
        "key_terms": {
          "en": {"السَّمَاوَاتِ": "The heavens", "...": "..."},
          "fa": {"السَّمَاوَاتِ": "آسمان‌ها", "...": "..."},
          "...": {"...": "..."}
        },
        "related_quran": [],
        "seo_questions": {
          "en": "What does the Quran say about...",
          "fa": "...", "...": "..."
        },
        "summaries": {
          "en": "In Shia exegesis, this verse underscores...",
          "fa": "در تفسیر شیعه، این آیه...",
          "...": "..."
        },
        "tags": [...],
        "topics": ["tawhid", "divine_attributes", "quran_interpretation_method"]
      }
    }
  },
  "index": "quran:2:107",
  "kind": "verse_detail"
}
```

**After** — same verse split into `1.json` + `1.{lang}.json`:

**`books/quran/2/107.json`** (base, ~10 KB):
```json
{
  "data": {
    "chapter_path": "/books/quran:2",
    "chapter_title": {"ar": "البقرة", "en": "The Cow", "ent": "Al-Baqara"},
    "nav": {"next": "/books/quran:2:108", "prev": "/books/quran:2:106", "up": "/books/quran:2"},
    "verse": {
      "index": 107, "local_index": 107, "path": "/books/quran:2:107",
      "part_type": "Verse",
      "text": {"ar": "أَلَمْ تَعْلَمْ...", "en": "Do you not know..."},
      "ai": {
        "ai_attribution": {"model": "...", "generated_date": "..."},
        "chunks": [{
          "arabic_text": "أَلَمْ تَعْلَمْ...",
          "chunk_type": "body",
          "word_start": 0, "word_end": 17
        }],
        "content_type": "quranic_commentary",
        "diacritics_status": "corrected",
        "isnad_matn": {"has_chain": false, "narrators": []},
        "key_phrases": [],
        "key_terms_keys": ["السَّمَاوَاتِ", "الْأَرْضِ", "مُلْكُ", "نَصِيرٍ", "وَلِيٍّ"],
        "related_quran": [],
        "tags": [...],
        "topics": ["tawhid", "divine_attributes", "quran_interpretation_method"],
        "available_languages": ["en", "fa", "ur", "tr", "id", "bn", "es", "fr", "de", "ru", "zh"]
      }
    }
  },
  "index": "quran:2:107",
  "kind": "verse_detail"
}
```

**`books/quran/2/107.en.json`** (English sister, ~1-2 KB):
```json
{
  "lang": "en",
  "path": "/books/quran:2:107",
  "ai": {
    "summary": "In Shia exegesis, this verse underscores the absolute sovereignty (Mulku) of Allah, often cited to refute the notion of independent intercessors...",
    "seo_question": "What does the Quran say about God's ownership of the heavens and the earth?",
    "chunks": ["Do you not know that God's is the kingdom of the heavens and the earth..."],
    "key_terms": {
      "السَّمَاوَاتِ": "The heavens",
      "الْأَرْضِ": "The earth",
      "مُلْكُ": "Kingdom/sovereignty",
      "نَصِيرٍ": "Helper/ally",
      "وَلِيٍّ": "Guardian/protector"
    }
  }
}
```

**`books/quran/2/107.fa.json`** (Persian sister, identical shape with Persian content) — same shape; `chunks[]` aligns with the base's `chunks[]` array index, `key_terms` keys align with the base's `key_terms_keys`.

For v3 verses (al-amali-mufid, al-amali-saduq, etc.) the sister also carries an index-aligned `word_analysis: ["...", null, ...]` string array, one entry per word in the base's `word_analysis`.

### A few design notes on the sister shape

- **Sister `chunks` / `word_analysis` are flat string arrays** — not arrays of `{translation: "..."}` objects. Index-aligned with the base's `chunks` / `word_analysis`. `null` marks "no translation for this lang at this index" so positional alignment is preserved. Saves ~15 bytes per entry vs the object-wrapped form (significant for v3 verses with 80-100 words across 11 langs).
- **`key_terms_keys` in base** preserves the canonical key order. Sisters' `key_terms` is a flat `{ar: lang_string}` map. The keys must match. Could also be a parallel array; map form is simpler to consume.
- **`available_languages` in base** tells the UI which sisters exist for this verse. Useful for verses where Phase 4 only generated some langs (rare, but happens — when a verse quarantines for one lang the merger may drop that lang).
- **`lang` + `path` at the top of each sister** make it self-identifying for debugging.

## UI changes

### `VerseLoaderService` rewrite

```ts
// Before:
loadVerseDetail(path: string): Observable<VerseDetail> {
  return this.http.get<VerseDetail>(`${API}${path}.json`)
}

// After:
loadVerseDetail(path: string, lang: string): Observable<VerseDetail> {
  return forkJoin([
    this.http.get<VerseBase>(`${API}${path}.json`),
    this.http.get<VerseLang>(`${API}${path}.${lang}.json`).pipe(
      catchError(() => of(null))  // missing lang → render with base only
    ),
  ]).pipe(map(([base, langData]) => mergeVerseLang(base, langData)))
}
```

Lang switch (`wordAnalysisLang` change, or top-bar i18n change) calls `loadVerseLang(path, newLang)` for visible verses — base stays cached.

`shareReplay(1)` cache keys become `(path, lang)` tuples so the cache layer can hold both base and the active-lang sisters per session.

### Component-level changes

`verse-text.component.ts` already reads `ai.summaries[wordAnalysisLang]`-style nested-dict accesses. After the split:
- `ai.summaries[lang]` → `ai.summary` (the lang is implicit, set by which sister loaded)
- `ai.seo_questions[lang]` → `ai.seo_question`
- `ai.chunks[i].translations[lang]` → `ai.chunks[i].translation`
- `ai.key_terms[lang][term]` → `ai.key_terms[term]`

The `mergeVerseLang` helper places the lang-specific fields *back* under the same paths the templates already read from, so the template diff is small (or zero if we keep the merged-shape API).

## Lazy loading & cache behaviour

The existing `VerseLoaderService` already lazy-loads each verse_detail file as it scrolls into view (200 px rootMargin `IntersectionObserver`). The split preserves that — each visible verse now triggers two parallel fetches via `forkJoin`:

1. `path.json` — base
2. `path.{activeLang}.json` — active-language sister

HTTP/2 multiplexes both over the same TCP connection, so doubling the request count is essentially free; what matters is total bytes, which drop ~60% per fetch.

**Language-switch behaviour:**
- Visible (already-loaded) verses: refetch only the new sister (~1-2 KB each). Base is cached.
- Off-screen verses: still un-fetched. When they scroll in, they pull base + the now-active-lang sister.

**Session profile (one user, one language):** base + 1 sister per visited verse. Switching language mid-session refetches only the sister deltas, not the base.

The cache key in `VerseLoaderService` becomes `(path)` for base and `(path, lang)` for sisters, so `shareReplay(1)` holds both base and any visited-lang sisters concurrently across the session.

## Service worker / PWA

`ngsw-config.json` has cache rules covering `/books/**/*.json`. The glob silently matches every sister file, so without a config update the SW would precache all 11 lang sisters per prefetched verse — an ~11× offline-storage blow-up.

Update SW config:
- Keep base files in explicit prefetch lists
- Cache sisters at runtime only (`installMode: lazy`, `updateMode: lazy`)
- Optional `maxSize` so the offline cache doesn't grow unbounded as users sample multiple languages

## Search (Orama)

The current Orama index covers `verse.text` (Arabic + active translator), not `ai.summaries`. The split changes nothing for existing search. **If** future work adds AI summaries to the index, the build will need to either pick one indexing language or ship per-language Orama bundles. Out of scope for this proposal; flagged here so we don't silently regress later.

## Prerender / SEO

Netlify Prerender renders pages for bot user-agents. After the split, prerendered output still bakes in the active lang at render time (the bot's Accept-Language drives which sister gets fetched during the render). No structural change required, but `prerender-routes.txt` coverage should remain aligned with canonical verse URLs. Per-language URL variants (URL design, hreflang) are a separate concern, out of scope here.

## `complete/` aggregates

`books/complete/al-kafi.json` and `books/complete/quran.json` are denormalized single-file bundles for offline consumers and data dumps, not used by the runtime UI. **Leave them in the current monolithic all-langs shape** — splitting would multiply their internal structure for files that are rarely fetched. Document in `ai_content_merger.py` that the aggregate writer is the one sanctioned place that retains the old shape.

## Why `verse.text` (human translator text) stays in base

`verse.text` carries the original Arabic + each *human translator's* text (Qarai EN, Sarwar EN, etc.). It looks similar to the AI multi-lang fields but isn't the same problem:
- Typically 2-4 translators per book, not 11 langs
- Translators rarely added
- Each entry is a single short string, not a per-lang bundle of summary + chunk translations + key_terms

Savings from splitting it would be marginal vs the bookkeeping cost. Keep it in base.

## Generator changes

### `ai_content_merger.py` — write split files instead of a single verse JSON

```python
# After loading response and reconciling with ThaqalaynData verse:
def write_verse_split(verse_path, base_data, per_lang_data):
    fs_path = compute_fs_path(verse_path)
    # base file (language-agnostic only)
    write_json(fs_path + ".json", base_data)
    # one sister per language present in the AI output
    for lang, content in per_lang_data.items():
        write_json(fs_path + f".{lang}.json", content)
```

`build_lean_ai_content()` (the existing strip-and-reconstruct function) splits per-lang data into the sister-file shape at the same place it currently strips redundant fields.

### Index files

`books/{book}.json` and chapter shells stay unchanged — they reference verses by path. The UI's verse-load just fetches base + sister instead of one combined file.

## Migration plan

The split is a one-shot generator change; no migration of existing data is needed — the next `merge_ai_content()` re-writes every verse JSON. Stages:

1. **Generator**: implement `write_verse_split()` in the merger.
2. **UI**: implement `loadVerseDetail(path, lang)` with the legacy-shape fallback (see below). Land it before the data deploy so it tolerates either shape.
3. **Coordinated deploy**:
   - Push ThaqalaynData with split shape (Netlify rebuilds in ~2-4 min)
   - Push Thaqalayn with the new loader
   - The two deploys aren't atomic; during the overlap the UI may briefly hit old-shape data (or vice versa). The fallback handles both.
4. **Cleanup**: after a stable week, remove the legacy combined-shape fallback in the loader.

### Legacy-shape fallback

`loadVerseDetail` should detect which shape the base file is in:
- **New shape**: base lacks `ai.summaries`/`ai.seo_questions`/`ai.key_terms` — fetch sister and merge.
- **Legacy shape**: base already contains `ai.summaries[lang]` etc. — use directly, skip sister fetch (the sister GET 404s but the catchError already swallows it).

A presence check on `ai.summaries` is the simplest discriminator. Remove the discriminator and the fallback branch once both deploys are stable.

### Testing

- Unit: mock both base and sister in `VerseLoaderService` specs. Fixtures: `verse-base.fixture.json`, `verse-en.fixture.json`, `verse-fa.fixture.json`. Existing fixture files (whole-verse) can stay during the fallback window.
- E2E: existing `verse-detail.spec.ts` should pass without change (it asserts on rendered DOM, not file shape). Add one new spec covering **language switch refetch** — assert the sister network request fires and the verse content updates, without a base refetch.

The lang-switcher behaviour is purely additive — switching to a lang the session hasn't loaded yet just lazy-fetches one extra sister.

## Expected outcomes

| Metric | Today | After split |
|---|---|---|
| Avg AI-verse fetch bytes (EN user) | ~30 KB | ~12 KB (base + EN sister) |
| Bandwidth saving per user fetch | — | ~60% |
| Total bytes on disk (sum across all sisters) | ~1.8 GB | ~1.8 GB (similar — same data, different layout) |
| File count on Netlify | 67K | 67K + ~11×52K ≈ 640K |
| Lang switch HTTP cost | ~30 KB (full re-fetch) | ~1-2 KB (one sister) |
| Cache invalidation when re-running Phase 4 EN-only | every verse JSON invalidates | only EN sisters invalidate |

The total-bytes line item is the honest accounting — splitting doesn't shrink the corpus, it just changes who pays. End users (each loading one lang) pay less; storage and CDN paths pay roughly the same.

## Open questions / future considerations

- **`chunks[i].arabic_text` in base** — adds ~10 KB across the chunk array. Could be stripped and reconstructed from `verse.text.ar` via `word_start`/`word_end`. Defer; not blocking.
- **`key_terms_keys` ordering** — must match across base and sisters. Generator should write them in a deterministic order (insertion order from the LLM output) and tests should assert.
- **Sister 404 fallback** — if `1.fa.json` is missing (e.g. quarantined for fa), UI renders base only and degrades gracefully. `available_languages` in base lets the loader skip the request entirely.
- **Cache headers** — the existing immutable-cache policy on `/books/...` should apply equally to sisters.
- **File-count blast** — going from 67K files to ~640K JSONs may stretch the Netlify deploy pipeline (upload, dedup, log noise). Worth measuring on a single-book pilot before flipping the full corpus.
