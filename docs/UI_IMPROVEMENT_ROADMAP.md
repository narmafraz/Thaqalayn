# UI Improvement Roadmap

> **Date:** 2026-03-09
> **Scope:** Thaqalayn Angular 19 Frontend
> **Sources:** Desktop UX Review, Mobile UX Review, RTL/Multilingual Review, UI Design Review
> **Total Items:** 52

---

## Executive Summary

The Thaqalayn frontend successfully delivers core functionality: hierarchical book navigation, Arabic rendering, dark mode, RTL layout mirroring, search, bookmarks, and keyboard shortcuts all work well. However, four independent UX reviews have surfaced a consistent set of problems that undermine the experience for real users. The most urgent issues are: blank screens during data loading (no spinners despite user stories claiming otherwise), broken internationalization that renders non-English link sharing useless ("undefined undefined" text, ignored `?lang=` parameter), browser hangs on high-narration narrator profiles, and touch targets far below the 44px accessibility minimum. Beyond these blockers, the app suffers from information-dense verse cards that prioritize metadata over content, a narrator section that lacks English names and meaningful visual hierarchy, and a visual design that relies on unstyled Angular Material defaults with inconsistent spacing and typography. A phased approach addressing critical bugs first, then UX polish, narrator overhaul, design system, and advanced features will systematically raise the quality bar.

---

## Phase 1: Critical Fixes

Items that block core usability or break fundamental user stories. These should be addressed before any other work.

### FIX-01: Add Loading States (Spinners/Skeletons) for All Data-Fetching Pages

**Description:** Every page that fetches data (book content, chapter lists, narrator profiles, search results) shows a blank main area for 2-4 seconds with no visual feedback. Despite ERR-01 and ERR-03 being marked [DONE] in USER_STORIES.md, the actual experience is a blank screen.

**Source:** Desktop UX Reviewer
**Severity:** CRITICAL
**Effort:** M (1-3 days)
**User Stories Affected:** ERR-01, ERR-03 (status should be reverted to [PARTIAL])
**Acceptance Criteria:**
- Every page that fetches async data shows a spinner or skeleton within 200ms of navigation
- Skeleton matches the layout of the content it replaces (table skeleton for chapter lists, card skeletons for verse pages)
- No blank white/dark area visible during loading on any page

### FIX-02: Fix `?lang=` URL Parameter Ignored on Fresh Sessions

**Description:** Opening a URL like `https://thaqalayn.netlify.app/#/books/quran:1?lang=fa` in a fresh browser session does not apply the language. This breaks link sharing for non-English users entirely.

**Source:** RTL/Multilingual Reviewer
**Severity:** CRITICAL
**Effort:** S (< 1 day)
**User Stories Affected:** LNG-02 (status should be reverted to [PARTIAL])
**Acceptance Criteria:**
- Opening a URL with `?lang=xx` in an incognito window applies that language immediately
- Language persists across subsequent navigation
- Works for all 12 supported languages

### FIX-03: Fix "undefined undefined" in In-Book References for Non-English Languages

**Description:** For ALL non-English UI languages, in-book reference text displays "undefined undefined" because `books.{lang}.json` index files are missing (404 errors). Breadcrumb book/chapter names are also blank for non-English.

**Source:** RTL/Multilingual Reviewer
**Severity:** CRITICAL
**Effort:** M (1-3 days) — requires generating missing index files in ThaqalaynDataGenerator
**User Stories Affected:** LNG-04 (status should be reverted to [PARTIAL]), NAV-03
**Acceptance Criteria:**
- In-book references display correctly in all 12 UI languages
- Breadcrumbs show localized book/chapter names for all languages
- No "undefined" text visible anywhere when switching languages
- Missing `books.{lang}.json` files are generated and deployed

### FIX-04: Fix Narrator Profile Performance Freeze for High-Narration Narrators

**Description:** Narrator profiles with thousands of narrations (e.g., 5,511 for top narrators) cause the browser tab to freeze/hang. The virtual scroll container with a fixed 400px viewport is insufficient.

**Source:** Desktop UX Reviewer, UI Design Reviewer
**Severity:** CRITICAL
**Effort:** M (1-3 days)
**User Stories Affected:** PPL-04
**Acceptance Criteria:**
- Narrator profiles with 5,000+ narrations load within 3 seconds
- Scrolling through narrations is smooth (no dropped frames)
- Virtual scroll viewport dynamically sizes to available screen height, not a fixed 400px
- Co-narrators section uses lazy loading or pagination instead of dumping hundreds of chains

### FIX-05: Fix Touch Targets Below 44px Minimum

**Description:** Verse action icons are approximately 24px, well below the WCAG 44px minimum touch target. This affects all mobile users attempting to bookmark, share, or annotate verses.

**Source:** Mobile UX Reviewer
**Severity:** CRITICAL
**Effort:** S (< 1 day)
**User Stories Affected:** A11-04 (status should be reverted to [PARTIAL])
**Acceptance Criteria:**
- All interactive icons/buttons have a minimum 44x44px touch target (actual hit area, not just visible icon)
- Verse footer action icons specifically increased to meet this threshold
- Verified on 375px viewport with touch event testing

### FIX-06: Fix Raw i18n Keys Leaking as Visible Text

**Description:** Approximately 20 raw i18n keys display as visible text instead of translated strings. Known keys include: `annotation.add`, `bookmark.add`, `nav.topics`, `pwa.install`, `search.placeholder`, `footer.about`, `footer.download`, `footer.support`, and others across various components.

**Source:** RTL/Multilingual Reviewer
**Severity:** HIGH
**Effort:** S (< 1 day)
**User Stories Affected:** LNG-04
**Acceptance Criteria:**
- Zero raw i18n keys visible in the UI for any of the 12 supported languages
- Automated test checks for `*.*.` pattern strings in rendered output (E2E)
- All ~20 identified keys have translations in every language file

---

