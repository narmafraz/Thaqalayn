# Hadith Card Anatomy

Visual diagrams of every UI element in the hadith/verse display, as currently implemented. Covers both the **chapter list view** (browsing a chapter) and the **verse detail view** (single hadith page), plus all four view modes within the shared `verse-text` component.

**Source files:**
- `src/app/components/chapter-content/chapter-content.component.{html,ts,scss}`
- `src/app/components/verse-detail/verse-detail.component.{html,ts,scss}`
- `src/app/components/verse-text/verse-text.component.{html,ts,scss}`
- `src/app/components/narrator-hover-card/narrator-hover-card.component.html`
- `src/app/models/book.ts` (Verse, Chapter, NarratorChain, SpecialText)
- `src/app/models/ai-content.ts` (AiContent, WordAnalysisEntry, Chunk, IsnadMatn)

---

## 1. Chapter-Level Page Structure

When browsing a chapter (e.g., `/#/books/al-kafi:1:2:3`), the page renders:

```
<app-settings>                       ← settings cog (top)
<app-book-titles>                    ← chapter title, description, author

┌─ chapter-toolbar (sticky, shown if >=10 verses OR has AI content) ──┐
│                                                                     │
│  Jump to: [Hadith 1 ▼] (total)        View: [plain][W×W][para][+]  │
│  (mat-select, shown if >=10 verses)    (toggle group, if AI content)│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

<app-book-titles> for any verse with part_type === 'Heading'

┌─ mat-card (per verse where part_type === 'Hadith' or 'Verse') ──────┐
│  (see Section 2 below)                                              │
└─────────────────────────────────────────────────────────────────────┘

┌─ mat-card (next verse) ─────────────────────────────────────────────┐
│  ...                                                                │
└─────────────────────────────────────────────────────────────────────┘

<app-settings>                       ← settings cog (bottom)
```

---

## 2. Hadith Card — Chapter List View

Each hadith in the chapter is rendered as a `<mat-card>`. This is the complete anatomy:

