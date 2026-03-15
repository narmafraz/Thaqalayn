# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Thaqalayn is an Angular 19 web application for hosting and displaying Islamic Hadith collections, specifically the Four Books (Al-Kutub Al-Arb'ah) and other primary Hadith sources. The application provides a hierarchical navigation system through books, chapters, and individual Hadiths (verses) with multi-language support and translations.

## Development Commands

### Running the Application
```bash
npm start                # Development server with legacy OpenSSL provider (required)
ng serve                 # Alternative (may fail without NODE_OPTIONS set)
```
Navigate to `http://localhost:4200/`. The dev server expects a local API at `http://localhost:8888/`.

### Building
```bash
ng build                 # Development build
ng build --configuration=production  # Production build
```

### Testing
```bash
# Unit tests (Karma/Jasmine) — 367 tests across 28 spec files
# On Windows without Chrome installed, set CHROME_BIN to Brave:
CHROME_BIN="/c/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe" npx ng test --watch=false --browsers=ChromeHeadless

# E2E tests (Playwright) — 187 tests across 16 spec files
# IMPORTANT: Must run from within the Thaqalayn directory, not from root
npx playwright test                    # Run all E2E tests (headless)
npx playwright test --headed           # Run with visible browser
npx playwright test --list             # List all tests without running
npx playwright test accessibility      # Run only accessibility tests
npx playwright test --reporter=html    # Generate HTML report
```

**Testing gotchas:**
- `ng test` requires a Chromium-based browser. If Chrome is not installed, set `CHROME_BIN` to Brave or Edge.
- Playwright tests target the **production** site (`https://thaqalayn.netlify.app/`) by default (see `playwright.config.ts`). To test locally, change `baseURL`.
- Running `npx playwright test` from the root `scripture/` directory fails with "two different versions of @playwright/test" error. Always `cd` into `Thaqalayn/` first.
- Playwright uses only Chromium by default (single project in config). Add Firefox/WebKit projects to `playwright.config.ts` for cross-browser testing.

### Linting
```bash
ng lint                  # Run ESLint (flat config, eslint.config.js)
```

### Code Generation
```bash
ng generate component component-name  # Generate new component
ng generate service service-name      # Generate new service
```

## Architecture

### State Management (NGXS)
The application uses NGXS for centralized state management. All state is defined in `src/store/`:

- **BooksState** (`src/store/books/`): Manages book parts, chapters, and verse data
- **PeopleState** (`src/store/people/`): Manages narrator/people information
- **RouterState** (`src/store/router/`): Custom router state with language and translation params
- **RouterParserState** (`src/store/router-parser/`): Parses route parameters
- **DashboardState** (`src/store/dashboard/`): Contains nested states:
  - `UserState`: User preferences and settings
  - `DictionaryState`: Translation and language dictionaries

State modules are configured in `src/store/store.config.ts` and imported via `NgxsStoreModule` in the main app module.

### Data Model
The core data structure is hierarchical:

```
Book (ChapterList | ChapterContent | VerseContent | VerseDetail)
  └─ Chapter
      ├─ titles (MultiLingualText)
      ├─ verse_refs[] (shell format — path refs to verse_detail files)
      │   ├─ local_index, part_type, path (Hadith/Verse)
      │   └─ local_index, part_type, inline (Heading only)
      ├─ verses[] (legacy format — full inline verses, absent in shell format)
      ├─ chapters[] (nested sub-chapters)
      ├─ nav (Navigation: prev, next, up)
      └─ verse_translations[]
```

Key interfaces are defined in `src/app/models/book.ts`. The `chapter-content` component detects shell format (`verse_refs` present) vs legacy (`verses` present) and lazy-loads verses via `VerseLoaderService`.

### Routing
Routes are defined in `src/app/routing/app-routing.module.ts` with hash-based routing (`useHash: true`). Route resolvers pre-fetch data before component activation:

- `BookTitlesResolver`: Loads book list
- `BookPartResolver`: Loads specific book part/chapter
- `NarratorListResolver`: Loads narrator index
- `NarratorResolver`: Loads individual narrator data

### Services
Services in `src/app/services/` handle API communication:

- **BooksService**: Fetches book data from API (converts path `index` like "1:2:3" to URL "books/1/2/3.json")
- **VerseLoaderService**: Lazy-loads individual verse_detail files with in-memory cache (`shareReplay`). Used by `chapter-content` component with `IntersectionObserver` to load verses as they scroll into view.
- **PeopleService**: Fetches narrator/people data

### Components
Components are organized by feature in `src/app/components/`:

- **book-dispatcher**: Main routing component for book content
- **chapter-list**: Displays table of chapters with Material Table
- **chapter-content**: Shows chapter with its verses
- **verse-content**: Individual verse display
- **verse-text**: Renders verse text with narrator chains and translations
- **translation-selection**: Language and translation selector
- **breadcrumbs**: Navigation breadcrumbs
- **people-list** / **people-content**: Narrator information pages

### Styling
- Uses Angular Material with the `deeppurple-amber` prebuilt theme
- Global styles in `src/styles.scss`
- Component styles use SCSS (configured in `angular.json`)
- Custom fonts in `src/assets/fonts/`

### API Integration
- **Development**: Expects local API at `http://localhost:8888/` (configured in `src/environments/environment.ts`)
- **Production**: Uses `https://thaqalayndata.netlify.app/` (configured in `src/environments/environment.prod.ts`)
- **Production App URL**: `https://thaqalayn.netlify.app/` (auto-deployed on push)
- API returns JSON files with book/chapter/verse data