## Phase 2: UX Polish ✅ COMPLETE

High-value improvements to existing features that reduce friction for daily users.

> **Status:** All 15 items implemented (2026-03-09). 484 unit tests passing.

### UX-01: Add "Jump to Verse" Navigation for Long Surahs/Chapters

**Description:** Al-Baqarah has 286 verses with no way to jump to a specific verse number. Users must scroll through the entire page. This affects both Quran surahs and long hadith chapters.

**Source:** Desktop UX Reviewer, Mobile UX Reviewer
**Severity:** HIGH
**Effort:** M (1-3 days)
**User Stories Affected:** NAV-02, VRS-04
**Acceptance Criteria:**
- A "Jump to verse" input or dropdown appears on pages with 20+ verses
- Entering a verse number scrolls to that verse with a highlight animation
- URL fragment updates to reflect the target verse (e.g., `#v42`)
- Works on both desktop and mobile

### UX-02: Add English Names to Narrator List and Profiles

**Description:** The narrator list and profile pages show Arabic names only, making them unusable for non-Arabic readers who represent a significant portion of users.

**Source:** Desktop UX Reviewer, Mobile UX Reviewer, UI Design Reviewer
**Severity:** HIGH
**Effort:** S (< 1 day) — data already exists in narrator JSON
**User Stories Affected:** PPL-01, PPL-02, PPL-03
**Acceptance Criteria:**
- Narrator list table shows English transliteration alongside Arabic name
- Narrator profile page shows English name prominently
- Narrator filter/search works on English names (not just Arabic)
- Mobile table shows at minimum English name if space is constrained

### UX-03: Reduce Verse Card Metadata Density

**Description:** Each verse card displays 7 icon buttons, reference numbers, tags, grading badges, and cross-validation info. The metadata often takes more visual space than the actual verse text, pushing content below the fold.

**Source:** Desktop UX Reviewer, Mobile UX Reviewer, UI Design Reviewer
**Severity:** HIGH
**Effort:** M (1-3 days)
**User Stories Affected:** VRS-01, VRS-04, VRS-08, VRS-09, VRS-10
**Acceptance Criteria:**
- Verse text is visually dominant (largest element in the card)
- Secondary metadata (grading, cross-validation, content type) collapsed behind an expandable section or shown on hover/tap
- Action icons grouped more compactly (e.g., overflow menu for less-used actions)
- On mobile, metadata is further reduced (show only grading badge inline, rest in expandable)

### UX-04: Add Inline Verse Numbers in Quran Text

**Description:** Quran verses lack inline verse numbers, requiring users to cross-reference with the sidebar/header. Traditional Quran display includes circled verse numbers inline with the Arabic text.

**Source:** Desktop UX Reviewer
**Severity:** HIGH
**Effort:** S (< 1 day)
**User Stories Affected:** VRS-04
**Acceptance Criteria:**
- Quran verses display their number in a small circled indicator inline with or immediately after the Arabic text
- Number styling is subtle (smaller font, muted color) so it does not compete with the text
- Numbers are not shown for hadith content (Quran-only feature)

### UX-05: Make Table Rows Visually Clickable

**Description:** Chapter list table rows are clickable but have no visual affordance (no cursor change, no hover highlight), making them appear as static text.

**Source:** Desktop UX Reviewer
**Severity:** HIGH
**Effort:** S (< 1 day)
**User Stories Affected:** TBL-01, NAV-02
**Acceptance Criteria:**
- Table rows show `cursor: pointer` on hover
- Hover state adds a subtle background highlight (respects dark mode)
- Active/pressed state provides visual feedback
- Entire row is clickable, not just the text

### UX-06: Add Tooltips to All Untitled Icons (Batch: 26 Icons)

**Description:** 26 of 54 audited icons lack tooltips. Users cannot discover functionality without clicking. The full list includes: 5 header buttons (font A-/A/A+, dark mode toggle, keyboard shortcuts), 6 verse footer icons (copy link, bookmark, add note, share as image, play audio, view commentary), 3 bookmark page buttons (delete single, clear all, export), 3 search/filter clear buttons, navigation arrows (prev/next/up), and miscellaneous action icons.

**Source:** Desktop UX Reviewer, UI Design Reviewer
**Severity:** MEDIUM
**Effort:** S (< 1 day)
**User Stories Affected:** A11-01, SET-01, SET-03, SET-05, BMK-01, BMK-03
**Acceptance Criteria:**
- All 26 identified icons have `matTooltip` directives with descriptive text
- Tooltips are localized (use i18n keys)
- Tooltip delay is 300-500ms (not instant, not slow)
- On mobile, tooltips are accessible via long-press

### UX-07: Reduce Header/Toolbar Height on Mobile

**Description:** The header and toolbar together consume approximately 160px (20% of a typical mobile viewport) before any content appears. This is excessive for a content-first reading application.

**Source:** Mobile UX Reviewer
**Severity:** HIGH
**Effort:** S (< 1 day)
**User Stories Affected:** RSP-01, RSP-03
**Acceptance Criteria:**
- Combined header + toolbar height is under 100px on viewports < 768px
- Header collapses or compacts on scroll (auto-hide or shrink pattern)
- All header functionality remains accessible (possibly via hamburger menu)

### UX-08: Fix Language Picker Dropdown Clipping at 375px Width

**Description:** The language picker dropdown is clipped/cut off on narrow mobile viewports (375px, iPhone SE size), making some language options unreachable.

**Source:** Mobile UX Reviewer
**Severity:** HIGH
**Effort:** S (< 1 day)
**User Stories Affected:** LNG-01, RSP-04
**Acceptance Criteria:**
- Language picker dropdown is fully visible and scrollable on 375px viewport
- No horizontal overflow caused by the dropdown
- All 12 language options are selectable

### UX-09: Fix Breadcrumb Truncation on Deep Paths

