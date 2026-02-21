# ThaqalaynData Optimization Plan

## Cross-Project Implementation Guide

This document provides a complete plan for optimizing the data model across all 3 projects. An agent should be able to pick this up and make coordinated changes across all projects simultaneously.

### Projects

| Project | Path | Language | Purpose |
|---------|------|----------|---------|
| **ThaqalaynDataGenerator** | `../ThaqalaynDataGenerator/` | Python (Pydantic models) | Generates JSON data files from source HTML/XML |
| **ThaqalaynData** | `../ThaqalaynData/` | JSON data files | Static API deployed to Netlify |
| **Thaqalayn** | `../Thaqalayn/` | Angular/TypeScript | Web UI that consumes the JSON API |

### Current State

- **Total data size:** 485 MB across 7,348 JSON files
- **Biggest waste:** Narrator subchain explosion (101 MB could be ~30 MB)
- **Pure duplication:** complete/ directory (133 MB) — kept per user preference
- **Repeated metadata:** Translator arrays, breadcrumbs, nav objects in every file

---

## PART 1: WHAT TO OPTIMIZE

### 1.1 Narrator Subchain Explosion (71 MB savings)

**THE SINGLE BIGGEST OPTIMIZATION OPPORTUNITY**

**Current Problem:** In `kafi_narrators.py`, the `getCombinations()` function generates all contiguous subsequences of a narrator chain. A chain of 5 narrators [1,2,3,4,5] produces 10 subchain entries, each duplicating narrator_ids and verse_paths.

**Current code** (`ThaqalaynDataGenerator/app/kafi_narrators.py`, lines 117-128):
```python
def getCombinations(lst) -> Dict[int, List[List[int]]]:
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
```

**Current output** (`ThaqalaynData/people/narrators/36.json` — 4.4 MB):
```json
{
  "data": {
    "subchains": {
      "10-11-36": {
        "narrator_ids": [10, 11, 36],
        "verse_paths": ["/books/al-kafi:6:7:15:3"]
      },
      "10-11-36-8": {
        "narrator_ids": [10, 11, 36, 8],
        "verse_paths": ["/books/al-kafi:6:7:15:3"]
      },
      "10-11-36-8-19": {
        "narrator_ids": [10, 11, 36, 8, 19],
        "verse_paths": ["/books/al-kafi:6:7:15:3"]
      }
    }
  }
}
```

**Problem:** Same verse path `/books/al-kafi:6:7:15:3` appears 3 times. Same narrator IDs [10, 11, 36] are a subset of all three entries. This compounds across 15,000+ hadiths.

**How Angular uses subchains** (`Thaqalayn/src/app/components/people-content/people-content.component.ts`, lines 32-35):
```typescript
const subchainsData = Object.entries(narrator.subchains)
  .map(([key, value]) => ({ key, value }))
  .sort(this.sortByNumberOfNarrators);
```

**Template** (`people-content.component.html`, lines 42-54):
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

**Key insight:** The Angular app only needs:
- `subchain.value.narrator_ids` — array of narrator IDs
- `subchain.value.verse_paths` — array of verse paths
- It does NOT use the subchain key string (e.g., "10-11-36")

**Proposed optimization:** Store only full chains (not all subchain prefixes). The Angular app can derive subchains client-side if needed, or we restructure the display to show full chains grouped by verse.

---

### 1.2 Translator Metadata Duplication (5 MB savings)

**Current:** Every Quran chapter file contains the full `verse_translations` array (27 Translation objects). This is identical across all 114 chapters.

**Angular usage** (`Thaqalayn/src/store/books/books.state.ts`, lines 59-81):
```typescript
@Selector([BooksState, BooksState.getCurrentNavigatedPart, RouterState.getLanguage, RouterState.getTranslation])
public static getTranslationIfInBookOrDefault(state: BooksStateModel, book: Book, language: string, translation: string): string {
    const verseTranslations = getVerseTranslations(book);
    // ... selects from verseTranslations
}
```

The app reads `book.data.verse_translations` to populate the translation dropdown. Since this is identical for all Quran chapters, it could be loaded once globally.

