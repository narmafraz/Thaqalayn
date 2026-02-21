# AGENTS.md — Comprehensive Project Knowledge Base

This document contains everything an agent needs to make coordinated changes across all 3 Thaqalayn projects.

---

## 1. PROJECT ECOSYSTEM

### 1.1 Projects and Their Roles

```
ThaqalaynDataGenerator (Python)
    │
    │  Parses HTML/XML sources → generates JSON files
    │  Output dir: DESTINATION_DIR (default: ../ThaqalaynData/)
    │
    ▼
ThaqalaynData (Static JSON)
    │
    │  Deployed to Netlify as static API
    │  URL: https://thaqalayndata.netlify.app/
    │
    ▼
Thaqalayn (Angular 18)
    │
    │  Web UI consuming JSON API
    │  Dev: http://localhost:4200 → http://localhost:8888
    │  Prod: hosted app → https://thaqalayndata.netlify.app/
    ▼
```

### 1.2 Technology Stack

| Layer | Technology | Version | Package Manager |
|-------|-----------|---------|-----------------|
| Generator | Python, Pydantic, BeautifulSoup, FastAPI (encoders only) | 3.8+ | uv |
| Data | JSON, Netlify | — | — |
| Frontend | Angular, Material, NGXS, RxJS, TypeScript | 18.0.4 | npm |

---

## 2. GENERATOR PROJECT (ThaqalaynDataGenerator)

### 2.1 File Structure

```
ThaqalaynDataGenerator/
├── app/
│   ├── main_add.py              # Entry point — orchestrates pipeline
│   ├── books.py                 # Generates books.json index
│   ├── quran.py                 # Parses Quran from XML (212 lines)
│   ├── kafi.py                  # Parses Al-Kafi from HTML (536 lines)
│   ├── kafi_sarwar.py           # Adds Sarwar translation (232 lines)
│   ├── kafi_corrections.py      # Manual HTML fixes
│   ├── kafi_narrators.py        # Narrator chain extraction (268 lines)
│   ├── link_quran_kafi.py       # Quran↔Hadith cross-references (72 lines)
│   ├── lib_db.py                # File I/O, JSON writing (130 lines)
│   ├── lib_model.py             # Indexing, breadcrumbs, navigation (90 lines)
│   ├── lib_bs4.py               # BeautifulSoup helpers
│   ├── models/
│   │   ├── __init__.py          # Re-exports all models
│   │   ├── quran.py             # Chapter, Verse, NarratorChain, SpecialText (54 lines)
│   │   ├── crumb.py             # Crumb, Navigation (15 lines)
│   │   ├── people.py            # Narrator, ChainVerses, NarratorIndex (24 lines)
│   │   ├── enums.py             # Language, PartType enums
│   │   └── translation.py       # Translation model
│   └── queries/                 # Ad-hoc analysis scripts
├── tests/
│   └── test_kafi_narrators.py
├── tanzil_net/                  # Quran XML source data
├── add_data.ps1                 # PowerShell runner script
└── pyproject.toml               # Project config and dependencies
```

### 2.2 Generation Pipeline

`app/main_add.py` runs these steps sequentially:

```python
def init():
    init_books()          # 1. Write books/books.json index
    init_quran()          # 2. Parse Quran XML → write chapter files + complete/quran.json
    init_kafi()           # 3. Parse Al-Kafi HTML → write chapter files
    add_kafi_sarwar()     # 4. Add Sarwar translation to existing Al-Kafi
    link_quran_kafi()     # 5. Create bidirectional Quran↔Hadith relations
    kafi_narrators()      # 6. Extract narrator chains, write narrator files + complete/al-kafi.json
```

### 2.3 Key Functions (Exact Code)

#### lib_db.py — File Writing

