# Parser Architecture for New Books

> **Purpose:** Guide for DataGen when building parsers for new book sources in Phase 3.
> Two source types exist: thaqalayn.net mirror HTML and ThaqalaynAPI JSON.
> This document covers both, including schema mappings and recommended code structure.
>
> **Date:** 2026-02-21

---

## 1. Source Types Overview

| Source | Format | Location | Books | Parser Type |
|--------|--------|----------|-------|-------------|
| **thaqalayn.net mirror** | HTML (HTTrack) | `raw/thaqalayn_net/` | 15 non-Kafi books (IDs 9-23) | HTML parser (BeautifulSoup) |
| **ThaqalaynAPI** | JSON (REST API) | `raw/thaqalayn_api/` | 21+ books (scraped via `scrape_thaqalayn_api.py`) | JSON transformer |
| **hubeali.com** | XHTML/ePub | `raw/hubeali_com/` | Al-Kafi (done), Basair al-Darajaat | HTML parser (existing pattern) |
| **tanzil.net** | XML | `raw/tanzil_net/` | Quran (done) | XML parser (existing) |

For most new books, **prefer the ThaqalaynAPI source** when available -- it's structured JSON, cleaner, and includes metadata (gradings, sanad/matn separation) not present in the mirror HTML.

---

## 2. ThaqalaynAPI JSON Transformer

### Source Schema (per hadith in `hadiths.json`)

```json
{
  "id": 1,
  "bookId": "Fadail-al-Shia-Saduq",
  "book": "Fadail al-Shia",
  "category": "Content",
  "categoryId": "1",
  "chapter": "The virtues and divine favor of the Shia",
  "chapterInCategoryId": 8,
  "author": "Shaykh Muhammad b. Ali al-Saduq",
  "translator": "Badr Shahin",
  "arabicText": "...",
  "englishText": "...",
  "frenchText": "",
  "thaqalaynSanad": "...",
  "thaqalaynMatn": "...",
  "majlisiGrading": "",
  "mohseniGrading": "",
  "behbudiGrading": "",
  "gradingsFull": [],
  "volume": 1,
  "URL": "https://thaqalayn.net/hadith/25/1/8/1"
}
```

### Target Schema (our output)

**Wrapper:** `{ "index": "book-slug:vol:chapter", "kind": "verse_list", "data": { ... } }`

**Verse:**
```json
{
  "index": 1,
  "local_index": 1,
  "part_type": "Hadith",
  "path": "/books/book-slug:1:1:1",
  "text": ["<Arabic text>"],
  "translations": {
    "en.translator-id": ["<English text>"]
  }
}
```

**Chapter list entry:**
```json
{
  "index": 1,
  "local_index": 1,
  "part_type": "Chapter",
  "path": "/books/book-slug:1:1",
  "titles": { "en": "Chapter title" },
  "verse_count": 5,
  "verse_start_index": 1,
  "verse_translations": ["en.translator-id"]
}
```

### Field Mapping

| API field | Our field | Notes |
|-----------|-----------|-------|
| `arabicText` | `verse.text[0]` | Primary text, always Arabic |
| `englishText` | `verse.translations["en.{translator_id}"][0]` | Translation entry |
| `chapter` | `chapter.titles["en"]` | Chapter heading |
| `category` | Section/volume grouping | Group hadiths by `categoryId`, then by `chapterInCategoryId` |
| `volume` | Volume level in hierarchy | Multi-volume books use this for top-level grouping |
| `thaqalaynSanad` | (future) narrator chain extraction | Chain of narration, useful for `kafi_narrators.py`-style processing later |
| `thaqalaynMatn` | (future) body text only | Main hadith text without chain, useful for display separation |
| `majlisiGrading` | (future) grading metadata | Not in current schema, but could be added |
| `translator` | `Translation.name` | Translator display name |
| `author` | Book-level metadata | Stored in book index, not per-hadith |
| `URL` | Not mapped | Source reference only |
| `frenchText` | (future) `fr.translator-id` | If non-empty, add as French translation |

### Recommended Code Structure