**Description:** Deep book paths (e.g., al-kafi > Volume 1 > Book of Reason > Chapter 1 > Hadith 3) cause breadcrumbs to overflow or truncate poorly on mobile, losing critical navigation context.

**Source:** Mobile UX Reviewer
**Severity:** HIGH
**Effort:** S (< 1 day)
**User Stories Affected:** NAV-03, RSP-04
**Acceptance Criteria:**
- Breadcrumbs on mobile use ellipsis truncation for middle segments (show first and last)
- Tapping truncated breadcrumb expands to show full path
- No horizontal scrolling caused by breadcrumbs
- Breadcrumb separator uses chevron icon instead of `>>` (see also DS-05)

### UX-10: Fix Narrator Chain Horizontal Overflow on Mobile

**Description:** Long narrator chains (isnad) overflow horizontally on mobile viewports, causing the page to scroll sideways.

**Source:** Mobile UX Reviewer
**Severity:** HIGH
**Effort:** S (< 1 day)
**User Stories Affected:** VRS-06, RSP-04
**Acceptance Criteria:**
- Narrator chains wrap within the card width on all viewports
- Chain links remain individually tappable after wrapping
- No horizontal scroll introduced by narrator chain content

### UX-11: Add Translation Fallback for Missing Languages

**Description:** When a verse has no translation in the user's selected language, the card shows only Arabic text with no indication that a translation is missing or available in other languages.

**Source:** RTL/Multilingual Reviewer
**Severity:** MEDIUM
**Effort:** S (< 1 day)
**User Stories Affected:** LNG-08
**Acceptance Criteria:**
- When no translation exists for selected language, a message says "Translation not available in [language]. Available in: English, Persian" (with clickable language links)
- The app does not silently show Arabic-only content without explanation

### UX-12: Translate Content Labels (Summary, Key Terms, Topics, etc.)

**Description:** AI-generated content labels like "Summary", "Key Terms", "Mentioned In:", and topic tag headers remain in English regardless of UI language selection.

**Source:** RTL/Multilingual Reviewer
**Severity:** MEDIUM
**Effort:** S (< 1 day)
**User Stories Affected:** LNG-04
**Acceptance Criteria:**
- All content section labels are translated using i18n system
- Topic tags display in the active UI language where translations exist
- "Mentioned In" and "Mentions" labels are localized

### UX-13: Add Search Results Count and "Load More" Indicator

**Description:** Search results are silently capped at 30 with no indication that more results exist, giving users a false impression of completeness.

**Source:** Desktop UX Reviewer
**Severity:** MEDIUM
**Effort:** S (< 1 day)
**User Stories Affected:** SRC-03
**Acceptance Criteria:**
- Search results page shows total count (e.g., "Showing 30 of 142 results")
- A "Load more" button or infinite scroll loads additional results
- If all results are shown, display "Showing all N results"

### UX-14: Add "Back to Top" Button on Long Pages

**Description:** Long chapter pages (200+ verses) require extensive scrolling with no quick way to return to the top.

**Source:** Mobile UX Reviewer
**Severity:** LOW
**Effort:** S (< 1 day)
**User Stories Affected:** NAV-02
**Acceptance Criteria:**
- A floating "back to top" button appears after scrolling down 2+ screen heights
- Button is positioned bottom-right (LTR) or bottom-left (RTL), above the mobile nav bar
- Smooth scroll animation to top

### UX-15: Resolve Homepage Dual-Navigation Confusion

**Description:** The homepage presents both a sidebar tree navigation and a bottom table listing books, creating competing navigation patterns that confuse new users.

**Source:** Desktop UX Reviewer
**Severity:** MEDIUM
**Effort:** M (1-3 days)
**User Stories Affected:** NAV-01
**Acceptance Criteria:**
- A single primary navigation pattern is established for the homepage
- If both persist, their relationship is clear (e.g., sidebar as outline, main area as detail)
- New users can find a book within 10 seconds (qualitative test)

---

## Phase 3: Narrator Pages Overhaul ✅ COMPLETE

> **Status:** All 6 items implemented (2026-03-10). NAR-01 gold Imam styling, NAR-02 stats summary, NAR-03 preview cards with IndexState chapter titles, NAR-04 co-narrators collapse, NAR-05 hover cards with English names, NAR-06 teacher/student lists. 484 unit tests passing.

Dedicated improvements to the narrator list and profile pages, which are currently the weakest part of the UI.

### New User Stories to Add to USER_STORIES.md

The following stories should be added under section "5. Narrator & People":

| ID | Story | Status |
|----|-------|--------|
| PPL-07 | As a user, I can see narrator English transliteration prominently on list and profile pages | [PLANNED] |
| PPL-08 | As a user, I can see a stats summary (total narrations, book distribution, reliability) on narrator profiles | [PLANNED] |
| PPL-09 | As a user, I can see featured/prominent narrators (Imams, major companions) visually distinguished from minor narrators | [PLANNED] |
| PPL-10 | As a user, I can see hadith preview cards (not just bare path links) in narrator profiles | [PLANNED] |
| PPL-11 | As a user, I can sort narrators by narration count, reliability, or alphabetically | [PLANNED] |
| PPL-12 | As a user, I can hover over narrator names in hadith chains to see a summary card without navigating away | [PLANNED] |
| PPL-13 | As a user, I can compare two narrators side-by-side | [PLANNED] |
| PPL-14 | As a user, I can see a teacher/student list on each narrator's profile | [PLANNED] |

### NAR-01: Narrator List — Add English Names and Visual Hierarchy

**Description:** Add English transliteration column, visually distinguish Imams and major narrators (e.g., gold badge, featured section at top), add default sort by narration count, and ensure filter works on English names.