```python
def write_file(path: str, obj):
    """Write JSON to filesystem. Path like /books/quran:1 → books/quran/1.json"""
    result = InsertedObj()
    result.path = path
    if 'index' in obj:
        result.index = obj["index"]
    clean_obj = clean_nones(obj)
    with open(ensure_dir(get_dest_path(path)), 'w', encoding='utf-8') as f:
        json.dump(clean_obj, f, ensure_ascii=False, indent=2, sort_keys=True)
        result.id = f.name
    return result

def get_dest_path(filename: str) -> str:
    """Convert API path to filesystem path: /books/quran:1:5 → DEST/books/quran/1/5.json"""
    sanitised_file = filename.replace(":", "/")
    if sanitised_file.startswith("/"):
        sanitised_file = sanitised_file[1:]
    return os.path.join(DESTINATION_DIR, sanitised_file + ".json")

def insert_chapter(chapter: Chapter):
    """Recursively write chapter hierarchy"""
    if get_chapters(chapter):
        insert_chapters_list(chapter)       # Write chapter_list JSON (excludes verses/subchapters)
    if get_verses(chapter):
        insert_chapter_content(chapter)     # Write verse_list JSON (includes all verse data)
```

#### lib_model.py — Indexing and Breadcrumbs

```python
def set_index(chapter: Chapter, indexes: List[int], depth: int, master_index: Dict[str, Crumb]):
    """Recursively assign indexes, breadcrumbs, and navigation to all chapters/verses"""
    # For each subchapter:
    #   1. Assign index (global) and local_index (within parent)
    #   2. Set path = parent.path + ":" + local_index
    #   3. Copy parent's crumbs + append self as new crumb
    #   4. Set nav.prev/next (between siblings) and nav.up (to parent)
    #   5. Store crumb in master_index dict keyed by path
    #   6. Recurse into subchapters
```

Breadcrumb generation (lines 56-61):
```python
subchapter.crumbs = copy.copy(chapter.crumbs)
crumb = Crumb()
crumb.indexed_titles = { Language.EN.value: subchapter.part_type.name + ' ' + str(subchapter.local_index) }
crumb.titles = subchapter.titles
crumb.path = subchapter.path
master_index[subchapter.path] = crumb
subchapter.crumbs.append(crumb)
```

Navigation generation (lines 63-69):
```python
subchapter.nav = Navigation()
if prev_chapter:
    subchapter.nav.prev = prev_chapter.crumbs[-1]    # Full Crumb object
    prev_chapter.nav.next = crumb                      # Full Crumb object
if len(subchapter.crumbs) >= 2:
    subchapter.nav.up = subchapter.crumbs[-2]          # Full Crumb object
prev_chapter = subchapter
```

#### kafi_narrators.py — Narrator Chain Extraction

The narrator processing pipeline for each hadith:
```python
def process_chapter_verses(chapter, narrator_index, narrators):
    for hadith in chapter.verses:
        hadith.text[0] = SPAN_PATTERN.sub("", hadith.text[0])
        narrator_names = extract_narrators(hadith)     # Regex: split Arabic text before first "qaal"
        narrator_ids = assign_narrator_id(narrator_names, narrator_index)  # Map names → stable IDs
        add_narrator_links(hadith, narrator_ids, narrator_index)           # Build parts array
        update_narrators(hadith, narrator_ids, narrators, narrator_index)  # Build subchains
```

The subchain generation (CRITICAL — main source of data bloat):
```python
def getCombinations(lst) -> Dict[int, List[List[int]]]:
    """Generates ALL contiguous subsequences — causes combinatorial explosion"""
    result = {}
    for i, j in itertools.combinations(range(len(lst) + 1), 2):
        combi = lst[i:j]
        combi_key = '-'.join(str(n) for n in combi)
        if len(combi) > 1:
            for n in combi:
                if n not in result:
                    result[n] = []
                result[n].append((combi_key, combi))
    return result
    # Chain [1,2,3,4,5] produces: 1-2, 1-2-3, 1-2-3-4, 1-2-3-4-5,
    #                              2-3, 2-3-4, 2-3-4-5, 3-4, 3-4-5, 4-5
    # Each stored per-narrator with duplicate verse_paths!
```

