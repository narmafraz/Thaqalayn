# Test Strategy

> **Purpose:** Define what tests each project needs, how they should be organized, what frameworks to use, and what "done" looks like before we proceed to Phase 2 (cleanup and modernization).
>
> **Date:** 2026-02-27 (updated)
>
> **Status:** Phase 1 test coverage is COMPLETE. This document is retained as a reference for the test architecture and future test additions.

---

## 1. Current Test State (Updated February 2026)

### Thaqalayn (Angular Frontend) — HEALTHY

- **367 `it()` calls** across **28 spec files**, all passing
- **187 E2E tests** across **16 Playwright spec files**, all passing
- Key test areas: NGXS state tests, service tests, component tests, pipe tests, accessibility audits
- E2E covers: book navigation, breadcrumbs, deep linking, narrator pages, cross-references, i18n, SEO, accessibility (axe-core WCAG 2.1 AA)

### ThaqalaynDataGenerator (Python) — HEALTHY

- **1143 tests** across **32 test files**, all passing
- Key test areas: parsers (quran 14, kafi 42, kafi_sarwar 17), narrators (47), data validation (64), AI pipeline (83+27), lib_db (37), lib_model (22), and more
- Parser coverage significantly improved from 0% baseline
- Data validation tests cover schema, integrity, cross-references

### ThaqalaynData (JSON Output) — COVERED

Data integrity is validated by `test_data_validation.py` (64 tests) covering JSON schema, completeness, cross-references, and narrator consistency.

---

## 2. Thaqalayn Frontend: E2E Tests

### Framework: Playwright

Playwright is already available in the project (configured in `.mcp.json` with Brave browser). It replaces the obsolete Protractor setup.

### Setup

```bash
cd Thaqalayn
npm install -D @playwright/test
npx playwright install chromium
```

Create `playwright.config.ts`:
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:4200',
    // Brave browser path (optional, chromium works fine):
    // launchOptions: { executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe' },
  },
  webServer: [
    {
      command: 'cd ../ThaqalaynData && python serve.py',
      port: 8888,
      reuseExistingServer: true,
    },
    {
      command: 'npm start',
      port: 4200,
      reuseExistingServer: true,
    },
  ],
});
```

### File Organization

```
Thaqalayn/
├── e2e/
│   ├── book-navigation.spec.ts    # Tests 1-3: Book list, Quran, Al-Kafi
│   ├── breadcrumbs-nav.spec.ts    # Tests 4-5: Breadcrumbs, prev/next
│   ├── translation.spec.ts        # Test 6: Language/translation switching
│   ├── narrator-pages.spec.ts     # Tests 7-8: Narrator detail, narrator index
│   ├── deep-linking.spec.ts       # Test 9: Direct URL navigation
│   └── cross-references.spec.ts   # Test 10: Mentions/Mentioned In links
├── playwright.config.ts
```

### E2E Test Specifications

#### Test 1: Homepage / Book List
```
Navigate to /books
VERIFY: Page loads without errors
VERIFY: "The Holy Quran" text is visible
VERIFY: "Al-Kafi" text is visible
VERIFY: Clicking "The Holy Quran" navigates to /books/quran
```

#### Test 2: Quran Surah
```
Navigate to /books/quran:1
VERIFY: Page loads without errors
VERIFY: Arabic text is present (matches /[\u0600-\u06FF]/)
VERIFY: At least 7 verse elements are rendered (Al-Fatiha has 7 verses)
VERIFY: English translation text is visible
```

#### Test 3: Al-Kafi Chapter
```
Navigate to /books/al-kafi:1:1:1
VERIFY: Page loads without errors
VERIFY: Hadith text is present (Arabic characters visible)
VERIFY: At least one narrator chain link exists (anchor with href containing /people/narrators/)
```

#### Test 4: Breadcrumb Navigation
```
Navigate to /books/al-kafi:1:2:3
VERIFY: Breadcrumbs are visible
VERIFY: Breadcrumbs contain multiple levels (at least 3 links)
Click the second breadcrumb
VERIFY: URL changes to a parent path
VERIFY: Page content updates
```

#### Test 5: Prev/Next Chapter Navigation
```
Navigate to /books/al-kafi:1:1:1
VERIFY: "Next" navigation button is visible
Click Next button
VERIFY: URL changes (path should now end in :2 or similar)
VERIFY: "Prev" navigation button is now visible
Click Prev button
VERIFY: URL returns to original path
```

#### Test 6: Language/Translation Switching
```
Navigate to /books/quran:1?lang=en
VERIFY: Translation dropdown/selector is visible
VERIFY: English translation text is visible
Switch to a different translation (if available)
VERIFY: Displayed translation text changes
```

#### Test 7: Narrator Detail Page
```
Navigate to /people/narrators/1
VERIFY: Page loads without errors
VERIFY: Arabic narrator name is visible (matches /[\u0600-\u06FF]/)
VERIFY: Hadith paths list is present (at least one /books/ link)
VERIFY: Co-narrators section is present
```

#### Test 8: Narrator Index Page
```
Navigate to /people/narrators/index
VERIFY: Table loads with narrator entries
VERIFY: Table has multiple rows (narrators listed)
VERIFY: Search/filter input exists (Material table filter)
Type a search term
VERIFY: Table filters results
```

#### Test 9: Deep Linking
```
Navigate directly to /books/quran:2:255 (Ayat al-Kursi)
VERIFY: Page loads without prior navigation
VERIFY: Verse content is rendered
VERIFY: Arabic text is present
```

#### Test 10: Cross-References
```
Navigate to a chapter known to have relations (e.g., /books/al-kafi:1:2:1)
VERIFY: At least one verse has a "Mentions" or "Mentioned In" section
VERIFY: Cross-reference links contain /books/ paths
Click a cross-reference link
VERIFY: Navigation occurs to the referenced page
```

### Important Technical Notes

- The app uses **path-based routing** (`useHash: false`). URLs are `http://localhost:4200/books/quran:1`.
- Data loads asynchronously via route resolvers. Always wait for content to appear before asserting.
- Use `page.waitForSelector()` or Playwright's auto-waiting rather than fixed timeouts where possible.
- Arabic text can be verified with: `expect(text).toMatch(/[\u0600-\u06FF]/)`.
- Both servers must be running: Angular on `:4200` and data API on `:8888`.

