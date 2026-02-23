# Research: Tahdhib al-Ahkam & al-Istibsar — Text Sources

> **Date:** 2026-02-23
> **Purpose:** Identify online sources for the full Arabic text of the remaining two of the Four Books, to enable building parsers for the Thaqalayn project.
> **Languages searched:** English, Arabic, Farsi

---

## Book Reference

| Book | Author | Volumes | Hadiths | Status in Thaqalayn |
|------|--------|---------|---------|-------------------|
| **Tahdhib al-Ahkam** (تهذيب الأحكام) | Shaykh al-Tusi (d. 460 AH) | 10 | ~13,590 | Not available |
| **al-Istibsar** (الاستبصار فيما اختلف من الأخبار) | Shaykh al-Tusi | 4 | ~5,511 | Not available |

Neither book is available on thaqalayn.net or the ThaqalaynAPI. This is the biggest gap in the project's coverage of the Four Books.

---

## Source Analysis

### Tier 1 — Best for Structured Extraction

#### 1. hadith.inoor.ir (Jami' al-Ahadith Online)

- **URL:** https://hadith.inoor.ir/
- **Format:** Angular SPA with internal REST API. Individual hadith pages with metadata.
- **Structure:** Highly structured — ~415,000 hadiths from 278 volumes. Each hadith has a unique numeric ID. Organized by book, volume, chapter. URLs: `/fa/hadith/{id}/translate`.
- **Includes Tahdhib + Istibsar:** Yes, as part of the comprehensive collection.
- **Farsi translation:** Yes — available alongside Arabic text.
- **English translation:** No.
- **Scrapeable:** The Angular SPA loads data via internal API calls that could be reverse-engineered via browser network inspection. This is the most promising source for structured per-hadith data.
- **Quality:** Highest quality. Operated by CRCIS (Computer Research Center of Islamic Sciences / Noor). Described as "the largest Shia hadith website."
- **Assessment:** **PRIMARY TARGET.** If the internal API can be discovered, this gives us fully structured per-hadith data with Arabic text, Farsi translations, narrator chains, and grading metadata.

#### 2. ghbook.ir (Qaimiyya Digital Library)

- **Tahdhib URL:** https://www.ghbook.ir/index.php?option=com_dbook&task=viewbook&book_id=378&lang=fa
- **Istibsar URL:** https://www.ghbook.ir/index.php?option=com_dbook&task=viewbook&book_id=2628&lang=fa
- **Format:** Multiple download formats: PDF, **HTML**, **EPUB**, GHM, GH/GHB, APK, JAR. Also readable online.
- **Structure:** Organized by volume. Each volume is a separate download. Also available as "complete in one volume."
- **Scrapeable:** Yes — HTML and EPUB formats are directly parseable. URL scheme is predictable (`book_id` based, volume suffix like `book_id=1000378007` for Vol 7).
- **English translation:** No. Arabic text only.
- **Quality:** Good quality. Published by Dar al-Kutub al-Islamiyyah. Largest free Islamic e-book platform.
- **Assessment:** **STRONG SECONDARY.** HTML/EPUB downloads are immediately parseable. Already identified in the MASTER_ROADMAP.md as a source for these books.

#### 3. shiabook.blogfa.com (HTML Download)

- **URL:** https://shiabook.blogfa.com/post/47
- **Format:** HTML package download (~2.5 MB ZIP containing `Main.html` + support files). Farsi translation PDFs also available (~1.5 MB per volume, 6 volumes).
- **Structure:** HTML-based — after extracting ZIP, Arabic text is structured and extractable.
- **Scrapeable:** Yes — HTML format is directly parseable.
- **Completeness:** Complete 10-volume Tahdhib al-Ahkam.
- **Quality:** Unknown provenance. Blog-based distribution. Should be verified against scholarly edition.
- **Assessment:** Quick win for raw text, but quality needs verification.

### Tier 2 — Good but Requires More Work

#### 4. noorlib.ir (Noor Digital Library)

- **Tahdhib URL:** https://noorlib.ir/book/info/1346 (also: https://noorlib.ir/en/book/info/14167)
- **Istibsar URL:** https://noorlib.ir/book/info/36600
- **Format:** Both image view and text view (HTML). Free text download indicated (`isDownloadTextFree`).
- **Structure:** 10 volumes (Tahdhib), 4 volumes (Istibsar). Searchable database integration.
- **Quality:** High quality scholarly platform. Part of the Noor (CRCIS) ecosystem.
- **Assessment:** Authoritative source. Free text download is valuable. Part of the same ecosystem as hadith.inoor.ir.

#### 5. library.tebyan.net (Tebyan Digital Library)

- **Tahdhib URLs:** Vol 1: https://library.tebyan.net/fa/Viewer/Text/100948/1 | Vol 6: /100953/142 | Vol 7: /100955/272 | Vol 10: /100958/181
- **Format:** HTML text viewer with predictable URL pattern `/fa/Viewer/Text/{volume_id}/{page}`.
- **Structure:** Organized by volume (each has unique ID). Chapter headings visible in text. All 10 volumes accessible.
- **Scrapeable:** Yes — predictable URL pattern, HTML text rendering. Volume IDs need mapping for all volumes.
- **Quality:** Good quality. Tebyan is a well-known Iranian cultural/educational platform.
- **Assessment:** Good fallback for Tahdhib. Volume ID mapping needed.

#### 6. ar.lib.eshia.ir (Arabic subdomain of Library of Madrasah Fiqahat)