The narrator metadata computation depends on 2-length subchains (lines 227-234):
```python
def compose_narrator_metadata(name, narrator):
    two_chains = [x for x in narrator.subchains.values() if len(x.narrator_ids) == 2]
    narrated_to = [x for x in two_chains if x.narrator_ids[0] == narrator.index]
    narrated_from = [x for x in two_chains if x.narrator_ids[1] == narrator.index]
    result['narrated_from'] = len(narrated_from)
    result['narrated_to'] = len(narrated_to)
```

The `kafi_narrators()` entry point:
```python
def kafi_narrators():
    delete_folder("/people/narrators")
    narrator_index = load_narrator_index()
    narrators = {}
    kafi = load_chapter("/books/complete/al-kafi")     # Loads from complete file
    process_chapter(kafi, narrator_index, narrators)
    insert_narrators(narrators)                         # Write individual narrator files
    insert_narrator_index(narrator_index, narrators)    # Write narrators/index.json
    insert_chapter(kafi)                                # Re-write all chapter files (with narrator data)
    write_file("/books/complete/al-kafi", jsonable_encoder(kafi))  # Re-write complete file
```

### 2.4 Data Models (Exact)

```python
# models/quran.py
class SpecialText(BaseModel):
    kind: str = None           # "narrator" or "plain"
    text: str = None           # Arabic text content
    path: str = None           # Only for kind="narrator": "/people/narrators/{id}"

class NarratorChain(BaseModel):
    text: str = None           # Concatenated full chain text (NOT used by Angular)
    parts: List[SpecialText] = None  # Structured parts (USED by Angular)

class Verse(BaseModel):
    narrator_chain: NarratorChain = None
    gradings: List[str] = None
    index: int = None          # Global index within book
    local_index: int = None    # Index within parent chapter
    part_type: PartType = None
    path: str = None
    relations: Dict[str, Set[str]] = None   # {"Mentions": {"/books/quran:9:122"}}
    text: List[str] = None                  # Arabic text paragraphs
    translations: Dict[str, List[str]] = None  # {"en.hubeali": ["English text..."]}

class Chapter(BaseModel):
    chapters: List[Chapter] = None
    crumbs: List[Crumb] = None
    default_verse_translation_ids: Dict[str, str] = None
    descriptions: Dict[str, List[str]] = None
    index: int = None
    local_index: int = None
    nav: Navigation = None
    order: int = None
    part_type: PartType = None
    path: str = None
    titles: Dict[str, Optional[str]] = None
    verse_count: int = None
    verse_start_index: int = None
    verse_translations: List[Translation] = None
    verses: List[Verse] = None

# models/crumb.py
class Crumb(BaseModel):
    titles: Dict[str, Optional[str]] = None
    indexed_titles: Dict[str, Optional[str]] = None
    path: str = None

class Navigation(BaseModel):
    prev: Crumb = None
    next: Crumb = None
    up: Crumb = None

# models/people.py
class ChainVerses(BaseModel):
    narrator_ids: List[int] = None
    verse_paths: Set[str] = None

class Narrator(BaseModel):
    titles: Dict[str, Optional[str]] = None
    index: int = None
    path: str = None
    verse_paths: Set[str] = None
    subchains: Dict[str, ChainVerses] = None

class NarratorIndex(BaseModel):
    id_name: Dict[int, str] = None    # ID → Arabic name
    name_id: Dict[str, int] = None    # Arabic name → ID
    last_id: int = 0
```

### 2.5 Running the Generator

```bash
cd ThaqalaynDataGenerator

# PowerShell (Windows):
./add_data.ps1

# Bash (Linux/Mac):
export PYTHONPATH="$PWD:$PWD/app"
export DESTINATION_DIR="../ThaqalaynData/"
uv run python app/main_add.py

# Tests:
uv run pytest
uv run pytest tests/test_kafi_narrators.py
uv run pytest --cov=app --cov-report=html
```

---

## 3. DATA PROJECT (ThaqalaynData)

### 3.1 File Structure

