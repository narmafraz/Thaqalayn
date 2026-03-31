# Shia Tafsir Integration Plan

> **Status:** ACTIVE
> **Created:** 2026-03-31
> **Goal:** Replace the 3 Sunni-only English tafsirs with a comprehensive collection of Shia tafsirs in Arabic, Farsi, and English

## Current State

The app serves 3 **Sunni English** tafsirs from an external CDN (`spa5k/tafsir_api` via jsDelivr):
- Tafsir Ibn Kathir
- Tafsir al-Jalalayn
- Maarif-ul-Quran

**Problems:**
1. None are Shia — misaligned with the project's Shia focus
2. English only — no Arabic or Farsi
3. External dependency — CDN could go down or change
4. No self-hosted data — inconsistent with the rest of the architecture

## Target State

Self-hosted Shia tafsir data in `ThaqalaynData/tafsir/` with editions in Arabic, Farsi, and English. The Angular `TafsirService` loads from the local API, same as all other data.

### Target Tafsir Editions

| ID | Name | Author | Language | Source | Priority |
|----|------|--------|----------|--------|----------|
| `ar.mizan` | Al-Mizan fi Tafsir al-Quran | Allamah Tabatabai | Arabic | app-furqan SQLite | P1 |
| `fa.mizan` | Al-Mizan (Farsi) | Allamah Tabatabai | Farsi | app-furqan SQLite | P1 |
| `en.mizan` | Al-Mizan (English) | Allamah Tabatabai | English | app-furqan SQLite | P1 |
| `fa.nemooneh` | Tafsir Nemooneh | Makarem Shirazi | Farsi | app-furqan SQLite | P1 |
| `en.nemooneh` | Tafsir Nemooneh (English) | Makarem Shirazi | English | app-furqan SQLite | P1 |
| `fa.noor` | Tafsir Noor | Mohsen Gharaati | Farsi | app-furqan SQLite | P1 |
| `ar.safi` | Tafsir as-Safi | Fayz Kashani | Arabic | app-furqan SQLite | P1 |
| `en.safi` | Tafsir as-Safi (English) | Fayz Kashani | English | app-furqan SQLite | P1 |
| `en.mizan.alislam` | Al-Mizan (al-islam.org) | Allamah Tabatabai | English | al-islam.org HTML | P2 |
| `ar.tabyan` | Al-Tibyan fi Tafsir al-Quran | Sheikh al-Tusi | Arabic | altafsir.com | P2 |
| `ar.majma` | Majma' al-Bayan | al-Tabarsi | Arabic | altafsir.com | P2 |
| `ar.qummi` | Tafsir al-Qummi | Ali ibn Ibrahim | Arabic | altafsir.com | P2 |
| `en.hubeali` | Tafseer Hub-e-Ali | Hubeali.com | English | hubeali.com | P3 |

## Data Sources

### Source 1: app-furqan/quran-app-data (GitHub) — PRIORITY 1

**URL:** https://github.com/app-furqan/quran-app-data
**Format:** SQLite databases (compressed as `.tar.xz`)
**License:** CC BY-ND 4.0 (redistribution OK with attribution, no modification to data itself)

**Files to download:**
- `tafsir_almizan_ar.db.tar.xz` — Al-Mizan Arabic
- `tafsir_almizan_fa.db.tar.xz` — Al-Mizan Farsi
- `tafsir_almizan_en.db.tar.xz` — Al-Mizan English
- `tafsir_nemouneh_fa_en_ur.tar.xz` — Nemooneh (Farsi/English/Urdu)
- `tafsir-noor.tar.xz` — Tafsir Noor (Farsi)
- `tafsir_safi_ar_en_ur.db.tar.xz` — As-Safi (Arabic/English/Urdu)

**Approach:**
1. Download and extract all SQLite DBs
2. Inspect schemas (expected: surah, ayah, text columns)
3. Write Python converter to export per-surah JSON files
4. Store source DBs in `ThaqalaynDataSources/tafsir/app-furqan/`
5. Generate JSON to `ThaqalaynData/tafsir/{edition_id}/{surah}.json`