**Source:** Desktop UX Reviewer, Mobile UX Reviewer, UI Design Reviewer
**Severity:** HIGH
**Effort:** M (1-3 days)
**User Stories Affected:** PPL-01, PPL-02, PPL-07, PPL-09
**Acceptance Criteria:**
- English name column visible on desktop; on mobile, English name is primary with Arabic secondary
- Imams/major figures have a visual badge or colored indicator
- Default sort is by narration count (descending)
- Filter input searches both Arabic and English names
- Column headers are concise (e.g., "Narrations" not "Number of Narrations")

### NAR-02: Narrator Profile — Add Stats Summary Section

**Description:** Add a summary section at the top of narrator profiles showing total narrations, book distribution breakdown (e.g., "Al-Kafi: 2,341 | Tahdhib: 890"), and reliability rating if available.

**Source:** UI Design Reviewer
**Severity:** HIGH
**Effort:** M (1-3 days)
**Data Requirements:** Book distribution counts need to be computed (can be derived from existing narration paths in narrator JSON)
**User Stories Affected:** PPL-03, PPL-08
**Acceptance Criteria:**
- Stats pills/badges display at top of profile (total narrations, books, reliability)
- Book distribution shown as mini bar chart or pill list
- Stats are accurate against actual narration count in the data

### NAR-03: Narrator Profile — Hadith Preview Cards Instead of Bare Links

**Description:** Replace bare path links (e.g., `/books/al-kafi:1:2:3:4`) in the narrations list with preview cards showing book name, chapter title, and first line of hadith text.

**Source:** UI Design Reviewer
**Severity:** HIGH
**Effort:** L (3+ days) — requires fetching additional data or pre-computing previews
**Data Requirements:** Either include preview text in narrator JSON (generator change) or lazy-fetch on scroll
**User Stories Affected:** PPL-04, PPL-10
**Acceptance Criteria:**
- Each narration in the list shows: book name, chapter title, first 100 characters of Arabic text
- Cards are clickable to navigate to the full hadith
- Virtual scroll still used for performance
- Loading skeleton shown while preview data loads

### NAR-04: Narrator Profile — Collapse Co-Narrators Section

**Description:** The co-narrators section dumps hundreds of narrator chain entries without summarization. Replace with a summary view showing top 10 co-narrators with counts, expandable to full list.

**Source:** UI Design Reviewer
**Severity:** MEDIUM
**Effort:** M (1-3 days)
**User Stories Affected:** PPL-05
**Acceptance Criteria:**
- Co-narrators section shows top 10 by frequency with narration count
- "Show all N co-narrators" expander reveals full list
- Each co-narrator is clickable to navigate to their profile
- No performance degradation for narrators with hundreds of co-narrators

### NAR-05: Add Narrator Hover Cards in Hadith Chains

**Description:** When hovering over (desktop) or long-pressing (mobile) a narrator name in a hadith chain, show a popup card with: English name, reliability, narration count, and a "View profile" link. Avoids full page navigation for quick lookups.

**Source:** UI Design Reviewer
**Severity:** MEDIUM
**Effort:** M (1-3 days)
**User Stories Affected:** VRS-06, PPL-06, PPL-12
**Acceptance Criteria:**
- Hover card appears within 300ms on desktop, on long-press on mobile
- Card shows: Arabic name, English name, narration count, reliability (if available)
- "View full profile" link in the card
- Card dismisses on mouse leave or tap outside
- Does not block interaction with underlying content

### NAR-06: Add Teacher/Student Lists to Narrator Profiles

**Description:** Display explicit teacher and student relationships on narrator profiles, using data already present in the narrator JSON (teachers/students fields).

**Source:** UI Design Reviewer
**Severity:** MEDIUM
**Effort:** S (< 1 day) — data already exists
**User Stories Affected:** PPL-03, PPL-14
**Acceptance Criteria:**
- "Teachers" and "Students" sections appear on narrator profile
- Each entry is a clickable link to that narrator's profile
- Sections hidden if no teacher/student data exists

---

## Phase 4: Design System and Modernization ✅ COMPLETE

> **Status:** All 6 items implemented (2026-03-10). DS-01 spacing system, DS-02 type scale, DS-03 casing normalization, DS-04 topic card hover states, DS-05 already done (chevrons), DS-06 localized page titles. 484 unit tests passing.

Visual refresh establishing consistent patterns across the application.

### DS-01: Establish Consistent Spacing System

**Description:** Replace ad-hoc spacing (mix of 8px, 16px, random values) with an 8px-based spacing scale applied consistently across all components. Increase Arabic/English gap in verse cards from ~8px to 16-20px.

**Source:** UI Design Reviewer
**Severity:** MEDIUM
**Effort:** M (1-3 days)
**User Stories Affected:** VRS-01, RSP-03
**Acceptance Criteria:**
- All component spacing uses multiples of 8px (8, 16, 24, 32, 48)
- Spacing defined as SCSS variables or CSS custom properties
- Arabic/English text gap in verse cards is 16-20px
- Visual audit confirms no remaining random spacing values

### DS-02: Establish Type Scale and Font Choice

**Description:** Replace generic system sans-serif with an intentional font stack (e.g., Inter for Latin, existing Noto/Amiri for Arabic). Establish a clear type scale where metadata labels are visually subordinate to content text, and breadcrumbs are appropriately sized.

**Source:** UI Design Reviewer
**Severity:** MEDIUM
**Effort:** M (1-3 days)
**User Stories Affected:** VRS-01, NAV-03
**Acceptance Criteria:**
- English body text uses a deliberately chosen font (e.g., Inter, Source Sans Pro)
- Type scale has at least 5 defined levels (heading, subheading, body, caption, overline)
- Metadata labels are visually smaller/lighter than content values
- Breadcrumb text is legible but subordinate to page title
- Font files are self-hosted (no external CDN dependency)

### DS-03: Normalize Title Casing

**Description:** Inconsistent casing across the UI: some headers are ALL CAPS, others are Title Case, others are sentence case. Establish a single convention.

