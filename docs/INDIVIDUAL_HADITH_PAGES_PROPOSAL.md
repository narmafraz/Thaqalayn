# Individual Hadith/Verse Pages Proposal

> **Date:** 2026-02-21
> **Status:** Proposed
> **Dependencies:** Schema changes (SCHEMA_PROPOSAL.md), Generator updates

---

## 1. Overview

Add individually addressable pages for each hadith/verse, giving every unit of content its own URL that can be shared, bookmarked, and enriched with per-hadith metadata. The existing chapter view (all hadiths on one scrollable page) is preserved unchanged.

**Two views of the same content:**

| View | URL Pattern | Purpose | Data Source |
|------|-------------|---------|-------------|
| **Chapter view** (existing) | `/books/al-kafi:1:1:1` | Reading flow, all hadiths in context | Chapter JSON file (unchanged) |
| **Hadith view** (new) | `/books/al-kafi:1:1:1:3` | Sharing, reference, per-hadith metadata | New individual hadith JSON file |

---

## 2. The Data Duplication Problem

### Option A: No new files (chapter + scroll)
The "hadith page" loads the full chapter JSON and renders only one verse. No data duplication.
- **Pros:** Zero storage cost
- **Cons:** Loads full chapter for one hadith. Can't add per-hadith metadata without bloating chapter files.

### Option B: Split everything (N requests per chapter)
Each hadith gets its own file. Chapter page makes N HTTP requests.
- **Pros:** True per-hadith pages
- **Cons:** Chapter with 50 hadiths = 50 requests. Major restructuring.

### Option C: Hybrid (RECOMMENDED)
Keep chapter files as-is. Add lightweight per-hadith stub files alongside them.
- **Pros:** No change to chapter loading. Per-hadith pages carry extended metadata. Follows existing path pattern.
- **Cons:** Some data duplication (~80 MB estimated for verse text). But the hadith files are the natural home for extended metadata that would bloat chapter files anyway.

**This proposal follows Option C.**

---

## 3. URL Design

Extends the existing colon-separated path hierarchy:

```
/books/al-kafi:1:1:1      → Chapter view (existing)
/books/al-kafi:1:1:1:3    → Hadith #3 in that chapter (NEW)

/books/quran:1             → Surah view (existing)
/books/quran:1:4           → Verse 4 of Al-Fatiha (NEW)
```

This follows the natural path convention already used throughout the project. The existing Angular route `books/:index` already accepts any depth of colon-separated index — no new routes needed.

---

## 4. Per-Hadith JSON Schema

### File location: `books/al-kafi/1/1/1/3.json`

```json
{
  "index": "al-kafi:1:1:1:3",
  "kind": "verse_detail",
  "data": {
    "verse": {
      "index": 3,
      "local_index": 3,
      "part_type": "Hadith",
      "path": "/books/al-kafi:1:1:1:3",
      "text": ["<Arabic text>"],
      "translations": {
        "en.hubeali": ["<English translation>"]
      },
      "narrator_chain": {
        "parts": [...]
      },
      "relations": {
        "Mentions": ["/books/quran:9:122"]
      }
    },
    "chapter_path": "/books/al-kafi:1:1:1",
    "chapter_title": { "en": "Chapter of Necessity of Proof", "ar": "..." },
    "nav": {
      "prev": "/books/al-kafi:1:1:1:2",
      "next": "/books/al-kafi:1:1:1:4",
      "up": "/books/al-kafi:1:1:1"
    },
    "gradings": {
      "majlisi": "Sahih",
      "mohseni": "Mu'tabar"
    },
    "source_url": "https://thaqalayn.net/hadith/2/1/1/3",
    "cross_validation": {
      "status": "verified",
      "confidence": 0.98,
      "sources": ["rafed.net", "lib.eshia.ir"]
    },
    "scholarly_notes": []
  }
}
```

### New `kind` value: `verse_detail`

This is distinct from the existing `verse_list` (chapter-level) to allow the Angular `BookDispatcher` to detect and render a single-verse detail view.

### Key design decisions:
1. **Verse text is duplicated** between chapter file and hadith file. This is intentional — the chapter file serves the reading view, the hadith file serves the reference/sharing view.
2. **Extended metadata lives only in the hadith file**: gradings, cross-validation, scholarly notes, source URLs. This avoids bloating chapter files.
3. **Navigation is hadith-to-hadith**: prev/next point to sibling hadiths, up points to the chapter.

---

## 5. Data Size Impact

| Content | Count | Avg. hadith file size | Total |
|---------|-------|----------------------|-------|
| Al-Kafi hadiths | ~15,281 | ~2 KB | ~30 MB |
| Quran verses | ~6,236 | ~1.5 KB | ~9 MB |
| Other books (future) | ~25,000 est. | ~2 KB | ~50 MB |
| **Total** | **~46,500** | | **~89 MB** |

