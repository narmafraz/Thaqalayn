# Reading Controls Redesign

**Status:** ACTIVE — plan agreed, one open question pending, implementation not yet started.
**Created:** 2026-05-16
**Owner:** narmafraz

Unifies AI view toggles + reading preferences into a single, discoverable, responsive surface across chapter-list and verse-detail pages.

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