---

### 1.3 Breadcrumb Duplication (~35 MB)

**Angular usage** (`Thaqalayn/src/app/components/breadcrumbs/breadcrumbs.component.html`, line 5):
```html
<ng-container *ngFor="let crumb of book.data.crumbs"> » <a [routerLink]="crumb.path"
    queryParamsHandling="preserve" [innerHTML]="crumb.titles.en"></a></ng-container>
```

And critically in `chapter-content.component.ts` (lines 32-38):
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

**Required fields from each crumb:**
- `crumb.titles.en` — displayed in breadcrumb navigation
- `crumb.indexed_titles.en` — used for in-book reference strings (e.g., "Volume 1 Book 2 Chapter 3")
- `crumb.path` — used for routerLink navigation

**Conclusion:** Breadcrumbs MUST be kept in each file OR the Angular app needs a metadata service to reconstruct them.

---

### 1.4 Navigation Object Duplication (~15 MB)

**Angular usage** (`Thaqalayn/src/store/books/books.state.ts`, lines 92-99):
```typescript
@Selector([BooksState, BooksState.getCurrentNavigatedPart])
public static getBookNavigation(state: BooksStateModel, book: Book): Navigation {
    const chapter = getChapter(book);
    if (chapter && chapter.nav) {
      return chapter.nav;
    }
    return undefined;
}
```

The `Navigation` interface (`Thaqalayn/src/app/models/book.ts`):
```typescript
export interface Navigation {
  prev: Crumb;
  next: Crumb;
  up: Crumb;
}
```

Each nav entry is a full `Crumb` object (titles, indexed_titles, path). The app uses these directly — there's no lookup by ID.

**Conclusion:** Navigation objects MUST be kept as full Crumb objects OR the Angular app needs to resolve IDs to metadata.

---

### 1.5 Narrator Chain Text Duplication (~30 MB)

**Current structure:** Each hadith's `narrator_chain` has both `parts` (structured) and `text` (concatenated string).

**Angular usage** (`verse-text.component.html`, lines 3-9):
```html
<p class="verseText arabic" *ngIf="verse.narrator_chain">
  <ng-container *ngFor="let npart of verse.narrator_chain.parts" [ngSwitch]="npart.kind">
    <a *ngSwitchCase="'narrator'" [routerLink]="npart.path" queryParamsHandling="preserve">{{npart.text}}</a>
    <ng-container *ngSwitchDefault>{{npart.text}}</ng-container>
  </ng-container>
</p>
```

**Finding:** The template ONLY uses `narrator_chain.parts`. The `narrator_chain.text` field is NOT used in any Angular template or component. It exists only as a data artifact from the generator.

**Conclusion:** `narrator_chain.text` CAN be safely removed — Angular only uses `.parts`.

---

### 1.6 Path Prefix in Relations and Verse Paths

**The path-link component** (`Thaqalayn/src/app/components/path-link/path-link.component.ts`):
```typescript
splitOnLastColon(path: string) { /* splits on last : */ }
removeBookPrefix(path: string) { return path.substring(7); }  // removes "/books/"
```

**CRITICAL:** The path-link component calls `path.substring(7)` which assumes paths start with `/books/`. If we remove this prefix from the data, this component MUST be updated.

**Current:** `verse_paths` in narrator files and `relations` in verse files all use full paths like `/books/al-kafi:1:2:3:4`.

---

## PART 2: IMPLEMENTATION PLAN

### Tier 1: Safe Optimizations (No Angular Changes)

These changes only affect the generator and the output data. The Angular app continues to work unchanged.

#### Change 1: Remove `narrator_chain.text` from hadith files

**Generator change** (`ThaqalaynDataGenerator/app/kafi_narrators.py`):

In the `extract_narrators()` function (line 57-58), the concatenated text is stored:
```python
hadith.narrator_chain.text = narrators_text
```

**Action:** After all narrator processing is complete and `add_narrator_links()` has built the `.parts` array, set `.text = None` so it won't be serialized.

