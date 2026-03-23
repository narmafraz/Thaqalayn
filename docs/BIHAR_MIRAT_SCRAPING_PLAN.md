# Bihar al-Anwar & Mir'at al-Uqul Scraping Plan

> **Date:** 2026-03-22
> **Status:** ACTIVE
> **Author:** Planning document for scraping two major Allamah Majlisi works

## Overview

This document plans the scraping, parsing, and integration of two major works by Allamah Majlisi (d. 1110/1698) into the Thaqalayn ecosystem:

1. **Bihar al-Anwar** (بحار الأنوار الجامعة لدرر أخبار الأئمة الأطهار) — 110-volume hadith encyclopedia
2. **Mir'at al-Uqul** (مرآة العقول في شرح أخبار آل الرسول) — 26-volume commentary on Al-Kafi

Both are critical for cross-referencing: Bihar cites source books by name/volume/page, and Mir'at maps 1:1 to Al-Kafi hadiths.

## Source Selection

### Primary Source: books.rafed.net (Word Download API) — BLOCKED

> **Status (2026-03-23):** rafed.net download API returning HTTP 500. Homepage loads but backend is down. Scripts are ready; waiting for site recovery.

**Why rafed.net:**
- Already integrated — working scraper infrastructure exists (`download_rafed_word.py`, `scrape_rafed_text.py`)
- **Word download API** (`books.rafed.net/api/download/{view_id}/doc`) — one HTTP GET per volume, entire volume as .doc
- Clean Arabic text (not image scans)
- Both books confirmed available with known view IDs

### Fallback Source: alfeker.net → archive.org / MediaFire — DISCOVERED

> **Status (2026-03-23):** All download URLs discovered and cached. PDFs are scanned images (no text layer). OCR text available via `_djvu.txt` files on archive.org but quality is moderate (Arabic OCR artifacts). **Not recommended as primary source.**

- **Bihar al-Anwar:** 110 PDFs on archive.org + OCR `_djvu.txt` + EPUB (all OCR-based)
- **Mir'at al-Uqul:** 28 PDFs on MediaFire (likely scanned, untested)
- Scripts: `download_alfeker_pdfs.py` (downloader), URL cache at `alfeker_net/discovered_urls.json`

### Sources NOT viable:
- **lib.eshia.ir** — Image-based scans, not text. Confirmed not viable (see `scrape_eshia_notes.md`).
- **shiaonlinelibrary.com** — DNS not resolving (site appears down as of 2026-03-23).
- **thaqalayn-api.net** — Neither book is available (API has only 21 primary hadith books).
- **ghbook.ir** — Not confirmed to have these books.
- **archive.org PDFs** — Scanned images without text layer. OCR text files exist but quality insufficient for production use.

### Known View IDs

**Mir'at al-Uqul** (26 volumes):
| Vol | view_id | Status |
|-----|---------|--------|
| 1 | 944 | confirmed |
| 4 | 1013 | confirmed |
| 20 | 1073 | confirmed |
| 25 | 1101 | confirmed |
| 2-3, 5-19, 21-24, 26 | TBD | need discovery |

**Bihar al-Anwar** (~110 volumes):
| Vol | view_id | Status |
|-----|---------|--------|
| 2 | 501 | confirmed |
| 8 | 526 | confirmed |
| 52 | 1009 | confirmed |
| 59 | 1052 | confirmed |
| 90 | 1167 | confirmed |
| 92 | 1187 | confirmed |
| Other vols | TBD | need discovery |

View IDs appear to be roughly sequential but not strictly contiguous. A discovery script is needed.

## Scale Estimate

| Book | Volumes | Estimated Size | Hadiths (est.) |
|------|---------|----------------|----------------|
| Bihar al-Anwar | 110 | ~200-400 MB total .doc | ~60,000+ |
| Mir'at al-Uqul | 26 | ~50-100 MB total .doc | ~16,000 (mirrors Al-Kafi) |
| **Total** | **136** | **~250-500 MB** | **~76,000+** |

For comparison: the entire current corpus is ~58,000 verses across 24 books.

## Implementation Phases

### Phase 1: View ID Discovery

Write a Playwright-based discovery script that navigates rafed.net's catalog pages to find all view IDs for both books.

**Approach:**
- Navigate to the book's main catalog page on rafed.net
- Bihar: `books.rafed.net/view.php?type=c_fbook&b_id=966` (or nearby IDs)
- Mir'at: catalog page TBD (may be linked from view/944)
- Extract all volume links and their view IDs from the page
- Save as a JSON registry

**Output:** `discover_rafed_view_ids.py` script + `rafed_view_ids.json` mapping file

### Phase 2: Word File Download

Extend `download_rafed_word.py` to include both books.

**Changes:**
- Add `bihar-al-anwar` and `mirat-al-uqul` entries to `BOOKS` dict with discovered view IDs
- Add `--bihar` and `--mirat` CLI flags
- No structural code changes needed — the downloader is generic

**Output:**
```
ThaqalaynDataSources/scraped/rafed_net/bihar-al-anwar/vol-{1..110}.doc
ThaqalaynDataSources/scraped/rafed_net/bihar-al-anwar/metadata.json
ThaqalaynDataSources/scraped/rafed_net/mirat-al-uqul/vol-{1..26}.doc
ThaqalaynDataSources/scraped/rafed_net/mirat-al-uqul/metadata.json
```