```python
# app/thaqalayn_api.py

BOOK_CONFIGS = {
    "fadail-al-shia": {
        "source_folder": "fadail-al-shia",
        "book_slug": "fadail-al-shia",
        "book_index": 3,  # Position in books.json
        "translator_id": "en.badr-shahin",
        "translator_name": "Badr Shahin",
    },
    "man-la-yahduruhu": {
        "source_folder": "man-la-yahduruhu-al-faqih-v{vol}",
        "book_slug": "man-la-yahduruhu",
        "book_index": 4,
        "volumes": 5,
        "translator_id": "en.bab-ul-qaim",
        "translator_name": "Bab Ul Qaim Publications",
    },
    # ... more books
}

def transform_book(config: dict) -> Chapter:
    """Transform scraped ThaqalaynAPI JSON into our Chapter hierarchy.

    Steps:
    1. Load hadiths.json from raw/thaqalayn_api/{source_folder}/
    2. Group hadiths by (volume, categoryId, chapterInCategoryId)
    3. Build hierarchy: Book -> [Volume ->] Category -> Chapter -> Hadiths
    4. Create Verse objects from arabicText + englishText
    5. Create Translation objects
    6. Call set_index() and insert_chapter()
    """
    pass

def group_hadiths(hadiths: list) -> dict:
    """Group flat hadith list into hierarchy.

    Returns: { volume: { categoryId: { chapterInCategoryId: [hadiths] } } }

    Key insight: the API returns a flat list. We reconstruct hierarchy from:
    - volume: top-level grouping (for multi-volume books)
    - categoryId: maps to "books" or "sections" within a volume
    - chapterInCategoryId: maps to chapters within a section
    - chapter: the chapter title (English)
    """
    pass
```

### Hierarchy Reconstruction

The API returns a flat list of hadiths. The hierarchy must be reconstructed:

```
Book (root Chapter, part_type=Book)
  Volume 1 (Chapter, part_type=Volume) -- only for multi-volume books
    Category "Introduction" (Chapter, part_type=Book)
      Chapter 1 "Title" (Chapter, part_type=Chapter, contains verses)
        Hadith 1 (Verse)
        Hadith 2 (Verse)
      Chapter 2 "Title" (Chapter, part_type=Chapter)
        ...
    Category "Content" (Chapter, part_type=Book)
      ...
  Volume 2 ...
```

Use `category` + `categoryId` for section grouping. Use `chapter` + `chapterInCategoryId` for chapter grouping. Single-volume books skip the volume level.

---

## 3. thaqalayn.net Mirror HTML Parser

### HTML Structure (uniform across books 9-23)

**Book index page** (`book/{id}.html`):
```html
<h3 style="text-align: center">Book Title</h3>
<h5 style="text-align: center"><strong>Author:</strong> Author Name</h5>
<h5 style="text-align: center"><strong>Translator:</strong> Translator Name</h5>

<!-- Section header (non-link) -->
<label class="form-check">
  <span class="form-label"><strong>Section Name</strong></span>
</label>

<!-- Chapter link -->
<a href="../chapter/{bookId}/{section}/{chapter}.html">
  <label class="form-check">
    <span class="form-label">1. Chapter Title</span>
  </label>
</a>
```

**Chapter page** (`chapter/{bookId}/{section}/{chapter}.html`):
```html
<h3>1. Chapter Title</h3>
<a href="..." class="btn btn-primary">Back to book</a>
<hr>

<!-- Hadith 1 -->
<p class="libAr" dir="rtl">Arabic hadith text...</p>
<br>
<p class="" dir="">English translation text...</p>
<br>
<hr/>

<!-- Hadith 2 -->
<p class="libAr" dir="rtl">Arabic hadith text...</p>
<br>
<p class="" dir="">English translation text...</p>
<br>
<hr/>
```

### Recommended Code Structure

```python
# app/thaqalayn_net.py

from bs4 import BeautifulSoup
from app.models import Chapter, Verse, Translation, Language, PartType

MIRROR_BOOKS = {
    20: {"slug": "kitab-al-zuhd", "index": 5},
    22: {"slug": "kitab-al-ghayba-numani", "index": 6},
    14: {"slug": "al-tawhid", "index": 7},
    # ... etc
}

def parse_book(book_id: int) -> Chapter:
    """Parse any book from the thaqalayn.net mirror.

    Steps:
    1. Parse book/{id}.html for title, author, translator, section/chapter list
    2. Group chapter links by section headers
    3. For each chapter, parse chapter/{id}/{section}/{num}.html
    4. Extract alternating Arabic/English paragraph pairs
    5. Build Chapter/Verse hierarchy
    6. Call set_index() and insert_chapter()
    """
    pass

def parse_chapter_page(filepath: str, translator_id: str) -> list:
    """Parse a chapter HTML file, returning list of Verse objects.

    Pattern:
    - Find all <p class="libAr" dir="rtl"> for Arabic text
    - The next <p> sibling (without class="libAr") is the English translation
    - Each Arabic+English pair = one Verse
    """
    pass

def extract_book_metadata(filepath: str) -> dict:
    """Extract title, author, translator from book index page.

    Returns: {
        "title_en": str,  # from <h3>
        "author": str,    # from <h5> containing "Author:"
        "translator": str # from <h5> containing "Translator:"
    }
    """
    pass

def extract_chapter_list(filepath: str) -> list:
    """Extract ordered list of sections and chapters from book index page.

    Returns: [
        {"type": "section", "title": "Section Name"},
        {"type": "chapter", "title": "Chapter Title", "href": "../chapter/14/2/1.html"},
        ...
    ]
    """
    pass
```