**Specific change in `process_chapter_verses()`** (line 152-161):
```python
def process_chapter_verses(chapter: Chapter, narrator_index, narrators):
    for hadith in chapter.verses:
        if len(hadith.text) < 1:
            continue
        hadith.text[0] = SPAN_PATTERN.sub("", hadith.text[0])
        try:
            narrator_names = extract_narrators(hadith)
            narrator_ids = assign_narrator_id(narrator_names, narrator_index)
            add_narrator_links(hadith, narrator_ids, narrator_index)
            update_narrators(hadith, narrator_ids, narrators, narrator_index)
            # ADD THIS LINE: Remove concatenated text (Angular only uses .parts)
            if hadith.narrator_chain:
                hadith.narrator_chain.text = None
        except Exception as e:
            logger.error('Ran into exception with hadith at ' + hadith.path)
            raise e
```

**Angular impact:** NONE. Template only uses `narrator_chain.parts`, never `.text`.

**Estimated savings:** ~30 MB

---

#### Change 2: Optimize narrator subchain generation

**Current generator code** (`ThaqalaynDataGenerator/app/kafi_narrators.py`):

The `getCombinations()` function (line 117-128) generates ALL contiguous subsequences. The `update_narrators()` function (line 130-145) stores every subchain for every narrator.

**Option A: Store only full chains + pairs**

Replace `getCombinations()` to only generate the full chain and direct pairs (2-narrator sequences). This preserves the "Co-Narrators" feature while eliminating the explosive growth from longer subsequences.

```python
def getCombinations(lst) -> Dict[int, List[List[int]]]:
    """Generate only full chain and direct pairs (not all subsequences)"""
    result = {}

    # Full chain
    if len(lst) > 1:
        full_key = '-'.join(str(n) for n in lst)
        for n in lst:
            if n not in result:
                result[n] = []
            result[n].append((full_key, lst))

    # Direct pairs (consecutive narrators only)
    for i in range(len(lst) - 1):
        pair = [lst[i], lst[i + 1]]
        pair_key = '-'.join(str(n) for n in pair)
        for n in pair:
            if n not in result:
                result[n] = []
            result[n].append((pair_key, pair))

    return result
```

**Why pairs matter:** The `compose_narrator_metadata()` function (line 227-234) uses 2-chains to compute `narrated_from` and `narrated_to` counts:
```python
two_chains = [x for x in narrator.subchains.values() if len(x.narrator_ids) == 2]
narrated_to = [x for x in two_chains if x.narrator_ids[0] == narrator.index]
narrated_from = [x for x in two_chains if x.narrator_ids[1] == narrator.index]
```

So pairs MUST be preserved for the narrator index metadata to remain accurate.

**Angular impact:** The Co-Narrators table will show full chains + direct pairs instead of all possible subchains. This is actually a UX improvement — fewer redundant entries, more meaningful groupings.

**Estimated savings:** ~60 MB (narrator files shrink dramatically)

**Option B: Store only full chains (more aggressive)**

Only store the complete chain, no subsequences at all. Angular component shows full transmission chains instead of subchain pairs.

This requires updating `compose_narrator_metadata()` to compute pair relationships from full chains:
```python
def compose_narrator_metadata(name: str, narrator: Narrator) -> dict:
    result = {}
    result['titles'] = {}
    result['titles'][Language.AR.value] = name
    result['narrations'] = len(narrator.verse_paths)

    # Compute from full chains instead of pre-built pairs
    narrated_to = 0
    narrated_from = 0
    for chain in narrator.subchains.values():
        ids = chain.narrator_ids
        for i in range(len(ids) - 1):
            if ids[i] == narrator.index:
                narrated_to += 1
            if ids[i + 1] == narrator.index:
                narrated_from += 1

    result['narrated_from'] = narrated_from
    result['narrated_to'] = narrated_to
    return result
```

**Angular impact:** Co-Narrators table shows full chains only. May need Angular template adjustment to display nicely.

**Estimated savings:** ~71 MB

---

### Tier 2: Moderate Optimizations (Requires Angular Changes)

These changes require coordinated updates to both the generator and the Angular app.

#### Change 3: Extract translator metadata to shared file

**Generator changes:**

