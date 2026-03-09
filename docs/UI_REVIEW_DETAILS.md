# UI Review Implementation Details

Companion to `UI_IMPROVEMENT_ROADMAP.md` with specific implementation guidance from the 4 UX reviews (2026-03-09).

---

## Tooltip Audit — Full Icon Inventory (UX-06)

54 interactive icons audited. 14 have tooltips, 14 have text labels (OK), **26 need tooltips added**.

### Icons That NEED Tooltips (no tooltip, no text label)

| # | Component | Icon | Purpose | Suggested Tooltip Text |
|---|-----------|------|---------|----------------------|
| 1 | Header (`app.component.html`) | `A-` text button | Decrease font | "Decrease font size" |
| 2 | Header | `A` text button | Reset font | "Reset font size" |
| 3 | Header | `A+` text button | Increase font | "Increase font size" |
| 4 | Header | `dark_mode`/`light_mode` | Toggle theme | "Toggle dark mode" |
| 5 | Header | `keyboard` | Shortcuts | "Keyboard shortcuts" |
| 6 | Search bar (`search-bar.component.html`) | `close` | Clear search | "Clear search" |
| 7 | Search bar | `help_outline` | Search tips | "Search tips" |
| 8 | Settings (`settings.component.html`) | `close` | Close AI panel | "Close settings" |
| 9 | Verse footer (`chapter-content.component.html`) | `link` | Anchor link | "Copy link to verse" |
| 10 | Verse footer | `bookmark_border`/`bookmark` | Toggle bookmark | "Bookmark this verse" / "Remove bookmark" |
| 11 | Verse footer | `note_add`/`edit_note` | Toggle note | "Add note" / "Edit note" |
| 12 | Verse footer | `image`/`hourglass_empty` | Share as image | "Share as image" |
| 13 | Verse footer | `play_circle`/`pause_circle` | Audio (Quran only) | "Play audio" / "Pause audio" |
| 14 | Verse footer | `auto_stories`/`menu_book` | Commentary (Quran) | "Show commentary" / "Hide commentary" |
| 15 | Verse relations | `expand_more`/`expand_less` | Preview related | "Preview related hadith" / "Hide preview" |
| 16 | Verse detail (`verse-detail.component.html`) | `arrow_upward` | Back to chapter | "Back to chapter" |
| 17 | Verse detail | `visibility` | Load comparison | "Preview this hadith" |
| 18 | Verse detail | `close` | Close comparison | "Close comparison" |
| 19 | Bookmarks (`bookmarks.component.html`) | `close` | Clear progress | "Clear reading progress" |
| 20 | Bookmarks | `delete_outline` | Remove bookmark | "Remove bookmark" |
| 21 | Bookmarks | `delete_outline` | Delete note | "Delete note" |
| 22 | Book tree (`book-tree.component.html`) | `expand_more`/`chevron_right` | Expand/collapse | "Expand [name]" / "Collapse [name]" |
| 23 | Book tree | `close` | Clear tree search | "Clear search" |
| 24 | Narrator list (`people-list.component.html`) | `close` | Clear filter | "Clear filter" |

Note: Items 1-5 and 9-14 all have `aria-label` attributes (good for screen readers) but no visual `matTooltip`. The fix is adding `[matTooltip]` directives alongside the existing `aria-label`.

### Icons That Already Have Tooltips (OK)

| # | Component | Icon | Tooltip Text |
|---|-----------|------|-------------|
| 1 | Settings | `auto_awesome`/`tune` | "AI feature settings" |
| 2 | Settings | `navigate_before` | Dynamic: prev page title |
| 3 | Settings | `keyboard_arrow_up` | Dynamic: parent page title |
| 4 | Settings | `navigate_next` | Dynamic: next page title |
| 5 | Verse text (`verse-text.component.html`) | `spellcheck`/`text_format` | "Toggle diacritics (tashkeel)" |
| 6 | Verse text | `grid_view`/`view_stream` | "Word-by-word analysis" |
| 7 | Verse text | `view_agenda`/`view_headline` | "Paragraph view" |
| 8 | Verse footer | `open_in_new` | "View hadith details" |
| 9 | Verse footer | Grading chips | Dynamic: full grading string |
| 10 | Translation selection | `compare_arrows` | "Compare translations" (translated) |
| 11 | Verse detail | `verified` | "Scholar verified" |
| 12 | Verse detail | `flag` | "Flag" (translated) |
| 13 | Verse detail | `delete_outline` | "Delete" (translated) |