```
ThaqalaynData/
├── books/
│   ├── books.json               # Top-level book index
│   ├── quran.json               # Quran metadata (chapter list)
│   ├── al-kafi.json             # Al-Kafi metadata (volume list)
│   ├── quran/
│   │   ├── 1.json ... 114.json  # Individual chapter files (verse_list)
│   ├── al-kafi/
│   │   ├── 1.json               # Volume 1 metadata (chapter_list)
│   │   ├── 1/
│   │   │   ├── 1.json           # Book 1 metadata (chapter_list)
│   │   │   ├── 1/
│   │   │   │   └── 1.json       # Chapter 1 content (verse_list with hadiths)
│   │   │   └── ...
│   │   └── ...
│   └── complete/
│       ├── quran.json           # 46 MB — full Quran in one file
│       └── al-kafi.json         # 88 MB — full Al-Kafi in one file
├── people/
│   └── narrators/
│       ├── index.json           # Narrator metadata index (all narrator names + stats)
│       ├── 1.json ... 4861.json # Individual narrator files with subchains
├── netlify.toml                 # CORS headers for Netlify deployment
└── serve.py                     # Local dev server (port 8888, CORS enabled)
```

### 3.2 Size Breakdown

| Component | Size | Files | Description |
|-----------|------|-------|-------------|
| `books/complete/` | 133 MB | 2 | Full book aggregations |
| `people/narrators/` | 101 MB | 4,861 | Narrator chain data |
| `books/al-kafi/` | 85 MB | 2,367 | Hadith chapter files |
| `books/quran/` | 46 MB | 114 | Quran chapter files |
| Other indexes | ~0.5 MB | 4 | books.json, quran.json, al-kafi.json, narrators/index.json |
| **Total** | **~485 MB** | **7,348** | |

### 3.3 JSON Wrapper Format

Every file uses the same envelope:
```json
{
  "index": "al-kafi:1:2:1",
  "kind": "chapter_list" | "verse_list" | "person_content" | "person_list",
  "data": { /* actual payload */ }
}
```

### 3.4 Path Convention

Hierarchical colon-separated paths map to filesystem:

| API Path | Filesystem | Content |
|----------|-----------|---------|
| `/books/quran` | `books/quran.json` | Chapter list (114 surahs) |
| `/books/quran:1` | `books/quran/1.json` | Verse list (Al-Fatiha) |
| `/books/al-kafi:1:2:3` | `books/al-kafi/1/2/3.json` | Verse list (specific chapter) |
| `/people/narrators/36` | `people/narrators/36.json` | Narrator data |
| `/people/narrators/index` | `people/narrators/index.json` | All narrator metadata |

### 3.5 JSON Schema Details

**Chapter list files** (e.g., `books/al-kafi.json`):
```json
{
  "index": "al-kafi",
  "kind": "chapter_list",
  "data": {
    "chapters": [
      {
        "index": 1, "local_index": 1,
        "part_type": "Volume",
        "path": "/books/al-kafi:1",
        "titles": {"ar": "...", "en": "Volume One"},
        "verse_count": 1441,
        "verse_start_index": 0
      }
    ],
    "crumbs": [ /* breadcrumb objects */ ],
    "path": "/books/al-kafi",
    "titles": {"ar": "الكافي", "en": "Al-Kafi"},
    "verse_count": 15281
  }
}
```

**Verse list files** (e.g., `books/al-kafi/1/2/1.json`):
```json
{
  "index": "al-kafi:1:2:1",
  "kind": "verse_list",
  "data": {
    "crumbs": [ /* array of Crumb objects — full hierarchy */ ],
    "nav": {
      "next": { "titles": {...}, "indexed_titles": {...}, "path": "..." },
      "prev": null,
      "up": { "titles": {...}, "indexed_titles": {...}, "path": "..." }
    },
    "verse_translations": [
      {"id": "en.hubeali", "lang": "en", "name": "HubeAli.com"}
    ],
    "default_verse_translation_ids": {"en": "en.hubeali"},
    "verses": [
      {
        "index": 37, "local_index": 1,
        "part_type": "Hadith",
        "path": "/books/al-kafi:1:2:1:1",
        "text": ["Arabic hadith text..."],
        "translations": {
          "en.hubeali": ["English translation..."]
        },
        "narrator_chain": {
          "text": "Full concatenated chain text...",
          "parts": [
            {"kind": "plain", "text": "أَخْبَرَنَا "},
            {"kind": "narrator", "text": "مُحَمَّدُ بْنُ يَعْقُوبَ", "path": "/people/narrators/1"}
          ]
        },
        "gradings": ["Allamah Baqir al-Majlisi: ..."],
        "relations": {
          "Mentions": ["/books/quran:9:122"]
        }
      }
    ]
  }
}
```