Add a new step in `main_add.py` after `init_quran()` to generate `_meta/translators.json`:

```python
# In ThaqalaynDataGenerator/app/main_add.py, add after init_quran():
def generate_translator_metadata(quran_root: Chapter):
    """Extract translators from Quran root and write to _meta/translators.json"""
    translators = {}
    # Walk through first chapter to get verse_translations
    first_chapter = quran_root.chapters[0]
    for trans in first_chapter.verse_translations:
        translators[trans.id] = {
            "id": trans.id,
            "lang": trans.lang,
            "name": trans.name
        }

    write_file("/_meta/translators", {
        "index": "translators",
        "kind": "translator_list",
        "data": {"translators": translators}
    })
```

Then remove `verse_translations` from individual chapter files by setting it to None after the metadata file is generated.

**Angular changes:**

1. Create `MetadataService` to load `_meta/translators.json` once:

```typescript
// Thaqalayn/src/app/services/metadata.service.ts
@Injectable({ providedIn: 'root' })
export class MetadataService {
  private translators$ = this.http.get<any>(`${environment.apiBaseUrl}_meta/translators.json`)
    .pipe(shareReplay(1));

  getTranslators(): Observable<Translation[]> {
    return this.translators$.pipe(
      map(data => Object.values(data.data.translators))
    );
  }

  constructor(private http: HttpClient) {}
}
```

2. Update `BooksState` to use MetadataService when `book.data.verse_translations` is null:

```typescript
// In books.state.ts, modify getBookTranslations selector:
@Selector([BooksState, BooksState.getCurrentNavigatedPart])
public static getBookTranslations(state: BooksStateModel, book: Book): Translation[] {
    const verseTranslations = getVerseTranslations(book);
    if (verseTranslations) {
      return verseTranslations;
    }
    // Fallback: load from metadata service (requires injecting)
    return [];
}
```

**Estimated savings:** ~5 MB

---

#### Change 4: Remove breadcrumbs, reconstruct client-side

**Generator changes:**

In `lib_model.py`, the `set_index()` function (lines 56-61) builds breadcrumbs:
```python
subchapter.crumbs = copy.copy(chapter.crumbs)
crumb = Crumb()
crumb.indexed_titles = { Language.EN.value: subchapter.part_type.name + ' ' + str(subchapter.local_index) }
crumb.titles = subchapter.titles
crumb.path = subchapter.path
master_index[subchapter.path] = crumb
subchapter.crumbs.append(crumb)
```

**Action:** After all indexing is complete, set `chapter.crumbs = None` on every chapter before writing. The `master_index` dict already stores all crumb data indexed by path.

**Also generate a crumbs lookup file:**
```python
# Write master_index as /books/crumbs.json
crumbs_data = {path: jsonable_encoder(crumb) for path, crumb in master_index.items()}
write_file("/books/crumbs", {"index": "crumbs", "kind": "crumbs_index", "data": crumbs_data})
```

**Angular changes:**

1. Load crumbs index once:
```typescript
// Thaqalayn/src/app/services/metadata.service.ts
private crumbs$ = this.http.get<any>(`${environment.apiBaseUrl}books/crumbs.json`)
  .pipe(shareReplay(1));

buildBreadcrumbs(path: string): Observable<Crumb[]> {
  return this.crumbs$.pipe(
    map(data => {
      const parts = path.split(':');
      const crumbs: Crumb[] = [];
      let currentPath = '/books/' + parts[0]; // e.g., "/books/al-kafi"
      for (let i = 0; i <= parts.length; i++) {
        if (data.data[currentPath]) {
          crumbs.push(data.data[currentPath]);
        }
        if (i < parts.length - 1) {
          currentPath += ':' + parts[i + 1];
        }
      }
      return crumbs;
    })
  );
}
```

2. Update `breadcrumbs.component.ts` to use the service instead of `book.data.crumbs`.

3. Update `chapter-content.component.ts` `getInBookReference()` to use the service.

**Estimated savings:** ~35 MB

---

#### Change 5: Simplify navigation to IDs

**Generator changes:**