---

## Leaked i18n Keys — Full List (FIX-06)

These raw i18n keys appear as visible text in non-English UI languages:

| Key | Where It Appears | Expected Translation |
|-----|-----------------|---------------------|
| `annotation.add` | Verse footer | "Add annotation" |
| `translation.compare` | Translation toolbar | "Compare translations" |
| `search.tipsTitle` | Search help | "Search tips" |
| `settings.decreaseFont` | Header | "Decrease font" |
| `settings.resetFont` | Header | "Reset font" |
| `settings.increaseFont` | Header | "Increase font" |
| `settings.toggleDarkMode` | Header | "Toggle dark mode" |
| `settings.showKeyboardShortcuts` | Header | "Keyboard shortcuts" |
| `bookmark.add` | Verse footer | "Add bookmark" |
| `pwa.installPrompt` | Install banner | "Install app" |
| `pwa.install` | Install button | "Install" |
| `nav.topics` | Bottom nav / footer | "Topics" |
| `nav.bookmarks` | Bottom nav / footer | "Bookmarks" |

Additionally, these hardcoded English strings need i18n treatment:

| String | Where It Appears |
|--------|-----------------|
| "Summary" | Verse accordion header |
| "Key Terms" | Verse accordion header |
| "Mentioned In:" | Verse cross-references |
| "Creedal", "Theology", "Worship", "Dua" | Topic tags on verses |
| "thematic" | Relation type label |
| "Preview" | Related hadith preview |
| "Share as image" | Verse action |
| "Play audio" | Verse action |
| "Show commentary" | Verse action |
| "Show diacritized text" | Verse action |
| "Show word-by-word analysis" | Verse action |
| "Link to verse N" | Verse anchor |
| "View Verse N details" | Verse detail link |

---

## Narrator Page Design Specifications (NAR-01 through NAR-06)

### Narrator List Page Redesign

**1. Featured Imams Section** (above main table):
```
Horizontal scrollable card row:
- display: flex; gap: 12px; overflow-x: auto; padding: 16px 0; scroll-snap-type: x mandatory
- Card: min-width: 160px; padding: 16px; border-radius: 12px; border: 2px solid #d4af37 (gold)
- Each card: Arabic name, English name, narration count
- Identify Imams by "(عليه السلام)" suffix in Arabic name
```

**2. Enhanced Table:**
```
Desktop columns: #, Name (Arabic + English on two lines), Narrations (colored pill), Role badge
- Name cell: display: flex; flex-direction: column; gap: 2px
- Arabic: font-family: 'Amiri'; font-size: 1.1rem; color: var(--text-primary)
- English: font-size: 0.85rem; color: var(--text-muted); font-style: italic
- Narration pill: display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 0.85rem; font-weight: 600
  - High (1000+): background: #e8f5e9 (green tint)
  - Medium (100-999): background: #fff3e0 (amber tint)
  - Low (<100): background: #f5f5f5 (gray tint)
- Role badges: "Imam" (gold bg), "Companion" (blue bg), "Scholar" (green bg)
- Default sort: narration count descending
- Column headers shortened: "Narrations", "From", "To", "Co-narrators"

Mobile card layout (replace table):
+----------------------------------+
| أَحْمَدَ بْنِ مُحَمَّدٍ          |
| Ahmad ibn Muhammad                |
| [3,116 narrations]  [293 chains]  |
+----------------------------------+
- display: flex; justify-content: space-between; align-items: center
- padding: 12px 16px; border-bottom: 1px solid var(--border-color)
```

### Narrator Profile Page Redesign

