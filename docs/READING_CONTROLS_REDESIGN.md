# Reading Controls Redesign

**Status:** COMPLETE — all 7 implementation steps shipped 2026-05-16.
**Created:** 2026-05-16
**Owner:** narmafraz

Unifies AI view toggles + reading preferences into a single, discoverable, responsive surface across chapter-list and verse-detail pages.

## Implementation summary (2026-05-16)

| Step | Commit | What landed |
|---|---|---|
| 1. Service plumbing | `2a7e0a5` | `AiPreferencesService` extended with `showChainDiagram`, `showWordByWord`, `sidesheetOpenOnDesktop`; legacy `viewMode` migration; `showIsnadSeparation` dropped. `VerseTextComponent` toggles routed through the service. |
| 2. Reading sheet | `f45f3ef` | New `ReadingSheetService` + `ReadingSheetComponent`. Slide-out panel hosted at app shell, RTL-aware, Esc / backdrop close. Inline `ai-settings-panel` retired. |
| 3. Top app bar | `2c09587` | `#header` made `position: sticky` (required flipping `#site` overflow to `clip` — the old `auto / hidden` combo silently broke sticky). View icon trigger added to desktop + mobile header. Mobile hamburger's duplicated AI checkboxes replaced with a single "open sheet" button. |
| 4. Reading toolbar | `bf3582d` | New `ReadingToolbarComponent`. Sticky below the header, hide-on-scroll-down per DR1 (60px always-visible top band, 10px dead zone), 3 view-toggle buttons synced through `AiPreferencesService`. Route-scoped to `/books/*`. |
| 5. Remove redundant surfaces | `f633d18` | Dropped the per-verse `ai-toggles-footer` block (chapter-content), the chapter-toolbar WBW button, and the `verse-detail-toggles` row. `currentViewMode` / `onViewModeChange` / `checkAiContent` / `hasAnyAiContent` cleaned out of `chapter-content.component.ts`. |
| 6. Simplify gate + revert patches | `1b2f275` | `hasWordByWord` reduced to `!!verse.text?.length`. `computeWordTokens` gained a `verse.text` fallback so WBW renders for every hadith. `showWordByWordActive` removed. Effectively reverts `78dba5d` and `7cb7f6e`. |
| 7. A11y + RTL | `5611b1a` | Focus trap + restoration on the sheet (open captures `document.activeElement`, close restores; Tab / Shift+Tab cycle within the panel). RTL browser-verified — panel anchors at the leading edge under `dir=rtl`. |

**Tests:** 649/649 Karma pass (up from 622 at start). Browser-verified end-to-end at desktop 1280–1516px and mobile 400px; RTL (`dir=rtl`) verified.

## Variance from original plan

- **Responsive primitive (`<600px` bottom sheet, `600–1240px` modal side sheet, `≥1240px` standard side sheet)** — shipped as a single custom slide-out panel that works at all sizes. The bottom-sheet split + non-modal desktop variant were not needed for the milestone and remain available as a future refinement. `sidesheetOpenOnDesktop` preference is provisioned in the service for when that lands.
- **Mobile hamburger menu** — was meant to lose its AI checkboxes "when step 3 restructures the mobile path." Done in step 3 as planned; replaced with a single button that closes the menu and opens the sheet.
- **Nav arrows + translation-selection in `<app-settings>` strip** — still in the strip, not relocated. Plan called this out as an open follow-up; staying open.

## Open follow-ups

- Responsive primitive: bottom sheet under 600px, non-modal side sheet at ≥1240px, with the `sidesheetOpenOnDesktop` pref governing the persistent-open case.
- Relocate the `<app-settings>` strip's translation-selection + nav arrows (or accept current placement).
- Line-height / reading width / reciter — the sheet's section template is designed to absorb these without restructuring.
- Z-index audit — sticky header (100), sticky toolbar (90), reading-sheet backdrop (1250), reading-sheet panel (1300). Mobile-menu z-indices retired in the consolidation. Worth reconsolidating into a single SCSS map once another modal lands.

## Post-ship consolidation (2026-05-17)

After the user reviewed the as-built UX, two issues surfaced and one direction-of-travel correction:

1. **View trigger discoverability** (`e525dcc`) — the 18×18 sparkles icon was indistinguishable from the other chrome icons. Replaced with a labeled "View" pill. Pill survives this consolidation but is rethemed as **"Settings"** with a gear icon.
2. **Toolbar didn't hide on real scrolling** (`e525dcc`) — `onScroll` re-baselined `lastScrollY` on every event, so smooth-scroll wheel deltas (~5px) never accumulated past the 10px dead zone. Fix: only update the baseline on decisive scrolls. Two regression specs added.
3. **Sheet scope consolidation** (`<this commit>`) — user direction: drop the AI-only framing, make this the single canonical surface for *all* settings + navigation. Sections:
   - **Display**: theme toggle, font size controls
   - **Language**: UI language picker, word-by-word language
   - **AI Features**: existing 4 prefs (renamed section header from "AI Feature Settings" to "AI Features")
   - **Navigate**: top-level routes (Books, Topics, Narrators, Bookmarks, About, Download, Support)

   Trigger renamed "View" → "Settings", icon `auto_awesome` → `settings` (gear). Mobile hamburger menu retired entirely — the single Settings trigger on mobile now opens the consolidated sheet (containing the nav links that were in the hamburger). Mobile-menu HTML, TS state (`mobileMenuOpen`, `toggleMobileMenu`, `openReadingSheetFromMobileMenu`), and 170+ lines of CSS removed.

   Desktop header keeps its quick-access controls (search, font, theme, shortcuts, lang picker) as redundant fast paths — the user explicitly accepted desktop having "some icons on the header for more frequent actions." Canonical home is the sheet.

   Acceptance verified: 4 sections render with correct titles; 7 nav links; nav click closes sheet and routes correctly; mobile @ 400px has no hamburger / no menu panel, gear opens sheet; 656/656 Karma pass.

---

## Problem

Today the toggles for the three view modes (narrator chain diagram, diacritics/chunked view, word-by-word) are inconsistent across surfaces:

| Surface | Chain | Diacritics/chunks | WBW |
|---|---|---|---|
| Chapter-toolbar (top, sticky) | — | — | ✓ single button |
| Per-verse, chapter-content card | ✓ (collapsed under chevron) | ✓ (collapsed) | ✓ (collapsed) |
| Verse-detail card top | ✓ visible | ✓ visible | ✓ visible |
| Settings page | — | ✓ `showDiacritizedByDefault` | ✓ `viewMode` |

The per-verse controls on chapter pages are buried inside `secondary-metadata`, which is collapsed by default. On production this means **0** visible toggle buttons across 36 hadith cards until the user clicks a chevron. Verse-detail shows the same 3 toggles at the top of the card by default — fine — but produces a UX mismatch.

Two recent commits (`78dba5d`, `7cb7f6e`, 2026-05-14) patched downstream symptoms (WBW toggle gate, blank-Arabic-when-WBW-pref-on) without addressing the visibility issue.

A separate refactor moved word data from per-narration `verse.ai.word_analysis` to the central **ThaqalaynWords** repo (per-word). The current `hasWordByWord` gate still inspects per-verse fields and is now structurally stale.

## Research findings (2026-05-16)

Researched how serious reading apps (Quran.com, YouVersion, Kindle, Apple Books, Sefaria, Al-Islam.org) and current Material Design 3 guidance handle reading settings. Key findings:

- **No major reader uses a FAB for settings.** All use a labeled, top-bar icon (`Aa`, `AA`, gear, `⋯`). Material's own guidance reserves FAB for the screen's *primary action* — for a reader that's *read*, not *configure*.
- **NN/g empirical study (179 participants):** hidden navigation cuts discoverability ~50%, increases task time, increases perceived difficulty. Hidden menus used 27% on desktop vs 48–50% for visible/combo. A FAB+drawer for high-frequency reading toggles repeats this anti-pattern.
- **Quran.com's lesson:** they explicitly redesigned around change-frequency. Translation/reciter (changes rarely) lives in settings; word-by-word (per-session) gets its own panel; audio is its own task. *Don't put everything in one drawer.*
- **Material 3 (May 2025):** the navigation drawer primitive is being deprecated in favor of the expanded navigation rail. **Side sheet** is the right M3 primitive for "viewing options for the screen you're already on" — exact match. **Bottom sheet** is the mobile-thumb-friendly equivalent.
- **RTL is real, not nominal.** Arabic + Urdu content means a "right-anchored" drawer must use logical properties (`inset-inline-end`, `position="end"` resolving via `dir`).
- **Material 3 Expressive (May 2025)** introduces `FAB Menu` (FAB that expands into labeled actions in-place) — orthogonal to settings; not what we need here.

Full research writeup with sources is in conversation history; key sources captured at the bottom of this doc.

## Plan

### Surfaces (final state)