**Narrator files** (e.g., `people/narrators/36.json`):
```json
{
  "index": 36,
  "kind": "person_content",
  "data": {
    "index": 36,
    "path": "/people/narrators/36",
    "titles": {"ar": "أَبِيهِ"},
    "verse_paths": ["/books/al-kafi:1:3:1:1", "/books/al-kafi:1:3:2:1", ...],
    "subchains": {
      "10-11-36": {
        "narrator_ids": [10, 11, 36],
        "verse_paths": ["/books/al-kafi:6:7:15:3"]
      },
      "10-11-36-8": {
        "narrator_ids": [10, 11, 36, 8],
        "verse_paths": ["/books/al-kafi:6:7:15:3"]
      }
    }
  }
}
```

**Narrator index** (`people/narrators/index.json`):
```json
{
  "index": "people",
  "kind": "person_list",
  "data": {
    "1": {
      "titles": {"ar": "أَبُو جَعْفَرٍ مُحَمَّدُ بْنُ يَعْقُوبَ"},
      "narrations": 2,
      "narrated_from": 0,
      "narrated_to": 2
    }
  }
}
```

### 3.6 Local Development

```bash
cd ThaqalaynData
python3 serve.py    # Serves on http://localhost:8888 with CORS
```

---

## 4. ANGULAR PROJECT (Thaqalayn)

### 4.1 File Structure (Key Files Only)

```
Thaqalayn/
├── src/
│   ├── app/
│   │   ├── models/
│   │   │   ├── book.ts          # Chapter, Verse, NarratorChain, Crumb, Navigation, Translation
│   │   │   ├── people.ts        # Narrator, ChainVerses, NarratorMetadata, NarratorWrapper
│   │   │   ├── text.ts          # MultiLingualText
│   │   │   └── index.ts         # Barrel exports
│   │   ├── services/
│   │   │   ├── books.service.ts  # getPart(index) → HTTP GET
│   │   │   └── people.service.ts # getNarrator(index) → HTTP GET
│   │   ├── components/
│   │   │   ├── breadcrumbs/      # Breadcrumb navigation bar
│   │   │   ├── chapter-content/  # Renders verses with narrator chains
│   │   │   ├── chapter-list/     # Table of chapters
│   │   │   ├── verse-text/       # Individual verse rendering
│   │   │   ├── people-content/   # Narrator profile with subchains table
│   │   │   ├── people-list/      # Narrator index table
│   │   │   ├── translation-selection/  # Translation dropdown
│   │   │   ├── path-link/        # Renders path as clickable link
│   │   │   └── book-dispatcher/  # Main routing component
│   │   └── routing/
│   │       └── app-routing.module.ts  # Route definitions
│   ├── store/
│   │   ├── books/
│   │   │   ├── books.state.ts    # NGXS state + selectors for book data
│   │   │   └── books.actions.ts
│   │   ├── people/
│   │   │   ├── people.state.ts   # NGXS state + selectors for narrator data
│   │   │   └── people.actions.ts
│   │   └── router/
│   │       └── router.state.ts   # Custom router state (language, translation params)
│   └── environments/
│       ├── environment.ts        # Dev: apiBaseUrl = 'http://localhost:8888/'
│       └── environment.prod.ts   # Prod: apiBaseUrl = 'https://thaqalayndata.netlify.app/'
└── angular.json
```

### 4.2 TypeScript Interfaces (Exact)