```
┌─ mat-card ──────────────────────────────────────────────────────────┐
│                                                                     │
│  ┌─ mat-card-title ─────────────────────────────────────────────┐   │
│  │  <a id="h{N}">  (invisible anchor for jump-to / deep link)  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ mat-card-content ───────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  ┌─ <app-verse-text> ─────────────────────────────────────┐  │   │
│  │  │  (see Section 4 for all four view modes)               │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  │                                                              │   │
│  │  ┌─ ai-badges-inline ─────────────────────────────────────┐  │   │
│  │  │  (only if verse.ai?.content_type or verse.ai?.tags)    │  │   │
│  │  │                                                        │  │   │
│  │  │  [Legal Ruling]  [fiqh]  [prayer]  [obligation]        │  │   │
│  │  │   content_type    tag     tag        tag                │  │   │
│  │  │  (each is a link to /search with query filter)         │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ mat-card-footer ────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  ┌─ refLink: primary action icons (always visible) ───────┐  │   │
│  │  │                                                        │  │   │
│  │  │  [open_in_new] [bookmark] [link] [note] [image]        │  │   │
│  │  │   view detail   toggle    copy   add/   share as       │  │   │
│  │  │   page          saved     link   edit   image          │  │   │
│  │  │                                                        │  │   │
│  │  │  [play_circle] [auto_stories]                          │  │   │
│  │  │   audio play    tafsir          (Quran only)           │  │   │
│  │  │                                                        │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  │                                                              │   │
│  │  ┌─ grading-inline (always visible if verse.gradings) ────┐  │   │
│  │  │                                                        │  │   │
│  │  │  [Sahih]  [Hasan]  [Daif]                              │  │   │
│  │  │   green    amber    red    (color-coded CSS class)     │  │   │
│  │  │  (tooltip shows full grading string with scholar)      │  │   │
│  │  │                                                        │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  │                                                              │   │
│  │  [expand_more / expand_less]  ← metadata toggle button       │   │
│  │                                                              │   │
│  │  ┌─ secondary-metadata (collapsed by default) ────────────┐  │   │
│  │  │                                                        │  │   │
│  │  │  Reference:     Al-Kafi 1234                           │  │   │
│  │  │  In-book ref:   Vol 1, Book 2, Ch 3, H 4              │  │   │
│  │  │                                                        │  │   │
│  │  │  ┌─ ai-quran-refs (if verse.ai?.related_quran) ─────┐ │  │   │
│  │  │  │  Quran refs: [2:255 explicit] [4:59 thematic]    │ │  │   │
│  │  │  │              (links to /books/quran:N#hM)         │ │  │   │
│  │  │  └──────────────────────────────────────────────────┘ │  │   │
│  │  │                                                        │  │   │
│  │  │  ┌─ related (if verse.relations) ────────────────────┐ │  │   │
│  │  │  │  Parallel Narrations:                             │ │  │   │
│  │  │  │    <path-link> al-kafi:1:3:5:2 [expand_more]     │ │  │   │
│  │  │  │    <path-link> tahdhib:3:1:4:7 [expand_more]     │ │  │   │
│  │  │  │  Variant Readings:                                │ │  │   │
│  │  │  │    <path-link> al-kafi:2:1:3:1 [expand_more]     │ │  │   │
│  │  │  └──────────────────────────────────────────────────┘ │  │   │
│  │  │                                                        │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ note-display (if user has note AND not editing) ────────────┐   │
│  │  [sticky_note_2]  "My personal note about this hadith..."    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ note-editor (if editing note) ──────────────────────────────┐   │
│  │  ┌──────────────────────────────────────────────────────┐    │   │
│  │  │  textarea (3 rows)                                   │    │   │
│  │  └──────────────────────────────────────────────────────┘    │   │
│  │  [Save]  [Cancel]  [Delete] (delete only if note exists)    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ compare-inline-panel (one per expanded relation link) ──────┐   │
│  │  [compare_arrows]  al-kafi:1:3:5:2  (link)          [close] │   │
│  │                                                              │   │
│  │  [mat-spinner]  (while loading)                              │   │
│  │  "Error message"  (if load failed)                           │   │
│  │                                                              │   │
│  │  حَدَّثَنَا أَحْمَدُ بْنُ مُحَمَّدٍ...                         │   │
│  │  "Ahmad ibn Muhammad narrated to us..."                      │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ tafsir-panel (Quran only, shown if toggled) ────────────────┐   │
│  │  [auto_stories]  Tafsir  [Edition selector ▼]                │   │
│  │                                                              │   │
│  │  [mat-spinner]  Loading commentary...  (while loading)       │   │
│  │                                                              │   │
│  │  "Ibn Kathir says regarding this verse that..."              │   │
│  │  (rendered as innerHTML)                                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Hadith Card — Verse Detail View

When navigating to a single hadith (e.g., `/#/books/al-kafi:1:2:3:4`), the verse-detail component renders a more comprehensive layout:

```
┌─ verse-detail-container ────────────────────────────────────────────┐
│                                                                     │
│  ┌─ verse-detail-header ────────────────────────────────────────┐   │
│  │  [arrow_upward] Chapter Title  (link back to chapter)        │   │
│  │  <app-translation-selection>   (language/translator picker)  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ mat-card (hadith-card) ─────────────────────────────────────┐   │
│  │                                                              │   │
│  │  ┌─ mat-card-header ──────────────────────────────────────┐  │   │
│  │  │  Hadith 4  (part_type + local_index)                   │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  │                                                              │   │
│  │  ┌─ mat-card-content ─────────────────────────────────────┐  │   │
│  │  │                                                        │  │   │
│  │  │  ┌─ <app-verse-text> ───────────────────────────────┐  │  │   │
│  │  │  │  (same component as chapter view — see Section 4)│  │  │   │
│  │  │  └──────────────────────────────────────────────────┘  │  │   │
│  │  │                                                        │  │   │
│  │  │  ┌─ gradings-section ────────────────────────────────┐ │  │   │
│  │  │  │  Grading                                          │ │  │   │
│  │  │  │  [Sahih (Al-Majlisi)]  [Hasan (Al-Behbudi)]      │ │  │   │
│  │  │  │  (badge shows term, tooltip shows full string,    │ │  │   │
│  │  │  │   scholar name shown in parentheses)              │ │  │   │
│  │  │  └──────────────────────────────────────────────────┘ │  │   │
│  │  │                                                        │  │   │
│  │  │  ┌─ relations-section ───────────────────────────────┐ │  │   │
│  │  │  │  Cross-references         [Compare All] / [Hide]  │ │  │   │
│  │  │  │                                                   │ │  │   │
│  │  │  │  Parallel Narrations:                             │ │  │   │
│  │  │  │    <path-link> [visibility]                       │ │  │   │
│  │  │  │    <path-link> [visibility]                       │ │  │   │
│  │  │  │  Variant Readings:                                │ │  │   │
│  │  │  │    <path-link> [visibility]                       │ │  │   │
│  │  │  │                                                   │ │  │   │
│  │  │  │  ┌─ compare-panels (if expanded) ──────────────┐  │ │  │   │
│  │  │  │  │  Chapter Title                              │  │ │  │   │
│  │  │  │  │  al-kafi:1:3:5:2                            │  │ │  │   │
│  │  │  │  │  Arabic text...                             │  │ │  │   │
│  │  │  │  │  Translation text...                        │  │ │  │   │
│  │  │  │  ├─────────────────────────────────────────────┤  │ │  │   │
│  │  │  │  │  (next compared verse...)                   │  │ │  │   │
│  │  │  │  └─────────────────────────────────────────────┘  │ │  │   │
│  │  │  └──────────────────────────────────────────────────┘ │  │   │
│  │  │                                                        │  │   │
│  │  │  ┌─ ai-metadata-section ─────────────────────────────┐ │  │   │
│  │  │  │  [Legal Ruling]  [fiqh]  [prayer]  [tawhid]       │ │  │   │
│  │  │  │   content_type    tags    tags      topics         │ │  │   │
│  │  │  └──────────────────────────────────────────────────┘ │  │   │
│  │  │                                                        │  │   │
│  │  │  ┌─ ai-quran-section ────────────────────────────────┐ │  │   │
│  │  │  │  Quran References                                 │ │  │   │
│  │  │  │  Surah 2, Ayah 255  [explicit]                    │ │  │   │
│  │  │  │  Surah 4, Ayah 59   [thematic]                    │ │  │   │
│  │  │  └──────────────────────────────────────────────────┘ │  │   │
│  │  │                                                        │  │   │
│  │  │  ┌─ ai-phrases-section ──────────────────────────────┐ │  │   │
│  │  │  │  Key Phrases                                      │ │  │   │
│  │  │  │  [التَّوْحِيد  Monotheism  theological_concept]    │ │  │   │
│  │  │  │  [بِسْمِ اللَّهِ  In the name of God  prophetic]   │ │  │   │
│  │  │  │  (each links to /phrases/{stripped})               │ │  │   │
│  │  │  └──────────────────────────────────────────────────┘ │  │   │
│  │  │                                                        │  │   │
│  │  │  ┌─ ai-similar-section ──────────────────────────────┐ │  │   │
│  │  │  │  Related Narrations                               │ │  │   │
│  │  │  │  [theme_label]  Description of similarity...      │ │  │   │
│  │  │  └──────────────────────────────────────────────────┘ │  │   │
│  │  │                                                        │  │   │
│  │  │  ┌─ validation-section ──────────────────────────────┐ │  │   │
│  │  │  │  [verified] Verified from 2 sources               │ │  │   │
│  │  │  │  <app-diff-viewer> (if diffs exist)               │ │  │   │
│  │  │  └──────────────────────────────────────────────────┘ │  │   │
│  │  │                                                        │  │   │
│  │  │  ┌─ source-section ──────────────────────────────────┐ │  │   │
│  │  │  │  [open_in_new] View Source  (external link)       │ │  │   │
│  │  │  └──────────────────────────────────────────────────┘ │  │   │
│  │  │                                                        │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  │                                                              │   │
│  │  ┌─ mat-card-actions ─────────────────────────────────────┐  │   │
│  │  │  [bookmark]  [note_add]  [share]  [image]  [menu_book] │  │   │
│  │  │  Bookmark    Add Note    Share    Share    View in      │  │   │
│  │  │                         Link     Image    Chapter      │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  │                                                              │   │
│  │  ┌─ note-display / note-editor ───────────────────────────┐  │   │
│  │  │  (same pattern as chapter view)                        │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  │                                                              │   │
│  │  ┌─ discussion-section (if enabled) ──────────────────────┐  │   │
│  │  │  [forum] Discussion  [expand_more]                     │  │   │
│  │  │                                                        │  │   │
│  │  │  ┌─ comment-list ───────────────────────────────────┐  │  │   │
│  │  │  │  [verified] Author Name         3/14/2026       │  │  │   │
│  │  │  │  "Comment text here..."         [flag] [delete]  │  │  │   │
│  │  │  │                                                  │  │  │   │
│  │  │  │  Author Name                    3/13/2026       │  │  │   │
│  │  │  │  "Another comment..."           [flag] [delete]  │  │  │   │
│  │  │  └──────────────────────────────────────────────────┘  │  │   │
│  │  │                                                        │  │   │
│  │  │  ┌─ comment-editor (if signed in) ──────────────────┐  │  │   │
│  │  │  │  textarea (2 rows)                               │  │  │   │
│  │  │  │  [send] Post                                     │  │  │   │
│  │  │  └──────────────────────────────────────────────────┘  │  │   │
│  │  │                                                        │  │   │
│  │  │  ┌─ sign-in prompt (if not signed in) ──────────────┐  │  │   │
│  │  │  │  Sign in to participate                          │  │  │   │
│  │  │  │  [account_circle] Sign in with Google            │  │  │   │
│  │  │  └──────────────────────────────────────────────────┘  │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ hadith-nav ─────────────────────────────────────────────────┐   │
│  │  [chevron_left] Previous              Next [chevron_right]   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Sections unique to verse-detail (not in chapter card)

| Section | Condition | Description |
|---------|-----------|-------------|
| Gradings with scholar names | `verse.gradings` or `book.data.gradings` | Shows full `term (scholar)` format |
| Compare All button | `verse.relations` exists | Loads all related verses at once |
| AI Topics | `verse.ai?.topics` | Topic badges (separate from tags) |
| AI Key Phrases | `verse.ai?.key_phrases` | Arabic + English + category |
| AI Similar Content | `verse.ai?.similar_content_hints` | Theme + description |
| Cross-validation | `book.data.cross_validation` | Verified/unverified badge + diff viewer |
| Source URL | `book.data.source_url` | External link to original source |
| Discussion panel | `discussionEnabled` | Comments, scholar badges, sign-in |
| Prev/Next navigation | `book.data.nav` | Bottom nav arrows |

---

## 4. Verse Text Component — Four View Modes

The `<app-verse-text>` component is shared between both views. It displays an AI toggle bar at the top (when AI features are available), then renders ONE of four mutually exclusive modes below it.

### Toggle Bar

```
┌─ ai-toggles (shown if any AI feature available) ───────────────────┐
│                                                                     │
│  [account_tree]  [spellcheck]  [grid_view]  [view_agenda]          │
│   chain diagram   diacritics    word-by-     paragraph    [badge]  │
│   (if narrator    (if AI        word         (if AI       status   │
│    chain exists)   diacritized   (if word     chunks               │
│                    text)          analysis)    exist)               │
│                                                                     │
│  Buttons highlight when active. Each toggles its view on/off.      │
│  Diacritics toggle is independent (overlays on standard view).     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Mode A: Standard View (default)

