# User Stories — Thaqalayn Frontend

Status legend: **[DONE]** = implemented & working, **[PARTIAL]** = partially implemented, **[PLANNED]** = not yet implemented

---

## 1. Book & Chapter Navigation

| ID | Story | Status |
|----|-------|--------|
| NAV-01 | As a user, I can browse the list of all available books on the homepage | [DONE] |
| NAV-02 | As a user, I can drill down through a book's hierarchy (volumes → sections → chapters → verses) | [DONE] |
| NAV-03 | As a user, I can see a breadcrumb trail showing my current position and click any level to jump back | [DONE] |
| NAV-04 | As a user, I can navigate to the next/previous chapter using prev/next buttons | [DONE] |
| NAV-05 | As a user, I can navigate up to the parent level | [DONE] |
| NAV-06 | As a user, I can deep-link directly to any book, chapter, or verse via URL | [DONE] |
| NAV-07 | As a user, I can use keyboard shortcuts (j/k/u) to navigate between chapters | [DONE] |
| NAV-08 | As a user, legacy hash-based URLs (`/#/...`) redirect to clean paths | [DONE] |

## 2. Verse & Hadith Content Display

| ID | Story | Status |
|----|-------|--------|
| VRS-01 | As a user, I can view verses/hadiths displayed as cards with Arabic text and translation side-by-side | [DONE] |
| VRS-02 | As a user, I can select which translation to display from a dropdown | [DONE] |
| VRS-03 | As a user, my selected translation persists as I navigate between chapters | [DONE] |
| VRS-04 | As a user, I can see verse/hadith index numbers and in-book reference numbers | [DONE] |
| VRS-05 | As a user, I can see relations ("Mentions" / "Mentioned In") with clickable links to related content | [DONE] |
| VRS-06 | As a user, I can click narrator names in hadith chains to navigate to their profiles | [DONE] |
| VRS-07 | As a user, I can view an individual verse/hadith on its own detail page | [DONE] |
| VRS-08 | As a user, I can see hadith grading badges (Sahih, Hasan, Daif, etc.) with color coding | [DONE] |
| VRS-09 | As a user, I can see cross-validation badges showing verification status and source count | [DONE] |
| VRS-10 | As a user, I can see content-type badges (creedal, ethical, narrative, etc.) on hadiths | [DONE] |
| VRS-11 | As a user, I can see a "View in chapter context" link from individual hadith pages | [DONE] |
| VRS-12 | As a user, I can see source links that open original sources in a new tab | [DONE] |
| VRS-13 | As a user, I can see sajda (prostration) markers on Quran verses | [DONE] |

## 3. Chapter Lists & Tables

| ID | Story | Status |
|----|-------|--------|
| TBL-01 | As a user, I can see chapter lists in a table with index, Arabic title, English title, and count columns | [DONE] |
| TBL-02 | As a user, I can sort chapter tables by column headers | [DONE] |
| TBL-03 | As a user, I can paginate through long chapter lists | [DONE] |
| TBL-04 | As a user, on mobile I see a simplified table with fewer columns | [DONE] |

## 4. Language & Translation

| ID | Story | Status |
|----|-------|--------|
| LNG-01 | As a user, I can select my UI language from 12 supported languages in the header | [DONE] |
| LNG-02 | As a user, my language selection persists via URL query parameter across navigation | [PARTIAL] |
| LNG-03 | As a user, the layout switches to RTL for Arabic, Persian, and Urdu | [DONE] |
| LNG-04 | As a user, all UI strings (buttons, headers, footer) translate to my selected language | [PARTIAL] |
| LNG-05 | As a user, Arabic source text is always displayed alongside translations regardless of UI language | [DONE] |
| LNG-06 | As a user, I can choose from AI-generated translations in 11 languages per hadith | [DONE] |
| LNG-07 | As a user, AI translations are clearly attributed with source model info | [DONE] |
| LNG-08 | As a user, if my selected translation is unavailable in a new chapter, the app falls back intelligently | [DONE] |

## 5. Narrator & People

