# Thaqalayn Ecosystem: Comprehensive Improvement Roadmap

> **STATUS: SUPERSEDED (2026-03-15)** — Phase 1-2 are complete. Phase 3+ items have been collated into [`CONSOLIDATED_ROADMAP.md`](CONSOLIDATED_ROADMAP.md). This document is retained for historical reference only.
>
> **Date:** 2026-02-27 (updated)
> **Scope:** ThaqalaynDataGenerator (Python) | ThaqalaynData (JSON API) | Thaqalayn (Angular 19 UI)
> **Primary Goal:** Serve all 4 major Shia hadith books with multi-language translations, accessible to users and developers

---

## Completion Status (February 2026)

> **Phase 1 (Tests) and Phase 2 (Cleanup) are largely COMPLETE.** Phase 3+ (Features, New Books, AI Pipeline) are the active frontier.

### Phase 1: Test Coverage — COMPLETE

| Item | Status | Details |
|------|--------|---------|
| Fix broken Angular unit tests | **DONE** | All 3 broken specs rewritten; 367 `it()` calls across 28 spec files now pass |
| E2E tests with Playwright | **DONE** | 187 tests across 16 spec files covering all key user flows |
| Fix generator test failures | **DONE** | 1143 tests passing (up from 91), 32 test files |
| Data validation tests | **DONE** | `test_data_validation.py` (64 tests) covers schema, integrity, cross-refs |
| Parser unit tests | **DONE** | `test_quran_parser.py` (14), `test_kafi_parser.py` (42), `test_kafi_sarwar_parser.py` (17) |

### Phase 2: Cleanup & Modernization — MOSTLY COMPLETE

| Item | Status | Details |
|------|--------|---------|
| TSLint → ESLint | **DONE** | `eslint.config.js` with `@angular-eslint` v21, flat config |
| Remove Protractor | **DONE** | Playwright E2E in place (16 spec files) |
| ProcessingReport class | **DONE** | In `lib_model.py`, replaces global error accumulation |
| Narrator subchain optimization | **DONE** | `getCombinations()` generates full chains + consecutive pairs only |
| `narrator_chain.text` removal | **DONE** | Set to `None` after processing in `kafi_narrators.py` |
| Angular 19 upgrade | **DONE** | Upgraded to Angular 19.2.18, NGXS 19, Material 19 |
| HTTP error handling | TODO | ErrorInterceptor, loading/error states still needed |
| npm audit vulnerabilities | TODO | Pending review |

### Phase 3: Features & Expansion — IN PROGRESS

| Item | Status | Details |
|------|--------|---------|
| PWA support | **DONE** | `@angular/service-worker` installed, `ngsw-config.json` configured with caching strategies |
| Capacitor mobile app | **INSTALLED** | `@capacitor/android`, `@capacitor/ios` v8.1 — needs native project setup |
| Search (Orama) | **INSTALLED** | `@orama/orama` v3.1 in dependencies — search feature implementation needed |
| Bookmarks (Dexie) | **INSTALLED** | `dexie` v4.3 in dependencies — bookmark/notes feature implementation needed |
| Firebase sync | **INSTALLED** | `firebase` v12.9 in dependencies — cross-device sync implementation needed |
| AI Content Pipeline | **OPERATIONAL** | 3-pass workflow (generate→review→fix), 20 samples generated, structure pass caching |
| New book parsers | TODO | Man La Yahduruhu al-Faqih (ThaqalaynAPI data available), Tahdhib, Istibsar |
| Standalone components migration | TODO | Angular 19 supports standalone; NgModule→standalone migration pending |

### Phase 3b: UI Polish & Layout Fixes — TODO

> **Goal:** Fix visual regressions, layout bugs, and inconsistencies identified through screenshot review of the hadith reading experience (chapter-content view).
>
> **Date identified:** 2026-03-11
> **Scope:** Thaqalayn (Angular) only — no data/generator changes needed
> **Evidence:** Screenshots in `screenshots/al-kafi-1-1-1-*.png` and `screenshots/viewmode-*.png`

#### 3b.1 Logo Overflow Covering Breadcrumbs — REGRESSION FIX

**Priority:** P0 (broken — breadcrumb text is unreadable)
**Root cause:** The logo image (`just-logo_small.png`, natural 255×244px) is no longer properly constrained to the 70px banner height. The `height="70%"` HTML attribute on the `<img>` in `app.component.html` is not resolving correctly against the flex container, causing the logo to render at its natural 244px height. It overflows ~174px below the banner, covering the breadcrumb bar.
**Files:** `app.component.html` (line 7), `app.component.scss`
**Fix:**
1. Replace `height="70%"` with explicit CSS `max-height` matching the banner height (e.g., `max-height: 56px` or `height: 100%` with `object-fit: contain` on a parent with explicit height)
2. Ensure the breadcrumb bar is fully visible and not overlapped by any element
3. Test at desktop (1280px), tablet (768px), and mobile (375px) viewports

#### 3b.2 View Mode Toggle Icons Cropped at Bottom

**Priority:** P0 (visible clipping — ~20% of icons cut off)
**Root cause:** `chapter-content.component.scss` sets `mat-button-toggle-group { height: 36px }` and `mat-button-toggle { height: 36px }`, but Material's inner `<button>` renders at 48px. The group's `overflow: hidden` (set by Material) clips the bottom of each icon.
**Files:** `chapter-content.component.scss` (lines 39–45)
**Fix:**
1. Either remove the explicit `height: 36px` constraints and let Angular Material manage the toggle sizing naturally
2. Or increase to `height: 48px` to accommodate the Material inner button
3. Verify icons render fully without clipping at all viewports
4. Verify the toggle group doesn't overlap with the hadith cards below it (add appropriate margin-bottom if needed)

#### 3b.3 Author Line Shown on Every Page — Scope Restriction

**Priority:** P1 (incorrect behavior — author should only appear on homepage + first book page)
**Current behavior:** `getBookAuthor(book.index)` is called in both `chapter-content.component.ts` and `chapter-list.component.ts`, extracting the root slug from any path depth. This means "Al-Kulayni - الكليني" appears on every single chapter page (e.g., `al-kafi:1:1:1`), not just the book landing page.
**Intended behavior:** Author name should only display on:
- The homepage (book cards)
- The first book page when clicking into a book (e.g., `al-kafi` or `al-kafi:1`)
**Files:** `chapter-content.component.ts` (line 112), `chapter-list.component.ts` (line 50), `book-titles.component.html` (lines 12–15)
**Fix:**
1. In `chapter-content.component.ts`: Remove the author assignment entirely — chapter-content always shows deep pages (hadith lists), never the book root
2. In `chapter-list.component.ts`: Add a depth check — only pass author when the book index has ≤2 colon-separated segments (e.g., `al-kafi` or `al-kafi:1`, but not `al-kafi:1:1`)
3. Alternatively, determine depth from the crumb count or index segment count: `index.split(':').length <= 2`

#### 3b.4 English–Arabic Chunk Horizontal Alignment

**Priority:** P1 (readability — chunks from different sections overlap vertically)
**Current behavior:** In the two-column layout (plain/paragraph view modes), English text on the left and Arabic text on the right are placed independently. When an English translation is longer than its corresponding Arabic chunk, the next Arabic chunk starts at a different vertical position than the next English chunk. This creates visual misalignment where it's unclear which English text corresponds to which Arabic text.
**Files:** `verse-text.component.html`, `verse-text.component.scss`, `chapter-content.component.scss`
**Fix approach:**
1. Each ISNAD/BODY chunk pair (English left + Arabic right) should be in the same row container, so they share a vertical baseline
2. Use CSS Grid or Flexbox rows where each row contains one chunk pair: `[English chunk | Arabic chunk]`
3. The row should expand to the height of its tallest child, preventing overlap with the next chunk
4. This may require restructuring the template from two independent columns to paired rows
5. Test with varying text lengths: short hadith (1 line), medium (5–10 lines), long (20+ lines where English is much longer than Arabic)

#### 3b.5 ISNAD/BODY Labels Styling