The default display when no special toggle is active.

```
┌─ Standard View ─────────────────────────────────────────────────────┐
│                                                                     │
│  ┌─ Arabic text area (lang="ar") ────────────────────────────────┐  │
│  │                                                               │  │
│  │  OPTION 1: Isnad/Matn separation                             │  │
│  │  (if showIsnadSeparation && hasIsnadMatn)                     │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  حَدَّثَنَا أَحْمَدُ بْنُ مُحَمَّدٍ عَنْ عَلِيِّ بْنِ...     │ │  │
│  │  │  (isnad text, styled as .isnad-text)                     │ │  │
│  │  ├──────────────────────────────────────────────────────────┤ │  │
│  │  │  ← isnad-divider →                                      │ │  │
│  │  ├──────────────────────────────────────────────────────────┤ │  │
│  │  │  قَالَ أَبُو عَبْدِ اللَّهِ إِنَّ اللَّهَ أَمَرَ...         │ │  │
│  │  │  (matn text, regular style)                              │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │                                                               │  │
│  │  OPTION 2: Standard with narrator chain                      │  │
│  │  (the normal path when isnad separation is off)              │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  narrator_chain.parts[] rendered inline (RTL):           │ │  │
│  │  │                                                          │ │  │
│  │  │  حَدَّثَنَا [أَحْمَدُ بْنُ مُحَمَّدٍ] عَنْ                 │ │  │
│  │  │  [عَلِيِّ بْنِ الحَكَمِ] عَنْ [أَبَانِ بْنِ عُثْمَانَ]      │ │  │
│  │  │                                                          │ │  │
│  │  │  [ ] = <a> link (kind='narrator'), hover triggers card   │ │  │
│  │  │  plain = <ng-container> text (kind='text')               │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │                                                               │  │
│  │  ┌─ narrator-hover-card (floating, on hover) ──────────────┐ │  │
│  │  │  أَحْمَدُ بْنُ مُحَمَّدٍ / Ahmad ibn Muhammad            │ │  │
│  │  │  87 narrations                     → view profile       │ │  │
│  │  └─────────────────────────────────────────────────────────┘ │  │
│  │                                                               │  │
│  │  Then the body text, with two sub-options:                   │  │
│  │                                                               │  │
│  │  IF diacritics toggle ON and AI diacritized text exists:     │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  AI diacritized text (single paragraph)                  │ │  │
│  │  │  optionally with <mark> highlights for key_phrases       │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │                                                               │  │
│  │  ELSE (original text):                                       │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  verse.text[] (one <p> per paragraph)                    │ │  │
│  │  │  optionally with <mark> highlights for key_phrases       │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │                                                               │  │
│  │  ﴿١﴾  (Quran verse number, only if isQuran && verseNumber)  │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ Translation display ─────────────────────────────────────────┐  │
│  │                                                               │  │
│  │  ┌─ translation-col (primary) ─────────────────────────────┐  │  │
│  │  │  verse.translations[selectedId] rendered as <p> per      │  │  │
│  │  │  paragraph, with innerHTML for formatting                │  │  │
│  │  │                                                          │  │  │
│  │  │  ┌─ translation-fallback (if translation missing) ────┐ │  │  │
│  │  │  │  Not available in this translation.                 │ │  │  │
│  │  │  │  Available in: English, Urdu, Farsi                 │ │  │  │
│  │  │  │  (each is a link that switches translation)         │ │  │  │
│  │  │  └─────────────────────────────────────────────────────┘ │  │  │
│  │  │                                                          │  │  │
│  │  │  ┌─ ai-translation-extra (if AI translation exists) ──┐ │  │  │
│  │  │  │                                                     │ │  │  │
│  │  │  │  Summary: This hadith discusses the obligation...   │ │  │  │
│  │  │  │                                                     │ │  │  │
│  │  │  │  Key terms:                                         │ │  │  │
│  │  │  │  [الصَّلَاة prayer] [التَّوْبَة repentance]          │ │  │  │
│  │  │  │  [الزَّكَاة alms]                                    │ │  │  │
│  │  │  │                                                     │ │  │  │
│  │  │  └─────────────────────────────────────────────────────┘ │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  │                                                               │  │
│  │  ┌─ translation-col-2 (if comparison translation active) ──┐  │  │
│  │  │  Second translator's text (side by side)                 │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Mode B: Chain Diagram View

Activated by the `account_tree` toggle. Shows narrators as a vertical flowchart.

```
┌─ Chain Diagram View ────────────────────────────────────────────────┐
│                                                                     │
│                 ┌─────────────────────────┐                         │
│                 │  أَحْمَدُ بْنُ مُحَمَّدٍ   │  ← narrator (linked)  │
│                 └────────────┬────────────┘                         │
│                              │                                      │
│                        [arrow_downward]                              │
│                              │                                      │
│                 ┌────────────┴────────────┐                         │
│                 │  عَلِيُّ بْنُ الحَكَمِ     │  ← narrator (linked)  │
│                 └────────────┬────────────┘                         │
│                              │                                      │
│                        [arrow_downward]                              │
│                              │                                      │
│                 ┌────────────┴────────────┐                         │
│                 │  أَبَانُ بْنُ عُثْمَانَ    │  ← narrator (linked)  │
│                 └────────────┬────────────┘                         │
│                              │                                      │
│                        [arrow_downward]                              │
│                              │                                      │
│                 ┌────────────┴────────────┐                         │
│                 │  أَبُو عَبْدِ اللَّهِ ع   │  ← plain (no path)   │
│                 └─────────────────────────┘                         │
│                                                                     │
│  Parts with part.path → <a routerLink> (clickable, navigates)      │
│  Parts without path  → <span> plain text                           │
│  Last part has no arrow below it                                    │
│                                                                     │
│  + Standard translation display below (same as Mode A)              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Mode C: Word-by-Word Analysis