---

## 3. Thaqalayn Frontend: Unit Test Fixes

### Priority: Fix compilation-blocking tests

The following 3 files must be fixed before ANY tests can run:

#### `src/store/books/books.state.spec.ts`

**Current (broken):** Imports `BooksAction` (doesn't exist), uses `{items: ['item-1']}` shape.

**Actual state:** Action is `LoadBookPart` (from `./books.actions`). State model is `{titles: ChapterList[], parts: {[index: string]: Book}}`. Selectors include `getState`, `getTitles`, `getParts`, `getPartByIndex`, `getCurrentNavigatedPart`.

**Fix:** Rewrite to test actual state:
```typescript
import { LoadBookPart } from './books.actions';
// Test that state initializes with empty titles and parts
// Test that LoadBookPart dispatches (requires mocking BooksService)
// Test selectors: getTitles, getParts, getPartByIndex
```

#### `src/store/router/router.state.spec.ts`

**Current (broken):** Imports `RouterAction` (doesn't exist), uses `{items: ['item-1']}` shape, calls `RouterState.getState` (doesn't exist).

**Actual state:** Actions are `BookPartIndexChanged`, `SortChanged` (from `./router.actions`). State model is `{index, fragment, sort, translation, language}`. Selectors are `getBookPartIndex`, `getUrlFragment`, `getTranslation`, `getLanguage`.

**Fix:** Rewrite to test selectors:
```typescript
import { BookPartIndexChanged, SortChanged } from './router.actions';
// Test default state: language is 'en', others are undefined
// Test getLanguage returns 'en' by default
// Test getBookPartIndex selector
```

#### `src/app/app.component.spec.ts`

**Current (broken):** Expects `.content span` with "Thaqalayn app is running!" -- this template content no longer exists. Also missing NGXS module imports needed for the component.

**Fix:** Update to test current template structure, add required module imports.

---

## 4. ThaqalaynDataGenerator: Data Validation Tests

### Framework: pytest

Already configured in `pyproject.toml` with coverage reporting.

### File Organization

```
ThaqalaynDataGenerator/
├── tests/
│   ├── conftest.py                 # Existing fixtures + new data_dir fixture
│   ├── test_kafi_narrators.py      # Existing (35+ tests, excellent)
│   ├── test_lib_db.py              # Existing (12 tests)
│   ├── test_lib_model.py           # Existing (10 tests)
│   ├── test_lib_bs4.py             # Existing
│   ├── test_link_quran_kafi.py     # Existing
│   ├── test_models.py              # Existing
│   ├── test_data_schema.py         # NEW: JSON wrapper and schema validation
│   ├── test_data_integrity.py      # NEW: Content integrity and completeness
│   ├── test_data_crossrefs.py      # NEW: Cross-reference and link validation
│   └── test_data_snapshots.py      # NEW: Snapshot tests for key files
```

### Shared Fixtures (`conftest.py` additions)

```python
import os
import json

@pytest.fixture(scope="session")
def data_dir():
    """Path to ThaqalaynData directory"""
    path = os.path.join(os.path.dirname(__file__), '..', '..', 'ThaqalaynData')
    assert os.path.isdir(path), f"ThaqalaynData not found at {path}"
    return os.path.abspath(path)

@pytest.fixture(scope="session")
def load_json_file(data_dir):
    """Helper to load a JSON file from the data directory"""
    def _load(relative_path):
        full_path = os.path.join(data_dir, relative_path)
        with open(full_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return _load

def path_to_file(data_dir, api_path):
    """Convert API path like /books/al-kafi:1:2 to filesystem path"""
    sanitized = api_path.lstrip('/').replace(':', '/')
    return os.path.join(data_dir, sanitized + '.json')
```

### test_data_schema.py -- JSON Schema Validation

| Test | Description | Priority |
|------|-------------|----------|
| `test_all_book_files_have_wrapper` | Walk `books/` (exclude `complete/`), verify every JSON has `index`, `kind`, `data` keys | P0 |
| `test_all_narrator_files_have_wrapper` | Walk `people/narrators/` (exclude `index.json`), verify wrapper | P0 |
| `test_kind_values_are_valid` | Verify `kind` is one of: `chapter_list`, `verse_list`, `person_content`, `person_list` | P0 |
| `test_chapter_list_schema` | For `kind: "chapter_list"` files: `data.chapters` is a list, each has `index`, `path`, `titles` | P1 |
| `test_verse_list_schema` | For `kind: "verse_list"` files: `data.verses` is a list, each has `index`, `local_index`, `path`, `text` | P1 |
| `test_narrator_file_schema` | For narrator files: `data.titles` exists, `data.verse_paths` is a list, `data.subchains` is a dict | P1 |

### test_data_integrity.py -- Content Integrity

| Test | Description | Priority |
|------|-------------|----------|
| `test_quran_completeness` | 114 surah files exist in `books/quran/`, sum of verse counts = 6236 | P0 |
| `test_alkafi_completeness` | 8 volume files in `books/al-kafi/`, total hadiths = 15281 | P0 |
| `test_utf8_arabic_text` | Sample 20 files, verify Arabic text contains chars in `\u0600-\u06FF` range, no `\uXXXX` escape sequences in file content | P0 |
| `test_no_null_text_arrays` | Sample verse_list files, verify no verse has `text: null` or `text: []` | P1 |
| `test_verse_counts_match` | For `books/quran.json` and `books/al-kafi.json`, verify `verse_count` matches sum of child file verse arrays | P1 |
| `test_narrator_index_coverage` | Every ID in `people/narrators/index.json` has a corresponding `{id}.json` file | P0 |
| `test_narrator_count` | Verify narrator count = 4861 (current known count) | P1 |
| `test_books_json_structure` | `books/books.json` lists Quran and Al-Kafi with correct paths | P0 |

### test_data_crossrefs.py -- Cross-Reference Validation

| Test | Description | Priority |
|------|-------------|----------|
| `test_narrator_chain_paths_resolve` | Sample 30 verse_list files with narrator chains: every `parts` entry with `kind: "narrator"` has a `path` pointing to an existing narrator file | P0 |
| `test_relation_paths_resolve` | Sample 20 files with `relations`: all paths in "Mentions"/"Mentioned In" resolve to existing files | P0 |
| `test_navigation_prev_resolves` | Sample 30 verse_list files: `nav.prev` path resolves to an existing file | P0 |
| `test_navigation_next_resolves` | Sample 30 verse_list files: `nav.next` path resolves to an existing file | P0 |
| `test_navigation_up_resolves` | Sample 30 verse_list files: `nav.up` path resolves to an existing file | P0 |
| `test_verse_paths_in_narrators_resolve` | Sample 20 narrator files: all `verse_paths` entries resolve to existing files | P1 |
| `test_subchain_narrator_ids_exist` | Sample 20 narrator files: all `narrator_ids` in subchains exist in narrator index | P1 |

**Sampling strategy:** For expensive cross-reference checks, don't test every file. Use `pytest.mark.parametrize` with a representative sample:
- 10 Quran surahs (1, 2, 36, 55, 67, 78, 93, 100, 112, 114)
- 10 Al-Kafi chapters across different volumes
- 10 narrator files (IDs 1, 10, 19, 36, 100, 500, 1000, 2000, 3000, 4000)

### test_data_snapshots.py -- Snapshot Tests

Capture known-good output for key files. Future changes that alter these files will fail the test, requiring explicit review and snapshot update.

| Test | File | What to snapshot |
|------|------|-----------------|
| `test_books_index_snapshot` | `books/books.json` | Full file content |
| `test_quran_fatiha_snapshot` | `books/quran/1.json` | Full file (small, ~15 KB) |
| `test_quran_metadata_snapshot` | `books/quran.json` | Surah count, first/last surah titles |
| `test_alkafi_first_chapter_snapshot` | `books/al-kafi/1/1/1.json` | Verse count, first verse text prefix, translations present |
| `test_narrator_1_snapshot` | `people/narrators/1.json` | Narrator name, verse_paths count, subchains count |
| `test_narrator_index_snapshot` | `people/narrators/index.json` | Total narrator count, spot-check 5 narrator names |

Implementation: Store expected values as constants in the test file (not separate snapshot files). Compare key fields rather than full file content to avoid brittle tests that break on whitespace or key ordering changes.

---

## 5. ThaqalaynDataGenerator: Parser Unit Tests

### Existing coverage gaps

| Parser | File | Current Coverage | Tests Needed |
|--------|------|-----------------|--------------|
| `quran.py` | `tests/test_quran.py` (NEW) | 0% | XML parsing, surah extraction, translation mapping |
| `kafi.py` | `tests/test_kafi.py` (NEW) | 0% | HTML parsing, volume/book/chapter hierarchy, correction application |
| `kafi_sarwar.py` | `tests/test_kafi_sarwar.py` (NEW) | 0% | Translation merge, verse matching |
| `link_quran_kafi.py` | `tests/test_link_quran_kafi.py` | 61% | Bidirectional link creation, path format |
| `kafi_narrators.py` | `tests/test_kafi_narrators.py` | 46% | Already excellent -- extend with edge cases |

### Parser test priorities

These are lower priority than data validation tests. Focus on testing the parser functions in isolation using small HTML/XML snippets, not full source files.

---

## 6. Definition of "Done" for Phase 1

Phase 1 is complete (and Phase 2 can begin) when ALL of the following are true:

### Angular Frontend (Thaqalayn) — ALL DONE

- [x] `ng test --watch=false` compiles and runs without errors
- [x] All existing spec files pass (broken ones fixed or properly rewritten)
- [x] At least 8 of the 10 E2E test scenarios pass against the live app (all 16 spec files pass)
- [x] E2E tests are committed and documented in the repo

### Data Generator (ThaqalaynDataGenerator) — ALL DONE

- [x] `pytest` runs with 0 failures (1143 tests passing)
- [x] Data schema tests exist and pass: wrapper format, kind values, per-kind schema
- [x] Data integrity tests exist and pass: Quran 114/6236, Al-Kafi 8 vols/15281 hadiths, UTF-8, narrator count
- [x] Cross-reference tests exist and pass: narrator chains, relations, navigation links
- [x] At least 3 snapshot tests exist and pass for key data files

### Overall — DONE

- [x] No manual verification needed to confirm "the app still works" -- tests cover it
- [x] A developer can run the test suite after making changes and trust that failures indicate real regressions

---

## 7. Test Execution Commands

### Angular

```bash
# Unit tests (Karma/Jasmine)
cd Thaqalayn
ng test --watch=false --browsers=ChromeHeadless

# E2E tests (Playwright) -- requires both servers running
npx playwright test

# E2E with headed browser (for debugging)
npx playwright test --headed
```

### Data Generator

```bash
# All tests with coverage
cd ThaqalaynDataGenerator
uv run pytest

# Data validation tests only
uv run pytest tests/test_data_schema.py tests/test_data_integrity.py tests/test_data_crossrefs.py

# Snapshot tests only
uv run pytest tests/test_data_snapshots.py

# Specific test file
uv run pytest tests/test_kafi_narrators.py -v
```

---

## 8. Maintenance

- **When adding a new book:** Add integrity tests (completeness counts), cross-reference tests (narrator chains), and a snapshot test for a representative chapter.
- **When changing JSON schema:** Update schema tests in `test_data_schema.py` and all affected snapshot tests.
- **When adding an Angular component:** Add a basic `.spec.ts` alongside the component. Add E2E coverage if the component is user-facing.
- **When optimizing data (Phase 2):** Run the full test suite before and after. Any snapshot test failures must be reviewed and explicitly updated.