This is significant but justified:
- These files carry extended metadata not present in chapter files
- Each file is individually cacheable by CDN
- Each hadith gets its own indexable URL for SEO (46,500 new indexed pages)
- The duplication is structured, not wasteful — different files serve different purposes

---

## 6. Generator Changes

### New output step in `main_add.py`:
```python
def generate_verse_detail_files(book_root: Chapter):
    """Generate individual JSON files for each verse/hadith."""
    for chapter in walk_chapters(book_root):
        if not chapter.verses:
            continue
        for i, verse in enumerate(chapter.verses):
            verse_index = f"{chapter.index}:{verse.local_index}"
            verse_data = {
                "index": verse_index,
                "kind": "verse_detail",
                "data": {
                    "verse": jsonable_encoder(verse),
                    "chapter_path": chapter.path,
                    "chapter_title": chapter.titles,
                    "nav": {
                        "prev": f"{chapter.path}:{chapter.verses[i-1].local_index}" if i > 0 else None,
                        "next": f"{chapter.path}:{chapter.verses[i+1].local_index}" if i < len(chapter.verses) - 1 else None,
                        "up": chapter.path,
                    },
                    "gradings": verse.gradings,
                    "source_url": verse.source_url,
                }
            }
            write_file(f"/books/{verse_index.replace(':', '/')}", verse_data)
```

### Sitemap update:
Update `scripts/generate-sitemap.js` to include individual hadith URLs with priority 0.6.

---

## 7. Angular Changes

### 7.1 Route handling (no new routes needed)

The existing route `{ path: 'books/:index', component: BookDispatcherComponent }` already accepts any colon-separated index. The `BookDispatcherComponent` just needs to detect `kind: "verse_detail"` and render differently.

### 7.2 BookDispatcher update

Add a condition for the new `verse_detail` kind:

```typescript
// In book-dispatcher.component.ts or template
switch (book.kind) {
  case 'chapter_list':
    // existing: show chapter list table
    break;
  case 'verse_list':
    // existing: show all verses in chapter
    break;
  case 'verse_detail':
    // NEW: show single verse detail view
    break;
}
```

### 7.3 New VerseDetailComponent

A focused single-hadith view showing:
- Full Arabic text (large, prominent)
- Translation(s)
- Narrator chain with clickable links
- Gradings with color-coded badges (Sahih=green, Hasan=blue, Da'if=orange)
- Cross-references
- Cross-validation status
- Chapter context link ("View in chapter context →")
- Prev/Next hadith navigation
- Share button (Web Share API / copy URL)
- Source link

### 7.4 Chapter view enhancement

Add a "link" icon to each hadith in the chapter view that navigates to the individual hadith page:
```html
<a [routerLink]="['/books', verse.path.substring(7)]"
   aria-label="View hadith details"
   class="verse-link-icon">
  <mat-icon>link</mat-icon>
</a>
```

### 7.5 SEO enhancement

Update `SeoService` to set rich meta for verse_detail pages:
- Title: "Hadith 3 - Chapter of Necessity of Proof - Al-Kafi"
- Description: First ~160 chars of English translation
- JSON-LD: `ScholarlyArticle` or `CreativeWork` with `isPartOf` linking to the Book
- OG image: could be generated (future)

---

## 8. Implementation Steps

| Step | Description | Effort | Dependencies |
|------|-------------|--------|-------------|
| 1 | Add `verse_detail` kind to Angular Book type | Low | None |
| 2 | Generator: write per-hadith JSON files | Medium | Schema changes |
| 3 | Angular: VerseDetailComponent | Medium | Step 1 |
| 4 | Angular: chapter view link icons | Low | Step 1 |
| 5 | SeoService: verse_detail meta | Low | Step 3 |
| 6 | Sitemap: include individual hadith URLs | Low | Step 2 |
| 7 | E2E tests for hadith pages | Low | Steps 2-3 |

---

## 9. Future Extensions

Once individual hadith pages exist, they become the natural home for:
- **Community annotations/notes** — per-hadith comments
- **Audio recitation** — per-verse Quran audio player
- **Tafsir/commentary** — expandable scholarly commentary
- **Thematic tags** — topic categorization
- **Citation export** — generate academic citations
- **Social sharing cards** — verse image generation

---

## 10. Relationship to Other Proposals

| Document | Relationship |
|----------|-------------|
| SCHEMA_PROPOSAL.md | Gradings field (`Dict[str, str]`) and `source_url` are defined there. Per-hadith files are the natural consumer of these fields. |
| PHASE3_FEATURE_PROPOSAL.md §6 | Cross-validation data (`validation/` files) could be merged into per-hadith files instead of separate validation files. |
| PHASE3_FEATURE_PROPOSAL.md §8 | SEO benefits: 46,500 individually indexable URLs instead of ~2,500 chapter pages. |
| OPTIMIZATION_PLAN.md | ~89 MB increase, but carries metadata that would otherwise bloat chapter files. Net architectural improvement. |
| FEATURE_PROPOSALS.md §6 | Social sharing becomes trivial — each hadith has a clean URL. |