Activated by the `grid_view` toggle. Replaces Arabic text with a grid of word cards.

```
┌─ Word-by-Word View ────────────────────────────────────────────────┐
│                                                                     │
│  Language: [English ▼]  (select from 11 languages)                  │
│                                                                     │
│  ┌─ word-cards (RTL flex grid) ──────────────────────────────────┐  │
│  │                                                               │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │  │
│  │  │   عَنْ    │ │  أَحْمَدَ  │ │   بْنِ   │ │  مُحَمَّدٍ │        │  │
│  │  │   from   │ │  Ahmad   │ │   son    │ │ Muhammad │        │  │
│  │  │   PREP   │ │   NOUN   │ │   NOUN   │ │   NOUN   │        │  │
│  │  │  (blue)  │ │  (green) │ │  (green) │ │  (green) │        │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │  │
│  │  │   قَالَ   │ │   إِنَّ   │ │  اللَّهَ  │                     │  │
│  │  │   said   │ │  indeed  │ │   God    │                     │  │
│  │  │   VERB   │ │   PART   │ │   NOUN   │                     │  │
│  │  │  (red)   │ │  (grey)  │ │  (green) │                     │  │
│  │  └──────────┘ └──────────┘ └──────────┘                     │  │
│  │                                                               │  │
│  │  Each card:                                                   │  │
│  │    .word-arabic    → Arabic word                              │  │
│  │    .word-translation → entry.translation[selectedLang]        │  │
│  │    .word-pos       → POS tag label, color-coded               │  │
│  │                                                               │  │
│  │  Cards are clickable (click/Enter/Space) → opens popup        │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ word-popup (floating, on card click) ────────────────────────┐  │
│  │                                                               │  │
│  │  عَنْ                          (word-popup-arabic)            │  │
│  │  [PREP]                        (POS badge, colored bg)        │  │
│  │  English: from                 (lang label + translation)     │  │
│  │                                                         [x]  │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  + Standard translation display below (same as Mode A)              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Mode D: Chunked / Paragraph View

Activated by the `view_agenda` toggle. Breaks the hadith into labeled structural segments.

```
┌─ Chunked View ──────────────────────────────────────────────────────┐
│                                                                     │
│  ┌─ chunk-block (chunk-type-isnad) ──────────────────────────────┐  │
│  │  [ISNAD]                          ← chunk label (grey bg)     │  │
│  │                                                               │  │
│  │  On desktop (>=769px), side-by-side grid:                     │  │
│  │  ┌─────────────────────────┬──────────────────────────────┐   │  │
│  │  │  Translation            │  Arabic (RTL)                │   │  │
│  │  │  Ahmad ibn Muhammad     │  حَدَّثَنَا أَحْمَدُ بْنُ مُحَمَّدٍ │   │  │
│  │  │  narrated from Ali...   │  عَنْ عَلِيٍّ...                │   │  │
│  │  └─────────────────────────┴──────────────────────────────┘   │  │
│  │                                                               │  │
│  │  On mobile (<769px), stacked:                                 │  │
│  │  Arabic text (RTL)                                            │  │
│  │  Translation text                                             │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ chunk-block (chunk-type-body) ───────────────────────────────┐  │
│  │  [BODY]                           ← chunk label (purple bg)   │  │
│  │                                                               │  │
│  │  ┌─────────────────────────┬──────────────────────────────┐   │  │
│  │  │  Abu Abdullah said:     │  قَالَ أَبُو عَبْدِ اللَّهِ      │   │  │
│  │  │  Indeed Allah            │  إِنَّ اللَّهَ أَمَرَ بِالصَّلَاةِ  │   │  │
│  │  │  commanded prayer...    │  ...                         │   │  │
│  │  └─────────────────────────┴──────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ chunk-block (chunk-type-quran_quote) ────────────────────────┐  │
│  │  [QURAN_QUOTE]                    ← chunk label (green bg)    │  │
│  │                                                               │  │
│  │  ┌─────────────────────────┬──────────────────────────────┐   │  │
│  │  │  And establish prayer   │  وَأَقِيمُوا الصَّلَاةَ          │   │  │
│  │  │  and give zakah...      │  وَآتُوا الزَّكَاةَ...           │   │  │
│  │  └─────────────────────────┴──────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ chunk-block (chunk-type-closing) ────────────────────────────┐  │
│  │  [CLOSING]                        ← chunk label (default)     │  │
│  │  ...                                                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  (Chunked view REPLACES the standard translation display.           │
│   Each chunk carries its own translation inline.)                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Chunk types and their visual styling

