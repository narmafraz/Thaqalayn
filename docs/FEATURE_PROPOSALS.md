# Feature Proposals

> All proposals in this document adhere to the project's architecture philosophy documented in **[ARCHITECTURE.md](ARCHITECTURE.md)** — most importantly: zero ongoing costs, static-only hosting, build-time computation, and progressive enhancement.

---

## 1. Search

### Problem

The app has no search functionality. Users cannot search for Quran verses, hadith text, narrator names, or chapter titles. For a scripture reference app, this is the most impactful missing feature.

### Challenges

- **Data volume**: ~200 MB of actual text content (Arabic + English) across ~22,000 verses/hadiths
- **Arabic diacritics**: The same word appears with and without tashkeel (e.g., `كِتَابُ` vs `كتاب`). Search must normalize both
- **Multilingual**: Users search in Arabic, English, or both
- **Bandwidth**: A monolithic search index would be too large to download on mobile

### Recommended Approach: Orama + Static Split Indexes

**Library: [Orama](https://github.com/oramasearch/orama)** (Apache 2.0, open-source)

Why Orama over alternatives:
- Built-in Arabic stemming via `@orama/stemmers` (best-in-class among client-side libraries)
- Modern API, actively maintained, under 2 KB library size
- Supports full-text search, typo tolerance, filters, and facets
- Can export/import indexes for static file serving

**Architecture:**

```
Build Time (ThaqalaynDataGenerator)          Runtime (Angular App)
┌──────────────────────────┐                ┌──────────────────────────┐
│                          │                │                          │
│  Parse sources as usual  │                │  User opens search       │
│          │               │                │          │               │
│          ▼               │                │          ▼               │
│  Generate JSON data      │                │  Load titles index       │
│          │               │                │  (~500 KB, instant)      │
│          ▼               │                │          │               │
│  Build Orama indexes:    │                │          ▼               │
│  ┌─────────────────────┐ │                │  Show title/chapter      │
│  │ search/titles.json  │ │  ──Netlify──▶  │  matches as user types   │
│  │ search/quran-ar.json│ │    (static)    │          │               │
│  │ search/quran-en.json│ │                │  User hits "Search all"  │
│  │ search/kafi-ar.json │ │                │          │               │
│  │ search/kafi-en.json │ │                │          ▼               │
│  │ search/narrators.json│ │                │  Lazy-load relevant     │
│  └─────────────────────┘ │                │  full-text index         │
│                          │                │  (one-time ~8-12 MB      │
│  Apply Arabic            │                │   with gzip)             │
│  normalization:          │                │          │               │
│  - Strip diacritics      │                │          ▼               │
│  - Normalize hamza       │                │  Run Orama query         │
│  - Normalize teh marbuta │                │  client-side             │
│  - Remove tatweel        │                │          │               │
│                          │                │          ▼               │
│                          │                │  Display results with    │
│                          │                │  highlighted matches     │
└──────────────────────────┘                └──────────────────────────┘
```

**Index files** (served as static JSON from Netlify CDN):

| File | Contents | Est. Size (gzipped) |
|------|----------|-------------------|
| `search/titles.json` | Chapter/book titles, all languages | ~100 KB |
| `search/narrators.json` | Narrator names and verse paths | ~500 KB |
| `search/quran-ar.json` | Arabic Quran verse text | ~1 MB |
| `search/quran-en.json` | English Quran translations | ~1 MB |
| `search/kafi-ar.json` | Arabic Al-Kafi hadith text | ~5-10 MB |
| `search/kafi-en.json` | English Al-Kafi translations | ~5-10 MB |

**Search UX:**

1. User types in search box
2. Immediately search `titles.json` (always loaded) for chapter/book matches
3. On "full search" or after a short debounce, lazy-load the relevant corpus index (by current book context and language)
4. Run Orama full-text query client-side
5. Display results grouped by book, with highlighted matching text and verse paths as links

**Arabic normalization** at both index-time and query-time using [arajs](https://github.com/mdanok/arajs):
- Strip harakat/tashkeel so `كِتَابُ` matches `كتاب`
- Normalize hamza forms (ء إ أ آ ؤ ئ → ا)
- Normalize teh marbuta (ة → ه)
- Normalize alef maksura (ى → ي)
- Remove tatweel/kashida (ـ)

### Alternative: Pagefind (If Bandwidth Is Critical)

[Pagefind](https://pagefind.app/) uses a chunked index architecture where each search query downloads only ~100-500 KB of index fragments, regardless of total corpus size. This would be better for users on very slow mobile connections, but lacks Arabic stemming (exact match only) and requires generating HTML from JSON at build time.

Could be added as a Phase 2 complement to Orama if bandwidth becomes a concern.

### Alternative: Orama Cloud (Hosted Backup)

[Orama Cloud](https://orama.com/) offers a free tier: 3 indexes, 100K documents each, unlimited searches, no credit card. This could serve as a hosted backup or alternative to client-side search. However, it introduces a dependency on a third-party service — if Orama changes pricing, search breaks. Use only as an optional enhancement, not the primary path.

---

## 2. Offline / PWA Support

### Problem

Users cannot access content without an internet connection. For a scripture reading app, offline access is a core expectation.

### Recommended Approach: Angular PWA

```bash
ng add @angular/pwa
```

This adds a service worker that caches:
- **App shell** (HTML, CSS, JS) — always cached, app loads instantly
- **Recently visited JSON files** — cache-on-read strategy, so pages you've visited work offline
- **Font files and images** — cached on first load

**Not cached by default** (too large): The full 485 MB data corpus. Instead, offer a "Download for offline" button per book that stores selected content in IndexedDB.

**Important notes:**
- Netlify provides HTTPS automatically (required for service workers)
- Safari caps service worker storage after 7 days for sites not added to home screen — prompt users to "Add to Home Screen"

**Cost: Free.**

---

## 3. Bookmarks, Notes & Reading Progress

### Problem

Users have no way to save their place, bookmark important verses, or add personal notes.

### Recommended Approach: IndexedDB via Dexie.js

All user data stored locally in the browser using [Dexie.js](https://dexie.org/) (a clean wrapper around IndexedDB):

```typescript
// Schema
interface Bookmark {
  path: string;        // e.g., "/books/al-kafi:1:2:3:4"
  title: string;       // cached display title
  createdAt: Date;
  tags?: string[];     // user-defined categories
}

interface Note {
  path: string;
  text: string;        // user's annotation
  createdAt: Date;
  updatedAt: Date;
}

interface ReadingProgress {
  bookPath: string;    // e.g., "/books/quran" or "/books/al-kafi"
  lastPath: string;    // last visited chapter/verse path
  lastVisited: Date;
  percentage?: number; // estimated progress through the book
}
```

**Features:**
- Bookmark any verse/chapter with one click
- Add free-text notes to any verse
- Auto-save reading position on navigation
- "Continue reading" button on homepage
- All data stored in browser, survives page refreshes, no server needed
- Storage limit: hundreds of MB (far more than needed)

**Optional future enhancement:** Cross-device sync via Firebase Realtime Database free tier (1 GB storage, 10 GB/month transfer, no credit card, free indefinitely). This would be an opt-in feature requiring a Google sign-in.

**Cost: Free.**

---

## 4. Audio Recitation (Quran)

### Problem

Many Quran apps offer audio recitation. This is a frequently expected feature for Quran reading.

### Recommended Approach: EveryAyah API

[EveryAyah.com](https://everyayah.com/) provides free, direct MP3 files for every ayah with 26+ reciters. URLs follow a predictable pattern:

```
https://everyayah.com/data/{reciter}/{surah_padded}{ayah_padded}.mp3
```

Example: Surah 2, Ayah 255 by Mishary Rashid Alafasy:
```
https://everyayah.com/data/Alafasy_128kbps/002255.mp3
```

**Features:**
- Play/pause per ayah
- Continuous playback through a surah
- Reciter selection dropdown
- No API key, no rate limits, no authentication

**Alternative APIs:**
- [Al Quran Cloud API](https://alquran.cloud/api) — verse-by-verse audio, multiple reciters, multiple formats
- [QuranicAudio.com](https://quranicaudio.com/) — high-quality streaming/download

**Cost: Free.**

---

## 5. Tafsir (Commentary) Integration

### Problem

Users reading Quran verses may want to see scholarly commentary (tafsir) alongside the text.

### Recommended Approach: Tafsir API

[Tafsir API](https://github.com/spa5k/tafsir_api) provides 25+ tafsirs in multiple languages. No API key, no rate limits.

**UX:** Add a "Tafsir" toggle or expandable section below each Quran verse. When expanded, fetch commentary for that ayah from the API and display inline.

**Fallback:** If the API goes down, the feature simply doesn't show — core reading is unaffected.

**Cost: Free.**

---

## 6. Social Sharing

### Problem

Users may want to share specific verses or hadiths with others.

### Recommended Approach: Web Share API + Shareable URLs

The app already has hash-based URLs that uniquely identify every verse (e.g., `https://thaqalayn.netlify.app/#/books/quran:2:255`).

**Features:**
- "Share" button on each verse that uses `navigator.share()` (native sharing on mobile)
- Copy-to-clipboard fallback on desktop
- Optional: Generate verse card images client-side using `html2canvas` for sharing on social media

**Cost: Free.**

---

## Implementation Priority

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 1 | **Search** (Orama + static indexes) | High | Highest — most requested missing feature |
| 2 | **Offline/PWA** | Low | High — `ng add @angular/pwa` is mostly automatic |
| 3 | **Bookmarks & Reading Progress** | Medium | High — core reading UX improvement |
| 4 | **Audio Recitation** | Medium | Medium — expected for Quran apps |
| 5 | **Social Sharing** | Low | Medium — shareable URLs already exist |
| 6 | **Tafsir** | Medium | Medium — adds scholarly depth |
| 7 | **Notes/Annotations** | Medium | Lower — power user feature |
| 8 | **Cross-device Sync** | High | Lower — requires Firebase, adds complexity |

---

## Rejected Approaches

| Approach | Why Rejected |
|----------|-------------|
| Algolia free tier | 10K searches/month — too restrictive for a public app |
| Meilisearch/Typesense Cloud | Trial only, no permanent free tier |
| Supabase | 7-day inactivity pause — deal-breaker for a public app |
| Cloudflare Workers + D1 | Adds a second platform; 10ms CPU limit is tight for search; more infrastructure to maintain |
| Fuse.js | Iterates entire dataset on every query — too slow for 22K+ documents |
| Lunr.js | No Arabic support, no chunked loading, maintenance mode |
| Stork Search | Abandoned project |
| Vercel Edge Functions | Non-commercial restriction on free tier |

---

## References

### Search Libraries
- [Orama](https://github.com/oramasearch/orama) — Full-text search with Arabic stemming
- [FlexSearch](https://github.com/nextapps-de/flexsearch) — High-performance search (existing PoC in project)
- [Pagefind](https://pagefind.app/) — Chunked static search indexes
- [arajs](https://github.com/mdanok/arajs) — Arabic text normalization

### Free APIs
- [EveryAyah](https://everyayah.com/) — Free Quran audio per ayah
- [Al Quran Cloud API](https://alquran.cloud/api) — Quran text and audio
- [Tafsir API](https://github.com/spa5k/tafsir_api) — 25+ tafsirs
- [Orama Cloud](https://orama.com/) — Free hosted search (100K docs, unlimited queries)

### Client-Side Storage
- [Dexie.js](https://dexie.org/) — IndexedDB wrapper for bookmarks/notes
- [Firebase Realtime Database](https://firebase.google.com/pricing) — Free tier for optional cloud sync