### Parsing Notes

- Arabic text is always in `<p class="libAr" dir="rtl">`.
- English text follows in the next `<p>` tag (with `class=""` or no class).
- Hadiths are separated by `<hr/>` tags.
- Section headers in book index pages are `<label>` elements with `<strong>` inside (no `<a>` wrapper). Chapter links are `<label>` elements wrapped in `<a>` tags.
- Some chapter files may be empty (e.g., `chapter/13/1/1.html` is 1 byte). Skip these gracefully.
- The hadith number is embedded at the start of both Arabic and English text (e.g., "2. He said:..."). Extract or preserve as-is.

---

## 4. Overlap Between Sources

Several books exist in both the mirror HTML and the ThaqalaynAPI:

| Book | Mirror ID | API Slug | Prefer |
|------|-----------|----------|--------|
| Al-Amali (Mufid) | 13 | Al-Amali-Mufid | **API** (structured JSON) |
| Al-Tawhid | 14 | Al-Tawhid-Saduq | **API** |
| Uyun akhbar al-Ridha | 11-12 | Uyun-akhbar-al-Rida-Volume-{1,2}-Saduq | **API** |
| Kitab al-Zuhd | 20 | Kitab-al-Zuhd-Ahwazi | **API** |
| Kitab al-Ghayba (Numani) | 22 | Kitab-al-Ghayba-Numani | **API** |
| Basair al-Darajaat | 21 | (not on API) | **Mirror** |
| Thawab al-Amal | 23 | Thawab-al-Amal-wa-iqab-al-Amal-Saduq | **API** |
| Al-Khisal | 10 | Al-Khisal-Saduq | **API** |
| Al-Mahasin | 18-19 | (not on API) | **Mirror** |

**Rule: prefer the API source when available.** The API provides additional metadata (gradings, sanad/matn separation, structured category/chapter IDs) that the mirror HTML does not. The mirror HTML parser is needed only for books not on the API (Al-Mahasin, Ilal al-Sharai, Rijal Ibn al-Ghadairi, and Basair al-Darajaat).

---

## 5. Shared Patterns

Both parsers should follow these patterns from the existing codebase:

### Model Construction
```python
from app.models import Chapter, Verse, Translation, Language, PartType

# Book root
book = Chapter()
book.titles = {Language.EN.value: "Book Title", Language.AR.value: "..."}
book.path = "/books/book-slug"
book.part_type = PartType.Book.value

# Leaf chapter (contains hadiths)
chapter = Chapter()
chapter.titles = {Language.EN.value: "Chapter Title"}
chapter.part_type = PartType.Chapter.value
chapter.verses = [verse1, verse2, ...]

# Verse/Hadith
verse = Verse()
verse.text = [arabic_text]
verse.part_type = PartType.Hadith.value
verse.translations = {"en.translator-id": [english_text]}
```

### Pipeline Integration
```python
# In main_add.py, add after existing init functions:
from app.thaqalayn_api import transform_book, BOOK_CONFIGS

def init_new_books():
    for config in BOOK_CONFIGS.values():
        book = transform_book(config)
        set_index(book)
        insert_chapter(book)
```

### Translation Registration
Each new book's translator must be registered in `index/translations.json` (generated by `lib_index.py`). The translation ID format is `{lang}.{translator-slug}` (e.g., `en.badr-shahin`).

### Book Registration
Each new book must be added to `books/books.json` (generated by `init_books()` in `books.py`). This requires a unique `book_index` and `book_slug`.

---

## 6. Testing New Parsers

For each new parser/transformer:

1. **Unit test with sample data:** Create a small fixture (3-5 hadiths) and test that the parser produces correct Chapter/Verse objects.
2. **Integration test:** Run the parser on real raw data and validate output JSON matches schema (use existing `test_data_schema.py` tests).
3. **Snapshot test:** Add a snapshot for the first chapter of each new book in `test_data_snapshots.py`.
4. **Visual verification:** Load the new book in the Angular app and verify Arabic text, English text, navigation, and breadcrumbs display correctly.

---

## 7. Implementation Order

1. **`thaqalayn_api.py` transformer** -- start here. Covers the most books with the least parsing complexity (JSON to JSON).
2. **`thaqalayn_net.py` HTML parser** -- for the 4 books not on the API.
3. **Integration into `main_add.py`** -- wire both parsers into the generation pipeline.
4. **`init_books()` update** -- register new books in the book index.