| Surface | Lives where | Triggers | Content |
|---|---|---|---|
| **Top app bar** | App shell, fixed | Labeled `View` icon (or `Aa`) → opens side sheet | Existing nav + new `View` icon |
| **Sticky reading toolbar** | App shell, scoped to `/books/*` and verse-detail routes | Inline buttons | Chain, Diacritics, WBW (with active state); "More" → opens side sheet |
| **Side sheet / bottom sheet** | App shell, `position="end"`, responsive primitive | Top-bar `View` icon OR toolbar "More" | AI content prefs, WBW lang selector, translation selector, future settings (font/theme) |
| Per-verse footer toggles | — | Removed | Was inside `secondary-metadata` |
| Verse-detail top toggle row | — | Removed | Replaced by sticky toolbar |

### Responsive primitive choice

- `< 600px` → **MatBottomSheet** (thumb zone; mobile convention)
- `600–1240px` → **modal MatSidenav, `position="end"`, `mode="over"`** (modal side sheet)
- `≥ 1240px` → **non-modal MatSidenav, `position="end"`, `mode="side"`, closed by default** (standard side sheet, opens beside content without dimming)

### Service changes

`AiPreferencesService`:
- Add `showChainDiagram: boolean` (default `false`).
- Add `showWordByWord: boolean` (default `false`) — replaces the `viewMode` enum's two-state usage. Keep `viewMode` field readable for one release for legacy localStorage migration (map `'word-by-word'` → `showWordByWord: true`), then drop.
- Drop `showIsnadSeparation` (unused since `dfdab29`, 2026-03-15).
- Add `sidesheetOpenOnDesktop: boolean` (default `false`) for the persistent-side-sheet desktop case.
- All toggles persist to localStorage and emit on `preferences$`.

### Component changes

