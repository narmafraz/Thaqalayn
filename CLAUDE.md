# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Thaqalayn is an Angular 18 web application for hosting and displaying Islamic Hadith collections, specifically the Four Books (Al-Kutub Al-Arb'ah) and other primary Hadith sources. The application provides a hierarchical navigation system through books, chapters, and individual Hadiths (verses) with multi-language support and translations.

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
ng test                  # Run unit tests via Karma
ng e2e                   # Run end-to-end tests via Protractor
```

### Linting
```bash
ng lint                  # Run TSLint
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
Book (ChapterList | ChapterContent | VerseContent)
  └─ Chapter
      ├─ titles (MultiLingualText)
      ├─ verses[]
      │   ├─ text[]
      │   ├─ translations (Record<string, string[]>)
      │   └─ narrator_chain
      ├─ chapters[] (nested sub-chapters)
      ├─ nav (Navigation: prev, next, up)
      └─ verse_translations[]
```

Key interfaces are defined in `src/app/models/book.ts`.

### Routing
Routes are defined in `src/app/routing/app-routing.module.ts` with hash-based routing (`useHash: true`). Route resolvers pre-fetch data before component activation:

- `BookTitlesResolver`: Loads book list
- `BookPartResolver`: Loads specific book part/chapter
- `NarratorListResolver`: Loads narrator index
- `NarratorResolver`: Loads individual narrator data

### Services
Services in `src/app/services/` handle API communication:

- **BooksService**: Fetches book data from API (converts path `index` like "1:2:3" to URL "books/1/2/3.json")
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
- API returns JSON files with book/chapter/verse data

## Important Notes

### OpenSSL Legacy Provider
The `npm start` script includes `NODE_OPTIONS=--openssl-legacy-provider` to support older Angular/webpack dependencies. This is required for the dev server to run.

### Known Issues from README
1. Column headings alignment with hadith index/count numbers
2. Heading tooltips needed
3. Sub-chapters should be grouped in chapter-list component for better organization

### Path Structure
Book parts are identified by colon-separated indices (e.g., "1:2:3") which map to API paths like "books/1/2/3.json". The `BooksService.getPart()` method handles this conversion.

### Translation System
- Translations are language-specific and book-specific
- Default translation IDs are stored per language in each chapter
- The `getTranslationIfInBookOrDefault` selector in BooksState determines which translation to display based on:
  1. User-selected translation (if available in current book)
  2. Default translation for selected language
  3. First translation matching selected language
  4. First available translation