- **Tahdhib URL:** https://ar.lib.eshia.ir/10083/7/190/27
- **Istibsar URL:** https://ar.lib.eshia.ir/11002/4/288
- **Format:** Main domain (`lib.eshia.ir`) renders as GIF images. Arabic subdomain (`ar.lib.eshia.ir`) shows some HTML text rendering.
- **Structure:** URL pattern: `/bookid/volume/page`. Hadith numbers visible (e.g., 838-842 per page).
- **Scrapeable:** Main domain: No (images). Arabic subdomain: Possibly — some HTML text visible, but inconsistent.
- **Quality:** Highest quality scholarly edition. Authoritative Iranian digital Islamic library.
- **Assessment:** Underlying text database likely exists (evidenced by search functionality), but direct programmatic access is limited. Previously assessed in Phase 3B as "not viable" due to image scans. The Arabic subdomain may offer a path forward that wasn't explored.

### Tier 3 — Software Databases (Richest Data, Hardest Access)

#### 7. Jami' al-Ahadith Software (Noor Software)

- **Desktop:** https://www.noorsoft.org/fa/software/View/6320
- **Android:** https://play.google.com/store/apps/details?id=org.crcis.noorhadith
- **Cloud:** https://abrenoor.ir/en/app/abrenoor_jamiahadith
- **Content:** Desktop: 431 book titles in 1,153 volumes, ~400,000 hadiths. **Includes both Tahdhib and Istibsar.**
- **Farsi translation:** Yes — Arabic text with Farsi translations.
- **Format:** Proprietary database. Could potentially extract SQLite from Android APK.
- **Assessment:** Most complete database, but extracting data programmatically is complex. The web version (hadith.inoor.ir) is the more accessible entry point into this same dataset.

#### 8. Dirayat al-Noor Software (Rijal/Narrator Database)

- **Desktop:** https://www.noorsoft.org/fa/software/View/74124
- **Cloud:** https://abrenoor.ir/en/app/abrenoor_dirayah3
- **Content:** Reconstructs and evaluates 183,707 chains of narration from al-Kafi, Tahdhib, Istibsar, Man La Yahduruh al-Faqih, and other works. Color-coded narrator evaluation (sahih, muwathaq, mu'tabar, muhmal, da'if).
- **Assessment:** Not a text source per se, but invaluable for narrator chain analysis and grading data for both books. Complementary to hadith text data.

### Tier 4 — PDF/Image Sources (Least Structured)

#### 9. alkarbala.org

- **Tahdhib:** https://alkarbala.org/Library/Tahdhib-al-Ahkam (9 volumes, PDF)
- **Istibsar:** https://alkarbala.org/Library/Al-Istibsar (4 volumes, PDF)
- Basic PDF downloads by volume. Arabic only, no structure beyond page layout.

#### 10. archive.org / HathiTrust

- **Istibsar Vol 1:** https://archive.org/details/in.ernet.dli.2015.324122
- **Istibsar Vol 2:** https://archive.org/details/in.ernet.dli.2015.324125
- **Istibsar Vol 3:** https://archive.org/details/in.ernet.dli.2015.361730
- **Istibsar Complete:** https://archive.org/details/1_20190929_20190929_1010
- **Tahdhib (HathiTrust):** https://babel.hathitrust.org/cgi/pt?id=mcg.ark:/13960/s28qqxgqzgk
- Scanned historical editions. Would require OCR. Variable quality.

#### 11. Scribd

- **Tahdhib:** https://www.scribd.com/document/324904740/Tehzeeb-Ul-Ahkam
- **Istibsar:** https://www.scribd.com/document/750602985/Arabic-Hadees-Kitab-Al-Istibsar-Complete
- User-uploaded PDFs. Requires account. Not structured.

### Reference Sources (Not Text, But Useful)

#### 12. wiki.ahlolbait.com (Islamic Encyclopedia)

- **Tahdhib article:** https://wiki.ahlolbait.com/تهذیب_الأحکام_(کتاب)
- **Istibsar article:** https://wiki.ahlolbait.com/الاستبصار_(کتاب)
- Detailed structural analysis (chapter counts, hadith counts, organizational scheme). Not the actual text.

#### 13. WikiShia (en.wikishia.net)

- **Tahdhib article:** https://en.wikishia.net/view/Tahdhib_al-ahkam_(book)
- English-language scholarly overview. Useful for understanding structure and edition history.

---

## Recommended Approach

### Primary Strategy: hadith.inoor.ir API Discovery

1. Use browser DevTools to inspect network requests when browsing Tahdhib hadiths on hadith.inoor.ir
2. Identify the internal REST API endpoints the Angular SPA calls
3. Map out: list volumes → list chapters → get hadith by ID
4. Build a scraper using the discovered API (similar to how `scrape_thaqalayn_api.py` works)
5. This gives us: structured Arabic text, Farsi translation, narrator chains, hadith numbering, grading data

**Advantages:** Most complete structured data, includes Farsi translations, maintained by authoritative institution (CRCIS/Noor).

### Fallback Strategy: ghbook.ir HTML/EPUB

1. Download HTML/EPUB files for all volumes of both books
2. Parse HTML structure to extract per-hadith Arabic text
3. Map hadith numbers to volume/chapter/hadith path structure
4. No English or Farsi translation available from this source — would need AI translation

### English Translation Gap

**Neither book has a complete English translation available online in structured format.** This makes AI translation (Phase 3C/7) even more critical for these books — they would be the first complete English translations of Tahdhib and Istibsar available in a structured digital format.

---

## Key Finding: thaqalayn.net Gap

Neither Tahdhib al-Ahkam nor al-Istibsar is available on thaqalayn.net or the ThaqalaynAPI. The API has 21 books covering al-Kafi, Man La Yahduruh al-Faqih, and other works, but not these two. Completing the Four Books requires sourcing from the Iranian digital library ecosystem (Noor/CRCIS, ghbook.ir, Tebyan).