**Priority:** P2 (cosmetic — labels look like debug output)
**Current behavior:** "ISNAD" and "BODY" appear as plain uppercase gray text, resembling raw data labels rather than polished UI elements.
**Fix options (choose one):**
1. **Subtle badge style:** Small rounded pill with muted background (similar to the topic tags but more subdued), e.g., light gray background with 11px font
2. **Icon + label:** Small Material icon (e.g., `link` for ISNAD, `article` for BODY) with smaller text beside it
3. **Colored left border only:** Remove the text labels entirely and use color-coded left borders (e.g., teal for ISNAD, purple for BODY) with a legend at the top
4. Keep current style but reduce font size to 10px and use letter-spacing for a more refined uppercase look

#### 3b.6 Jump-to-Hadith Dropdown Placement

**Priority:** P2 (usability — current placement is awkward)
**Current behavior:** The dropdown sits alone above the view mode toolbar in a sticky container. On mobile it truncates to "Jump to h...". It occupies vertical space that pushes content down.
**Files:** `chapter-content.component.html` (lines 4–16), `chapter-content.component.scss` (lines 1–21)
**Candidate placements to evaluate:**
1. **Inside the header/toolbar row** — Merge into the same row as "View mode:" toggle, right-aligned. Saves a full row of vertical space. Test: does it fit on mobile?
2. **Sticky in the breadcrumb bar** — Add to the right side of the breadcrumb area so it's always visible during scrolling without a dedicated sticky row
3. **Floating action button (FAB)** — Bottom-right floating button that opens a dropdown overlay. Zero permanent space cost. But may feel out of place.
4. **Inside the chapter title card** — Place as a compact control within the title/description card area, which is already large and underutilized
5. **Current placement but styled better** — Keep sticky top but reduce padding, use a compact chip/button style instead of a full mat-form-field

**Recommendation:** Option 1 (merge with view mode toolbar row) for desktop; on mobile, move it below the toolbar as a full-width compact select.

#### 3b.7 View Mode Inconsistencies

**Priority:** P2 (confusing — modes look identical or have layout issues)
**Findings from testing all 4 modes:**

| Mode | Icon | Observation |
|------|------|-------------|
| **Plain** | `subject` | Default. Two-column: English left with ISNAD/BODY labels + Arabic right. Works well for short/medium hadiths. |
| **Word-by-word** | `grid_on` | Shows word grid with POS tags on the right, narrative English + summary on the left. Good but very wide — horizontal scroll possible on narrow screens. |
| **Paragraph** | `view_agenda` | Visually **identical** to Plain on this chapter. Users cannot tell them apart. The distinction (if any) is unclear. |
| **Combined** | `dashboard` | English body text on left, word grid on right. Compact but word grid can be cramped. |

**Issues to fix:**
1. **Plain vs Paragraph look identical** — Either make them visually distinct (e.g., Paragraph mode merges ISNAD+BODY into a single flowing paragraph without labels) or remove Paragraph mode entirely to reduce confusion
2. **Word-by-word on narrow viewports** — The word grid cells may need to reflow or reduce column count on mobile. Test at 375px width.
3. **No visual indicator of active mode** — The checkmark overlay on the toggle is very subtle. Consider highlighting the active toggle with a background color or underline.
4. **Mode persistence** — Verify that switching modes is persisted in localStorage (via `AiPreferencesService`) and restored on revisit
5. **Modes only shown for AI content** — The toolbar appears only when `hasAnyAiContent` is true. This is correct but should be documented — users may wonder why some chapters have the toolbar and others don't.

#### 3b.8 Hadith Card Boundaries

**Priority:** P2 (readability — hard to tell where one hadith ends and the next begins)
**Current behavior:** Hadiths have a left border accent but no clear top/bottom separation. When scrolling through many hadiths, the boundary between consecutive hadiths is ambiguous, especially between the topic tags / action icons of one hadith and the ISNAD label of the next.
**Fix options:**
1. Add a horizontal divider (`<mat-divider>`) between hadith cards
2. Add subtle alternating background colors (e.g., white / very light gray)
3. Add more margin/padding between cards (currently the gap may be too tight)
4. Wrap each hadith in a `mat-card` with slight elevation for clear containment

#### 3b.9 PWA Install Banner — No Changes Needed

**Priority:** N/A (not an issue after investigation)
**Finding:** The install banner is driven by the browser's `beforeinstallprompt` event and only shows when the browser offers installation. It has no dismiss button by design — if the user doesn't install, the banner reappears on next visit via the browser event. The update banner (separate) already has a dismiss button. Adding a dismiss to the install banner would risk users never seeing it again, with no way to get it back since the `beforeinstallprompt` event is browser-controlled and not re-triggerable from JS. Current behavior is correct.

#### 3b.10 Previous/Next Chapter Navigation Visibility

**Priority:** P3 (usability — nav arrows not visible in viewport)
**Current behavior:** If prev/next navigation exists, it may be outside the viewport or not prominent enough. Users rely on breadcrumbs to navigate between chapters.
**Fix:** Ensure prev/next arrows are visible either:
1. In the sticky header/toolbar area
2. At both the top and bottom of the chapter content
3. As floating side arrows (← →) at viewport edges

---

#### 3b.11 CRITICAL: Mobile Search Bar Blocks Hamburger Menu Button

**Priority:** P0 (the hamburger menu is completely non-functional on mobile)
**Root cause:** In the mobile header, `.header-mobile-controls` uses `flex: 1; min-width: 0; gap: 4px` and the `.mobile-header-search` inside it has `flex: 1; min-width: 0; max-width: 280px`. At 375px, the flex layout allocates 0px width to the search container. However, the `<input>` inside has `min-width: 60px` (from `search-bar.component.scss` line 60), causing a 60×23px invisible overflow that sits directly on top of the 44×44px hamburger menu button. Playwright confirmed: the search input intercepts all pointer events, making the menu button untappable.
**Files:** `app.component.html` (lines 38–45), `app.component.scss` (lines 88–102), `search-bar.component.scss` (lines 52–76)
**Fix options:**
1. Add `overflow: hidden` to `.mobile-header-search` so the input doesn't overflow past its 0px container
2. Restructure the mobile header flex layout to allocate minimum space for both search and menu button (e.g., give the menu button `flex-shrink: 0` with explicit width, and let search fill remaining space)
3. Replace the inline mobile search input with a search icon button that opens a full-width search overlay (recommended — see 3b.14)
**Impact:** This is the most severe mobile bug. Without the hamburger menu, users cannot access settings (dark mode, font size, language, AI preferences) on mobile. They only have the bottom nav bar (Home, Books, Topics, Bookmarks, Narrators).

#### 3b.12 Mobile Header Title Truncated