```typescript
// models/book.ts
export interface Translation {
  name: string;    // "HubeAli.com"
  id: string;      // "en.hubeali"
  lang: string;    // "en"
}

export interface Crumb {
  titles: MultiLingualText;           // {"ar": "...", "en": "..."}
  indexed_titles: MultiLingualText;   // {"en": "Chapter 3"}
  path: string;                       // "/books/al-kafi:1:2:3"
}

export interface Navigation {
  prev: Crumb;
  next: Crumb;
  up: Crumb;
}

export interface SpecialText {
  kind: string;    // "narrator" | "plain"
  path: string;    // "/people/narrators/100" (narrator only)
  text: string;    // Arabic text content
}

export interface NarratorChain {
  parts: SpecialText[];
  text: string;    // Concatenated text (NOT used in templates, but exists in interface)
}

export interface Verse {
  index: number;
  local_index: number;
  path: string;
  text: string[];
  translations: Record<string, string[]>;
  part_type: string;
  relations: Record<string, string[]>;   // {"Mentions": ["/books/quran:9:122"]}
  narrator_chain: NarratorChain;
}

export interface Chapter {
  index: string;
  local_index: string;
  path: string;
  titles: MultiLingualText;
  descriptions: MultiLingualText;
  verse_count: number;
  verse_start_index: number;
  verses: Verse[];
  chapters: Chapter[];
  part_type: string;
  crumbs: Crumb[];
  nav: Navigation;
  verse_translations: Translation[];
  default_verse_translation_ids: Record<string, string>;
}

export type Book = ChapterList | ChapterContent | VerseContent;
// Discriminated union on `kind` field

// models/people.ts
export interface ChainVerses {
  narrator_ids: number[];
  verse_paths: string[];
}

export interface Narrator {
  index: string;
  path: string;
  titles: MultiLingualText;
  verse_paths: string[];
  subchains: Record<string, ChainVerses>;
}

export interface NarratorMetadata {
  index: string;
  titles: MultiLingualText;
  narrations: number;
  narrated_from: number;
  narrated_to: number;
}
```

### 4.3 Data Loading Pattern

**Services make HTTP calls:**
```typescript
// books.service.ts
getPart(index: string): Observable<Book> {
    return this.http.get<Book>(`${environment.apiBaseUrl}books/${index.replace(/:/g, '/')}.json`);
}

// people.service.ts
getNarrator(index: string): Observable<NarratorWrapper> {
    return this.http.get<NarratorWrapper>(`${environment.apiBaseUrl}people/narrators/${index}.json`);
}
```

**NGXS state stores loaded data:**
```typescript
// books.state.ts — stores by index
@Action(LoadBookPart)
public loadPart(ctx: StateContext<BooksStateModel>, action: LoadBookPart) {
    return this.booksService.getPart(action.payload).pipe(
        tap(loadedPart => {
            ctx.patchState({ parts: { ...state.parts, [loadedPart.index]: loadedPart } });
        })
    );
}
```

**Selectors derive data from state:**
- `getCurrentNavigatedPart` — current book/chapter based on route
- `getTranslationIfInBookOrDefault` — resolves which translation to display
- `getBookTranslations` — extracts `verse_translations` array
- `getBookNavigation` — extracts `nav` object

### 4.4 How Templates Use Data (Critical for Schema Changes)

**Breadcrumbs** (`breadcrumbs.component.html`):
```html
<ng-container *ngFor="let crumb of book.data.crumbs">
    » <a [routerLink]="crumb.path" [innerHTML]="crumb.titles.en"></a>
</ng-container>
```
Uses: `crumb.path`, `crumb.titles.en`

**In-book reference** (`chapter-content.component.ts`):
```typescript
getInBookReference(chapter: Chapter, verse: Verse): string {
    let result = '';
    chapter.crumbs.forEach(crumb => {
        result += crumb.indexed_titles.en + ' ';
    });
    result += verse.part_type + ' ' + verse.local_index;
    return result;
}
```
Uses: `crumb.indexed_titles.en`, `verse.part_type`, `verse.local_index`

**Verse reference display** (`chapter-content.component.html`):
```html
<div>{{book.data.crumbs[0].titles.en}} {{verse.index}}</div>
```
Uses: `crumbs[0].titles.en`, `verse.index`