**1. Profile Header (Hero):**
```
+--------------------------------------------------+
|  [Geometric monogram based on first Arabic letter] |
|  أَبِي عَبْدِ اللَّهِ ( عليه السلام )             |
|  Imam Ja'far al-Sadiq (AS)                        |
|                                                    |
|  [5,511 narrations] [888 from] [35 to] [923 co]  |
|                                                    |
|  Era: 8th century CE | Reliability: Imam           |
+--------------------------------------------------+

CSS:
- padding: 32px 24px
- background: linear-gradient(180deg, var(--header-bg) 0%, transparent 100%)
- border-radius: 0 0 16px 16px
- text-align: center
- Arabic name: 2.5rem Amiri
- English name: 1.3rem, muted color
- Stats pills: display: inline-flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 16px
- Individual stat: padding: 6px 16px; border-radius: 20px; background: rgba(125, 170, 156, 0.15); font-size: 0.9rem; font-weight: 500
- Imam gold accent: border: 2px solid #d4af37 or subtle gold gradient
```

**2. Biography Card:**
```
- Two-column grid on desktop: key facts left, summary right
- Key facts: Era, Reliability (colored badge), Birth, Death, Location
- Teachers/Students as clickable links
- If no biography: "Biography data is being compiled for this narrator"
```

**3. Narrated Hadiths Section:**
```
- Summary bar: "5,511 hadiths across 15 books"
- Book distribution: CSS flex bar with proportional widths, 8px height, border-radius: 4px
- Filter by book (dropdown or chips)
- Hadith preview card (instead of bare links):
  +------------------------------------------+
  | Al-Kafi, Book 1, Chapter 2, Hadith 3     |
  | "When Allah created intellect..." (preview)|
  | [Theology] [Intellect]                    |
  +------------------------------------------+
  - padding: 12px 16px; border-left: 3px solid var(--accent); margin-bottom: 8px; border-radius: 0 8px 8px 0
- LAZY LOAD: 50 at a time, fetch more on scroll (NOT all at once)
```

**4. Transmission Network Section** (replaces "Co-Narrators"):
```
Default (summary view):
- "Narrated FROM" (teachers): unique narrators sorted by frequency
  e.g., "مُحَمَّدِ بْنِ مُسْلِمٍ (698 hadiths)" — clickable
- "Narrated TO" (students): same format

Expandable (chain detail):
- Current full-chain display, paginated to 10 per page
- Hidden behind "Show all chains" toggle
```

**5. Section Separators:**
```
- border-top: 1px solid var(--border-color); padding-top: 24px; margin-top: 24px
```

---

## Design System Notes (Phase 4)

### Spacing Scale (DS-01)
Use 8px base: `4, 8, 12, 16, 24, 32, 48, 64`
- Verse card inner padding: 24px
- Arabic/English text gap: 16px (currently ~8px)
- Section margins: 24px
- Card gaps: 16px

### Typography Scale (DS-02)
```
--font-heading:    2.0rem / 700  (page titles)
--font-subheading: 1.25rem / 600 (section headers)
--font-body:       1.0rem / 400  (content text)
--font-caption:    0.875rem / 400 (metadata labels, references)
--font-overline:   0.75rem / 500  (badges, tags)
```
Recommended English font: Inter (clean, excellent multilingual support, free)

### Verse Card Improvements
- Alternate backgrounds: `nth-child(even) { background: #faf7f2; }`
- Left accent border with verse number: `border-left: 3px solid var(--accent-color)`
- Verse number: `position: absolute; left: -20px; top: 16px; font-weight: 700; color: var(--accent)`

---

## Design Inspiration References

1. **Sunnah.com** — Gold standard hadith web app. Clean cards, bilingual layout, grading badges, English narrator names.
2. **Quran.com** — Modern Quran reader. Excellent typography, audio integration, word-by-word. Good dark mode.
3. **al-islam.org** — Biographical pages for scholars. Chain visualizations, scholar profiles.
4. **Notion / Linear** — Dense information handled well. Collapsible sections, inline tags, clean tables, subtle hover states.
5. **Wikipedia** — Biographical infobox pattern (key facts sidebar + narrative sections) for narrator profiles.