| ID | Story | Status |
|----|-------|--------|
| PPL-01 | As a user, I can browse the full list of narrators in a paginated, sortable table | [DONE] |
| PPL-02 | As a user, I can filter narrators by name (Arabic or English) using a text input | [DONE] |
| PPL-03 | As a user, I can view an individual narrator's profile with biography, reliability, dates, teachers, students | [DONE] |
| PPL-04 | As a user, I can see all hadiths narrated by a specific narrator (virtual-scrolled) | [DONE] |
| PPL-05 | As a user, I can see co-narrators and click to navigate to their profiles | [DONE] |
| PPL-06 | As a user, narrator names in hadith chains are clickable links | [DONE] |
| PPL-07 | As a user, I can see narrator English transliteration prominently on list and profile pages | [PLANNED] |
| PPL-08 | As a user, I can see a stats summary (total narrations, book distribution, reliability) on narrator profiles | [PLANNED] |
| PPL-09 | As a user, I can see featured/prominent narrators (Imams, major companions) visually distinguished | [PLANNED] |
| PPL-10 | As a user, I can see hadith preview cards (not just bare path links) in narrator profiles | [PLANNED] |
| PPL-11 | As a user, I can sort narrators by narration count, reliability, or alphabetically | [PLANNED] |
| PPL-12 | As a user, I can hover over narrator names in hadith chains to see a summary card | [PLANNED] |
| PPL-13 | As a researcher, I can compare two narrators side-by-side | [PLANNED] |
| PPL-14 | As a user, I can see teacher/student lists on each narrator's profile | [PLANNED] |
| PPL-15 | As a researcher, I can see reliability ratings from multiple rijal scholars on narrator profiles | [PLANNED] |
| PPL-16 | As a researcher, I can see a visual chain diagram for hadith isnad with color-coded reliability | [PLANNED] |
| PPL-17 | As a user, I can browse narrators by category (Imams, Companions, scholars by era) | [PLANNED] |
| PPL-18 | As a researcher, I can use advanced search to filter narrators by reliability, count, era, teacher | [PLANNED] |
| PPL-19 | As a researcher, I can see an interactive network graph of narrator relationships | [PLANNED] |
| PPL-20 | As a user, I can see which Imams a narrator was contemporary with | [PLANNED] |

## 6. Search & Discovery

| ID | Story | Status |
|----|-------|--------|
| SRC-01 | As a user, I can type in a search bar with live results appearing as I type (debounced) | [DONE] |
| SRC-02 | As a user, I can switch between Titles, Full-Text, and Narrators search modes | [DONE] |
| SRC-03 | As a user, I can see a full search results page with results grouped by type | [DONE] |
| SRC-04 | As a user, I can click search results to navigate directly to that content | [DONE] |
| SRC-05 | As a user, I can browse AI-generated topics in a two-level taxonomy (categories → subtopics) | [DONE] |
| SRC-06 | As a user, I can click a topic to see all hadiths tagged with it | [DONE] |
| SRC-07 | As a user, I can browse AI-extracted key phrases and see hadiths containing each phrase | [DONE] |
| SRC-08 | As a user, key phrases are highlighted in hadith text and are clickable | [DONE] |
| SRC-09 | As a user, I can filter search by topic using `topic:{id}` query syntax | [DONE] |

## 7. Settings & Preferences

| ID | Story | Status |
|----|-------|--------|
| SET-01 | As a user, I can toggle dark/light mode via a button in the header | [DONE] |
| SET-02 | As a user, my theme preference persists across sessions (localStorage) | [DONE] |
| SET-03 | As a user, I can increase/decrease font size with A-/A/A+ buttons | [DONE] |
| SET-04 | As a user, my font size preference persists across sessions | [DONE] |
| SET-05 | As a user, I can view a keyboard shortcuts help overlay (press `?`) | [DONE] |
| SET-06 | As a user, I can configure AI content display settings | [DONE] |
| SET-07 | As a user, I can set my preferred word-by-word translation language | [DONE] |

## 8. Bookmarks, Notes & Reading Progress

| ID | Story | Status |
|----|-------|--------|
| BMK-01 | As a user, I can bookmark a verse/hadith with one click | [DONE] |
| BMK-02 | As a user, I can see all my bookmarks on a dedicated page with titles, paths, and dates | [DONE] |
| BMK-03 | As a user, I can delete bookmarks | [DONE] |
| BMK-04 | As a user, I can export bookmarks as JSON and import them back | [DONE] |
| BMK-05 | As a user, my reading progress is auto-saved per book (last chapter visited) | [DONE] |
| BMK-06 | As a user, I can see my reading progress on the bookmarks page | [DONE] |
| BMK-07 | As a user, I can clear reading progress for a book | [DONE] |
| BMK-08 | As a user, I can add personal notes/annotations to verses | [PARTIAL] |
| BMK-09 | As a user, I can sync bookmarks/notes across devices via Firebase (Google or anonymous sign-in) | [PARTIAL] |

## 9. Sharing & Embedding

| ID | Story | Status |
|----|-------|--------|
| SHR-01 | As a user, I can share a verse/hadith via the Web Share API | [DONE] |
| SHR-02 | As a user, on unsupported browsers, the share button copies the URL to clipboard | [DONE] |
| SHR-03 | As a user, every verse/hadith has a unique permanent URL for sharing | [DONE] |
| EMB-01 | As a developer, I can embed a verse card on an external site via `/embed/books/{path}` | [DONE] |
| EMB-02 | As a developer, I can control embed theme via `?theme=auto|light|dark` query param | [DONE] |

