# Architecture & Design Philosophy

This document describes the guiding principles behind the Thaqalayn project — the technical decisions, design values, and product vision that shape how the project is built and evolved.

---

## 1. Zero Ongoing Costs

The foundational constraint. The site must be able to stay online indefinitely without requiring funding, donations, server maintenance, or any recurring payment.

Both the data API (ThaqalaynData) and the web frontend (Thaqalayn) are hosted as static files on Netlify's free tier. There are no servers, no databases, no subscriptions. The content outlives the developer.

**Rules:**

- **No backend servers.** All logic runs in the browser or at build time.
- **No paid services.** Only genuinely free tiers — no credit card required, no trial expiration, no usage caps that a public site would realistically hit.
- **No fragile dependencies.** Prefer open-source libraries bundled into the app over hosted services. If a third-party service disappears, the core reading experience must still work.
- **Build-time over run-time.** Pre-compute as much as possible in ThaqalaynDataGenerator. Serve the results as static files. Move complexity to the build step, not the user's browser session.
- **Progressive enhancement.** The core reading experience works with just static JSON. Search, audio, bookmarks, and other features are additive layers that degrade gracefully if their dependencies become unavailable.

**The stack is deliberately simple:** a Python script generates JSON files, Netlify serves them, and an Angular app renders them. Adding complexity (new platforms, external APIs, serverless functions) is acceptable only when the benefit is clear and the fallback is graceful.

---

## 2. Mobile First, Responsive Design

The primary audience reads scripture on their phone — during commute, at the mosque, before sleep, at a study circle. The app must be designed for mobile first and then adapt upward to tablets and desktops.

**Principles:**

- **Design for the smallest screen first.** Every layout, every component, every interaction must work well on a 360px-wide phone screen. Tablet and desktop layouts are progressive enhancements, not the default.
- **Touch-friendly targets.** Buttons, links, and interactive elements must be large enough for comfortable thumb tapping (minimum 44x44px touch targets). Navigation controls, verse links, and narrator chain links are frequently tapped — they must not require precision.
- **Readable text at every size.** Arabic calligraphic text requires generous line height and font sizing to remain legible. English text must be comfortable to read in long sessions. Both must scale gracefully across screen sizes.
- **No horizontal scrolling.** Content must reflow naturally. On mobile, Arabic and English text stack vertically rather than sitting side by side. On wider screens, bilingual text can sit in parallel columns.
- **Bandwidth awareness.** Mobile users may be on slow or metered connections. Lazy-load data, compress assets, and defer non-essential resources. A user opening a single hadith chapter should not need to download megabytes of unrelated data.

**Current implementation:**

- Responsive breakpoints via Angular CDK `BreakpointObserver` (XSmall through XLarge)
- Chapter list tables dynamically adjust visible columns based on screen width — mobile shows a single combined column, desktop shows index, badges, names, and counts
- Flex layouts with `row-reverse` direction for natural RTL/LTR bilingual display
- The `.main` content area uses `min-width: 70%; max-width: 98%` with auto centering
- Viewport meta tag: `width=device-width, initial-scale=1`

**Aspirations:**

- Adopt a more systematic spacing and sizing scale (e.g., 4px/8px grid)
- Add more explicit mobile breakpoint styling for verse cards, narrator chains, and navigation controls
- Test and optimize for common mobile scenarios: one-handed use, landscape mode, split-screen

---

## 3. Future Mobile App

The long-term vision includes a native or near-native mobile app for iOS and Android. The decision of whether to repurpose the existing Angular codebase or build a new native codebase is still open.

**Options under consideration:**

| Approach | Pros | Cons |
|----------|------|------|
| **Capacitor/Ionic** (wrap existing Angular) | Reuse existing code, shared codebase, fastest path | Performance ceiling, not truly native feel, platform quirks |
| **React Native / Expo** | Large ecosystem, good performance, single codebase for iOS + Android | Full rewrite, different paradigm from Angular |
| **Flutter** | Excellent performance, beautiful UI toolkit, single codebase | Full rewrite, Dart ecosystem, less web integration |
| **Native (Swift + Kotlin)** | Best performance and platform integration | Two separate codebases, highest development effort |
| **PWA (current path extended)** | No app store needed, zero distribution cost, already works | Limited native APIs, no push notifications (iOS), app store discoverability |

**Regardless of the path chosen, the data layer stays the same.** The ThaqalaynData JSON API is consumed identically whether the client is an Angular web app, a React Native app, or a native Swift app. This is a key advantage of the static JSON architecture — the data contract is client-agnostic.

**Current leaning:** Start by enhancing the PWA experience (offline support, home screen install, app-like navigation). This gives mobile users an app-like experience at zero cost. If a native app becomes necessary for features that PWAs cannot provide (push notifications, app store presence, background audio), evaluate Capacitor (wrapping the existing Angular code) as the lowest-effort path before considering a full rewrite.

---

## 4. Visual Design & Reader Experience

This is a scripture reading app. The visual design must serve the content — drawing the reader in, keeping them focused, and making them want to return.