In `lib_model.py` (lines 63-69), navigation is set as full Crumb objects:
```python
subchapter.nav = Navigation()
if prev_chapter:
    subchapter.nav.prev = prev_chapter.crumbs[-1]
    prev_chapter.nav.next = crumb
if len(subchapter.crumbs) >= 2:
    subchapter.nav.up = subchapter.crumbs[-2]
```

**Action:** Store only the path string, not the full Crumb:
```python
subchapter.nav = Navigation()
if prev_chapter:
    subchapter.nav.prev = prev_chapter.crumbs[-1].path  # Just the path
    prev_chapter.nav.next = crumb.path
if len(subchapter.crumbs) >= 2:
    subchapter.nav.up = subchapter.crumbs[-2].path
```

This requires changing the `Navigation` model in `models/crumb.py`:
```python
class Navigation(BaseModel):
    prev: str = None   # Changed from Crumb to str (path)
    next: str = None
    up: str = None
```

**Angular changes:**

1. Update `Navigation` interface in `models/book.ts`:
```typescript
export interface Navigation {
  prev: string;  // path string instead of Crumb
  next: string;
  up: string;
}
```

2. Update the navigation component (wherever nav buttons are rendered) to look up Crumb metadata from the crumbs index (Change 4).

**Estimated savings:** ~15 MB

---

#### Change 6: Shorten field names

**Generator changes:**

Add a field name mapping step before writing JSON. In `lib_db.py`, modify `write_file()` or add a post-processing step:

```python
FIELD_RENAMES = {
    "indexed_titles": "it",
    "verse_start_index": "vs",
    "verse_count": "vc",
    "local_index": "li",
    "part_type": "pt",
    "verse_translations": "vt",
    "default_verse_translation_ids": "dvt",
    "narrator_chain": "nc",
    "narrator_ids": "nids",
    "verse_paths": "vps",
}

def rename_fields(obj):
    """Recursively rename fields in a dict"""
    if isinstance(obj, dict):
        return {FIELD_RENAMES.get(k, k): rename_fields(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [rename_fields(item) for item in obj]
    return obj
```

Apply in `write_file()`:
```python
def write_file(path: str, obj):
    clean_obj = clean_nones(obj)
    clean_obj = rename_fields(clean_obj)  # ADD THIS LINE
    # ... rest of write logic
```

**Angular changes:**

Update ALL TypeScript interfaces to match shortened field names:

```typescript
// models/book.ts
export interface Crumb {
  titles: MultiLingualText;
  it: MultiLingualText;        // was: indexed_titles
  path: string;
}

export interface Verse {
  index: number;
  li: number;                  // was: local_index
  path: string;
  text: string[];
  translations: Record<string, string[]>;
  pt: string;                  // was: part_type
  relations: Record<string, string[]>;
  nc: NarratorChain;           // was: narrator_chain
}

export interface Chapter {
  index: string;
  li: string;                  // was: local_index
  path: string;
  titles: MultiLingualText;
  descriptions: MultiLingualText;
  vc: number;                  // was: verse_count
  vs: number;                  // was: verse_start_index
  // ... etc.
}
```

And update all template references (`book.data.crumbs` → still `crumbs`, `verse.part_type` → `verse.pt`, etc.).

**Estimated savings:** ~20 MB

**NOTE:** This is the most invasive change and touches every file in all 3 projects. Consider doing this last.

---

## PART 3: RECOMMENDED IMPLEMENTATION ORDER

### Phase 1: Generator-Only Changes (No Angular Impact)

**Estimated savings: 90 MB (19% reduction)**

| Step | Change | File | Savings | Risk |
|------|--------|------|---------|------|
| 1a | Remove `narrator_chain.text` | `kafi_narrators.py` (line 161) | 30 MB | None — Angular doesn't use it |
| 1b | Optimize subchains (Option A: full chains + pairs) | `kafi_narrators.py` (lines 117-145) | 60 MB | Low — Co-Narrators still works |

**Implementation for Step 1a:**

In `ThaqalaynDataGenerator/app/kafi_narrators.py`, add one line at the end of `process_chapter_verses()`:

```python
def process_chapter_verses(chapter: Chapter, narrator_index, narrators):
    for hadith in chapter.verses:
        if len(hadith.text) < 1:
            logger.warn("No Arabic text found in %s", hadith.path)
            continue
        hadith.text[0] = SPAN_PATTERN.sub("", hadith.text[0])
        try:
            narrator_names = extract_narrators(hadith)
            narrator_ids = assign_narrator_id(narrator_names, narrator_index)
            add_narrator_links(hadith, narrator_ids, narrator_index)
            update_narrators(hadith, narrator_ids, narrators, narrator_index)
            # NEW: Remove concatenated text since Angular only uses .parts
            if hadith.narrator_chain:
                hadith.narrator_chain.text = None
        except Exception as e:
            logger.error('Ran into exception with hadith at ' + hadith.path)
            raise e
```

**Implementation for Step 1b:**

In `ThaqalaynDataGenerator/app/kafi_narrators.py`, replace `getCombinations()`:

```python
def getCombinations(lst) -> Dict[int, List[List[int]]]:
    """Generate only full chain and direct pairs (not all subsequences).

    Full chains preserve the complete transmission record.
    Direct pairs preserve narrated_from/narrated_to metadata accuracy.
    """
    result = {}

    # Full chain (always include)
    if len(lst) > 1:
        full_key = '-'.join(str(n) for n in lst)
        for n in lst:
            if n not in result:
                result[n] = []
            result[n].append((full_key, lst))

    # Direct pairs (consecutive narrators only — needed for metadata)
    for i in range(len(lst) - 1):
        pair = [lst[i], lst[i + 1]]
        pair_key = '-'.join(str(n) for n in pair)
        for n in pair:
            if n not in result:
                result[n] = []
            result[n].append((pair_key, pair))

    return result
```