## 10. PWA & Offline

| ID | Story | Status |
|----|-------|--------|
| PWA-01 | As a user, I can install the app to my home screen (PWA install prompt) | [DONE] |
| PWA-02 | As a user, the app shell loads instantly from cache on repeat visits | [DONE] |
| PWA-03 | As a user, recently visited pages work offline from cached data | [DONE] |
| PWA-04 | As a user, fonts, icons, and images are cached for offline use | [DONE] |

## 11. Accessibility

| ID | Story | Status |
|----|-------|--------|
| A11-01 | As a screen reader user, I hear proper heading hierarchy and ARIA labels on nav buttons | [DONE] |
| A11-02 | As a screen reader user, Arabic text is properly tagged with `lang="ar"` | [DONE] |
| A11-03 | As a keyboard user, I can navigate the entire app via Tab/Arrow/Enter and custom shortcuts | [DONE] |
| A11-04 | As a user, all touch targets are at least 44x44px | [PARTIAL] |
| A11-05 | As a user, I can skip to main content via a hidden skip link | [DONE] |

## 12. SEO & Meta

| ID | Story | Status |
|----|-------|--------|
| SEO-01 | As a search engine, I see dynamic page titles matching the content | [DONE] |
| SEO-02 | As a search engine, I see Open Graph tags for social sharing previews | [DONE] |
| SEO-03 | As a search engine, I see JSON-LD structured data (WebSite, Book, CreativeWork, Person schemas) | [DONE] |
| SEO-04 | As a search engine, I see canonical URLs and proper meta descriptions | [DONE] |

## 13. Responsive Design

| ID | Story | Status |
|----|-------|--------|
| RSP-01 | As a mobile user, I see a bottom navigation bar with 4 main sections | [DONE] |
| RSP-02 | As a mobile user, tables show simplified columns that fit the screen | [DONE] |
| RSP-03 | As a mobile user, verse cards stack vertically instead of side-by-side | [DONE] |
| RSP-04 | As a user on any device, there is no horizontal scrolling | [PARTIAL] |

## 14. Error Handling

| ID | Story | Status |
|----|-------|--------|
| ERR-01 | As a user, I see loading spinners while data is being fetched | [PARTIAL] |
| ERR-02 | As a user, I see a meaningful error message if data fails to load | [DONE] |
| ERR-03 | As a user, page data is pre-fetched before rendering (no blank screens) | [PARTIAL] |

## 15. Planned / Not Yet Implemented

| ID | Story | Status |
|----|-------|--------|
| FUT-01 | As a user, I can listen to Quran recitation audio per ayah (EveryAyah API) | [PLANNED] |
| FUT-02 | As a user, I can read tafsir (scholarly commentary) alongside Quran verses | [PLANNED] |
| FUT-03 | As a user, I can see word-by-word analysis with POS tags for each Arabic word | [PARTIAL] |
| FUT-04 | As a user, I can see text diffs between cross-validated hadith sources | [PARTIAL] |

---

## Test Coverage Mapping

Each story ID can be mapped to E2E specs and unit tests for traceability:

| Area | E2E Spec Files | Unit Spec Files |
|------|---------------|-----------------|
| NAV-* | `navigation.spec.ts`, `book-navigation.spec.ts` | `breadcrumbs.component.spec.ts` |
| VRS-* | `verse-display.spec.ts`, `hadith-detail.spec.ts` | `verse-text.component.spec.ts`, `chapter-content.component.spec.ts` |
| TBL-* | `chapter-list.spec.ts` | `chapter-list.component.spec.ts` |
| LNG-* | `language.spec.ts` | `expanded-language.pipe.spec.ts` |
| PPL-* | `narrators.spec.ts` | `people-list.component.spec.ts`, `people-content.component.spec.ts` |
| SRC-* | `search.spec.ts` | `search-results.component.spec.ts` |
| SET-* | `settings.spec.ts` | `header.component.spec.ts` |
| BMK-* | `bookmarks.spec.ts` | `bookmarks.component.spec.ts` |
| SHR-* | `sharing.spec.ts` | — |
| EMB-* | `embed.spec.ts` | `embed-verse.component.spec.ts` |
| A11-* | `accessibility.spec.ts` | — |
| SEO-* | `seo.spec.ts` | `seo.service.spec.ts` |
| RSP-* | `responsive.spec.ts` | — |

> **Note:** Spec file names above are indicative — actual files may differ. Run `npx playwright test --list` and `npx ng test` to see current test inventory.