**Principles:**

- **Reverence for the text.** The Quran and hadith are sacred texts. The design must reflect this with care, dignity, and beauty. Typography, spacing, and layout should honour the content rather than compete with it. Arabic calligraphic text in particular deserves generous space and a quality typeface.
- **Calm, warm aesthetic.** The colour palette (soft teals, warm whites, subtle transparency) evokes a sense of calm and contemplation. The app should feel like opening a beautifully bound book, not scrolling a social media feed. Avoid visual noise, aggressive colours, or distracting animations.
- **Content is king.** Minimize chrome. Navigation, settings, and UI controls should be present but unobtrusive. The reader's eye should go to the verse text first, not to buttons, dropouts, or toolbars.
- **Readable long sessions.** Many users will read for extended periods — entire surahs, multiple hadith chapters. Typography must be optimized for sustained reading: comfortable font sizes, generous line spacing, good contrast without being harsh (avoid pure black on pure white).
- **Bilingual harmony.** Arabic and English text must coexist gracefully. Neither language should feel like an afterthought. The current `row-reverse` flex pattern naturally places Arabic on the right and English on the left, respecting the reading direction of each language.
- **Visual hierarchy.** At a glance, the reader should be able to distinguish: chapter titles from verse text, narrator chains from hadith content, Arabic source from English translation, and metadata (reference numbers, cross-references) from primary content.

**Current implementation:**

- Typography: KFGQPC Uthman Taha Naskh for Arabic (a Quran-standard typeface), Akzidenz Grotesk for English
- Colour scheme: Teal/cyan accents (`#5F9999`, `#75A1A1`, `#84B8B8`) on semi-transparent white cards over a subtle patterned background
- Verse cards: `mat-card` with rounded corners, slight elevation, and transparent background — content feels like it floats on the page
- Zebra-striped table rows with transparency for chapter lists
- Header and footer use a repeating banner pattern (`banner_small.png`) for visual continuity

**Aspirations:**

- Explore richer Islamic geometric or arabesque patterns as subtle decorative elements (borders, dividers, background textures) — drawing from the visual tradition of Islamic manuscript illumination without overwhelming the content
- Improve dark mode support for night reading
- Add subtle micro-animations (page transitions, verse highlight on navigation) that feel natural rather than flashy
- Refine the colour palette with more intentional use of warm golds and deep teals inspired by traditional Islamic art and calligraphy

---

## 5. Intuitive Navigation

Scripture texts are deeply hierarchical (Book > Volume > Section > Chapter > Verse) and densely cross-referenced. Navigation must make this structure feel natural, not overwhelming.

**Principles:**

- **Always know where you are.** Breadcrumbs show the full path from the root to the current location. The reader should never feel lost in the hierarchy.
- **Always know where you can go.** Previous/next chapter navigation is always visible. The "up" button returns to the parent level. Cross-references to related verses are inline and tappable.
- **Preserve context across navigation.** Language and translation preferences persist via URL query parameters (`?lang=en&translation=en.qarai`). Navigating between chapters or books does not reset the reader's preferences.
- **Deep linking works.** Every page has a unique URL. Users can bookmark, share, or return to any specific verse via its URL (e.g., `/#/books/quran:2:255`). Fragment anchors (`#h4`) link to specific hadith numbers within a chapter.
- **Minimize clicks to content.** From the homepage, a reader should reach any specific verse in 2-3 clicks. The hierarchical chapter list, combined with breadcrumb shortcuts, provides both drill-down and jump-back navigation.
- **Narrator chains are navigable.** In hadith text, narrator names are links. Tapping a narrator name goes to their profile page, which lists all hadiths they narrate and their co-narrators. This turns the chain of transmission into a navigable graph.

**Current implementation:**

- Breadcrumbs: horizontal scrollable bar showing `Home > Book > Volume > Section > Chapter`
- Prev/Next/Up: icon buttons with tooltips at top and bottom of chapter content
- Cross-references: `relations` field rendered as inline links (e.g., "Mentioned In: Al-kafi:2:3:13:20")
- Narrator chain links: each narrator name in a hadith is a router link to their profile
- Hash-based routing with query parameter preservation
- Route resolvers pre-fetch data before rendering to avoid blank screens

**Aspirations:**

- Add search as a primary navigation path (search for a verse instead of drilling down through hierarchy)
- Add a "recently viewed" or "continue reading" shortcut on the homepage
- Improve narrator graph visualization — show chain-of-transmission diagrams rather than just flat lists
- Add keyboard navigation shortcuts for power users (j/k for next/prev verse, n/p for next/prev chapter)

---

## 6. Content Integrity & Preservation

The primary purpose of this project is to make Islamic scripture accessible, accurate, and preserved in a durable format.

**Principles:**