**Source:** Desktop UX Reviewer
**Severity:** MEDIUM
**Effort:** S (< 1 day)
**User Stories Affected:** — (visual consistency)
**Acceptance Criteria:**
- All page titles use Title Case
- All button/action labels use Sentence case
- All table column headers use Sentence case
- CSS `text-transform` used consistently (not mixed with manual casing)

### DS-04: Add Hover States to Topic Cards

**Description:** Topic cards and browsable category items lack hover states, active states, or visual feedback indicating interactivity. Card heights are also inconsistent.

**Source:** UI Design Reviewer
**Severity:** MEDIUM
**Effort:** S (< 1 day)
**User Stories Affected:** SRC-05, SRC-06
**Acceptance Criteria:**
- Topic cards have hover elevation/shadow change
- Cursor changes to pointer on hover
- Cards have consistent heights within the same grid row
- Active/selected state is visually distinct

### DS-05: Replace `>>` Breadcrumb Separator with Chevron

**Description:** The breadcrumb separator `>>` looks dated. Modern breadcrumbs use a chevron icon (e.g., `mat-icon: chevron_right` or SVG).

**Source:** UI Design Reviewer
**Severity:** LOW
**Effort:** S (< 1 day)
**User Stories Affected:** NAV-03
**Acceptance Criteria:**
- Breadcrumb separator is a chevron icon (flips for RTL)
- Chevron is sized proportionally to breadcrumb text
- Spacing around chevron is consistent

### DS-06: Localize Page Titles

**Description:** Browser tab titles remain in English regardless of UI language. The `document.title` should reflect the active language.

**Source:** RTL/Multilingual Reviewer
**Severity:** LOW
**Effort:** S (< 1 day)
**User Stories Affected:** SEO-01, LNG-04
**Acceptance Criteria:**
- Page title updates to reflect active UI language for book/chapter names
- Static page titles (About, Download, Support) are localized
- Default title "Thaqalayn" remains as-is (proper noun)

---

## Phase 5: Advanced Features ✅ MOSTLY COMPLETE

> **Status:** 4 of 6 items implemented (2026-03-10). ADV-03 narrator comparison, ADV-04 chain diagram, ADV-05 advanced filters (partial: count/range filters), ADV-06 category browsing (Imams/Top/All). 484 unit tests passing. ADV-01 (reliability ratings) and ADV-02 (network graph) deferred — see notes below.

New capabilities that add significant value but require substantial implementation effort.

### ADV-01: Narrator Reliability Ratings and Multi-Scholar Gradings ⏳ DEFERRED

> **Deferral reason:** ADV-01a (display WikiShia reliability) is ready in Angular — the template already conditionally renders reliability badges with color coding. It just needs the WikiShia enrichment pipeline to be run against production data (`enrich_narrators(scrape=True)` in ThaqalaynDataGenerator). ADV-01b (multi-scholar gradings from Najashi, Tusi, Khoei) is deferred indefinitely — no machine-readable rijal data source has been identified. This is a data sourcing research project, not an engineering task.

**Description:** Display rijal (narrator science) reliability ratings on narrator profiles. Show gradings from multiple scholars where available, with an aggregated reliability indicator.

**Source:** UI Design Reviewer
**Severity:** MEDIUM
**Effort:** L (3+ days) — requires sourcing and structuring grading data
**Data Requirements:** Reliability data from rijal sources (Najashi, Tusi, Khoei). Must be added to narrator JSON by the generator.
**User Stories Affected:** PPL-03
**Acceptance Criteria:**
- Reliability rating badge on narrator profile (e.g., Thiqa/Reliable, Daif/Weak, Majhul/Unknown)
- Individual scholar gradings shown in expandable section
- Color coding matches hadith grading convention (green=reliable, yellow=acceptable, red=weak)

### ADV-02: Interactive Narrator Network Graph ⏳ DEFERRED

> **Deferral reason:** High complexity (requires Cytoscape.js library ~85KB), niche audience, and the co-narration data needed for meaningful graph edges already exists but the feature has the lowest impact-to-effort ratio. Recommended for a future phase when the narrator biography data is enriched.

**Description:** A visual graph showing narrator relationships (teacher-student, co-narration) with interactive exploration. Users can click nodes to navigate to profiles.

**Source:** UI Design Reviewer
**Severity:** LOW
**Effort:** L (3+ days)
**User Stories Affected:** PPL-05
**Acceptance Criteria:**
- Graph renders narrator as nodes, relationships as edges
- Nodes are clickable to navigate to narrator profile
- Graph supports zoom/pan and highlights the selected narrator's connections
- Performs acceptably with up to 100 nodes visible

### ADV-03: Narrator Comparison (Side-by-Side)

**Description:** Allow users to select two narrators and compare their profiles side-by-side: narration counts, reliability, shared narrations, teacher/student overlap.

**Source:** UI Design Reviewer
**Severity:** LOW
**Effort:** M (1-3 days)
**User Stories Affected:** PPL-13
**Acceptance Criteria:**
- Comparison page accessible from narrator profiles ("Compare with...")
- Side-by-side display of key stats
- Shared narrations listed with links
- Accessible on mobile via stacked layout

### ADV-04: Visual Chain Diagram for Hadith Isnad

**Description:** Render the narrator chain (isnad) as a visual diagram showing the transmission path from the Prophet/Imam to the compiler, instead of a flat text list.

**Source:** UI Design Reviewer
**Severity:** LOW
**Effort:** L (3+ days)
**User Stories Affected:** VRS-06
**Acceptance Criteria:**
- Chain rendered as a vertical or horizontal flow diagram
- Each narrator node is clickable
- Diagram fits within the verse card width (responsive)
- Falls back to text chain on very narrow viewports

### ADV-05: Advanced Narrator Search with Multi-Criteria Filters

**Description:** Extend narrator search beyond name matching to include filters by: book, reliability, narration count range, era/century, teacher/student of a specific narrator.