## Important Notes

### OpenSSL Legacy Provider
The `npm start` script includes `NODE_OPTIONS=--openssl-legacy-provider` to support older Angular/webpack dependencies. This is required for the dev server to run.

### Known Issues from README
1. Column headings alignment with hadith index/count numbers
2. Heading tooltips needed
3. Sub-chapters should be grouped in chapter-list component for better organization

### Accessibility
The app uses semantic HTML5 landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`) and a skip-to-content link. Page titles use `<h1>` (via `book-titles` component with `headingLevel` input). Verse reference links have `aria-label` attributes.

**Remaining accessibility issues** tracked in `e2e/tests/accessibility.spec.ts` as `KNOWN_ISSUE_RULES_TO_SKIP`:
- **M1** Arabic text lacks `lang="ar"` attributes (screen readers mispronounce) — needs `lang="ar"` on `.arabic` containers
- Narrator sort headers lack accessible names — `aria-command-name` (Material table sort, third-party component)

As issues are fixed, remove the corresponding rule from `KNOWN_ISSUE_RULES_TO_SKIP` in `accessibility.spec.ts` so the test enforces the fix going forward.

### E2E Test Structure
Tests live in `e2e/tests/` and use Playwright with `@axe-core/playwright` for accessibility:
```
e2e/tests/
├── accessibility.spec.ts         # axe-core WCAG 2.1 AA audits
├── al-kafi-reading.spec.ts       # hadith display, narrator chains
├── book-navigation.spec.ts       # navigate between books
├── breadcrumbs.spec.ts           # breadcrumb rendering
├── cross-references.spec.ts      # Quran/Kafi cross-references
├── deep-linking.spec.ts          # direct URL access
├── homepage.spec.ts              # homepage loading
├── i18n.spec.ts                  # internationalization
├── narrator-pages.spec.ts        # narrator list and detail
├── no-console-errors.spec.ts     # no JS errors on pages
├── phase3c-features.spec.ts      # Phase 3c feature tests
├── prev-next-navigation.spec.ts  # prev/next arrows
├── quran-reading.spec.ts         # Quran verse display
├── seo.spec.ts                   # SEO and meta tags
├── translation-switching.spec.ts # translation selector
└── verse-detail.spec.ts          # verse detail view
```

### Routing Notes
- `/#/people/narrators` redirects to `/#/people/narrators/index` (redirect defined in `app-routing.module.ts` line 20). This works correctly.
- Hash-based routing (`useHash: true`) means all routes start with `/#/`. Direct URL navigation works for all routes.

### NGXS Selector Race Conditions
NGXS selectors fire immediately on subscription, before API data is loaded. This means selectors like `getCurrentNavigatedPart` return `undefined` initially. Any function that accesses `book.data` must guard with `book &&` first. The functions `getVerseTranslations()`, `getChapter()`, and `getDefaultVerseTranslationIds()` in `src/app/models/book.ts` all have these guards. Without them, ~20 TypeErrors appear in the console on every page load (non-fatal but noisy).

### Dynamic Page Titles
`app.component.ts` subscribes to `BooksState.getCurrentNavigatedPart`, `PeopleState.getCurrentNavigatedNarrator`, and router events to update `document.title` dynamically. Static pages (about, download, support) use router event matching. Book/chapter pages extract `chapter.titles.en` from the NGXS state.

### Unit Test Patterns
When writing Karma/Jasmine specs for components that use NGXS:
- Always add `NgxsModule.forRoot([])` to the test module imports
- Components using `HttpClient` (or services that do) need `HttpClientTestingModule`
- Components with child custom elements need `CUSTOM_ELEMENTS_SCHEMA`
- Components with `@Input()` observables (like `book$`) must set the input before `fixture.detectChanges()` to prevent `undefined.pipe()` errors
- `RouterTestingModule` is needed for components using `routerLink` or `Router`
- The `book-titles` component has a `headingLevel` input (1 or 2) controlling whether titles render as `<h1>` or `<h2>`

### Path Structure
Book parts are identified by colon-separated indices (e.g., "1:2:3") which map to API paths like "books/1/2/3.json". The `BooksService.getPart()` method handles this conversion.

### Installed Feature Dependencies
The following libraries are installed and available for feature development:
- **@angular/service-worker** — PWA support (configured in `ngsw-config.json`)
- **@orama/orama** — Client-side full-text search engine (for search feature)
- **dexie** — IndexedDB wrapper (for bookmarks, notes, reading progress)
- **firebase** — Cloud services (for optional cross-device sync)
- **@capacitor/\*** — Native mobile app framework (Android + iOS wrappers)
- **@angular/ssr** + **express** — Server-side rendering support

### Translation System
- Each chapter's `verse_translations` field contains an array of translation IDs (e.g., `["en.qarai", "en.sarwar"]`)
- Translation metadata (id, lang, name) is stored centrally in `index/translations.json` on the data server
- `IndexState` loads `index/translations.json` once on app init via `LoadTranslations` action
- `BooksState.getBookTranslations` joins the chapter's translation IDs with the central index to produce `Translation[]` objects for display
- The `translation-selection` component displays translator names (e.g., "English: Ali Quli Qarai") and uses the translation ID as the `mat-option` value
- The `getTranslationIfInBookOrDefault` selector in BooksState determines which translation to display based on:
  1. User-selected translation (if available in current book)
  2. Default translation for selected language
  3. First translation matching selected language
  4. First available translation