- **Accuracy above all.** Source texts must be faithfully preserved. The generator includes a corrections layer (`kafi_corrections.py`) for known errors in the source HTML, keeping parser logic clean and corrections auditable.
- **UTF-8 everywhere.** Arabic text must never be escaped or corrupted. All JSON files use `ensure_ascii=False` to preserve the original Unicode characters. This is non-negotiable.
- **Stable identifiers.** Verse paths (`/books/al-kafi:1:2:3:4`), narrator IDs, and cross-reference links are permanent. Once assigned, they must not change — they may be bookmarked, shared, cited in other works, or referenced by other applications.
- **Multiple translations, faithfully attributed.** Each translation is identified by translator name and displayed with proper attribution. The centralized `translations.json` index ensures translator names are consistent across the entire app.
- **Open data.** The generated JSON files are a structured, machine-readable representation of these texts. They can be consumed by any application, not just this one. The data format is documented in `ThaqalaynData/CLAUDE.md`.

---

## 7. Multilingual & RTL Support

The app serves Arabic and English as primary languages, with Persian translations for the Quran. The design must natively support right-to-left text.

**Principles:**

- **RTL is not an afterthought.** Arabic text uses `direction: rtl` and `text-align: justify`. Layout containers use `flex-direction: row-reverse` so that the natural document flow places Arabic on the right and English on the left.
- **Language-aware typography.** Arabic and English use different typefaces, sizing, and line heights optimized for each script's legibility requirements.
- **Language selection persists.** The `?lang=` query parameter carries the user's language preference across all navigation. Switching language does not lose your place.
- **Translation selection is per-book.** Different books have different available translations. The dropdown adapts to show only what is available for the current content.

---

## 8. Accessibility

The content should be accessible to all users, including those using screen readers, keyboard navigation, or other assistive technologies.

**Current implementation:**

- ARIA labels on navigation buttons ("Navigate to the previous chapter", "Navigate to the parent")
- ARIA labels on tables and paginators
- Semantic HTML: proper heading hierarchy, `<table>` with `<th>` headers, `<button>` for interactive controls, `<a>` for links
- Material components provide built-in keyboard navigation and focus management
- Sufficient colour contrast for text readability

**Aspirations:**

- Add `lang="ar"` attributes to Arabic text blocks for screen reader pronunciation
- Improve focus indicators for keyboard navigation
- Add skip-to-content links
- Test with screen readers (NVDA, VoiceOver) for the complete reading flow
- Ensure verse-by-verse audio playback (when added) is accessible via keyboard and screen reader controls

---

## 9. Performance

The app loads sacred texts that users may read for extended sessions. It must feel fast and responsive.

**Principles:**

- **Route-level data loading.** Route resolvers fetch only the JSON file for the current chapter. A user reading Surah Al-Fatiha does not download the entire Quran.
- **Lazy-load non-essential resources.** Search indexes, audio files, and additional translations should load only when requested.
- **Leverage CDN caching.** Netlify's CDN caches and serves static JSON files from edge locations worldwide. Subsequent visits to the same page are nearly instant.
- **Minimize bundle size.** Use Angular's tree-shaking and ahead-of-time compilation. Avoid importing large libraries unless their benefit justifies the cost.
- **Virtual scrolling for large lists.** Narrator pages with hundreds of hadiths use CDK virtual scroll to render only the visible items.

---

## 10. Simplicity & Maintainability

The project is maintained by a small team (potentially one person). The architecture must be simple enough to understand, debug, and evolve without extensive documentation or tribal knowledge.

**Principles:**

- **Three projects, clear boundaries.** Generator (Python) produces data. Data (JSON) is the API contract. Frontend (Angular) consumes and displays. Each project can be understood independently.
- **Convention over configuration.** Path formats (`/books/al-kafi:1:2:3:4`), file naming (JSON files mirror path structure), and data shapes are consistent and predictable.
- **CLAUDE.md files as living documentation.** Each project has a CLAUDE.md that describes its architecture, commands, and conventions. These files serve both human developers and AI coding assistants.
- **Corrections are separated from parsing.** The `kafi_corrections.py` file isolates manual fixes from parser logic. When source data is fixed upstream, corrections can be removed cleanly.
- **Avoid over-engineering.** No microservices, no message queues, no container orchestration. A Python script, some JSON files, and an Angular app. The simplest architecture that solves the problem.

---

## Summary of Key Decisions

| Decision | Rationale |
|----------|-----------|
| Static JSON files as API | Zero cost, infinite scalability via CDN, no server to maintain |
| Netlify free tier for hosting | No expiration, automatic HTTPS, global CDN, deploy on push |
| Angular with Material Design | Mature framework, good RTL support, accessible components |
| Python generator as build step | Complex parsing logic runs once, output is static |
| Hash-based routing | Works on static hosting without server-side URL rewriting |
| Centralized translation index | Translator metadata stored once, not duplicated in every chapter file |
| Breadcrumbs from index files | Reduces per-file JSON size, computed client-side from lightweight indexes |
| Mobile-first responsive layout | Primary audience reads on phones |
| KFGQPC Uthman Taha Naskh for Arabic | Quran-standard typeface, trusted and familiar to Arabic readers |
| Stable verse paths and narrator IDs | URLs are permanent — bookmarkable, shareable, citable |
