# Thaqalayn QA Baseline Report

**Date:** 2026-02-21
**Tester:** QATester (Claude Opus 4.6)
**Target:** Production site at https://thaqalayn.netlify.app/
**Browser:** Playwright-controlled Chromium (headless)

---

## 1. Summary

The Thaqalayn production site is **functional and usable**. All key pages load, Arabic text renders correctly in RTL, English translations display properly, and navigation works. However, there are significant **JavaScript console errors** on Al-Kafi pages and several **accessibility deficiencies** that should be addressed.

### Overall Quality Rating: **B-** (Good functionality, needs accessibility work)

---

## 2. Pages Tested

| Page | URL | Status | Notes |
|------|-----|--------|-------|
| Homepage | `/#/books` | PASS | Loads correctly, shows Quran and Al-Kafi |
| Quran Al-Fatiha | `/#/books/quran:1` | PASS | All 7 verses, Arabic + English, cross-refs |
| Al-Kafi 1:1:1 | `/#/books/al-kafi:1:1:1` | PASS (with errors) | 36 hadiths load, but 20 console errors |
| Narrator List | `/#/people/narrators/index` | PASS | 4,860 narrators, sortable, filterable |
| Narrator Detail | `/#/people/narrators/1` | PASS | Shows hadith links + co-narrator chains |

---

## 3. Issues Found

### HIGH Severity

#### H1: 20 JavaScript Errors on Al-Kafi Chapter Pages
- **Page:** `/#/books/al-kafi:1:1:1`
- **Error:** `TypeError: Cannot read properties of undefined (reading 'data')`
- **Functions affected:** `getTranslationIfInBookOrDefault`, `getBookNavigation`, `getBookTranslations`
- **Impact:** These are race condition errors in NGXS state selectors that fire before data is fully loaded. Despite the errors, the page renders correctly after data loads.
- **Recommendation:** Add null/undefined guards in the NGXS selectors or use `filter(Boolean)` in the observable pipelines to suppress emissions before data is available.
- **Assigned to:** UIdev

#### H2: No Landmark Roles (WCAG 1.3.1, 2.4.1)
- **All pages** lack semantic landmark elements:
  - `<main>`: 0 instances
  - `<nav>`: 0 instances
  - `<header>`: 0 instances
  - `<footer>`: 0 instances
- **Impact:** Screen readers cannot navigate by landmarks. Users must tab through the entire page to find content.
- **Recommendation:** Wrap the header in `<header>`, breadcrumbs in `<nav>`, main content in `<main>`, footer links in `<footer>`.
- **Assigned to:** UIdev

#### H3: No Skip Navigation Link (WCAG 2.4.1)
- No "Skip to content" link exists on any page.
- **Impact:** Keyboard users must tab through header/nav on every page load.
- **Recommendation:** Add a visually-hidden skip link as the first focusable element: `<a href="#main-content" class="skip-link">Skip to content</a>`.
- **Assigned to:** UIdev

### MEDIUM Severity

#### M1: Missing `lang="ar"` Attributes on Arabic Content (WCAG 3.1.2)
- The page's `lang` attribute is `"en"`, which is correct for the overall page.
- However, Arabic text elements lack `lang="ar"` attributes (0 instances found).
- **Impact:** Screen readers may try to pronounce Arabic text using English pronunciation rules.
- **Recommendation:** Add `lang="ar"` and `dir="rtl"` to all Arabic text containers. The `dir="rtl"` is partially present (2 elements found) but `lang="ar"` is missing entirely.
- **Assigned to:** UIdev

#### M2: Logo Image Missing Alt Text (WCAG 1.1.1)
- The site logo (`just-logo_small.png`) has no `alt` attribute.
- **Recommendation:** Add `alt="Thaqalayn"` or `alt="Thaqalayn logo"` to the image.
- **Assigned to:** UIdev

#### M3: Empty Heading Element (WCAG 1.3.1)
- On the homepage, there is an empty `<h2>` element before the "Books" heading.
- **Impact:** Screen readers announce "heading level 2" with no content, confusing users.
- **Recommendation:** Remove the empty heading or populate it with content.
- **Assigned to:** UIdev

#### M4: 7 Links Without Accessible Names (WCAG 4.1.2)
- On the Quran page, 7 out of 27 links lack accessible names (no text, aria-label, or titled img).
- These are likely the "link" icon anchors next to verse references.
- **Recommendation:** Add `aria-label` attributes (e.g., `aria-label="Link to verse 1"`).
- **Assigned to:** UIdev

#### M5: No `<h1>` Heading (WCAG 1.3.1)
- Pages use `<h2>` as the highest heading level. No `<h1>` is present.
- The site name "THAQALAYN" in the header is plain text, not a heading.
- **Recommendation:** Make the page title an `<h1>` (e.g., the surah name on Quran pages, "Books" on homepage).
- **Assigned to:** UIdev

#### M6: Console Errors on Navigation Between Pages
- Navigating from one page to another produces `TypeError: Cannot read properties of undefined` and `TypeError: t is not iterable` errors.
- These appear to be timing/race conditions in the NGXS state management.
- **Assigned to:** UIdev

### LOW Severity

#### L1: Narrator Route Without `/index` Redirects to Books Page
- `/#/people/narrators` (without `/index`) shows the Books page instead of the narrator list.
- Only `/#/people/narrators/index` correctly shows the narrator list.
- **Recommendation:** Add a redirect from `/people/narrators` to `/people/narrators/index`.
- **Assigned to:** UIdev