**After Phase 1:** Re-run the generator, verify output, check that:
- All narrator files are present
- Narrator index metadata (narrations, narrated_from, narrated_to) is correct
- Angular Co-Narrators table displays chains correctly
- Narrator chain text is not rendered in the UI (it shouldn't be since Angular uses .parts)

---

### Phase 2: Coordinated Generator + Angular Changes

**Estimated additional savings: 55 MB (11% reduction)**

| Step | Change | Generator Files | Angular Files | Savings |
|------|--------|----------------|---------------|---------|
| 2a | Extract translator metadata | `main_add.py`, `lib_db.py` | `metadata.service.ts` (new), `books.state.ts` | 5 MB |
| 2b | Remove breadcrumbs | `lib_model.py`, `lib_db.py` | `metadata.service.ts`, `breadcrumbs.component.*`, `chapter-content.component.ts` | 35 MB |
| 2c | Simplify navigation | `models/crumb.py`, `lib_model.py` | `models/book.ts`, navigation component | 15 MB |

**These changes are interdependent** — breadcrumb removal (2b) and navigation simplification (2c) both require the crumbs index file, so they should be done together.

---

### Phase 3: Field Name Shortening (Optional)

**Estimated additional savings: 20 MB (4% reduction)**

This is the most invasive change. Every TypeScript interface, every template reference, every Python model would need updating. Only do this if the savings justify the effort.

---

## PART 4: CRITICAL CONSTRAINTS

### Path Format Dependencies

The `path-link` component in Angular does `path.substring(7)` to remove `/books/` prefix:
```typescript
removeBookPrefix(path: string) { return path.substring(7); }
```

**ALL paths in `verse_paths`, `relations`, and `crumb.path` MUST start with `/books/`** unless this component is also updated.

### Relations Format

Relations in verses use `Record<string, string[]>` where keys are relation types:
```json
{
  "relations": {
    "Mentioned In": ["/books/al-kafi:1:2:1:6"],
    "Mentions": ["/books/quran:9:122"]
  }
}
```

The Angular template iterates with `| keyvalue` pipe, displaying keys as headers. This format must be preserved.

### Narrator Chain Parts Format

Each part must have:
- `kind`: "narrator" or "plain"
- `text`: the Arabic text content
- `path`: (narrator only) full path like `/people/narrators/100`

The Angular template uses `npart.kind`, `npart.text`, and `npart.path` directly.

### Complete Files

`books/complete/al-kafi.json` (88 MB) and `books/complete/quran.json` (46 MB) are kept per user preference. The generator writes these at the end of `kafi_narrators()`:
```python
write_file("/books/complete/al-kafi", jsonable_encoder(kafi))
```

Note: The complete file is written AFTER narrator processing, so it will reflect all changes made in Phase 1.

### Narrator Index

`people/narrators/index.json` is loaded by Angular to populate narrator names in the Co-Narrators table. The `compose_narrator_metadata()` function must continue to produce accurate `narrated_from` and `narrated_to` counts.

---

## PART 5: VERIFICATION CHECKLIST

After each phase, verify:

### Data Integrity
- [ ] All 6,236 Quran verses present
- [ ] All 15,281 Al-Kafi hadiths present
- [ ] All narrator files present (check count matches before/after)
- [ ] All Quran ↔ Hadith cross-references preserved
- [ ] Complete files regenerated correctly
- [ ] Narrator index metadata (narrations, narrated_from, narrated_to) matches

### Angular App Functionality
- [ ] Breadcrumbs display correctly on all pages
- [ ] Navigation (next/prev/up) works between chapters
- [ ] Translation selector dropdown populates
- [ ] Narrator chain displays with clickable links
- [ ] Narrator profile page loads
- [ ] Co-Narrators table displays and is searchable
- [ ] Verse paths in narrator profile link correctly
- [ ] Relations (Mentions/Mentioned In) display and link correctly
- [ ] In-book reference strings display correctly

### Size Verification
- [ ] Measure total data size after each phase
- [ ] Compare largest narrator files before/after (narrators 36, 19, 4, 20)
- [ ] Verify complete/ files reflect optimization changes

---

## PART 6: FILE-BY-FILE CHANGE MAP

### ThaqalaynDataGenerator Changes

| File | Change | Phase |
|------|--------|-------|
| `app/kafi_narrators.py` line 161 | Add `hadith.narrator_chain.text = None` | 1a |
| `app/kafi_narrators.py` lines 117-128 | Replace `getCombinations()` | 1b |
| `app/main_add.py` | Add `generate_translator_metadata()` call | 2a |
| `app/lib_db.py` | Add translator metadata write function | 2a |
| `app/lib_model.py` lines 56-61 | Optionally remove crumbs, generate index | 2b |
| `app/models/crumb.py` | Change Navigation fields from Crumb to str | 2c |

### ThaqalaynData Changes

| File/Directory | Change | Phase |
|---------------|--------|-------|
| All `people/narrators/*.json` | Regenerated (smaller subchains) | 1b |
| All `books/al-kafi/**/*.json` | Regenerated (no narrator_chain.text) | 1a |
| `books/complete/al-kafi.json` | Regenerated (reflects all changes) | 1a, 1b |
| `_meta/translators.json` | NEW file | 2a |
| `books/crumbs.json` | NEW file | 2b |

### Thaqalayn (Angular) Changes

| File | Change | Phase |
|------|--------|-------|
| `src/app/services/metadata.service.ts` | NEW file — loads shared metadata | 2a, 2b |
| `src/store/books/books.state.ts` | Use MetadataService for translations | 2a |
| `src/app/components/breadcrumbs/breadcrumbs.component.*` | Use MetadataService for crumbs | 2b |
| `src/app/components/chapter-content/chapter-content.component.ts` | Update getInBookReference() | 2b |
| `src/app/models/book.ts` | Update Navigation interface | 2c |

---

## PART 7: EXPECTED TOTAL SAVINGS

| Phase | Savings | Cumulative | % Reduction |
|-------|---------|------------|-------------|
| Phase 1 (Generator only) | 90 MB | 395 MB | 19% |
| Phase 2 (Generator + Angular) | 55 MB | 340 MB | 30% |
| Phase 3 (Field names, optional) | 20 MB | 320 MB | 34% |
| **TOTAL** | **165 MB** | **320 MB** | **34%** |