**Assessment:** Lowest effort, highest value. Structured data, ready to query.

### Source 2: al-islam.org — PRIORITY 2

**URL:** https://al-islam.org/library/quran-commentaries
**Format:** HTML pages, organized by volume/chapter
**License:** Free for non-commercial use with attribution

**Available content:**
- Al-Mizan English translation (13+ volumes by Rizvi, remaining by Tawheed Institute)
- "An Enlightening Commentary into the Light of the Holy Quran" (English Tafsir Nemooneh, 19 volumes)

**URL pattern:**
- Volume index: `/al-mizan-exegesis-quran-volume-{N}-sayyid-muhammad-husayn-tabatabai`
- Sections: `/surah-al-{name}-verses-{range}`
- Anchors: `#verse-{N}`, `#commentary`, `#traditions`

**Approach:**
1. Scrape table of contents for each volume to get all section URLs
2. Parse HTML content, extract verse-by-verse commentary
3. Map each commentary block to (surah, ayah_start, ayah_end)
4. May provide higher-quality English than the app-furqan DB (professionally translated)

**Assessment:** Medium effort. HTML scraping required but structure is clean. Good supplement if app-furqan English quality is insufficient.

### Source 3: altafsir.com — PRIORITY 2

**URL:** https://www.altafsir.com/
**Format:** ASP.NET dynamic pages
**License:** Academic/research resource (Royal Aal al-Bayt Institute)

**Shia tafsirs available (madhab ID 4):**
- Al-Qummi (Tafsir al-Qummi)
- Al-Tibyan (Sheikh al-Tusi)
- Al-Mizan (Tabatabai)
- Al-Safi (Fayz Kashani)
- Majma' al-Bayan (Tabarsi)

**URL parameters:**
```
/Tafasir.asp?tMadhNo=4&tTafsirNo={id}&tSoraNo={1-114}&tAyahNo={N}&tDisplay=yes&LanguageID=1
```
- `tMadhNo=4` — Shia school
- `tTafsirNo` — Specific tafsir ID
- `tSoraNo` — Surah (1-114)
- `tAyahNo` — Ayah number
- `LanguageID=1` — Arabic

**Approach:**
1. First, enumerate all Shia tafsir IDs by fetching the JavaScript arrays from the page
2. For each tafsir, iterate all surahs and ayahs
3. Parse the `#DispFrame` div content
4. Rate-limit requests (be respectful — academic resource)