#### L2: "Mentioned In" Links Slightly Truncated on Mobile
- At 360px viewport width, the "Mentioned In" cross-reference links (e.g., "Al-kafi:2:3:13:20") are clipped at the right edge.
- **Impact:** Minor visual issue; the links are still clickable.
- **Recommendation:** Allow text wrapping or use a smaller font for reference links on mobile.
- **Assigned to:** UIdev

#### L3: Page Title Does Not Change Between Pages
- The browser tab always shows "Thaqalayn" regardless of which page is viewed.
- **Recommendation:** Update `document.title` dynamically (e.g., "Al-Fatiha - Thaqalayn", "Narrators - Thaqalayn").
- **Assigned to:** UIdev

#### L4: Narrator List Shows Only Arabic Names
- The narrator table has no English transliteration column.
- **Impact:** English-only users cannot identify narrators by name.
- **Recommendation:** This may be a data limitation, but consider adding English transliterations where available.
- **Assigned to:** DataGen (data) + UIdev (display)

---

## 4. Responsive Design Results

| Viewport | Size | Result | Notes |
|----------|------|--------|-------|
| Mobile | 360x640 | PASS | Vertical stack layout, readable text, Arabic renders well |
| Tablet | 768x1024 | PASS | Side-by-side layout for Arabic/English, breadcrumbs wrap properly |
| Desktop | 1280x800 | PASS | Comfortable reading width, all features visible |
| Wide | 1920x1080 | PASS | Content does not over-stretch, max-width constraint works |

The responsive design is well-implemented across all tested viewport sizes.

---

## 5. Data Integrity Spot-Check

| Check | Result | Details |
|-------|--------|---------|
| JSON wrapper structure | PASS | All checked files have `{index, kind, data}` at top level |
| Arabic text encoding | PASS | Arabic text stored as UTF-8 characters, not escaped |
| Quran verse count | PASS | Surah Al-Fatiha has 7 verses as expected |
| Al-Kafi hadith count | PASS | Chapter 1:1:1 has 36 hadiths |
| Nav links (up) | PASS | `/books/al-kafi:1:1` -> `al-kafi/1/1.json` exists |
| Nav links (next) | PASS | `/books/quran:2` -> `quran/2.json` exists |
| Narrator references | PASS | All 19 narrator paths from first 3 hadiths resolve to existing files |
| Cross-references | PASS | Quran 1:1 "Mentioned In" `/books/al-kafi:2:3:13:20` -> file exists |
| Book index | PASS | `books.json` lists Quran and Al-Kafi with correct paths and Arabic titles |
| Narrator file format | PASS | Narrator 1 has proper structure with `subchains` and `verse_paths` |
| Total narrators | INFO | 4,860 narrators in the index |

---

## 6. Accessibility Summary (WCAG 2.1 Level AA)

| Criterion | Status | Notes |
|-----------|--------|-------|
| 1.1.1 Non-text Content | FAIL | Logo missing alt text |
| 1.3.1 Info and Relationships | FAIL | No landmarks, empty heading, no h1 |
| 2.4.1 Bypass Blocks | FAIL | No skip navigation link |
| 2.4.2 Page Titled | PARTIAL | Static title, not page-specific |
| 2.4.6 Headings and Labels | PARTIAL | Headings present but hierarchy incomplete |
| 3.1.2 Language of Parts | FAIL | Arabic text lacks lang="ar" |
| 4.1.2 Name, Role, Value | FAIL | Links without accessible names |
| 1.4.3 Contrast | PASS | Text colors appear sufficient |
| 2.1.1 Keyboard | PARTIAL | Table rows have tabindex, but focus management needs testing |

---

## 7. Screenshots Captured

| File | Description |
|------|-------------|
| `screenshots/01-homepage-desktop.png` | Homepage at default viewport |
| `screenshots/02-quran-fatiha-desktop.png` | Quran Al-Fatiha full page |
| `screenshots/03-alkafi-1-1-1-desktop.png` | Al-Kafi Chapter 1 viewport |
| `screenshots/04-narrators-list-desktop.png` | Narrator list at desktop |
| `screenshots/05-narrator-detail-desktop.png` | Individual narrator page |
| `screenshots/06-homepage-mobile-360.png` | Homepage at 360px mobile |
| `screenshots/07-quran-mobile-360.png` | Quran page at 360px mobile |
| `screenshots/08-narrators-mobile-360.png` | Narrators at 360px mobile |
| `screenshots/09-alkafi-tablet-768.png` | Al-Kafi at 768px tablet |
| `screenshots/10-alkafi-wide-1920.png` | Al-Kafi at 1920px wide |

---

## 8. Recommendations Priority

1. **Immediate:** Fix NGXS race condition errors (H1) - these produce 20+ errors per page load
2. **High:** Add semantic landmarks (H2) and skip navigation (H3)
3. **Medium:** Add `lang="ar"` to Arabic content (M1), fix empty heading (M3), add link labels (M4)
4. **Low:** Fix narrator route (L1), dynamic page titles (L3)

---

## 9. Next Steps

- [ ] Cross-browser testing (Firefox, Safari, Edge) - requires additional browser setup
- [ ] Screen reader testing (NVDA/VoiceOver)
- [ ] Performance profiling (page load times, bundle size)
- [ ] Test with slow network conditions
- [ ] Verify PWA/offline capabilities (if applicable)
- [ ] Automated accessibility testing with axe-core or Lighthouse
