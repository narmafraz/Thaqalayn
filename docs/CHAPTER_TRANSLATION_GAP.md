# Chapter Name Translation Gap Analysis

**Date**: 2026-03-10
**Finding**: Chapter/book names exist in only 2-3 languages but the site supports 11

---

## The Problem

The AI pipeline generates verse content in **11 languages** (en, ur, tr, fa, id, bn, es, fr, de, ru, zh), but the navigation structure — book names, volume names, chapter titles — exists only in **English and Arabic** (plus English transliteration for Quran surahs).

When a user selects Turkish or Urdu in the language dropdown, they see AI-translated verse content but all chapter names remain in English. This is an incomplete multilingual experience.

## Current State (Audited)

### Chapter Name Files

| File | Entries | Language |
|------|---------|----------|
| `index/books.en.json` | 7,798 | English |
| `index/books.ar.json` | 7,798 | Arabic |
| `index/books.ent.json` | 571 | English Transliteration (Quran only) |
| `index/books.fa.json` | **Does not exist** | — |
| `index/books.ur.json` | **Does not exist** | — |
| `index/books.tr.json` | **Does not exist** | — |
| (etc. for 8 more languages) | **Do not exist** | — |

### What's in Each Entry

```json
{
  "/books/al-kafi:1:1:1": {
    "part_type": "Chapter",
    "local_index": 1,
    "title": "Chapter of the Intellect"
  }
}
```

Each file has a single `title` field per chapter — one language per file.

### TypeScript Model (Limited)

```typescript
// Thaqalayn/src/app/models/text.ts
export interface MultiLingualText {
  en?: string;   // English
  ent?: string;  // English Transliteration
  ar?: string;   // Arabic
  fa?: string;   // Farsi — only non-core language included
}
```

Only 4 of 11 languages are modeled. The other 7 (ur, tr, id, bn, es, fr, de, ru, zh) have no slot in the interface.

### Scale of the Gap

| Metric | Value |
|--------|-------|
| Total chapter entries | 7,798 |
| Languages with titles | 3 (en, ar, ent) |
| Languages missing | 8 (ur, tr, fa, id, bn, es, fr, de, ru, zh) |
| Translations needed | **~62,400** (7,798 × 8 languages) |
| Estimated tokens per title | ~20-50 (short text) |
| Total output tokens | ~1.2-3.1M |

### Cost to Generate (via AI)

Chapter title translation is much cheaper than verse content — titles are short (2-15 words each):

| Model | $/title (batch) | 62.4K titles total |
|-------|----------------|-------------------|
| GPT-5-mini batch | ~$0.0001 | **~$6** |
| GPT-5 batch | ~$0.0005 | **~$31** |
| Claude CLI | ~$0.05 | **~$3,120** (overkill) |

**This is trivially cheap** — even GPT-5 batch costs only ~$31 for all translations.

## What Needs to Change

### 1. Data Generator (ThaqalaynDataGenerator)

- `book_registry.py`: `BookConfig.titles` currently only populates `en` and `ar`
- `base_parser.py`: `make_chapter()` only processes existing title languages
- Need: New pipeline step to generate translations for all chapter titles

### 2. Data Files (ThaqalaynData)

- Generate 8 new index files: `books.{ur,tr,fa,id,bn,es,fr,de,ru,zh}.json`
- Each chapter JSON file should include multilingual `titles` dict
- **Or**: Keep separate files per language (current pattern) — simpler

### 3. Angular Frontend (Thaqalayn)

- `models/text.ts`: Extend `MultiLingualText` to include all 11 languages
- `BooksState`: Update breadcrumb/title selectors to use user's selected language
- `chapter-list`, `book-dispatcher`: Display titles in selected language with English fallback

### 4. AI Pipeline Addition

Add a chapter title translation step:
- Input: 7,798 English titles + Arabic titles
- Output: 8 languages × 7,798 = 62,400 translations
- Can batch all in a single OpenAI Batch API request (~$6-31)
- Much simpler prompt than verse content (just "translate this chapter title")

## Recommendation

1. **Include in OpenAI batch processing** — add chapter titles to the batch alongside verse content
2. **Generate all 8 missing language files** in one batch run
3. **Update Angular MultiLingualText** to support all 11 languages
4. **Total cost**: ~$6-31 (negligible)
5. **Priority**: Medium — should ship alongside or shortly after AI verse content

## Interaction with AI Content Strategy

The chapter translation gap is an additional ~62K very cheap translations on top of the ~58K verse content items. Since chapter titles are short (2-15 words), they can use the cheapest model (GPT-5-mini batch at ~$6 total) regardless of which model we choose for verse content. This should be included in the Week 2 batch processing step of the main strategy.

---

*This gap should be tracked alongside the AI content generation work.*