**Assessment:** Medium-high effort. ASP.NET scraping is fragile. Best source for classical tafsirs (al-Qummi, al-Tibyan, Majma' al-Bayan) not available elsewhere as structured data.

### Source 4: hubeali.com — PRIORITY 3

**URL:** https://hubeali.com/tafseerhubeali/
**Format:** HTML pages + PDF (7,192 pages)
**Content:** Tafseer Hub-e-Ali — hadith-based commentary compiled from Shia hadith sources

**Approach:**
1. Scrape per-surah pages
2. Extract verse-level commentary
3. Unique value: hadith-based tafsir from Ahlul Bayt traditions

**Assessment:** Lower priority. Unique content but PDF-heavy format makes extraction harder.

### Source 5: almizan.org — PRIORITY 3

**URL:** https://almizan.org/
**Format:** Dynamic web app (likely SPA with API backend)
**Content:** Full Al-Mizan in English + Arabic (40 volumes)

**Assessment:** Needs further investigation of API calls. May duplicate app-furqan data. Lower priority unless app-furqan quality is insufficient.

### Sources NOT currently accessible (*.ir domains)

These Iranian sites are likely geo-restricted and deferred to a future phase:
- **quran.inoor.ir** — 25+ Farsi tafsirs, structured per-verse URLs
- **lib.eshia.ir** — Al-Mizan Farsi, Majma' al-Bayan, thousands of texts
- **ghbook.ir** — Tafsir Nemooneh (27 volumes), Tafsir Noor
- **gharaati.ir** — Official Tafsir Noor site
- **makarem.ir** — Official Makarem Shirazi site

## Output Format

### JSON File Structure

Each tafsir edition produces per-surah JSON files:

```
ThaqalaynData/tafsir/
  editions.json                    # Edition index
  ar.mizan/1.json                  # Al-Mizan Arabic, Surah 1
  ar.mizan/2.json                  # Al-Mizan Arabic, Surah 2
  ...
  fa.nemooneh/114.json             # Nemooneh Farsi, Surah 114
```

**editions.json:**
```json
[
  {
    "id": "ar.mizan",
    "name": "الميزان في تفسير القرآن",
    "name_en": "Al-Mizan fi Tafsir al-Quran",
    "author": "العلامة الطباطبائي",
    "author_en": "Allamah Tabatabai",
    "language": "ar",
    "source": "app-furqan"
  }
]
```

**Per-surah file (e.g., `ar.mizan/1.json`):**
```json
{
  "edition": "ar.mizan",
  "surah": 1,
  "ayahs": [
    {
      "ayah": 1,
      "text": "..."
    },
    {
      "ayah": 2,
      "text": "..."
    }
  ]
}
```

This format is compatible with the existing `TafsirService` response parsing (which expects an array with `ayah_number` and `text` fields), requiring only minor adjustments.

## Implementation Plan

### Phase 1: app-furqan SQLite databases (this session)

1. **Download** all 6 SQLite database archives from GitHub
2. **Inspect** schemas to understand table structure
3. **Write** `ThaqalaynDataGenerator/app/tafsir_converter.py`:
   - Reads SQLite DBs
   - Exports per-surah JSON files
   - Generates `editions.json`
4. **Store** source DBs in `ThaqalaynDataSources/tafsir/app-furqan/`
5. **Generate** JSON to `ThaqalaynData/tafsir/`
6. **Update** Angular `TafsirService`:
   - Point to self-hosted `tafsir/` path instead of external CDN
   - Load editions dynamically from `editions.json`
   - Support language filtering in edition selector
7. **Update** `chapter-content` component:
   - Group editions by language in dropdown
   - Show edition language indicator

### Phase 2: altafsir.com scraping (future session)

1. Enumerate Shia tafsir IDs from the site's JavaScript
2. Build scraper with rate limiting (1 req/sec)
3. Parse Arabic tafsir content for al-Qummi, al-Tibyan, Majma' al-Bayan
4. Add to tafsir JSON collection

### Phase 3: al-islam.org scraping (future session)

1. Scrape Al-Mizan English volumes
2. Parse HTML, map to verse references
3. Compare quality with app-furqan English — keep the better one

### Phase 4: hubeali.com and *.ir sites (future)

1. Scrape Tafseer Hub-e-Ali (hadith-based)
2. When *.ir access available: scrape quran.inoor.ir for additional Farsi tafsirs

## Architecture Decisions

1. **Self-hosted over CDN** — Consistent with existing architecture. All data in ThaqalaynData, deployed to Netlify.
2. **Per-surah files** — Matches the existing CDN format. Each file is small enough for fast loading (~10-100KB) but contains all ayahs for a surah, enabling efficient caching.
3. **Edition ID format** — `{lang}.{name}` (e.g., `ar.mizan`) follows the translation ID convention already used in the project.
4. **Source attribution** — Each edition includes source metadata for proper attribution per CC BY-ND 4.0.

## Attribution Requirements

- **app-furqan/quran-app-data**: CC BY-ND 4.0 — Must credit repository and maintain data integrity
- **al-islam.org**: Non-commercial use with permission from copyright holders
- **altafsir.com**: Royal Aal al-Bayt Institute for Islamic Thought — academic use
- **hubeali.com**: Charity organization, free distribution encouraged