| chunk_type | Label color | Border accent | Purpose |
|------------|-------------|---------------|---------|
| `isnad` | Grey (#757575) | Grey-tinted bg | Chain of narration |
| `body` | Purple (var(--link-color)) | Purple-tinted bg | Main hadith content |
| `quran_quote` | Green (#2e7d32) | Green-tinted bg | Embedded Quran quotation |
| `opening` | Default | Default | Opening formula |
| `closing` | Default | Default | Closing remarks |

---

## 5. Data Dependencies Summary

| UI Element | Data Source | Condition |
|------------|------------|-----------|
| Narrator chain | `verse.narrator_chain.parts[]` | Always (if chain exists) |
| Arabic text | `verse.text[]` | Always |
| Diacritized text | `verse.ai.diacritized_text` | Toggle + AI data |
| Translation | `verse.translations[id]` | Always |
| AI summary | `verse.ai.summaries[lang]` or `verse.ai.translations[lang].summary` | AI data exists |
| AI key terms | `verse.ai.key_terms[lang]` or `verse.ai.translations[lang].key_terms` | AI data exists |
| Word analysis | `verse.ai.word_analysis[]` | AI data exists |
| Chunks | `verse.ai.chunks[]` | AI data exists |
| Content type | `verse.ai.content_type` | AI data exists |
| Tags | `verse.ai.tags[]` | AI data exists |
| Topics | `verse.ai.topics[]` | AI data (detail view only) |
| Key phrases | `verse.ai.key_phrases[]` | AI data (detail view only) |
| Similar content | `verse.ai.similar_content_hints[]` | AI data (detail view only) |
| Related Quran | `verse.ai.related_quran[]` | AI data exists |
| Gradings | `verse.gradings[]` | Data exists |
| Relations | `verse.relations{}` | Data exists |
| Notes | IndexedDB via Dexie | User-created |
| Bookmarks | IndexedDB via Dexie | User-created |
| Tafsir | External API (al-quran.cloud) | Quran only |
| Audio | External API (al-quran.cloud) | Quran only |
| Cross-validation | `book.data.cross_validation` | Detail view only |
| Discussion | Firebase | Detail view + enabled |