**Source:** UI Design Reviewer
**Severity:** LOW
**Effort:** M (1-3 days)
**User Stories Affected:** PPL-02
**Acceptance Criteria:**
- Filter panel with dropdowns/checkboxes for each criterion
- Filters combine with AND logic
- Results update in real-time as filters change
- Filter state reflected in URL for shareability

### ADV-06: Narrator Browse by Category

**Description:** Allow browsing narrators by category: Imams, major companions, scholars by era, scholarly circles. Provides an alternative to the flat alphabetical list.

**Source:** UI Design Reviewer
**Severity:** LOW
**Effort:** M (1-3 days)
**Data Requirements:** Category tagging for narrators (Imam, Companion, Scholar, etc.) in narrator data
**User Stories Affected:** PPL-01, PPL-09
**Acceptance Criteria:**
- Category tabs or sidebar on narrator list page
- At minimum: "Imams" and "All Narrators" categories
- Category counts shown (e.g., "Imams (12)", "All (1,074)")

---

## Phase 6: Content Parity & Terminology ✅ COMPLETE

> **Status:** All 7 items implemented (2026-03-10). PAR-01 verse-detail uses app-verse-text, PAR-02 contextual terminology, PAR-03 jump-to dropdown, PAR-04 flattened actions, PAR-05 page-level view mode with persistence, PAR-07 paragraph default. Build passing.

Addressing the disconnect between verse-detail and chapter-content views, fixing terminology, and improving action visibility.

### PAR-01: Verse Detail — Use `<app-verse-text>` for Full Feature Parity ⚠️ IMPLEMENT LAST IN PHASE

**Description:** The verse-detail component renders Arabic text directly (`<p *ngFor="let txt of book.data.verse.text">`) instead of using `<app-verse-text>`. This means verse-detail completely lacks: word-by-word analysis, chunked/paragraph view, chain diagram, isnad/matn separation, narrator hover cards, diacritics toggle, and phrase highlighting. Users who click into a hadith detail lose all the AI-enhanced reading features available in chapter view.