**Time estimate:** ~5 minutes total (136 HTTP GETs at 2s delay)

**Fallback:** If Word downloads are unavailable for some volumes, fall back to page-by-page Playwright scraping using the existing `scrape_rafed_text.py` pattern.

### Phase 3: Word File Parsing

Create a parser to extract structured content from the .doc files.

**New dependency:** `python-docx` (for .docx) or custom binary parser (for .doc). If rafed.net provides .doc (older format), may need `antiword` CLI tool or convert to .docx first via LibreOffice CLI.

**Parser responsibilities:**
1. Extract paragraphs with styling info (headings vs body text)
2. Identify chapter/bab boundaries from heading styles
3. Extract hadith numbers (Arabic numerals like ١٢٣ or markers like `ـ` prefix)
4. Preserve source citations (Bihar) or Al-Kafi references (Mir'at)
5. Build hierarchical Chapter/Verse structure matching the existing data model

**Output:** `bihar_parser.py` and `mirat_al_uqul_parser.py` in `app/`

### Phase 4: Cross-Reference Linking

This is the key value-add for both books.

#### Mir'at al-Uqul → Al-Kafi (1:1 structural mapping)

Mir'at follows Al-Kafi's exact structure: same volumes, books, chapters, hadiths. Each entry quotes the Al-Kafi hadith text, then adds Majlisi's commentary and grading.

**Linking strategy:**
- Structural alignment: Mir'at vol 1 covers Al-Kafi vol 1, etc.
- Text matching: Match the quoted hadith text against our existing Al-Kafi data
- Grading extraction: Mir'at is the primary source for Majlisi's hadith gradings (صحيح، حسن، موثق، ضعيف) — these can be added to Al-Kafi hadiths as metadata

**Data model additions:**
```json
{
  "commentary": {
    "mirat_al_uqul": {
      "path": "/books/mirat-al-uqul:1:1:1:1",
      "grading": "صحيح",
      "grading_en": "Sahih (Authentic)"
    }
  }
}
```

#### Bihar al-Anwar → Multiple Source Books

Bihar al-Anwar cites sources explicitly. Common citation patterns in the Arabic text:

- `الكافي:` / `الكافي ج ١ ص ٥` (Al-Kafi vol 1 p 5)
- `التهذيب:` (Tahdhib al-Ahkam)
- `الفقيه:` (Man La Yahduruhu al-Faqih)
- `الاستبصار:` (al-Istibsar)
- `الأمالي:` (Al-Amali)
- `التوحيد:` (Al-Tawhid)
- `الخصال:` (Al-Khisal)
- `كمال الدين:` (Kamal al-Din)
- And dozens more

**Linking strategy:**
1. Regex extraction of source citations (book name + vol + page/hadith number)
2. Map book names to our existing book slugs (e.g., `الكافي` → `al-kafi`)
3. Resolve volume + page/hadith to our path format (e.g., `/books/al-kafi:1:2:3:5`)
4. Resolution may require a page-to-hadith mapping table (Bihar cites by page number, our data uses hadith numbers)

**Data model additions:**
```json
{
  "cited_in": [
    {
      "source": "bihar-al-anwar",
      "path": "/books/bihar-al-anwar:2:1:3",
      "context": "cited as source"
    }
  ]
}
```

### Phase 5: Book Registration & Pipeline Integration

- Register both books in `book_registry.py`
- Add to `main_add.py` pipeline
- Run narrator extraction via existing `process_all_narrators()`
- Generate search indices
- Update Angular `Book` type if new `kind` values are needed

### Phase 6: Angular UI Updates

- Add books to the book tree navigation
- Display cross-reference links (commentary, cited_in) in verse detail view
- Display Majlisi gradings from Mir'at al-Uqul on Al-Kafi hadiths

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Word downloads unavailable for some volumes | Medium | Fall back to page-by-page scraping |
| .doc format (not .docx) requires special handling | Low | Use LibreOffice CLI to batch-convert to .docx |
| View IDs not sequential — discovery misses volumes | Medium | Cross-check against known 110-volume count |
| Bihar source citations hard to parse reliably | High | Start with high-confidence patterns, iterate |
| Mir'at structural alignment to Al-Kafi imperfect | Medium | Use text matching as fallback for structural alignment |
| Scale: 136 volumes overwhelms current JSON file count | Low | Already handle ~68,000 files; proportional increase is manageable |

## Estimated Cost & Timeline

| Phase | Effort | Notes |
|-------|--------|-------|
| Phase 1: View ID Discovery | 1-2 hours | Playwright script + manual verification |
| Phase 2: Word Download | Minutes | Extend existing script, run download |
| Phase 3: Word Parsing | 2-4 days | New parser, test against sample volumes |
| Phase 4: Cross-Reference Linking | 3-5 days | Regex extraction, resolution, testing |
| Phase 5: Pipeline Integration | 1 day | Registry, pipeline, indices |
| Phase 6: Angular UI | 2-3 days | Commentary display, grading badges |

## Dependencies

- `python-docx` or `antiword` for Word file parsing
- Playwright (already installed) for view ID discovery
- Existing narrator registry + linker infrastructure