**Narrator chain** (`verse-text.component.html`):
```html
<ng-container *ngFor="let npart of verse.narrator_chain.parts" [ngSwitch]="npart.kind">
    <a *ngSwitchCase="'narrator'" [routerLink]="npart.path">{{npart.text}}</a>
    <ng-container *ngSwitchDefault>{{npart.text}}</ng-container>
</ng-container>
```
Uses: `npart.kind`, `npart.path`, `npart.text`
Does NOT use: `narrator_chain.text`

**Relations** (`chapter-content.component.html`):
```html
<div *ngFor="let relation of relations | keyvalue">
    <strong>{{relation.key}}</strong>:
    <app-path-link *ngFor="let rLink of relation.value" [path]="rLink"></app-path-link>
</div>
```
Uses: relation key as label ("Mentions"), values as paths

**Path-link** (`path-link.component.ts`):
```typescript
splitOnLastColon(path: string) { /* splits "/books/quran:1:1" → ["/books/quran:1", "1"] */ }
removeBookPrefix(path: string) { return path.substring(7); }  // Strips "/books/"
```
CRITICAL: Assumes paths start with `/books/` (7 chars).

**Co-Narrators table** (`people-content.component.html`):
```html
<ng-container *ngFor="let narrator_id of subchain.value.narrator_ids; let isLast=last">
    <a [routerLink]="['/people/narrators/' + narrator_id]">
        {{narratorIndex[narrator_id] ? narratorIndex[narrator_id].titles.ar : narrator_id}}
    </a>
    {{isLast ? '' : '&#10229;'}}
</ng-container>
<ol>
    <li *ngFor="let path of subchain.value.verse_paths">
        <app-path-link [path]="path"></app-path-link>
    </li>
</ol>
```
Uses: `subchain.value.narrator_ids`, `subchain.value.verse_paths`
Does NOT use: subchain key string

**Translation selector** (`translation-selection.component.html`):
```html
<mat-select (selectionChange)="selectedTranslation($event.value)" [ngModel]="translation$ | async">
    <mat-option *ngFor="let translation of translations" [value]="translation.id">
        {{translation.lang | expandLanguage}}: {{translation.name}}
    </mat-option>
</mat-select>
```
Uses: `translation.id`, `translation.lang`, `translation.name`

### 4.5 Routes

```typescript
{ path: 'books', component: BookDispatcherComponent }
{ path: 'books/:index', component: BookDispatcherComponent }
{ path: 'people/narrators/index', component: PeopleListComponent }
{ path: 'people/narrators/:index', component: PeopleContentComponent }
{ path: 'about', component: AboutComponent }
{ path: 'support', component: SupportComponent }
{ path: 'download', component: DownloadComponent }
{ path: '', redirectTo: '/books', queryParams: { lang: 'en' } }
```

Uses hash-based routing (`useHash: true`).

### 4.6 Running the Angular App

```bash
cd Thaqalayn
npm install
npm start     # http://localhost:4200, calls http://localhost:8888
npm test      # Karma unit tests
npm run build # Production build → dist/Thaqalayn/
```

---

## 5. CROSS-PROJECT DEPENDENCIES

### 5.1 Field Usage Map

This table maps each JSON field to where it's generated and consumed:

| Field | Generator (writes) | Angular (reads) | Notes |
|-------|-------------------|-----------------|-------|
| `data.crumbs[]` | `lib_model.py:56-61` | `breadcrumbs.component`, `chapter-content.component` | REQUIRED — displayed directly |
| `data.crumbs[].indexed_titles` | `lib_model.py:58` | `chapter-content.component.ts:34` | Used for in-book reference string |
| `data.crumbs[].titles` | `lib_model.py:59` | `breadcrumbs.component.html:5` | Displayed in breadcrumb bar |
| `data.crumbs[].path` | `lib_model.py:60` | `breadcrumbs.component.html:5` | Used for routerLink |
| `data.nav.prev/next/up` | `lib_model.py:64-68` | `books.state.ts:92-99` | Full Crumb objects, not IDs |
| `data.verse_translations[]` | `quran.py` | `books.state.ts:59-81`, `translation-selection` | Translation dropdown, per-chapter |
| `data.default_verse_translation_ids` | `quran.py` | `books.state.ts:68-70` | Default translation lookup |
| `verses[].narrator_chain.parts` | `kafi_narrators.py:99-116` | `verse-text.component.html:4-8` | Interactive narrator links |
| `verses[].narrator_chain.text` | `kafi_narrators.py:57` | **NOT USED in templates** | Can be safely removed |
| `verses[].relations` | `link_quran_kafi.py` | `chapter-content.component.html:27-31` | Cross-reference links |
| `verses[].part_type` | `lib_model.py` | `chapter-content.component.html:5-6` | Controls rendering (Hadith vs Heading) |
| `narrator.subchains` | `kafi_narrators.py:130-145` | `people-content.component` | Co-Narrators table |
| `narrator.subchains[].narrator_ids` | `kafi_narrators.py:138` | `people-content.component.html:43` | Chain display, narrator lookups |
| `narrator.subchains[].verse_paths` | `kafi_narrators.py:141` | `people-content.component.html:49` | Linked hadith paths |
| `narrator.verse_paths` | `kafi_narrators.py:133` | `people-content.component` | Narrated Ahadith table |

### 5.2 Constraints for Schema Changes

1. **All paths must start with `/books/`** — The `path-link` component does `path.substring(7)`
2. **Narrator paths must be `/people/narrators/{id}`** — Used for routerLink in narrator chain
3. **Relations must be `Record<string, string[]>`** — Keys displayed as headers, values as path-links
4. **`kind` field must be one of the known values** — Angular discriminates Book type on this
5. **`index` field in wrapper must match the path-based lookup key** — Used as state store key
6. **Narrator IDs are stable** — Referenced across hadiths, narrator files, and narrator index
7. **`verse_translations` must be `Translation[]` with `id`, `lang`, `name`** — Used for dropdown

---

## 6. KNOWN OPTIMIZATION OPPORTUNITIES

See `OPTIMIZATION_PLAN.md` for the full plan. Summary:

| Optimization | Savings | Complexity | Angular Changes? |
|-------------|---------|------------|-----------------|
| Remove `narrator_chain.text` | 30 MB | Trivial | None |
| Optimize subchains (full chains + pairs only) | 60 MB | Low | None |
| Extract translator metadata | 5 MB | Medium | Yes — new service |
| Remove breadcrumbs (derive client-side) | 35 MB | High | Yes — rebuild logic |
| Simplify navigation to IDs | 15 MB | Medium | Yes — resolve logic |
| Shorten field names | 20 MB | High | Yes — every file |

---

## 7. COMMON PATTERNS AND GOTCHAS

1. **Pydantic + FastAPI encoders** — The generator uses `fastapi.encoders.jsonable_encoder` for serialization, not plain `model.dict()`. This handles special types like `Set` → list conversion.

2. **`clean_nones()` in lib_db.py** — Recursively strips None values before writing JSON. Setting a field to None effectively removes it from output.

3. **`sort_keys=True` in json.dump** — Output JSON has alphabetically sorted keys. This affects field ordering in all output files.

4. **Complete files written last** — `kafi_narrators()` writes `complete/al-kafi.json` as its final step, after modifying all chapter objects in memory. Any changes to chapter data before this point will be reflected in the complete file.

5. **Narrator index loaded from previous runs** — `load_narrator_index()` reads existing `narrators/index.json` to preserve ID stability. On first run, it starts from empty.

6. **Angular uses hash routing** — URLs are like `/#/books/al-kafi:1:2:3`. The `#` is important for single-page app routing on Netlify.

7. **`DESTINATION_DIR` must be set** — The generator writes to this env var. If not set, it defaults to None and crashes. Use `add_data.ps1` or set manually.

8. **Quran has 27 translators, Al-Kafi has 2** — The `verse_translations` array size varies by book. Quran chapters repeat the full 27-translator array in every file.