- **New `app-reading-toolbar`** — sticky inline strip with 3 view-toggle buttons + a "More" button. Mounts at app shell, route-scoped.
- **New `app-reading-sheet`** — responsive shell wrapping `MatBottomSheet` (<600px) and `MatSidenav` (≥600px) with a single content template. Hosted at app shell.
- **Top app bar** — restructure existing `app-settings` strip into a proper fixed app bar. Add the `View` icon trigger.
- **`VerseTextComponent`** — replace component-local `showDiacritics` / `showWordAnalysis` / `showChainDiagram` state with subscriptions to `aiPrefs.preferences$`. Remove `toggle*()` methods (the source of truth is now the service, written from toolbar/sheet).
- **`chapter-content.component.html`** — remove `ai-toggles-footer` block from `secondary-metadata`. Remove the chapter-toolbar WBW button (now in the sticky toolbar). Keep jump-to-verse selector.
- **`verse-detail.component.html`** — remove `verse-detail-toggles` row at top of card.
- **Simplify `hasWordByWord`** → `!!this.verse?.text?.length`. Drop all per-verse data inspection (no more `word_analysis` / `chunks[].arabic_text` checks). Tokenizer (`computeWordTokens`) gets a `verse.text.join(' ')` fallback path so WBW renders for any hadith with Arabic, with words lazy-loaded from ThaqalaynWords via `WordsService.getSurface()`.
- **Revert `78dba5d`** (WBW gate change from `hasWordAnalysis` → `hasWordByWord`) — irrelevant once the gate is simplified.
- **Revert `7cb7f6e`** (don't hide standard Arabic when WBW pref is on but verse lacks WBW data) — also irrelevant once `hasWordByWord` is always true for hadiths with Arabic.

### Implementation order (so prod isn't broken mid-flight)

1. **Service** — extend `AiPreferencesService` with new fields; wire `VerseTextComponent` to subscribe. Old per-verse footer buttons still work, now writing to the same global source.
2. **Side sheet + bottom-sheet responsive shell** — build and mount at app shell. Wire from existing `app-settings` `ai-settings-btn` first to validate end-to-end.
3. **Top app bar restructure** — convert inline `app-settings` strip into a fixed top app bar. Add `View` icon trigger.
4. **Sticky reading toolbar** — mount at app shell, route-scoped to `/books/*` and verse-detail. At this point three paths exist (toolbar / sheet / per-verse footer) — all consistent.
5. **Remove redundant surfaces** — drop per-verse footer toggle row and verse-detail top toggle row.
6. **Simplify `hasWordByWord` gate** + revert today's `78dba5d` and `7cb7f6e`.
7. **Tests + RTL pass** — Karma specs for new components/service; E2E specs in Arabic and Urdu directions; focus-trap / ESC / focus-restoration on close; tab order in toolbar; sticky-toolbar / backdrop z-index.

### Acceptance criteria

- On chapter pages, all 3 view toggles are visible without expanding any collapsible section.
- Toggle state persists across page reloads (localStorage).
- Toggle state propagates instantly to every visible verse on chapter pages.
- WBW button shows for every hadith with Arabic text, regardless of `word_analysis` / chunk presence.
- On `< 600px` viewport, "More" opens a bottom sheet; on `≥ 600px`, opens a side sheet from the trailing edge.
- Under RTL (Arabic/Urdu UI), the side sheet opens from the leading edge of content (logical-property correctness).
- Focus trap + ESC + focus-restoration verified in Karma and Playwright.
- Per-verse footer toggle row is gone.
- Verse-detail top toggle row is gone.

## Decisions resolved

### DR1: Sticky reading toolbar behaviour on scroll (2026-05-16)

**Decision:** Option B — hide-on-scroll-down, show-on-scroll-up (Medium / iOS Safari pattern).

**Rationale:** Reclaims the ~40px of vertical reading area while the user is committed to reading forward. Bringing the toolbar back is a small upward flick — cheap. The alternative (always-pinned) costs that 40px every verse on mobile where it matters most.

**Implementation note:** Track `lastScrollY` on the scroll container; translate the toolbar by its own height when `currentY > lastScrollY + threshold`, reset transform on upward scroll. Add a small dead-zone (~8–12px) so micro-scroll doesn't flicker. Disable the hide behaviour for the first ~60px from top of page so the toolbar is always visible at chapter start.

### DR2: Top app bar structure (2026-05-16)

**Decision:** Restructure the existing inline `app-settings` strip into a proper fixed top app bar (not page-scrolling content).

**Rationale:** A scrolling settings strip means the View icon disappears as the user scrolls into the chapter — defeats the whole "always-accessible" goal. Fixed app bar matches Kindle / Apple Books / YouVersion convention.

**Implementation note:** This is a small restructure of `app-settings` placement + CSS — the bar already exists, it just needs to be moved out of the `chapter-content` template into the app shell and given `position: sticky; top: 0`.

### DR3: Desktop side sheet default state at ≥1240px (2026-05-16)

**Decision:** Closed by default; user opens via toolbar "More" or top-bar `View` icon when needed.

**Rationale:** Open-by-default costs ~320px of content width on every desktop visit even when the user isn't configuring anything. Quran.com uses this pattern; Sefaria uses open-by-default and that's a different (resource-panel) use case. Saving `sidesheetOpenOnDesktop` to localStorage means power users who *do* keep it open get that remembered across visits.

## Open follow-ups (out of scope for this initiative)

- Nav arrows (`navigate_before / keyboard_arrow_up / navigate_next` currently in `app-settings`): move into the new app bar as-is, or relocate elsewhere? Decide during step 3.
- Future settings additions (font size, theme, line-height) — the side sheet content template is designed to absorb these without restructuring.

## Sources

- [Quran.com — Simplifying Word by Word and Audio Settings](https://quran.com/en/product-updates/simplifying-word-by-word-and-audio-settings)
- [Material Design 3 — Side sheets guidelines](https://m3.material.io/components/side-sheets/guidelines)
- [Material Design 3 — Bottom sheets guidelines](https://m3.material.io/components/bottom-sheets/guidelines)
- [9to5google — M3 Expressive drops navigation drawers](https://9to5google.com/2025/05/14/material-3-expressive-navigation/)
- [NN/g — Hamburger Menus and Hidden Navigation Hurt UX Metrics](https://www.nngroup.com/articles/hamburger-menus/)
- [NN/g — What Makes Navigation Discoverable on Desktops](https://www.nngroup.com/articles/find-navigation-desktop-not-hamburger/)
- [UX Planet — FAB in UX Design](https://uxplanet.org/floating-action-button-in-ux-design-7dd06e49144e)
- [YouVersion — Android reader settings](https://help.youversion.com/l/en/article/mya0fknmzo-bible-settings-android)
- [Kindle Cloud Reader — customization](https://www.amazon.com/gp/help/customer/display.html?nodeId=TT200NNkr2BE4Jnsy9)
- [Apple Books — Change a book's appearance (Mac)](https://support.apple.com/guide/books/change-a-books-appearance-ibks8923126d/mac)
- [Logto — RTL language support](https://blog.logto.io/rtl-language-support)
- [Angular Material — Sidenav API](https://material.angular.dev/components/sidenav/api)