**Priority:** P1 (branding — "THAQALAYN" shows as "THAQAL" at 375px)
**Current behavior:** The logo image + "THAQALAYN" text compete for horizontal space in the header. At 375px, the title is truncated to "THAQAL" with the remaining letters cut off. At 320px, the layout breaks further with content clipping off the left edge.
**Files:** `app.component.html` (lines 4–9), `app.component.scss` (lines 33–68, 380–409)
**Evidence:** `screenshots/mobile-header-375.png`, `screenshots/mobile-header-320.png`
**Fix options:**
1. **Hide the text on mobile, show only the logo icon** — Use `display: none` on the title text below 600px and rely on the geometric logo image alone. The logo is distinctive enough for brand recognition.
2. **Reduce logo size on mobile** — The logo image is oversized (see 3b.1). Fixing the logo size may free up enough space for the full title.
3. **Use a shorter title on mobile** — e.g., "ث" (thā') or a custom compact logo mark
4. **Two-row header** — Stack logo/title on one row, controls on another. Increases header height but ensures nothing is truncated.

#### 3b.13 Mobile Layout Completely Broken at 320px

**Priority:** P0 (unusable at smallest common viewport)
**Current behavior:** At 320px width, the layout is severely broken:
- Content clips off the left edge of the viewport (negative overflow)
- Translation selector overflows its container
- "Chapter 1" heading and author text are left-clipped ("apter 1", "layni - الكليني")
- View mode icons overflow the screen
- The page is essentially unusable
**Evidence:** `screenshots/mobile-header-320.png`
**Files:** `app.component.scss` (lines 390–409), `chapter-content.component.scss`, `styles.scss`
**Fix:**
1. Audit all fixed-width elements (translation selector width, view mode toolbar, etc.) and replace with `max-width: 100%` or responsive units
2. Ensure no element has `min-width` that exceeds 320px
3. Add `overflow-x: hidden` to the main content container as a safety net
4. Test all pages at 320px, 375px, and 414px after fixes

#### 3b.14 Mobile Search UX — Replace Inline Input with Search Overlay

**Priority:** P1 (the current inline search is too small and causes 3b.11)
**Current behavior:** The mobile header tries to fit a search input inline between the title and hamburger menu. At 375px, the input renders at 60×23px — far below the 44px minimum touch target. The search dropdown would also render incorrectly since its parent has 0px width.
**Files:** `app.component.html` (lines 38–45), `search-bar.component.html`, `search-bar.component.scss` (lines 52–76)
**Recommended approach:**
1. Replace the inline `<app-search-bar>` in `.header-mobile-controls` with a search icon button (magnifying glass, 44×44px)
2. On tap, open a full-width search overlay that slides down from the header (or a modal)
3. The overlay contains: back arrow, full-width input (auto-focused), clear button
4. Search results dropdown renders inside the overlay at full viewport width
5. Escape or back arrow closes the overlay
6. This pattern is used by Google, YouTube, and most mobile apps — users expect it
**Benefit:** Eliminates 3b.11 (no more pointer event conflict), provides a usable search experience, and frees up header space for the hamburger menu and title.

#### 3b.15 Mobile Header — Hamburger Icon Not Visible at 375px

**Priority:** P1 (related to 3b.11 but distinct visual issue)
**Current behavior:** At 375px, the hamburger menu icon (☰) is either not visible or extremely hard to see. The screenshots show no clear hamburger icon in the top-right area. The search bar's invisible overflow may be visually covering it, or the icon blends into the header background.
**Evidence:** `screenshots/mobile-header-375.png` — no hamburger icon visible in the header area
**Fix:** After resolving 3b.11 (search overlap), verify the menu button has:
1. Sufficient contrast against the teal header background (white icon on teal)
2. A visible icon (Material `menu` icon at 24px)
3. Optional: add a subtle background/border to make it stand out as a tappable button

#### 3b.16 Mobile "Jump to Hadith" Truncation

**Priority:** P2 (usability — label unreadable)
**Current behavior:** At 375px, the "Jump to hadith" dropdown shows as "Jump to h..." with `width: 120px` on mobile (from `chapter-content.component.scss`). The label is meaningless when truncated.
**Files:** `chapter-content.component.scss` (lines 14–19)
**Fix options:**
1. Shorten the label to "Hadith #" or just "Jump" on mobile
2. Use an icon-only button (e.g., `#` or `format_list_numbered`) with tooltip
3. Increase width to 160px on mobile (trades space for readability)
4. This ties into 3b.6 — if the dropdown moves into the toolbar row, it may get more space

#### 3b.17 Bottom Navigation Bar Duplicates Sidebar Navigation

**Priority:** P3 (design consistency — not broken but redundant)
**Current behavior:** Mobile has both:
- Bottom nav bar: Home, Books, Topics, Bookmarks, Narrators (always visible)
- Sidebar menu: Home, Narrators, Topics, Bookmarks, About (opened via hamburger)
These overlap significantly. The sidebar also contains Settings and AI preferences which are not in the bottom bar.
**Consideration:** The bottom bar provides quick access to the 5 most common destinations, while the sidebar provides settings access. This is a common mobile pattern (e.g., Instagram). However, the items should be audited:
- Bottom bar has "Books" but sidebar doesn't (sidebar has "Home" which effectively goes to books)
- Bottom bar has "Narrators" and sidebar also has "Narrators" — redundant
- Sidebar has "About" which bottom bar doesn't — acceptable
**Recommendation:** Keep both but ensure they complement rather than duplicate. Consider replacing one bottom bar item with "Settings" (gear icon) to give direct access to settings without the hamburger menu, which is currently broken (3b.11).

---

### Remaining Work (Active Priorities)

1. **HTTP error handling** — ErrorInterceptor, loading/error states for BooksService/PeopleService
2. **Search feature build-out** — Orama is installed; need index generation in generator + Angular search UI
3. **Bookmarks & reading progress** — Dexie installed; need Angular service + UI components
4. **Scale AI translations** — Pipeline is ready; expand from 20 samples to full corpus
5. **Word-by-word UI** — AI pipeline generates word_analysis data; need Angular component
6. **Hadith gradings** — ThaqalaynAPI has grading data; need schema + UI surfacing
7. **New book parsers** — Start with Man La Yahduruhu al-Faqih (structured JSON available from ThaqalaynAPI)
8. **Social sharing** — Web Share API + deep links (low effort, high visibility)
9. **CI/CD pipeline** — GitHub Actions for automated testing on push

### DataGatherer -- Source Data Research (continues across all phases)
1. **22 books scraped** from ThaqalaynAPI (18,945 hadiths across 25 book folders)
2. Tahdhib al-Ahkam and al-Istibsar: multiple sources identified (ghbook.ir, rafed.net)
3. Cross-validation pipeline for Arabic text accuracy

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Phase 1: Foundation & Critical Fixes](#2-phase-1-foundation--critical-fixes-weeks-1-4)
3. [Phase 2: Complete the Four Books](#3-phase-2-complete-the-four-books-months-2-5)
4. [Phase 3: Multi-Language Expansion](#4-phase-3-multi-language-expansion-months-4-7)
5. [Phase 3b: UI Polish & Layout Fixes](#phase-3b-ui-polish--layout-fixes--todo) *(new — 2026-03-11)*
6. [Phase 4: User Experience & Accessibility](#5-phase-4-user-experience--accessibility-months-5-8)
7. [Phase 5: Developer Experience & Infrastructure](#6-phase-5-developer-experience--infrastructure-months-6-9)
8. [Phase 6: Data Optimization](#7-phase-6-data-optimization-months-7-9)
9. [Phase 7: Extended Use Cases & Future Vision](#8-phase-7-extended-use-cases--future-vision-months-9)
10. [Summary Matrix](#9-summary-matrix)

---

## 1. Current State Assessment

### Content Completeness

| Book | Status | Hadiths | Translations | Parser |
|------|--------|---------|--------------|--------|
| **Quran** | 100% Complete | 6,236 verses | 27 (17 EN, 11 FA) | `quran.py` |
| **Al-Kafi** | ~95% Parsed | 15,281 hadiths | 2 EN (HubeAli, Sarwar) | `kafi.py` + `kafi_sarwar.py` |
| **Man La Yahduruhu al-Faqih** | Not Started | ~6,000 est. | None | Not written |
| **Tahdhib al-Ahkam** | Not Started | ~13,590 est. | None | Not written |
| **al-Istibsar** | Not Started | ~5,511 est. | None | Not written |

### Technical Health

| Area | ThaqalaynDataGenerator | Thaqalayn (Angular 19) |
|------|----------------------|---------------------|
| **Test Coverage** | 1143 tests, good coverage | 367 unit tests + 187 E2E tests |
| **Error Handling** | ProcessingReport class (clean) | No HTTP error handling (TODO) |
| **Code Quality** | Good architecture, AI pipeline added | Good structure, modern tooling |
| **Documentation** | Excellent CLAUDE.md | Good CLAUDE.md + docs/ |
| **Dependencies** | Current (uv, Pydantic) | Current (Angular 19, ESLint 9, Playwright) |
| **Security** | N/A (offline tool) | No CSP, no input validation |
| **Performance** | Functional | PWA configured, no lazy loading yet |
| **AI Pipeline** | Operational (3-pass, caching) | N/A |

### Data Statistics

- **Total JSON files:** ~7,350+
- **Total size:** ~545 MB (1.2 GB on disk with git objects)
- **Narrator profiles:** 4,861
- **Books served:** 22 distinct works (Quran + Al-Kafi + 20 from ThaqalaynAPI)
- **Optimization done:** narrator subchains + narrator_chain.text (~90 MB savings applied)
- **Remaining optimization:** ~5 MB (verse_translations deduplication)

---

## 2. Phase 1: Foundation & Critical Fixes (Weeks 1-4)

> **Goal:** Stabilize the existing codebase, fix broken tests, add essential error handling, and modernize deprecated tooling.

### 2.1 Thaqalayn (Angular) - Critical Fixes

#### 2.1.1 Fix Broken Tests — DONE

**Priority:** P0 (Blocking) — **COMPLETED**
All broken specs have been rewritten. The Angular test suite now has 367 `it()` calls across 28 spec files, all passing.

#### 2.1.2 Add HTTP Error Handling

**Priority:** P0 (User-facing gaps)
**Current State:** Services have zero timeout, zero retry, zero error handling. A network failure gives users a blank page with no feedback.

**Actions:**
1. Create `ErrorInterceptor` (`src/app/services/error.interceptor.ts`) for global HTTP error capture
2. Add `timeout(30000)` and `retry({ count: 2, delay: 1000 })` to `BooksService.getPart()` and `PeopleService.getNarrator()`
3. Add loading/error state to NGXS stores (`BooksStateModel.loading`, `BooksStateModel.errors`)
4. Create error display component for user feedback (e.g., "Failed to load chapter. Retry?")

#### 2.1.3 Migrate from TSLint to ESLint — DONE

**COMPLETED.** ESLint 9 with flat config (`eslint.config.js`), `@angular-eslint` v21, `typescript-eslint` v8.46. TSLint and codelyzer removed.

#### 2.1.4 Replace Protractor with Playwright — DONE

**COMPLETED.** Playwright E2E tests in `e2e/tests/` with 187 tests across 16 spec files. Includes accessibility testing via `@axe-core/playwright`.

### 2.2 ThaqalaynDataGenerator - Foundational Improvements

#### 2.2.1 Refactor Global Error Accumulation — DONE

**COMPLETED.** `ProcessingReport` class exists in `lib_model.py`. All report parameters are optional with `None` default, falling back to a global default report. Tests create isolated instances.

#### 2.2.2 Externalize Configuration

**Priority:** P2
**Current State:** Book indices, paths, translation IDs, source directories are hard-coded across multiple files.

**Action:** Create `config.py` or `config.yaml`:
```python
BOOKS = {
    'quran': {'index': 1, 'path': '/books/quran', 'source_dir': 'raw/tanzil_net/'},
    'al-kafi': {'index': 2, 'path': '/books/al-kafi', 'source_dir': 'raw/hubeali_com/'},
}
TRANSLATIONS = {
    'quran_defaults': {'en': 'en.qarai', 'fa': 'fa.makarem'},
    'kafi_defaults': {'en': 'en.hubeali'},
}
```

#### 2.2.3 Fix Platform-Specific File Paths

**Priority:** P2
**Current State:** Some paths use Windows backslashes (`\\`) in `quran.py` and `kafi.py`.

**Action:** Replace all raw string paths with `pathlib.Path` or `os.path.join()` for cross-platform compatibility.

---

## 3. Phase 2: Complete the Four Books (Months 2-5)

> **Goal:** Add parsers and data for the remaining 3 major hadith collections: Man La Yahduruhu al-Faqih, Tahdhib al-Ahkam, and al-Istibsar.

### 3.1 Source Identification & Acquisition

Before writing parsers, identify and acquire source data for each book.

#### 3.1.1 Man La Yahduruhu al-Faqih (by Shaikh Saduq)

| Aspect | Details |
|--------|---------|
| **Estimated Hadiths** | ~6,000 |
| **Volumes** | 4 |
| **Potential Sources** | HubeAli.com (if available), Thaqalayn.net, Al-Islam.org, Noor Digital Library |
| **Translations** | English (likely HubeAli or community translations) |
| **Parser Complexity** | Medium - similar structure to Al-Kafi |

#### 3.1.2 Tahdhib al-Ahkam (by Shaikh Tusi)

| Aspect | Details |
|--------|---------|
| **Estimated Hadiths** | ~13,590 |
| **Volumes** | 10 |
| **Potential Sources** | **PDF only** -- almuntazar.ca (Arabic), Bab Ul Qaim vols 1-3 (English) |
| **Translations** | English for vols 1-3 only (Bab Ul Qaim Publications) |
| **Parser Complexity** | **Very High** -- PDF extraction required (Arabic OCR/text extraction, no narrator chains in structured form, manual chapter boundary verification) |

> **Research finding (Feb 2026):** No structured HTML/JSON/XML source exists online for Tahdhib al-Ahkam. All available sources are PDF format. This significantly increases parser complexity and requires a PDF parsing pipeline (PyMuPDF or pdfplumber for text extraction, followed by heuristic chapter/hadith boundary detection). Arabic-only initially; English translation available only for first 3 of 10 volumes.

#### 3.1.3 al-Istibsar (by Shaikh Tusi)

| Aspect | Details |
|--------|---------|
| **Estimated Hadiths** | ~5,511 |
| **Volumes** | 4 |
| **Potential Sources** | **PDF only** -- almuntazar.ca (Arabic), same publisher as Tahdhib |
| **Translations** | **None available** -- Bab Ul Qaim lists 4 vols as "COMING SOON" |
| **Parser Complexity** | **Very High** -- Same PDF extraction challenges as Tahdhib |

> **Research finding (Feb 2026):** Like Tahdhib, no structured data source exists. Arabic PDF only, no English translation available. Often published alongside Tahdhib (both by Shaikh Tusi), so the same PDF parsing pipeline would serve both. Recommend deferring to a dedicated "PDF parsing pipeline" effort rather than treating as a standard parser task.

### 3.2 ThaqalaynDataGenerator - New Parsers

#### 3.2.1 Create Parser Template/Base Class

**Priority:** P0 (enables all subsequent parsers)

**Rationale:** Currently `quran.py` and `kafi.py` share patterns but don't share code. A base parser class would accelerate adding new books.

**Action:** Create `app/base_parser.py`:
```python
class BookParser(ABC):
    def __init__(self, config: BookConfig, report: ProcessingReport):
        self.config = config
        self.report = report

    @abstractmethod
    def parse_source(self) -> Chapter: ...

    def build_hierarchy(self, root: Chapter) -> None:
        set_index(root, ...)

    def write_output(self, root: Chapter) -> None:
        insert_chapter(root)
        write_file(f"/books/complete/{self.config.slug}", jsonable_encoder(root))
```

#### 3.2.2 Implement `faqih.py` Parser

**Priority:** P0
**Estimated Effort:** 2-3 weeks
**Approach:**
1. Obtain source HTML/XML from identified source
2. Analyze HTML structure (volume/book/chapter/hadith hierarchy)
3. Implement parser following patterns from `kafi.py`
4. Add corrections file `faqih_corrections.py` as needed
5. Integrate narrator extraction (reuse `kafi_narrators.py` patterns or create shared narrator module)
6. Add tests with real hadith examples

#### 3.2.3 Implement `tahdhib.py` Parser

**Priority:** P1
**Estimated Effort:** 3-4 weeks (largest book)
**Notes:** May need different narrator extraction patterns due to Tusi's style vs. Kulayni's style.

#### 3.2.4 Implement `istibsar.py` Parser

**Priority:** P1
**Estimated Effort:** 2-3 weeks
**Notes:** Often shares structural patterns with Tahdhib since both are by Shaikh Tusi.

#### 3.2.5 Generalize Narrator Extraction

**Priority:** P0 (required before adding new books)
**Current State:** `kafi_narrators.py` is tightly coupled to Al-Kafi. Narrator patterns, ID assignment, and subchain generation are reusable.

**Action:** Refactor into `app/narrators.py`:
- Extract `extract_narrators()`, `assign_narrator_id()`, `add_narrator_links()`, `update_narrators()` into a shared module
- Make narrator regex patterns configurable per book (different books may have different chain styles)
- Ensure narrator ID stability across all books (shared `NarratorIndex`)
- Create `kafi_narrators.py` and future `faqih_narrators.py` as thin wrappers

#### 3.2.6 Create Cross-Reference Linker for New Books

**Priority:** P2
**Current State:** `link_quran_kafi.py` only links Quran <-> Al-Kafi.

**Action:** Generalize into `link_books.py`:
- Accept any pair of books
- Pattern-match Quran verse references in any hadith text
- Create inter-hadith references where appropriate (e.g., same hadith appears in multiple collections)
- Create `Mentioned In` / `Mentions` relations bidirectionally

### 3.3 ThaqalaynDataGenerator - Pipeline Updates

#### 3.3.1 Update `main_add.py` Pipeline

**Action:** Add new pipeline steps:
```python
def init():
    init_books()           # 1. Book metadata
    init_quran()           # 2. Quran
    init_kafi()            # 3. Al-Kafi (existing)
    add_kafi_sarwar()      # 4. Sarwar translation (existing)
    init_faqih()           # 5. Man La Yahduruhu al-Faqih (NEW)
    init_tahdhib()         # 6. Tahdhib al-Ahkam (NEW)
    init_istibsar()        # 7. al-Istibsar (NEW)
    link_all_books()       # 8. Cross-references for all books (EXPANDED)
    process_all_narrators() # 9. Narrator chains for all books (EXPANDED)
```

#### 3.3.2 Update `books.py` Index

**Action:** Add entries for new books in the master `books.json`:
```python
BOOKS = [
    {"index": 1, "path": "/books/quran", "titles": {...}},
    {"index": 2, "path": "/books/al-kafi", "titles": {...}},
    {"index": 3, "path": "/books/man-la-yahduruhu-al-faqih", "titles": {...}},  # NEW
    {"index": 4, "path": "/books/tahdhib-al-ahkam", "titles": {...}},           # NEW
    {"index": 5, "path": "/books/al-istibsar", "titles": {...}},                # NEW
]
```

### 3.4 Thaqalayn (Angular) - Support New Books

#### 3.4.1 Update Book Models (if needed)

**Priority:** P1
**Current State:** The Angular `Book` type (`ChapterList | ChapterContent | VerseContent`) is generic enough to support any book. No model changes should be needed if the new books follow the same JSON schema.

**Action:** Verify that new book JSON matches existing interfaces. If new fields are needed (e.g., `book_source`, `hadith_grading_system`), extend `Chapter` and `Verse` interfaces.

#### 3.4.2 Update Book Landing Page

**Priority:** P1
**Action:** The book list page (`book-titles.component`) automatically renders whatever books are in `books.json`. Verify it displays 5 books correctly and add descriptive metadata for each.

#### 3.4.3 Add Book-Specific Styling/Branding

**Priority:** P3
**Action:** Consider giving each of the 4 books a distinct accent color or icon to help users orient themselves when navigating between collections.

---

## 4. Phase 3: Multi-Language Expansion (Months 4-7)

> **Goal:** Provide translations in multiple languages beyond English and Farsi to make the texts globally accessible.

### 4.1 Translation Infrastructure

#### 4.1.1 Language Support Expansion

**Current Languages:**
- Quran: English (17 translators), Farsi (11 translators)
- Al-Kafi: English only (2 translators)

**Target Languages (by demand):**

| Language | Code | Script Direction | Priority | Rationale |
|----------|------|-----------------|----------|-----------|
| Urdu | `ur` | RTL | P0 | Largest Shia population outside Iran |
| Indonesian/Malay | `id`/`ms` | LTR | P1 | Significant Muslim population |
| Turkish | `tr` | LTR | P1 | Historical Shia community |
| French | `fr` | LTR | P2 | Francophone Muslim communities |
| Spanish | `es` | LTR | P2 | Growing Muslim community |
| Swahili | `sw` | LTR | P3 | East African Muslim communities |

#### 4.1.2 ThaqalaynDataGenerator - Translation Pipeline

**Action:** Create a flexible translation ingestion system:

1. **Standardized translation file format** - Define a simple format (JSON or CSV) for contributors:
   ```json
   {
     "translator": "Name",
     "language": "ur",
     "book": "al-kafi",
     "verses": {
       "/books/al-kafi:1:1:1:1": ["Urdu translation text..."],
       "/books/al-kafi:1:1:1:2": ["Urdu translation text..."]
     }
   }
   ```

2. **Translation ingestion script** - `app/add_translation.py`:
   - Loads existing book data
   - Merges new translations into `verse.translations` dict
   - Updates `chapter.verse_translations` list
   - Validates verse paths match existing data

3. **Community contribution pipeline** - Enable scholars and translators to submit translations via structured files rather than requiring parser development.

#### 4.1.3 Add Al-Kafi Farsi Translations

**Priority:** P0 (large Farsi-speaking audience)
**Sources:** Iranian hadith databases, Noor Digital Library

#### 4.1.4 Add Al-Kafi Urdu Translations

**Priority:** P0 (Pakistani/Indian Shia communities)
**Sources:** Urdu hadith publications, community scholars

### 4.2 Thaqalayn (Angular) - i18n & RTL Support

#### 4.2.1 Fix `ExpandLanguagePipe` Incomplete Mappings

**Priority:** P1
**Current State:** `src/app/pipes/expand-language.pipe.ts` has a static map of language codes to names. It only supports `en`, `ent`, `ar`, `fa`.

**Action:** Extend with all target languages and make it data-driven from the API.

#### 4.2.2 Full RTL Support

**Priority:** P1
**Current State:** Arabic text renders RTL, but the overall layout doesn't fully adapt for RTL-primary users.

**Actions:**
1. Add `dir="rtl"` support to root component based on selected language
2. Use CSS logical properties (`margin-inline-start` instead of `margin-left`)
3. Test layout with Urdu and Arabic as primary UI languages
4. Mirror navigation controls for RTL users

#### 4.2.3 UI Language Selection (Separate from Translation)

**Priority:** P2
**Rationale:** Currently "language" conflates UI language with verse translation language. A user might want the UI in English but read verses in Farsi.

**Action:** Separate two concerns:
- **UI Language:** Controls labels, navigation text, breadcrumbs (stored in `localStorage`)
- **Translation Language:** Controls which verse translation is displayed (already handled via query params)

#### 4.2.4 Browser Language Auto-Detection

**Priority:** P3
**Action:** On first visit, detect `navigator.language` and set default UI language and translation accordingly.

---

## 5. Phase 4: User Experience & Accessibility (Months 5-8)

> **Goal:** Make the application intuitive, accessible, and pleasant for researchers, students, and casual readers.

### 5.1 Navigation & Discovery

#### 5.1.1 Full-Text Search

**Priority:** P0 (most requested feature for religious text apps)
**Options:**

| Approach | Pros | Cons |
|----------|------|------|
| **Client-side (Lunr.js / FlexSearch)** | No server needed, works offline | Requires loading complete JSON (~88 MB for Al-Kafi) |
| **Algolia / Meilisearch hosted** | Fast, typo-tolerant, faceted search | Requires hosting, costs money |
| **Pre-built search index** | Generated at build time, served statically | Medium complexity, good compromise |
| **Edge Functions (Netlify/Vercel)** | Server-side search without full backend | Limited processing time |

**Recommended Approach:** Pre-built search index generated by `ThaqalaynDataGenerator`:
1. Generator builds a search index (JSON) mapping keywords to verse paths
2. Index is split into per-book files for lazy loading
3. Angular loads relevant index on search and performs client-side matching
4. Supports Arabic text search with diacritics normalization

#### 5.1.2 Sub-Chapter Grouping in Chapter List

**Priority:** P1 (identified in README as known issue)
**Current State:** `chapter-list` component shows a flat list of chapters. Some books have logical sub-groupings (e.g., Al-Kafi Volume 4 Book 3 has chapters 106-115 belonging to "Chapters on Hunting").

**Actions:**
1. Add `sub_group` field to `Chapter` model in generator
2. Generate group metadata in JSON
3. Update `chapter-list` component to render grouped rows with section headers
4. Use Material `mat-table` row grouping or a custom expansion panel approach

#### 5.1.3 Bookmarks & Reading Progress

**Priority:** P2
**Action:** Allow users to:
- Bookmark verses/hadiths (stored in `localStorage`)
- Track reading progress per book (last read chapter)
- Resume where they left off
- Export/import bookmarks as JSON

#### 5.1.4 Side-by-Side Translation View

**Priority:** P2
**Action:** Allow displaying 2+ translations simultaneously in parallel columns, useful for comparative study.

#### 5.1.5 Verse/Hadith Sharing

**Priority:** P2
**Action:** Add share buttons that generate:
- Deep links to specific verses (`/books/quran:2#h255`)
- Copy verse text + translation to clipboard
- Social media share cards with verse text overlay

### 5.2 Accessibility

#### 5.2.1 WCAG 2.1 AA Compliance

**Priority:** P1
**Current State:** No accessibility audit has been performed. Angular Material provides some baseline accessibility.

**Actions:**
1. Add `aria-label` attributes to all interactive elements
2. Ensure proper heading hierarchy (`h1` > `h2` > `h3`)
3. Add skip-to-content link
4. Ensure color contrast ratios meet WCAG AA (4.5:1 for text)
5. Add `alt` text for any images
6. Test with screen reader (NVDA/VoiceOver)

#### 5.2.2 Keyboard Navigation

**Priority:** P1
**Actions:**
1. Ensure all interactive elements are focusable and operable via keyboard
2. Add keyboard shortcuts for common actions:
   - `J/K` or `Left/Right` for prev/next chapter
   - `T` to toggle translation
   - `/` to focus search
3. Add visible focus indicators

#### 5.2.3 Font Size & Readability Controls

**Priority:** P2
**Actions:**
1. Add font size controls (S/M/L/XL) for Arabic and translation text independently
2. Store preference in `localStorage`
3. Add line spacing control for dense Arabic text
4. Support system font size preferences (`prefers-reduced-motion`, `font-size-adjust`)

### 5.3 Mobile Experience

#### 5.3.1 Responsive Design Audit

**Priority:** P1
**Current State:** Angular Material provides basic responsiveness, but no specific mobile optimization has been done.

**Actions:**
1. Test all pages on mobile viewports (320px, 375px, 414px)
2. Fix chapter-list table for mobile (horizontal scrolling or card layout)
3. Make narrator chain text wrap properly on narrow screens
4. Add touch-friendly navigation (swipe for next/prev chapter)

#### 5.3.2 Progressive Web App (PWA)

**Priority:** P2
**Actions:**
1. Add service worker via `@angular/pwa`
2. Cache static assets and frequently accessed JSON
3. Enable offline reading of previously loaded chapters
4. Add installable manifest for home screen access
5. Configure background sync for bookmarks

#### 5.3.3 Native App Considerations

**Priority:** P3
**Options:**
- **Capacitor/Ionic wrapper** for App Store distribution (reuses Angular code)
- **React Native rebuild** for fully native experience (high effort)
- **PWA-first** approach (recommended - lowest effort, widest reach)

---

## 6. Phase 5: Developer Experience & Infrastructure (Months 6-9)

> **Goal:** Make the project maintainable, testable, and welcoming for contributors.

### 6.1 Thaqalayn (Angular) - Code Quality

#### 6.1.1 Implement Lazy Loading

**Priority:** P1
**Current State:** All components are eagerly loaded in a single bundle.

**Action:** Split into feature modules:
- `BooksModule` (chapter-list, chapter-content, verse-text, book-dispatcher)
- `PeopleModule` (people-list, people-content)
- `StaticModule` (about, support, download)

Use `loadChildren` in routing for deferred loading.

#### 6.1.2 Add `OnPush` Change Detection

**Priority:** P2
**Current State:** Most components use default change detection strategy, causing unnecessary re-renders.

**Action:** Add `changeDetection: ChangeDetectionStrategy.OnPush` to all components that receive data via `@Input()` or NGXS selectors. This is safe because NGXS already produces new references on state changes.

#### 6.1.3 Client-Side Caching Service

**Priority:** P2
**Current State:** Every navigation to a previously loaded chapter re-fetches JSON from the API.

**Action:** The NGXS store already caches loaded parts in `state.parts`, but the check in `BookPartResolver` may not prevent re-fetching. Ensure resolvers check the store before dispatching a load action. Optionally add a `CacheService` with TTL.

#### 6.1.4 Comprehensive Test Suite — DONE

**COMPLETED.** Test suite is now comprehensive:
- 367 unit `it()` calls across 28 spec files (services, components, states, pipes)
- 187 E2E tests across 16 Playwright spec files (all key user flows + accessibility)
- Coverage reporting configured (`ng test --code-coverage`)

#### 6.1.5 Remove `any` Types

**Priority:** P2
**Current State:** 4+ instances of `any` in services and components.

**Action:** Replace with proper types or `unknown` + type guards.

### 6.2 ThaqalaynDataGenerator - Code Quality

#### 6.2.1 Add Type Hints Throughout

**Priority:** P2
**Current State:** Most functions have return type hints but some parameter types are missing.

**Action:** Add complete type annotations to all public functions. Consider adding `mypy` to the CI pipeline.

#### 6.2.2 DRY Refactoring

**Priority:** P2
**Current Issues:**
- Translation ID formatting duplicated across `quran.py`, `kafi.py`, `kafi_sarwar.py`
- Path conversion logic duplicated in `lib_db.py` and `kafi_sarwar.py`
- Chapter loading patterns similar across parsers

**Action:** Extract shared utilities and use the `BookParser` base class from Phase 2.

#### 6.2.3 Increase Test Coverage for Parsers

**Priority:** P2
**Current State:** `kafi_narrators.py` has excellent coverage (35+ tests). Other parsers (`quran.py`, `kafi.py`, `kafi_sarwar.py`) have less coverage.

**Action:** Add parser-level integration tests that verify:
- Correct number of chapters/verses extracted
- Correct translation pairing
- Correct metadata extraction
- Graceful handling of malformed HTML

### 6.3 CI/CD & Infrastructure

#### 6.3.1 Set Up CI Pipeline

**Priority:** P0 (foundational)
**Current State:** No CI/CD pipeline. Manual deployment to Netlify.

**Actions:**

1. **GitHub Actions for Angular:**
   ```yaml
   # .github/workflows/angular.yml
   - npm ci
   - npm run lint
   - npm test -- --code-coverage --watch=false
   - npm run build -- --configuration=production
   ```

2. **GitHub Actions for Generator:**
   ```yaml
   # .github/workflows/generator.yml
   - uv sync --all-extras
   - uv run pytest --cov=app --cov-report=xml
   ```

3. **Pre-commit hooks** (via Husky or pre-commit framework):
   - Lint check (ESLint for Angular, pylint for Python)
   - Type check (TypeScript strict mode, mypy)
   - Test run (fast unit tests only)

#### 6.3.2 Automated Data Generation Pipeline

**Priority:** P2
**Action:** Create a GitHub Action that:
1. Runs `ThaqalaynDataGenerator` on source changes
2. Validates output (file count, JSON validity, schema compliance)
3. Commits generated data to `ThaqalaynData` repo
4. Triggers Netlify deploy

#### 6.3.3 Data Schema Validation

**Priority:** P1
**Action:** Create a validation script that runs after data generation:
- Verify all JSON files parse correctly
- Verify all paths referenced in `relations`, `verse_paths`, `narrator_chain.parts` exist
- Verify narrator ID consistency (no gaps, no duplicates)
- Verify verse counts match actual verse arrays
- Verify breadcrumb paths match file hierarchy

### 6.4 API & Data Access

#### 6.4.1 Public API Documentation

**Priority:** P2
**Action:** Create developer documentation (OpenAPI-style) describing:
- All endpoints and their response schemas
- Path format conventions
- Available books and translations
- Rate limiting (if applicable)
- Example requests and responses

This could live as a static page on the Thaqalayn site or as a separate docs site.

#### 6.4.2 JSON Schema Definitions

**Priority:** P2
**Action:** Create formal JSON Schema files for each `kind` type:
- `schema/chapter_list.json`
- `schema/verse_list.json`
- `schema/person_content.json`
- `schema/person_list.json`

Use these for:
- Generator output validation
- Angular type generation (via `json-schema-to-typescript`)
- Third-party developer reference

#### 6.4.3 Versioned API

**Priority:** P3
**Action:** Add version prefix to API paths (`/v2/books/...`) to allow backward-compatible schema evolution. The existing `_examples/v2-format-*.json` files suggest this was already considered.

---

## 7. Phase 6: Data Optimization (Months 7-9)

> **Goal:** Reduce data size from ~485 MB to ~320 MB (34% reduction) per the existing OPTIMIZATION_PLAN.md.

### 7.1 Tier 1: Generator-Only Changes (No Angular Impact)

#### 7.1.1 Remove `narrator_chain.text` — DONE

**COMPLETED.** `kafi_narrators.py` line 183 sets `hadith.narrator_chain.text = None` after processing. The field is used as intermediate state during narrator chain parsing but cleared before final output.

#### 7.1.2 Optimize Narrator Subchain Generation — DONE

**COMPLETED.** `getCombinations()` now generates only full chains + consecutive pairs. A chain of N narrators produces N entries (1 full chain + N-1 pairs) instead of N*(N+1)/2 - N. Dedup check avoids double-counting for 2-narrator chains.

### 7.2 Tier 2: Coordinated Generator + Angular Changes

#### 7.2.1 Extract Translator Metadata to Shared File

**Priority:** P2
**Savings:** ~5 MB
**Action:** Generate `_meta/translators.json` once, remove `verse_translations` from individual chapter files, load once in Angular via new `MetadataService`

#### 7.2.2 Simplify Navigation Objects — ALREADY DONE

**No action needed.** Navigation already stores path strings, not Crumb objects. See SCHEMA_PROPOSAL.md for details. The 15 MB savings claimed in OPTIMIZATION_PLAN.md was phantom.

### 7.3 Tier 3: Optional Advanced Optimization

#### 7.3.1 Shorten Field Names

**Priority:** P3
**Savings:** ~20 MB
**Risk:** High - touches every file in all 3 projects
**Action:** Only pursue if other optimizations are insufficient.

#### 7.3.2 gzip/Brotli Compression

**Priority:** P2
**Action:** Ensure Netlify serves JSON with Brotli compression (typically enabled by default). For the `complete/` files, pre-compress and serve `.json.br` files.

---

## 8. Phase 7: Extended Use Cases & Future Vision (Months 9+)

> **Goal:** Expand beyond the core 4 books to serve broader Islamic scholarship needs.

### 8.1 Additional Hadith Collections

#### 8.1.1 Primary Hadith Collections (Listed in README)

Add parsers and data for the remaining books listed in the README:

| Book | Author | Priority | Complexity |
|------|--------|----------|-----------|
| Nahj al-Balaghah | Al-Sharif al-Radi | P1 | Medium (structured, widely available) |
| Tuhaf al-Uqul | Ibn Shuba Harrani | P2 | Medium |
| Al-Amali (Tusi) | Shaikh Tusi | P2 | Medium |
| Al-Amali (Saduq) | Shaikh Saduq | P2 | Medium |
| Al-Amali (Mufid) | Shaikh Mufid | P2 | Medium |
| Uyun Akhbar al-Ridha | Shaykh Saduq | P2 | Medium |
| Kamil al-Ziyarat | Ibn Qulawayh | P3 | Medium |
| Al Tawheed | Shaikh Saduq | P3 | Medium |
| Al-Ihtijaj | Abu Mansur Tabrisi | P3 | Medium |
| Basair al-Darajat | Sheikh Al-Safar | P3 | High |
| Others | Various | P3 | Varies |

#### 8.1.2 Sunni Hadith Collections (Cross-Sectarian)

**Priority:** P3 (significant expansion of audience)
**Rationale:** Including Sunni collections (Sahih Bukhari, Sahih Muslim, etc.) would:
- Make the platform a comprehensive hadith resource
- Enable cross-collection comparison
- Attract a much wider audience
- Support academic/comparative religious studies

**Approach:** Many Sunni collections are available in structured formats via sunnah.com or similar APIs.

### 8.2 Scholarly & Research Features

#### 8.2.1 Hadith Grading System

**Priority:** P1
**Current State:** Some gradings exist in Al-Kafi via Sarwar translation, but not systematically displayed.

**Action:**
1. Add structured grading field to `Verse` model: `gradings: List<{scholar: string, grade: string, source: string}>`
2. Display grades with color coding (Sahih = green, Hasan = blue, Da'if = orange, Mawdu' = red)
3. Add grading filter to chapter views
4. Source grading data from published `ilm ar-rijal` databases

#### 8.2.2 Narrator Biographical Database

**Priority:** P2
**Current State:** Narrator files only contain Arabic names and chain relationships.

**Action:** Enrich narrator profiles with:
- Birth/death dates (approximate)
- Teacher-student relationships
- Reliability assessments from major `rijal` scholars
- Biographical notes
- Cross-references to `rijal` literature

#### 8.2.3 Thematic Tagging & Topic Index

**Priority:** P2
**Action:**
1. Tag hadiths by topic (e.g., "Prayer", "Fasting", "Ethics", "Jurisprudence")
2. Generate topic index files
3. Add topic-based navigation in the UI
4. Enable topic-filtered views within books

#### 8.2.4 Comparative Hadith View

**Priority:** P3
**Action:** When the same hadith appears in multiple collections, show them side-by-side:
- Highlight textual differences
- Compare narrator chains
- Show grading differences across collections

### 8.3 Community & Engagement

#### 8.3.1 User Annotations & Notes

**Priority:** P3
**Action:**
- Allow logged-in users to add private notes on any verse/hadith
- Notes stored client-side (localStorage) or in a simple backend (Firebase/Supabase)
- Export notes as PDF or Markdown

#### 8.3.2 Discussion / Commentary System

**Priority:** P3
**Action:**
- Community commentary on verses/hadiths (moderated)
- Scholar-verified explanations
- Integration with existing tafsir/sharh databases

#### 8.3.3 Daily Hadith / Verse of the Day

**Priority:** P3
**Action:**
- Curated daily selections displayed on landing page
- Email/push notification subscription
- Share widget for social media

### 8.4 Data Export & Integration

#### 8.4.1 Downloadable Data Packages

**Priority:** P2
**Action:**
- Provide downloadable ZIP files per book (already partially exists via `download` component)
- Include multiple format options: JSON, CSV, SQLite
- Add API-compatible format for developers

#### 8.4.2 REST / GraphQL API

**Priority:** P3
**Action:** For developer consumers who need more than static files:
- Deploy a thin API layer (Netlify Functions / Cloudflare Workers)
- Support queries like "all hadiths by narrator X about topic Y"
- Provide GraphQL schema for flexible querying

#### 8.4.3 Embeddable Widgets

**Priority:** P3
**Action:** Create embeddable `<iframe>` or web component widgets that other websites can use:
- Verse display widget (shows specific verse with translation)
- Random hadith widget
- Search widget

### 8.5 AI-Assisted Features

#### 8.5.1 Semantic Search

**Priority:** P2
**Action:**
- Use embeddings (e.g., via OpenAI or local model) to enable semantic search
- "Find hadiths about patience during hardship" instead of keyword matching
- Pre-compute embeddings for all hadiths and Quran verses during data generation

#### 8.5.2 AI-Powered Translation Assistance

**Priority:** P3
**Action:**
- For books lacking professional translations, provide AI-generated draft translations
- Clearly mark as "machine translation" with a disclaimer
- Allow scholars to review and approve/correct

#### 8.5.3 Q&A / Chatbot

**Priority:** P3
**Action:**
- RAG-based chatbot that answers questions using the hadith database as context
- "What does Al-Kafi say about fasting?" -> retrieves relevant hadiths
- Cite sources with direct links to verses

---

## 9. Summary Matrix

### By Priority

| Priority | Item | Project | Phase | Status |
|----------|------|---------|-------|--------|
| P0 | Fix broken Angular tests | Thaqalayn | 1 | **DONE** |
| P0 | Add HTTP error handling | Thaqalayn | 1 | TODO |
| P0 | Set up CI pipeline | All | 5 | TODO |
| P0 | Create parser base class | Generator | 2 | **DONE** |
| P0 | Generalize narrator extraction | Generator | 2 | TODO |
| P0 | Implement Man La Yahduruhu al-Faqih parser | Generator | 2 | TODO |
| P0 | Remove `narrator_chain.text` | Generator | 6 | **DONE** |
| P0 | Optimize narrator subchains | Generator | 6 | **DONE** |
| P0 | Full-text search (Orama) | Thaqalayn | 4 | **INSTALLED** — needs UI |
| P0 | Add Al-Kafi Farsi translations | Generator | 3 | TODO |
| P0 | Scale AI translations to full corpus | Generator | 3 | TODO (pipeline ready) |
| P1 | Migrate TSLint to ESLint | Thaqalayn | 1 | **DONE** |
| P1 | Replace Protractor with Playwright | Thaqalayn | 1 | **DONE** |
| P1 | Refactor global error accumulation | Generator | 1 | **DONE** |
| P1 | PWA support | Thaqalayn | 3 | **DONE** |
| P1 | Angular 19 upgrade | Thaqalayn | 3 | **DONE** |
| P1 | Word-by-word translation UI | Thaqalayn | 3 | TODO (data available from AI pipeline) |
| P1 | Implement Tahdhib & Istibsar parsers | Generator | 2 | TODO |
| P1 | RTL support | Thaqalayn | 3 | TODO |
| P1 | WCAG 2.1 AA compliance | Thaqalayn | 4 | Partial (accessibility E2E tests exist) |
| P1 | Responsive design audit | Thaqalayn | 4 | TODO |
| P1 | Sub-chapter grouping | Thaqalayn | 4 | TODO |
| P1 | Lazy loading | Thaqalayn | 5 | TODO |
| P1 | Comprehensive test suite | Thaqalayn | 5 | **DONE** (367 unit + 187 E2E) |
| P1 | Data schema validation | Generator | 5 | **DONE** (64 tests) |
| P1 | Hadith grading system | All | 7 | TODO |
| P1 | Nahj al-Balaghah parser | Generator | 7 | TODO |
| P0 | Fix logo overflow covering breadcrumbs | Thaqalayn | 3b | TODO — regression |
| P0 | Fix view mode icons cropped at bottom | Thaqalayn | 3b | TODO |
| P0 | Mobile search bar blocks hamburger menu | Thaqalayn | 3b | TODO — mobile broken |
| P0 | Mobile layout broken at 320px | Thaqalayn | 3b | TODO — mobile broken |
| P1 | Author line only on homepage/book root | Thaqalayn | 3b | TODO |
| P1 | English–Arabic chunk horizontal alignment | Thaqalayn | 3b | TODO |
| P1 | Mobile header title truncated | Thaqalayn | 3b | TODO |
| P1 | Mobile search overlay (replace inline input) | Thaqalayn | 3b | TODO |
| P1 | Mobile hamburger icon not visible | Thaqalayn | 3b | TODO |
| P2 | ISNAD/BODY label styling | Thaqalayn | 3b | TODO |
| P2 | Jump-to-hadith dropdown placement | Thaqalayn | 3b | TODO |
| P2 | View mode inconsistencies (plain≡paragraph) | Thaqalayn | 3b | TODO |
| P2 | Hadith card boundary separation | Thaqalayn | 3b | TODO |
| P2 | Mobile "Jump to hadith" truncation | Thaqalayn | 3b | TODO |
| P3 | Prev/next chapter nav visibility | Thaqalayn | 3b | TODO |
| P3 | Mobile bottom nav / sidebar redundancy audit | Thaqalayn | 3b | TODO |
| P2 | Social sharing (Web Share API) | Thaqalayn | 4 | TODO |
| P2 | Bookmarks & reading progress (Dexie) | Thaqalayn | 4 | **INSTALLED** — needs UI |
| P2 | Narrator biographical database | All | 7 | TODO |

### By Estimated Impact

| Impact | Item | Effort | Status |
|--------|------|--------|--------|
| **Highest** | Complete all 4 books | 3-4 months | TODO |
| **Highest** | Full-text search (Orama UI) | 1-2 weeks | Orama installed, needs UI |
| **High** | Multi-language AI translations | 2-3 months | Pipeline ready, 20 samples done |
| **High** | Data optimization (90 MB savings) | -- | **DONE** |
| **High** | PWA / Offline support | -- | **DONE** |
| **High** | Word-by-word translation UI | 1-2 weeks | Data from AI pipeline available |
| **Medium** | Hadith gradings | 1-2 weeks | ThaqalaynAPI data available |
| **Medium** | Narrator biographical database | 1-2 months | TODO |
| **Medium** | Thematic tagging | 1 month | AI pipeline generates tags |
| **Medium** | CI/CD pipeline | 1 week | TODO |
| **Medium** | Accessibility compliance | -- | Partial (E2E axe-core tests) |
| **Medium** | Social sharing | 1 week | TODO |
| **Medium** | Bookmarks & reading progress | 1-2 weeks | Dexie installed, needs UI |
| **Lower** | Additional hadith collections | Ongoing | 22 books available via ThaqalaynAPI |
| **Lower** | AI-assisted features | 2-4 weeks each | Pipeline operational |
| **Lower** | API/GraphQL layer | 2-3 weeks | TODO |

### Milestone Targets

| Milestone | Target | Key Deliverables | Status |
|-----------|--------|-----------------|--------|
| **M1: Stable Foundation** | Week 4 | Tests pass, error handling, modern tooling | **DONE** (tests + tooling; HTTP errors TODO) |
| **M1.5: AI Pipeline** | Week 8 | AI content generation operational | **DONE** (3-pass, caching, 20 samples) |
| **M2: Search & Bookmarks** | Month 3 | Orama search UI, Dexie bookmarks, social sharing | Dependencies installed |
| **M3: Three Books** | Month 4 | Man La Yahduruhu al-Faqih added | TODO |
| **M4: All Four Books** | Month 6 | Tahdhib + Istibsar added | TODO |
| **M5: Multi-Language** | Month 8 | AI translations for 11 languages | Pipeline ready |
| **M6: Optimized & Accessible** | Month 9 | WCAG AA, lazy loading, CI/CD | Partial |
| **M7: Extended Platform** | Month 12+ | Grading, narrator bios, additional books, API | TODO |

---

## Appendix A: Quick Wins

| Item | Effort | Status |
|------|--------|--------|
| Remove `narrator_chain.text` from output | 1 line | **DONE** |
| Fix `ExpandLanguagePipe` for all languages | Low | TODO |
| Add `<meta>` description tags for SEO | Low | TODO |
| Add favicon and PWA manifest | Low | **DONE** (PWA configured) |
| Add loading spinners for API data | Low | TODO |
| Store language preference in localStorage | Low | TODO |
| Surface hadith gradings from ThaqalaynAPI | Medium | TODO (data available) |
| Add HTTP error handling to Angular services | Medium | TODO |

## Appendix B: Architecture Decision Records (ADRs) Needed

Before implementing major changes, document decisions on:

1. **ADR-001:** Static JSON API vs. dynamic API (current: static, should it stay?)
2. **ADR-002:** Narrator ID strategy for multi-book expansion (shared vs. per-book IDs)
3. **ADR-003:** Search implementation approach (client-side vs. hosted)
4. **ADR-004:** PWA caching strategy (which data to cache, size limits)
5. **ADR-005:** Translation contribution workflow (how external contributors submit translations)
6. **ADR-006:** Authentication model for user features (bookmarks, notes)

## Appendix C: Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Source data unavailable for 3 remaining books | Medium | High | Identify multiple sources per book early |
| Narrator ID conflicts across books | Medium | High | Design shared narrator index before adding books |
| Data size grows beyond Netlify free tier | Low | Medium | Optimize aggressively, consider paid hosting |
| Breaking changes to JSON schema | Medium | High | Version API, maintain backward compatibility |
| Community translations quality | Medium | Medium | Peer review process, scholar verification |
| AI-generated translations accuracy | High | Medium | Always mark as machine translation, allow corrections |