**Implementation notes (from challenger review):**
- Split into two parts: (a) Replace Arabic text rendering with `<app-verse-text [verse]="book.data.verse">`, removing duplicate narrator chain rendering. (b) Reconcile translation display — either let `<app-verse-text>` handle translations (remove verse-detail's section) or pass a flag to suppress `<app-verse-text>` translation rendering.
- Risk: `[innerHTML]` sanitization differences between raw rendering and `<app-verse-text>`'s `highlightPhrases()`. Test both Quran and hadith content.
- Implement LAST in Phase 6 so view mode service (PAR-05) is already in place.
- Existing verse-detail unit tests and E2E tests will need updates.

**Source:** User feedback item #1, Desktop review DESK-04
**Severity:** CRITICAL
**Effort:** M-L (2-4 days)
**Acceptance Criteria:**
- Verse-detail uses `<app-verse-text>` component instead of raw text rendering
- All view modes (word-by-word, paragraph, chain diagram) work identically in verse-detail and chapter-content
- Translation selection still works alongside `<app-verse-text>`
- Gradings, relations, AI metadata sections remain in verse-detail (they are detail-level features)
- Settings panel (`<app-settings>`) is accessible from verse-detail

### PAR-02: Contextual Terminology — "Verse" vs "Hadith"

**Description:** The UI uses "verse" terminology everywhere (jump to verse, verse count, verse paths) regardless of content type. For hadith books, "hadith" is the correct term. Only Quran content should use "verse"/"ayah".

**Source:** User feedback item #5, Desktop review DESK-01/02/12
**Severity:** HIGH
**Effort:** S (< 1 day)
**Acceptance Criteria:**
- "Jump to verse" shows "Jump to hadith" on hadith book pages and "Jump to ayah" on Quran pages
- Verse count labels say "hadith" for hadith books (e.g., "42 hadiths" not "42 verses")
- i18n keys support both variants: `book.jumpToVerse` / `book.jumpToHadith` / `book.jumpToAyah`
- Chapter-content component detects book type and uses correct terminology
- Narrator profile paths use "hadith" not "verse"

### PAR-03: Jump-to Navigation as Dropdown

**Description:** The current jump-to-verse/hadith is a bare number input. Users don't know how many items exist or what numbers are valid. Replace with a dropdown/select showing the count and allowing selection.

**Source:** User feedback item #10
**Severity:** HIGH
**Effort:** S (< 1 day)
**Acceptance Criteria:**
- Jump-to control is a dropdown/autocomplete showing available numbers (1-N)
- Dropdown header shows total count (e.g., "42 hadiths in this chapter")
- Selecting a number scrolls to that item with highlight animation
- Still supports direct number input (type-to-filter in autocomplete)
- Works on mobile without excessive viewport consumption

### PAR-04: Flatten Action Buttons — Remove Overflow Menu

**Description:** Secondary actions (copy link, add note, share as image, audio, tafsir) are hidden behind a three-dot overflow menu. The user wants all actions visible with tooltips since there aren't many.

**Source:** User feedback item #8
**Severity:** HIGH
**Effort:** S (< 1 day)
**Acceptance Criteria:**
- All action buttons visible inline (no overflow menu)
- Each button has a `matTooltip` with descriptive text
- On mobile (< 768px), icons are compact (icon-only, no text labels) but still all visible
- Touch targets remain ≥ 44px
- Actions: view detail, bookmark, copy link, add note, share as image, audio (Quran), tafsir (Quran)

### PAR-05: Page-Level View Mode Toggle + Persistence (includes former PAR-06)

**Description:** Word-by-word analysis and paragraph/chunked view toggles are per-hadith instance in chapter view. Toggling one doesn't affect others on the page. Users expect page-level control. Additionally, selected view mode should persist across chapter navigation.

**Source:** User feedback items #2 and #13, Desktop review DESK-05
**Severity:** HIGH
**Effort:** M (1-3 days)

**Implementation approach (from challenger review):**
- Add `viewMode: 'plain' | 'word-by-word' | 'paragraph'` property to `AiPreferencesService` (persisted via localStorage).
- `<app-verse-text>` reads view mode from the service by default. Local `overrideViewMode` property on VerseTextComponent takes precedence when set by user.
- Page-level toolbar in chapter-content calls `aiPrefs.set('viewMode', ...)` which all verse-text instances react to.
- Persistence across navigation is automatic since the service uses localStorage.

**Acceptance Criteria:**
- A page-level toolbar with view mode buttons (plain text / word-by-word / paragraph) appears above the verse list
- Toggling page-level mode applies to ALL hadith on the page simultaneously
- Individual hadith can still override the page-level setting
- Page-level toggle only appears when AI data is available for at least one hadith
- Selected view mode persists across chapter navigation via `AiPreferencesService`
- On page load, chapter-content reads persisted mode and applies it to all verse-text instances

### PAR-07: Paragraph View On by Default When Data Available

**Description:** When AI chunked/paragraph data is available, the default view should be paragraph view instead of plain text. This showcases the AI content investment.

**Source:** User feedback item #9
**Severity:** MEDIUM
**Effort:** S (< 1 day)
**Acceptance Criteria:**
- If `verse.ai.chunks` exists and is non-empty, default to chunked/paragraph view
- User's explicit preference (from PAR-06) overrides this default
- Plain text remains default when no AI data is available
- First-time users see the richest available view automatically

---

## Phase 7: AI Content Integration & Word Interaction ✅ PARTIAL

> **Status:** AI-01 (seamless integration) implemented (2026-03-10). Summary and key terms now visible inline instead of collapsed. AI-02 (word click popup) deferred — requires word tokenization prerequisite.

Making AI-generated content seamless rather than hidden, and adding word-level interaction.

### AI-01: Seamless AI Content Integration

**Description:** AI content (summary, key terms, topics, content type) is currently shown in collapsed `<details>` accordions or hidden behind expand toggles, making it feel disconnected from the hadith text. It should be integrated naturally into the reading flow.

**Source:** User feedback item #6, Desktop review DESK-07
**Severity:** HIGH
**Effort:** M (1-3 days)
**Acceptance Criteria:**
- AI summary appears directly below the translation text (not in a collapsible)
- Key terms display as subtle inline chips below the summary
- Content type badge is visible in the card header (not hidden in metadata)
- Topics shown as tag pills at the bottom of the card
- Quran references shown inline near related text (not in separate section)
- User can still hide AI content entirely via settings toggle
- Transition from "AI as addon" to "AI as integrated content layer"

### AI-02: Arabic Word Click Popup

**Description:** Users should be able to tap/click on any Arabic word in a hadith to see more detail: root word, morphological analysis, translation in selected language, and occurrences across the corpus.

**Source:** User feedback item #7
**Severity:** MEDIUM
**Effort:** M (1-3 days)
**Data Requirements:** Requires `verse.ai.word_analysis` data (already generated by AI pipeline for processed verses)

**Implementation prerequisite (from challenger review):** Standard Arabic text is currently rendered as `<p [innerHTML]="txt">`. Individual word click handlers cannot be attached to innerHTML. A prerequisite is tokenizing Arabic text into clickable `<span>` elements per word when `word_analysis` data is available. This is a non-trivial template change in `verse-text.component`.

**Acceptance Criteria:**
- Clicking/tapping an Arabic word opens a popup/tooltip showing: word, POS, translation, root (if available)
- Popup appears near the tapped word (not blocking other text)
- Works on both desktop (click) and mobile (tap)
- Only functional when AI word_analysis data is available for that verse
- Popup dismisses on click outside, tap elsewhere, or Escape key (keyboard accessible)
- If word_analysis is unavailable, clicking does nothing (graceful degradation)
- Focus management: popup receives focus, aria-describedby links word to popup

---

## Phase 8: Homepage & Book Discovery ✅ PARTIAL

> **Status:** HOME-01 (dynamic explore cards) implemented (2026-03-10). All books from IndexState shown with icons, Arabic titles, authors. HOME-02 (author metadata in index) pending — requires ThaqalaynDataGenerator changes.

Expanding the homepage to properly showcase all available books.

### HOME-01: Explore Cards for All Books

**Description:** The homepage "Explore" section has only 2 hardcoded cards (Quran and Al-Kafi). The app serves 24+ books. All books should be discoverable from the homepage.

**Source:** User feedback item #11, Desktop review DESK-03
**Severity:** HIGH
**Effort:** M (1-3 days)
**Acceptance Criteria:**
- Explore section shows cards for ALL books in the collection
- Cards are generated dynamically from the book index (not hardcoded)
- Each card shows: book name (English + Arabic), icon, brief description
- Cards are arranged in a responsive grid (2 columns mobile, 3-4 desktop)
- Quran and the Four Books (Al-Kafi, Tahdhib, Istibsar, Man La Yahduruh) are visually prioritized (larger or first)
- Cards link to the book's root page

### HOME-02: Book Authors in Cards and Lists

**Description:** Book cards and chapter-list tables don't show author information. Users should see who wrote/compiled each book for scholarly context.

**Source:** User feedback item #12
**Severity:** MEDIUM
**Effort:** S (< 1 day) for Angular, M for data
**Data Requirements:** Author names need to be added to book index JSON. Some are available in `books.en.json` descriptions, others need to be added in ThaqalaynDataGenerator.
**Acceptance Criteria:**
- Each book card on homepage shows the author/compiler name
- Chapter-list header shows author name below book title
- Author names are localized (English + Arabic at minimum)
- Fallback: if no author data, field is simply hidden

---

## Phase 9: Mobile Navigation & Settings ✅ COMPLETE

> **Status:** MOB-01 implemented (2026-03-10). Mobile hamburger menu with consolidated settings (navigation, dark mode, font size, language). Desktop controls unchanged. 484 unit tests passing.

Consolidating scattered settings and improving mobile navigation.

### MOB-01: Mobile Hamburger Menu with Consolidated Settings

**Description:** On mobile, the search box in the header and other icons (font size, dark mode, language) are not visible or are scattered across the UI. Settings controls appear in different places (header, settings component, AI settings). Need a unified hamburger menu.

**Source:** User feedback item #4, Desktop review DESK-06
**Severity:** HIGH
**Effort:** L (3-5 days) — revised up from M per challenger review
**Acceptance Criteria:**
- Mobile (< 768px): header shows only logo/title + hamburger icon + search icon
- Hamburger menu slides in from the side with ALL settings consolidated:
  - Language selection
  - Dark mode toggle
  - Font size controls
  - AI content preferences
  - Navigation links (Home, Narrators, Bookmarks, About)
- Search icon opens an expandable search bar in the header
- Settings component is hidden on mobile (replaced by hamburger menu contents)
- Smooth slide animation, closes on outside tap or swipe

---

## Phase 10: Cross-Project Data Improvements

Items requiring changes to ThaqalaynDataGenerator or data pipeline.

### DATA-01: Narrator Chain Extraction for All Books

**Description:** Currently narrator chains (isnad) are only extracted for Al-Kafi. The same extraction should be applied best-effort to all hadith books in the collection (Tahdhib, Istibsar, Man La Yahduruh, etc.).

**Source:** User feedback item #3
**Severity:** HIGH
**Effort:** L (3+ days) — requires generator parser changes per book
**Cross-Project:** ThaqalaynDataGenerator parser changes + ThaqalaynData regeneration
**Acceptance Criteria:**
- Narrator chains extracted for all major hadith books (at minimum the Four Books)
- Extraction is best-effort: non-standard chains fall back to raw text
- Narrator IDs are linked where possible (reusing existing narrator index)
- New narrator entries created for previously unseen narrators
- Angular app displays chains identically regardless of source book

### DATA-02: Book Author Metadata in Index

**Description:** The book index (`books.en.json`) lacks author/compiler metadata. This is needed for HOME-02 and chapter-list headers.

**Source:** User feedback item #12
**Severity:** MEDIUM
**Effort:** S (< 1 day)
**Cross-Project:** ThaqalaynDataGenerator + ThaqalaynData
**Acceptance Criteria:**
- `books.en.json` (and other language variants) include `author` field per book entry
- Author data: `{ "en": "Sheikh al-Kulayni", "ar": "الشيخ الكليني" }`
- All 24+ books have author information populated

---

## Summary Matrix

| Phase | Items | Effort Range | Key Theme |
|-------|-------|-------------|-----------|
| Phase 1: Critical Fixes | FIX-01 to FIX-06 (6 items) | 4S + 2M | Unblock basic usability |
| Phase 2: UX Polish ✅ | UX-01 to UX-15 (15 items) | 10S + 5M | Reduce daily friction |
| Phase 3: Narrator Overhaul ✅ | NAR-01 to NAR-06 (6 items) | 2S + 3M + 1L | Transform weakest section |
| Phase 4: Design System ✅ | DS-01 to DS-06 (6 items) | 3S + 3M | Visual consistency |
| Phase 5: Advanced Features ✅ | ADV-01 to ADV-06 (6 items) | 0S + 2M + 4L | New capabilities |
| Phase 6: Content Parity | PAR-01 to PAR-07 (7 items) | 4S + 3M | Unified reading experience |
| Phase 7: AI Integration | AI-01 to AI-02 (2 items) | 0S + 2M | Seamless AI content |
| Phase 8: Homepage & Discovery | HOME-01 to HOME-02 (2 items) | 1S + 1M | Full book showcase |
| Phase 9: Mobile Navigation | MOB-01 (1 item) | 0S + 1M | Mobile settings consolidation |
| Phase 10: Data Improvements | DATA-01 to DATA-02 (2 items) | 1S + 0M + 1L | Cross-project data |
| **Total** | **53 items** | **25S + 20M + 6L** | |

### Effort Estimates

- **S (< 1 day):** 25 items
- **M (1-3 days):** 20 items
- **L (3+ days):** 6 items
- **Estimated total:** ~85-120 developer-days

### User Story Status Corrections

The following user stories should have their status reverted from [DONE] to [PARTIAL] in USER_STORIES.md based on review findings:

| Story | Current | Should Be | Reason |
|-------|---------|-----------|--------|
| ERR-01 | [DONE] | [PARTIAL] | No loading spinners visible in practice |
| ERR-03 | [DONE] | [PARTIAL] | Blank screens during data fetch |
| LNG-02 | [DONE] | [PARTIAL] | `?lang=` ignored on fresh sessions |
| LNG-04 | [DONE] | [PARTIAL] | ~20 raw i18n keys visible; "undefined" in non-EN references |
| A11-04 | [DONE] | [PARTIAL] | Touch targets ~24px, well below 44px minimum |
| RSP-04 | [DONE] | [PARTIAL] | Narrator chain horizontal overflow on mobile |

### Cross-Project Dependencies

Several items require changes in ThaqalaynDataGenerator or ThaqalaynData in addition to the Angular frontend:

| Item | Generator Change | Data Change |
|------|-----------------|-------------|
| FIX-03 | Generate `books.{lang}.json` for all 12 languages | Deploy new index files |
| NAR-02 | Compute book distribution stats per narrator | Add to narrator JSON |
| NAR-03 | Include hadith preview text in narrator JSON | Regenerate narrator files |
| ADV-01 | Source and structure rijal reliability data | Add to narrator JSON |
| ADV-06 | Add category tags to narrator data | Regenerate narrator index |
| DATA-01 | Extend narrator chain extraction to all books | Regenerate all book JSON |
| DATA-02 | Add author metadata to book index | Regenerate index files |
| HOME-02 | Author data in book index | Deploy updated index |
