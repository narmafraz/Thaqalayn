# SEO Roadmap

> **Created:** 2026-04-24
> **Last updated:** 2026-04-25 (Track A + Track B + GEO/CWV/E-E-A-T quick wins shipped)
> **Last verified against source code:** 2026-04-25
> **Purpose:** Single source of truth for SEO work across Thaqalayn. Consolidates prior plans from `PHASE3_FEATURE_PROPOSAL.md` §8 (2026-02-27), expands with 2026 best practices (GEO, llms.txt, INP, hreflang-in-sitemap, AI crawler policy), and lists manual steps the site owner must perform.

**Audience for this doc:**
- The site owner (manual steps in §2 — only you can do these)
- Future Claude Code sessions (priority order, source-verified status, file paths)

---

## 1. Executive summary

**Status as of 2026-04-25:** Track A, Track B, plus GEO/CWV/E-E-A-T quick wins have all shipped. The site is now in a strong indexable state.

### What was wrong (April audit)

Thaqalayn shipped the SEO baseline in early 2026 (path routing, `SeoService`, OG, JSON-LD, robots.txt, sitemap, E2E tests) and marked `USER_STORIES` items SEO-01..04 as DONE. A code-level audit on 2026-04-24 found the baseline was functionally correct but materially incomplete: Search Console wasn't actually verified, the sitemap omitted all 67K hadith pages, lazy-loaded verses were invisible to crawlers, and there was no Twitter Card, hreflang, BreadcrumbList, AI-crawler policy, llms.txt, FAQ schema, or Core Web Vitals telemetry.

### What's now in place

| Area | State |
|------|-------|
| **Search Console** | Verified (token `haBRxR-7K-zM…`); sitemap submitted |
| **Bing Webmaster Tools** | Imported from Search Console |
| **Netlify Prerender Extension** | Installed (Netlify-built variant) — bot UAs get prerendered HTML |
| **Sitemap** | `/sitemap.xml` is now a sitemap-index referencing 26 per-book buckets; **72,112 URLs** (vs 13,290 before), every URL with `<lastmod>` |
| **Build pipeline** | `prebuild` hook auto-regenerates sitemap from current data on every Netlify deploy |
| **Lazy verse fix** | Chapter-content prefetches up to 50 verses synchronously under SSR (`isPlatformServer`) so crawlers see actual hadith bodies |
| **Soft-404s** | Wildcard route → NotFoundComponent emits `<meta name="robots" content="noindex">` |
| **Twitter Card** | `summary_large_image` on every page |
| **OG / hreflang / `<html lang>`** | Per-page OG tags including `og:locale`; hreflang alternates for 12 supported languages + x-default |
| **JSON-LD** | WebSite, Book, CreativeWork, Person, CollectionPage, BreadcrumbList, FAQPage (chapters with AI Q/A); all include `datePublished` + `dateModified` |
| **AI crawler policy** | robots.txt explicitly allows GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended, CCBot, etc. |
| **llms.txt** | Published at `/llms.txt` for AI-crawler discovery |
| **Core Web Vitals telemetry** | `WebVitalsService` reports LCP/INP/CLS/FCP/TTFB to console (ready to wire to analytics) |
| **Preconnect** | `<link rel="preconnect">` for the data API origin + Google Fonts |
| **Arabic `lang="ar"`** | Added on remaining unwrapped Arabic spans |

### What's still outstanding

- **P1.8 per-page OG images** — needs design assets (1200×630 branded PNGs)
- **P3.3 definitional opening copy** — homepage hero + /about intro paragraph (content/UX decision)
- **P5 named author / editorial voice on /about** — content decision
- **P6 IndexNow integration** — needs you to generate an API key
- **P7 Custom domain** — the highest-impact remaining lever; ~$10-12/yr
- **Track C subdirectory language URLs** — bigger architectural change

### What this doc still serves as

The historical record of what was missing, why each fix matters, and the source-verified status of each item. Future sessions should read §3 (gap inventory) for the audit baseline; the rest is now mostly status-tracking.

---

## 2. Manual steps only the site owner can do

These steps are checklisted here because they cannot be done from code. Each is a small action but is blocking for the work to have any real effect.

| # | Step | Where | Time | Status |
|---|------|-------|------|--------|
| M1 | **Verify Google Search Console ownership** (URL-prefix property for `https://thaqalayn.netlify.app/`, HTML tag method). | https://search.google.com/search-console | 10 min | **✅ DONE 2026-04-25** — token live in `index.html`, ownership verified |
| M2 | **Submit sitemap** to Search Console. | Search Console → Sitemaps | 2 min | **✅ DONE 2026-04-25** — `/sitemap.xml` submitted; auto-recrawls the new sitemap-index format |
| M3 | **Request indexing for key pages** via URL Inspection. Daily quota ~10. | Search Console → URL Inspection | 15 min | **✅ Quota used 2026-04-25** — homepage + key URLs submitted; quota exceeded by end of day. Resume tomorrow if more nudges needed |
| M4 | **Verify Bing Webmaster Tools** (one-click import from Search Console). | https://www.bing.com/webmasters | 10 min | **✅ DONE 2026-04-25** |
| M5 | **Install Netlify Prerender Extension (Netlify-built variant)** — settings: "Skip CSS/images/etc" ON, "Skip user-agents supporting JavaScript" OFF. | Netlify dashboard | 5 min | **✅ DONE 2026-04-25** — verified live: bot UAs get prerendered HTML, browser UAs get the SPA shell |
| M6 | **After P1.3 lands**, regenerate the sitemap and redeploy. | Terminal + browser | 2 min | **✅ DONE** — `prebuild` hook auto-regenerates on every Netlify build |
| M7 | **Decide on custom domain.** `thaqalayn.net` / `.org` / `.app` is ~$10-12/year — single biggest remaining authority lever. | Domain registrar → Netlify DNS | 30 min one-time | **⏳ PENDING decision** |
| M8 | **IndexNow API key** (optional). Generate a random hex key, serve it at `/{key}.txt`, then POST URL updates to `https://api.indexnow.org/indexnow`. | Code + deploy | 1 hr | **⏳ PENDING — needs key from you** |
| M9 | **Resubmit sitemap to Search Console + Bing** after the sitemap-index migration deployed (URL is the same `/sitemap.xml` but content is now an index). Click "Resubmit" or wait for auto-recrawl. | Search Console + Bing WMT | 2 min | **⏳ Recommended after Track B deploy** |
| M10 | **Wire web-vitals telemetry to a real endpoint.** Edit `src/app/services/web-vitals.service.ts` `report()` to send to GA4 / Plausible / custom endpoint. Currently logs to console. Without this we have no field-data on INP/LCP/CLS. | Code | 30 min | **⏳ PENDING — needs your analytics target** |
| M11 | **Replace placeholder per-page OG images** (P1.8a) with branded 1200×630 PNGs: one each for Quran, Al-Kafi, narrator pages, default. Drop in `src/assets/og-*.png`, then update `SeoService` to pick by page type. | Design + code | 1-2 hrs | **⏳ PENDING — needs design** |

**Bolded "you only" steps** are non-recoverable from Claude Code — these should be ticked in calendar time, not queued behind dev work.

---

## 3. Current state (verified 2026-04-24)

### Shipped and working

| Component | Location | Notes |
|-----------|----------|-------|
| `SeoService` | `src/app/services/seo.service.ts` | title, description, OG, canonical, JSON-LD |
| Per-route wiring | `src/app/app.component.ts` (L208–286) | home, static, book, verse-detail, narrator list, narrator |
| AI-enriched verse meta | `src/app/components/verse-detail/verse-detail.component.ts` L128 | `setVerseDetailPageWithAi` uses `aiSeoQuestion` + `aiSummary` when present |
| JSON-LD types | `SeoService` | `WebSite`, `Book`, `CreativeWork`, `Person`, `CollectionPage`, plus `Question`/`Answer` when AI content is present |
| Path routing | `src/app/routing/app-routing.module.ts` | `useHash: false`; hash→path redirect in `app.component.ts:200` |
| Netlify SPA fallback | `src/_redirects` | `/* /index.html 200` |
| robots.txt | `src/robots.txt` | minimal — allows all, links sitemap |
| Static sitemap | `src/sitemap.xml` | 7,349 URLs — homepage + static + books + narrators |
| Sitemap generator | `scripts/generate-sitemap.js` | runs from `ThaqalaynData/index/books.en.json` + narrators directory |
| Angular SSR/prerender config | `angular.json` L74-79, `src/main.server.ts`, `src/server.ts` | prerender `routesFile: "prerender-routes.txt"` (7 routes) |
| E2E tests | `e2e/tests/seo.spec.ts` | hash redirects, robots.txt, meta, OG, canonical, JSON-LD |

### Gaps found

| # | Gap | Evidence | Impact |
|---|-----|----------|--------|
| G1 | Search Console unverified | `src/index.html:8` still `PLACEHOLDER_VERIFICATION_CODE` | No indexing reports, no manual submission, no rich-result eligibility reports |
| G2 | Sitemap missing verse-detail URLs | Generator skips `books/**/verses/*.json`; find reports 67,715 JSON files vs 7,349 sitemap entries | Individual hadith pages (VRS-07) invisible to search |
| G3 | Lazy-loaded verse bodies not in SSR HTML | `VerseLoaderService` + `IntersectionObserver` fetch `verse_detail` on scroll; Angular prerender does not await these | Crawlers see chapter shell with no hadith text |
| G4 | Sitemap not auto-built | `package.json` `build` = `ng build`; `generate-sitemap` is a separate script | Stale sitemap as new data lands |
| G5 | No `<lastmod>` in sitemap | `scripts/generate-sitemap.js` L20 only emits loc/changefreq/priority | Crawl budget wasted on unchanged URLs |
| G6 | No Twitter Card tags | grep `twitter:` → 0 matches in `src/` | Weaker Twitter/X previews |
| G7 | No hreflang | grep `hreflang`/`alternate` → 0 matches; 12 langs supported via `?lang=` only | Non-English content not surfaced on Google.ar/.fr/etc |
| G8 | `<html lang="en">` hardcoded | `src/index.html:2` | Wrong signal when user is reading Arabic/Urdu |
| G9 | Arabic spans lack `lang="ar"` | `CLAUDE.md` known a11y issue M1 | Screen readers mispronounce; weaker language signal |
| G10 | No `BreadcrumbList` JSON-LD | `SeoService` only emits per-page types | Missing rich snippet |
| G11 | Per-page `og:image` identical | `SeoService:8` `DEFAULT_IMAGE` used everywhere | All social shares look the same |
| G12 | Narrator pages freeze for high-count narrators | Already flagged in `CONSOLIDATED_ROADMAP.md` §3.1 | Googlebot abandons → poor indexation |
| G13 | Soft-404s | `/* /index.html 200` rewrites every URL | Invalid URLs indexed as duplicates of homepage |
| G14 | Duplicate meta descriptions | Narrator & chapter pages share templated strings with only name/number changed | Google may drop duplicates from index |
| G15 | No AI-crawler policy | `robots.txt` only has `User-agent: *` | No intentional stance on GPTBot/ClaudeBot/PerplexityBot |
| G16 | No `llms.txt` | Not present | ~10% adoption in 2026 but forward-compatible & zero cost |
| G17 | No FAQ/QAPage schema per hadith (beyond single Q&A on verse-detail) | Would enable per-chapter FAQ rich results | GEO lever untouched |
| G18 | No IndexNow | No `/{key}.txt`, no POST endpoint | Bing/Yandex/Naver updates delayed |
| G19 | No Core Web Vitals monitoring | Google PSI only on demand | INP <150ms is 2026 baseline; no visibility into regressions |
| G20 | 160-char description truncation breaks words | `SeoService:127, 172` `.substring(0, 160)` | Ugly ellipsis cuts mid-word |

---

## 4. Priority 1 — Track A: Quick wins (✅ shipped 2026-04-25)

Every item here is a self-contained code change with a clear blast radius. Together they close G1, G5, G6, G8-G11, G15, G20.

### P1.1 Replace Search Console placeholder

**File:** `src/index.html:8`
**Change:** Wait for the owner to obtain the token (M1), then replace `PLACEHOLDER_VERIFICATION_CODE` with the real value. Do **not** ship verification tags from multiple properties — one domain property beats multiple URL-prefix properties.
**Status:** Ready to apply as soon as M1 is done.

### P1.2 Add `<lastmod>` to sitemap

**File:** `scripts/generate-sitemap.js`
**Change:**
- For each URL, derive `<lastmod>` from the source JSON file's mtime (or a `last_updated` timestamp in `books.en.json` if the generator starts emitting one).
- Format: ISO 8601 date (`2026-04-24`) — no time component is needed.
- Homepage/static pages: use the latest build date.

Google uses `lastmod` to prioritize recrawls. Without it, every URL is effectively a fresh crawl each time.

### P1.3 Wire sitemap generation into build

**Files:** `package.json`, `netlify.toml`
**Change:** Either:
- Update `build` script to `node scripts/generate-sitemap.js && ng build`, or
- Add a `prebuild` script: `"prebuild": "node scripts/generate-sitemap.js"` (npm runs it automatically before `build`).

Reason we didn't do this originally: `generate-sitemap.js` reads `../../ThaqalaynData/` which is only present locally, not in Netlify's build container. Fix: the sitemap script should gracefully skip if the data dir is absent AND Netlify's build pulls data from the deployed JSON API instead. Alternative: generate the sitemap in `ThaqalaynDataGenerator` and publish it as an asset inside the data bucket — cleanest but crosses project boundaries.

**Recommended:** Keep `generate-sitemap.js` where it is. Have it read from `https://thaqalayndata.netlify.app/index/books.en.json` as a fallback when the local path is absent. Cache in CI with `netlify.toml` `[build.environment]` if it's slow.

### P1.4 Add Twitter Card meta tags

**File:** `src/app/services/seo.service.ts`
**Change:** In `setPageMeta`, add:
```ts
this.meta.updateTag({ name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' });
this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
this.meta.updateTag({ name: 'twitter:description', content: page.description });
this.meta.updateTag({ name: 'twitter:image', content: image });
// Optional once we have an account: twitter:site / twitter:creator
```

### P1.5 Dynamic `<html lang>` + `og:locale`

**Files:** `src/app/app.component.ts`, `src/app/services/seo.service.ts`
**Change:**
- On language change, `document.documentElement.lang = this.i18n.currentLang` (do this in the `i18n.stringsChanged$` subscription — `app.component.ts:289`).
- In `SeoService.setPageMeta`, emit `og:locale` from the current language (map `en` → `en_US`, `ar` → `ar`, `fa` → `fa_IR`, etc.).

### P1.6 Mark Arabic spans with `lang="ar"`

**Files:** `src/app/components/verse-text/verse-text.component.html`, any component rendering `.arabic` class.
**Change:** Add `lang="ar"` (and `dir="rtl"`) to every `<div class="arabic">` and surrounding Arabic-only containers. Then remove the M1 entry from `KNOWN_ISSUE_RULES_TO_SKIP` in `e2e/tests/accessibility.spec.ts` so the test enforces it.

### P1.7 Add `BreadcrumbList` JSON-LD

**File:** `src/app/services/seo.service.ts`
**Change:** Extend `PageMeta` with an optional `breadcrumbs: Array<{name: string, url: string}>` field. In `updateJsonLd`, when breadcrumbs are provided, emit a `@graph` with both the page's primary type and a `BreadcrumbList`:

```ts
{
  '@context': 'https://schema.org',
  '@graph': [
    existingPrimary,
    {
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: crumb.name,
        item: crumb.url,
      })),
    },
  ],
}
```

Wire from `app.component.ts` using existing `BooksState.getCurrentNavigatedCrumbs`.

### P1.8 Per-page `og:image` (basic tier)

**Scope:** Phase the solution.
- **P1.8a (this pass):** Use 3-4 hand-designed static OG images: `og-quran.png`, `og-al-kafi.png`, `og-narrator.png`, `og-default.png` (all 1200×630, <300 KB). Pick one per page type in `SeoService` based on book slug.
- **P1.8b (later, Track B):** Build-time generator that composes per-page OG images (book + chapter title overlaid on a template) via `@vercel/og` or headless Chromium.

### P1.9 Fix 160-char description truncation

**File:** `src/app/services/seo.service.ts:127, 172`
**Change:** Replace naive `substring(0, 160)` with word-boundary-safe truncation:

```ts
function truncateMeta(text: string, max = 155): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > 100 ? slice.slice(0, lastSpace) : slice) + '…';
}
```

Use 155 not 160 to leave room for the ellipsis character.

### P1.10 Declare AI-crawler policy in robots.txt

**File:** `src/robots.txt`
**Change:** Public Islamic-text project — all AI crawlers should be **allowed**. But declare it explicitly so the policy is intentional, not accidental:

```
User-agent: *
Allow: /

# AI training + retrieval crawlers — explicitly allowed.
# This is a public scholarly resource; we want it in training corpora and AI search.
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: CCBot
Allow: /

User-agent: meta-externalagent
Allow: /

User-agent: Bytespider
Allow: /

User-agent: Amazonbot
Allow: /

Sitemap: https://thaqalayn.netlify.app/sitemap.xml
Sitemap: https://thaqalayn.netlify.app/sitemap_index.xml
```

(Reference `Sitemap:` for both the legacy file and the Track B index; Google reads both lines.)

### P1.11 Per-page descriptions stop being templated

**File:** `src/app/services/seo.service.ts`
**Change:**
- **Narrator:** prefer `narrator.data.biography.en` (if present) over the templated string. Append narration count: "— 342 narrations across Al-Kafi."
- **Chapter (no `descriptions.en`):** use the first Hadith's AI summary if cached; otherwise the first translation text (already what we do for verse-detail). Currently a chapter with no description gets "Read X from Al-Kafi with English translations" — Google flags mass duplicates.

---

## 5. Priority 2 — Track B: Structural work (✅ shipped 2026-04-25)

### P2.1 Sitemap index for >50K URLs

`sitemap.xml` has a hard ceiling of 50,000 URLs or 50 MB. We need to split.

**Proposed split** (one sitemap per logical bucket — makes Search Console's "valid URLs" reporting per-bucket useful for diagnostics):
- `sitemap-static.xml` — homepage + /about + /download + /support + /topics + /bookmarks + /books index
- `sitemap-quran.xml` — all Quran surah + verse URLs (6,236 + 114 = ~6,350)
- `sitemap-al-kafi.xml` — Al-Kafi volumes, books, chapters, verses (~17,000)
- `sitemap-books-other.xml` — other books as they come online
- `sitemap-narrators.xml` — narrator index + 4,629 canonical narrator pages
- `sitemap_index.xml` — root index referencing all the above

**File:** `scripts/generate-sitemap.js` — refactor to emit multiple files + an index. Each file must sit at `/sitemap-*.xml` because Google requires sibling-or-descendant URLs.

### P2.2 Put verse-detail URLs in the sitemap

G2 depends on P2.1 (won't fit in one file). After P2.1, the generator must walk verse_detail JSON files in the data dir and emit:

```xml
<url>
  <loc>https://thaqalayn.netlify.app/books/al-kafi:1:1:1:1</loc>
  <lastmod>2026-04-24</lastmod>
  <changefreq>yearly</changefreq>
  <priority>0.5</priority>
</url>
```

Quran verse URLs: ~6,236. Al-Kafi hadith URLs: ~16,000. Other books: ~45K more as they come online. Priority drops to 0.5 (individual verses are less important than chapter pages for ranking).

### P2.3 Prerender that sees the hadith text (G3 — critical) — **shipped 2026-04-25**

**Final implementation:**
- `chapter-content.component.ts` checks both `isPlatformServer(platformId)` AND `isLikelyCrawler()` (a browser-side heuristic on `navigator.webdriver` + bot UA patterns) before deciding between eager prefetch vs `IntersectionObserver`.
- Either path triggers `prefetchVersesForSsr(book)` which fires up to `SSR_INLINE_VERSE_LIMIT = 50` parallel verse_loader fetches and tracks completion to emit FAQPage JSON-LD once they resolve.
- Browser hydration receives the verses pre-cached via `provideClientHydration() + TransferState`.

**Why both checks were needed (post-mortem 2026-04-25):**
The original P2.3 design assumed Netlify Prerender ran Angular SSR (`isPlatformServer === true`). It doesn't. Netlify Prerender executes the **browser bundle** in headless Chromium, so `isPlatformServer` is false there. Verification on the deployed site confirmed only 2 of ~10 hadith were rendered for Googlebot UA. Adding the browser-side `isLikelyCrawler()` heuristic closed the gap.

**Crawler detection criteria:**
- `navigator.webdriver === true` (Puppeteer, Playwright, Selenium, headless Chromium)
- UA matches `/headlesschrome|googlebot|bingbot|gptbot|claudebot|claude-searchbot|perplexitybot|oai-searchbot|applebot|yandexbot|baiduspider|duckduckbot|facebookexternalhit|twitterbot|linkedinbot|slackbot|telegrambot|whatsapp|prerender|netlify-prerender/i`

**Trade-off accepted:** a UA-spoofing tool (e.g. "User-Agent Switcher" extension) that sets a bot UA will trigger eager-load. Bandwidth cost is bounded by the 50-verse cap. Real users on real browsers continue to use lazy loading.

**Original (pre-fix) plan kept below for reference:**

This is the **single highest-impact SEO fix** available. Today, a crawler that fetches `/books/al-kafi:1:1:1` gets the chapter shell with no hadith bodies. The `IntersectionObserver` only fires when verse cards scroll into a real viewport, and headless prerenderers don't scroll — so M5 alone does **not** solve this.

This is the **single highest-impact SEO fix** available. Today, a crawler that fetches `/books/al-kafi:1:1:1` gets the chapter shell with no hadith bodies. The `IntersectionObserver` only fires when verse cards scroll into a real viewport, and headless prerenderers don't scroll — so M5 alone does **not** solve this.

**M5 (Netlify Prerender Extension) gets us ~80% of the win on its own:**
- Homepage, `/about`, `/download`, `/support` — already prerendered by Angular SSR; M5 is redundant but harmless
- Narrator pages — work because data loads via NGXS resolver on init (no observer)
- Verse-detail pages — work because all data is fetched synchronously
- **Chapter pages with verses — still thin.** Headless prerender renders the shell; verses below the fold never fire their observers; verse JSON never gets fetched.

So P2.3 is **needed regardless of which prerenderer we use**. AI crawlers (GPTBot, ClaudeBot, PerplexityBot) also can't run JavaScript at all — they need real HTML.

**Implementation: SSR-inline the verses.**

Modify `chapter-content.component.ts`:
- Inject `PLATFORM_ID`; check `isPlatformServer(platformId)`
- Under SSR only: synchronously prefetch all verse_detail JSON for the chapter and inline the rendered verse bodies into the initial HTML
- Skip the `IntersectionObserver` setup under SSR
- Browser-side hydration continues to use `VerseLoaderService` which already caches with `shareReplay(1)` — verses arrive pre-cached if hydration sees them inline

For very long chapters (>100 verses), inline only the first ~50 to keep prerender HTML under ~500 KB; the long tail can be picked up by the live page.

**After it lands:** Use Search Console's URL Inspection "View Crawled Page" on 5-10 random chapter URLs to confirm the Arabic + translation text appears in the rendered HTML.

### P2.4 Hreflang via XML sitemap (G7)

For all pages that support language variants, add `<xhtml:link>` alternates in the sitemap:

```xml
<url>
  <loc>https://thaqalayn.netlify.app/books/quran:1?lang=en</loc>
  <xhtml:link rel="alternate" hreflang="en" href="https://thaqalayn.netlify.app/books/quran:1?lang=en"/>
  <xhtml:link rel="alternate" hreflang="ar" href="https://thaqalayn.netlify.app/books/quran:1?lang=ar"/>
  <xhtml:link rel="alternate" hreflang="x-default" href="https://thaqalayn.netlify.app/books/quran:1"/>
  ...
</url>
```

Must declare `xmlns:xhtml="http://www.w3.org/1999/xhtml"` on the root `<urlset>`.

**Cluster rule (75% of sites get this wrong):** each language's canonical must point to itself, not to a master. So `canonical` for `?lang=ar` → `...?lang=ar`, not `...?lang=en`.

**Caveat — query-string language signals:** Google does index `?lang=` variants when hreflang is correct, but subdirectory URLs (`/ar/books/quran:1`) are strictly better. Subdirectory migration is Track C below.

### P2.5 Soft-404 fix (G13)

**File:** `src/_redirects`
**Change:** Add explicit 404 for paths that look like routes but aren't:
```
# Still SPA-fallback for real client routes
/books/*    /index.html    200
/people/*   /index.html    200
/about      /index.html    200
/download   /index.html    200
/support    /index.html    200
/topics     /index.html    200
/bookmarks  /index.html    200
/          /index.html    200
# Everything else → 404
/*    /404.html   404
```

Then add a `404.html` in `src/` that ships a static "not found" page. Angular can detect via route guard and redirect too, but SPA fallback takes priority on Netlify — static `/404.html` is the right tool.

### P2.6 Narrator page virtualization (G12) — **already done**

Verified 2026-04-25: commit `38c173b` (FIX-04, pre-dating this roadmap) introduced `mat-paginator` for hadith paths and subchains plus `slice(0, 10)` caps for narrated-from/to lists and top co-narrators. The browser-freeze symptom on narrator #4 (3,116 narrations) and #19 (5,511) is gone. CONSOLIDATED_ROADMAP §3.1 is also stale on this — it's tracked there as outstanding but the code already paginates.

No further action needed for SEO. If Search Console later flags rendering timeouts on specific narrator URLs we can revisit (CDK virtual scroll would be the next step), but pagination is sufficient for crawler indexing.

---

## 6. Priority 3 — GEO (Generative Engine Optimization) (✅ partially shipped 2026-04-25)

This project is **exceptionally well-suited for GEO** because the AI content pipeline already generates `seo_question`, `summary`, and scholarly context per hadith. We can expose that material in structures LLM crawlers (GPTBot, PerplexityBot, ClaudeBot) preferentially ingest.

### P3.1 `llms.txt` at the root

**File:** `src/llms.txt` (register as a build asset in `angular.json`)
**Content:**
```markdown
# Thaqalayn

> Thaqalayn is an open scholarly resource for authentic Shia Islamic primary texts — the Holy Quran and Al-Kafi (the first of the Four Books of hadith) — with Arabic originals, multiple English translations, narrator chains, and AI-assisted scholarly enrichment (diacritics, key terms, cross-references, topic tags).

## Core content
- [Holy Quran (114 surahs, 6,236 verses)](https://thaqalayn.netlify.app/books/quran)
- [Al-Kafi (16,000+ hadith across 8 volumes)](https://thaqalayn.netlify.app/books/al-kafi)
- [Narrators (4,629 canonical hadith transmitters)](https://thaqalayn.netlify.app/people/narrators/index)

## Reference
- [About the project](https://thaqalayn.netlify.app/about)
- [Download the data (JSON API)](https://thaqalayndata.netlify.app/)
- [Source code](https://github.com/...) — [fill in]

## Licensing and attribution
- Quran text: Tanzil Project (CC BY 3.0)
- Translations: per-translator licensing; see /about
- Al-Kafi: public domain Arabic text; translations per-translator
- AI-generated scholarly content: CC BY 4.0
```

Adoption is ~10% as of April 2026; only developer-tool AIs (Cursor, Continue) reliably read it. Upside is zero-cost and forward-compatible.

### P3.2 FAQPage schema per chapter

When a chapter has N hadith and each hadith has an `ai_seo_question` + `ai_summary`, emit a single `FAQPage` schema on the chapter page:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "...", "acceptedAnswer": { "@type": "Answer", "text": "..." }},
    ...
  ]
}
```

**Caution:** Google restricted FAQ rich results in 2023 to "well-known authoritative sites" — we may not qualify yet. However, even without rich-result display, the schema is read by LLM crawlers and can surface in AI Overviews. Keep ≤10 Q&A per page.

### P3.3 Definitional openings

GEO research (2025-2026) shows pages whose opening sentence is clearly definitional are cited significantly more by LLMs. Audit the homepage, `/about`, book-level pages to open with one sentence defining what the page is:

- **Before (current homepage hero):** "Browse Quran and hadith collections."
- **After:** "Thaqalayn is a free, open digital library of authentic Shia Islamic primary texts — the Holy Quran and Al-Kafi hadith collection — in Arabic with English translations, narrator chains, and scholarly references."

### P3.4 Authoritative attribution visible on page

LLMs cite sources with named authors + dates more often. Add to each book landing page:
- Author name + era: "Al-Kafi, compiled by Muhammad ibn Ya'qub al-Kulayni (d. 329 AH / 941 CE)"
- Source text lineage
- Translator attribution already shows in the translation selector — surface it more prominently on book landing pages

### P3.5 Machine-readable chain data

The canonical narrator registry is unique value. Expose it to crawlers via structured data:
- On narrator pages: `@type: Person` with `parent`/`children` equivalents pointing to teacher/student narrators (once PPL-14 lands)
- On hadith pages: encode the isnad as an ordered `memberOf` chain of Person entities

---

## 7. Priority 4 — Performance (Core Web Vitals) (✅ partially shipped 2026-04-25)

2026 thresholds (75th-percentile of real users):
- **LCP < 2.0s** (was 2.5s — tightened)
- **INP < 150ms** (replaced FID in 2024; 2026 target tightened from 200ms)
- **CLS < 0.1**

43% of sites fail INP. INP fixes require JavaScript architecture work.

| Item | Approach | Effort |
|------|----------|--------|
| Enable Angular production build optimizations | Already on in `angular.json:56` | Done |
| Preconnect to `thaqalayndata.netlify.app` in `index.html` | `<link rel="preconnect" href="https://thaqalayndata.netlify.app" crossorigin>` | 5 min |
| Preload critical fonts (Material Icons, Arabic font) | `<link rel="preload" as="font" type="font/woff2" crossorigin>` | 15 min |
| Inline critical CSS (above-the-fold) | Angular 19 critical CSS extraction | 30 min |
| Swap Material Icons CDN for self-hosted subset | Saves ~100 KB + round-trip | 1 hr |
| Image LCP optimization on homepage hero | AVIF/WebP with `<picture>` + `loading="eager"` on LCP image only | 1 hr |
| Service worker already shipped | `ngsw-config.json` | Verify caching strategy |
| Web Vitals field data via `web-vitals` npm | Wire to Netlify Analytics or Firebase | 2 hr |
| Audit INP on narrator pages (3,000+ narrations) | Virtualize table (ties to P2.6) | 1 day |

Install [`web-vitals`](https://www.npmjs.com/package/web-vitals) and log INP/LCP/CLS to a lightweight endpoint or Google Analytics. Without field data we're flying blind — PageSpeed Insights lab scores don't equal ranking impact.

---

## 8. Priority 5 — Content quality & E-E-A-T (partial; ✅ dateModified shipped)

Google 2026 emphasis: **Trust** is the most important of the four E-E-A-T pillars. A page with low trust cannot rank regardless of other signals. Religious/scholarly content touches YMYL borders when it gives life guidance — treat accordingly.

| Item | Why |
|------|-----|
| Named author or editorial entity on `/about` | Google rates anonymous content lower. Consider "Maintained by [name/org], [role]" visible on About + in footer |
| Source citations visible on every hadith | Already done — sanad chain + grading. Make sure it's visible to crawlers (i.e. SSR'd, not lazy) |
| Transparency about AI-generated enrichment | We already do this implicitly with the AI toggle. Add explicit disclosure on `/about` and a small badge on each hadith when AI content is shown |
| Last-updated dates on key pages | Signals freshness to Google. Emit `datePublished` + `dateModified` in JSON-LD |
| Contact method (email at minimum) | Trust signal per QRG. We have a support page — add a clear contact |
| External authoritative citations | Cross-link WikiShia narrator articles where available (ties into `RESEARCH_TAHDHIB_ISTIBSAR_SOURCES`) |
| Clear licensing + source attribution on `/download` | Public-scholarly-resource positioning |

---

## 9. Priority 6 — Discovery & crawl budget

| Item | Notes |
|------|-------|
| **IndexNow** (Bing, Yandex, Naver, Seznam, Yep; **not Google**) | After the data pipeline writes new/updated hadith, POST the URLs to `https://api.indexnow.org/indexnow?url=...&key=...`. Generate a hex key, serve at `/{key}.txt`. A hook in `ThaqalaynDataGenerator` can batch-emit on each run |
| **Bing Webmaster Tools** | 17% of Bing clicks now come via IndexNow. Bing also powers ChatGPT search. Free, fast, no reason to skip |
| **Internal linking audit** | Today verse-detail pages only link "up" to chapter. Add "previous/next hadith in volume", related narrator links, cross-references. Crawlers use internal links as relevance signals |
| **Canonical consistency** | Every URL should have one canonical form. Today `?lang=` is stripped from canonical (good) but `?aiMode=` or other query strings may sneak in — audit |
| **noindex on utility pages** | `/bookmarks` is per-user — should be `noindex`. `/topics` and `/phrases` are discovery pages — keep indexable but verify they aren't thin |
| **Pagination** | High-narration narrator pages when virtualized should use proper `rel="canonical"` on each page and `rel="prev/next"` (deprecated by Google but still used by Bing) |

---

## 10. Priority 7 — Future (scope-expanding)

### Custom domain (M7)
Biggest single authority lever not yet pulled. Delay compounds — every month on `netlify.app` is a month of lost backlink equity. ~$10-12/year.

### Subdirectory URLs for languages (`/ar/`, `/fa/`, `/ur/`)
Query-string languages index poorly. Real subdirectory URLs double the indexable surface area for non-English queries. Requires Angular routing rework + per-language sitemaps + hreflang clusters. 2-3 week effort. Defer until P2.4 data proves non-English traffic is worth chasing.

### Dynamic per-hadith OG images
Build-time generator using `@vercel/og` or equivalent — each hadith gets a branded image with the chapter title + Arabic first line overlaid on a template. ~67K images at build time is heavy; generate on-demand via a Netlify function is cleaner.

### AI Overview optimization
Google AI Overviews cite sites with: dense factual content + clear heading hierarchy + recent timestamps + inbound links from authoritative sources. All addressed piecewise above; this is an ongoing audit once traffic data starts arriving in Search Console.

### Religious text schema
No standard `schema.org/QuranVerse` exists. `CreativeWork` + `isPartOf: Book` (what we do today) is correct. Watch `schema.org` for future additions — unlikely in this window.

---

## 11. Measurement & monitoring

Without measurement the above is theater. Minimum set:

| Signal | Tool | Action threshold |
|--------|------|------------------|
| Indexed pages | Search Console → Pages | Alert if drops >5% week-over-week |
| Impressions + clicks | Search Console → Performance | Watch weekly; baseline after M1-M4 |
| Core Web Vitals field data | Search Console → Core Web Vitals; PSI; `web-vitals` npm | Alert if p75 INP > 150ms |
| Coverage errors (soft-404, server errors, redirect errors) | Search Console → Pages | Fix same-week |
| Rich-result validity | Search Console → Enhancements; [Rich Results Test](https://search.google.com/test/rich-results) | After any schema change |
| Referral from AI assistants | Netlify Analytics / Plausible referrer log — look for `chatgpt.com`, `perplexity.ai`, `claude.ai`, `copilot.microsoft.com` | GEO validation |
| Mobile-friendliness | Search Console → Mobile Usability | Zero errors |

Add a weekly `seo-checkin.md` note (or comment on CONSOLIDATED_ROADMAP) capturing impressions/click/index-count trend.

---

## 12. Recommended sequence

**Week 1 (Track A):**
1. Owner: M1, M5 (Search Console verified, Prerender extension installed)
2. Ship P1.4, P1.5, P1.6, P1.7, P1.9, P1.10, P1.11 in a single PR
3. Ship P1.2, P1.3 in a second PR
4. Ship P1.8a (static OG images) in a third PR
5. Owner: M2, M3, M4 (submit sitemap, request indexing, Bing verification)

**Week 2-3 (Track B):**
6. Ship P2.1 + P2.2 (sitemap index + verse-detail URLs)
7. Ship P2.4 (hreflang in sitemap)
8. Ship P2.5 (soft-404 fix)
9. Ship P3.1, P3.3 (llms.txt, definitional openings)

**Week 4+:**
10. Ship P2.3 SSR-inline-verses (if bot traffic needs it after M5 is live)
11. Ship P2.6 narrator virtualization (also unblocks UI roadmap)
12. Ship P3.2 FAQPage per chapter
13. Ship P4 Core Web Vitals pass
14. Owner: M7 decide on custom domain
15. Ship P5 E-E-A-T pass

**Ongoing:**
16. Weekly Search Console + Bing WMT review
17. IndexNow hook in generator (P9 / M8)

---

## 13. Appendix A — AI crawler reference

Current as of April 2026. Source: [AI User Agent Landscape 2026](https://nohacks.co/blog/ai-user-agents-landscape-2026), [Anthropic](https://www.searchenginejournal.com/anthropics-claude-bots-make-robots-txt-decisions-more-granular/568253/).

| Vendor | Bot | Purpose | Honors robots.txt? |
|--------|-----|---------|--------------------|
| OpenAI | GPTBot | Training corpus | Yes |
| OpenAI | OAI-SearchBot | Search index | Yes |
| OpenAI | ChatGPT-User | User-triggered fetch | Often ignored |
| Anthropic | ClaudeBot | Training | Yes |
| Anthropic | Claude-SearchBot | Search | Yes |
| Anthropic | Claude-User | User-triggered | Yes |
| Perplexity | PerplexityBot | Index | Yes |
| Perplexity | Perplexity-User | User-triggered | Often ignored |
| Google | Google-Extended | Gemini/AI Overviews opt-out token | Yes (opt-out only) |
| Apple | Applebot-Extended | Apple Intelligence opt-out | Yes (opt-out only) |
| Common Crawl | CCBot | Training data | Yes |
| Meta | meta-externalagent | Llama training | Yes |
| ByteDance | Bytespider | TikTok/Doubao | Partially |
| Amazon | Amazonbot | Alexa | Yes |

For this project (public scholarly corpus), **allow all** is the right policy. The content already exists on many sites; being in training corpora helps discovery via ChatGPT/Claude/Gemini.

## 14. Appendix B — JSON-LD cookbook

### Verse (per current implementation + breadcrumbs)
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CreativeWork",
      "name": "Hadith 1 - The Necessity of Intellect - Al-Kafi",
      "url": "https://thaqalayn.netlify.app/books/al-kafi:1:1:1:1",
      "inLanguage": ["ar", "en"],
      "isPartOf": { "@type": "Book", "name": "Al-Kafi", "author": "Muhammad ibn Ya'qub al-Kulayni" },
      "datePublished": "329-AH",
      "dateModified": "2026-04-24"
    },
    {
      "@type": "Question",
      "name": "What does this hadith teach about the intellect?",
      "acceptedAnswer": { "@type": "Answer", "text": "..." }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Books", "item": "https://thaqalayn.netlify.app/books" },
        { "@type": "ListItem", "position": 2, "name": "Al-Kafi", "item": "https://thaqalayn.netlify.app/books/al-kafi" },
        { "@type": "ListItem", "position": 3, "name": "Vol. 1 · Book 1 · Chapter 1", "item": "https://thaqalayn.netlify.app/books/al-kafi:1:1:1" },
        { "@type": "ListItem", "position": 4, "name": "Hadith 1", "item": "https://thaqalayn.netlify.app/books/al-kafi:1:1:1:1" }
      ]
    }
  ]
}
```

### Chapter (FAQ form — optional tier)
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "...", "acceptedAnswer": { "@type": "Answer", "text": "..." }}
  ]
}
```

### Narrator
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Muhammad ibn Yahya",
  "alternateName": "محمد بن يحيى",
  "description": "Teacher of al-Kulayni; narrated 342 hadith across Al-Kafi.",
  "url": "https://thaqalayn.netlify.app/people/narrators/42"
}
```

---

## 15. Appendix C — Decision Log: Netlify Prerender Extension over Prerender.io

**Date:** 2026-04-25
**Decision:** Use the **Netlify Prerender Extension** (Netlify-built, GA Dec 2025) for M5, not the Prerender.io extension.

### Comparison

| Aspect | Netlify Prerender Extension | Prerender.io Extension |
|--------|-----------------------------|------------------------|
| Cost | Free; only standard Netlify Function invocation billing | Free tier: ~250 prerenders/day, 1,000 cached pages. Cache freshness control needs $349/mo plan |
| Setup | One-click install, no API key | Sign up at prerender.io → API token → paste into Netlify extension config |
| Mechanism | Netlify Edge Function detects bots → invokes Netlify Function with headless Chromium → returns rendered HTML | Edge Function detects bots → routes to prerender.io's external rendering service |
| Maturity | GA Dec 2025; ~5 months old | Operating since 2013, enterprise-vetted |
| Analytics | Logging in Netlify dashboard | Full analytics, cache-hit/miss insights, render logs |
| Known issues | Breaks branch-deploy previews; may trigger Google Ads cloaking false-positive | Same Google Ads cloaking false-positive |
| Lazy-load behavior | Not documented; doesn't scroll | Configurable scroll triggers (paid tier) |

### Reasoning

1. **Free is actually free** — no third-party billing relationship, no token rotation, no separate dashboard
2. **Single vendor** — Netlify dashboard remains the source of truth for hosting, deploy, prerender; one less integration to manage
3. **Google Ads cloaking risk doesn't apply** — the project doesn't run paid ads
4. **Branch-deploy preview breakage is acceptable** — can be disabled per non-production branch in extension config
5. **Lazy-load gap is the same either way** — neither extension scrolls the page, so neither sees `IntersectionObserver`-triggered content. P2.3 (SSR-inline verses) is required regardless of choice

### Trade-offs accepted

- Newer product; less battle-tested than Prerender.io. Mitigation: P2.3 reduces our dependency on the prerender working correctly (chapter pages will be SSR'd inline rather than depending on the prerender's headless Chromium catching them)
- No analytics dashboard for cache hit/miss. Mitigation: Search Console's "Crawled Page" view + Netlify Function logs provide enough visibility to diagnose issues

### Re-evaluation triggers

Switch to Prerender.io if:
- Netlify Function invocation costs become material (unlikely on a free Netlify plan with our traffic)
- Prerender quality issues appear on critical routes that P2.3 doesn't cover
- Netlify deprecates or paywalls their built-in extension

---

## 16. Appendix D — Source documents

- `docs/PHASE3_FEATURE_PROPOSAL.md` §8 — Original SEO plan (2026-02-27). Covered hash→path, prerender, meta, robots, sitemap. Items 8.1-8.7 largely done; 8.8 (Angular SSG) partially implemented.
- `docs/USER_STORIES.md` §12 — SEO-01..04 marked DONE (title, OG, JSON-LD, canonical). This roadmap treats those as **table stakes** and adds ~40 further items.
- `docs/CONSOLIDATED_ROADMAP.md` §3.1 (narrator freeze) — intersects with P2.6.
- `docs/ARCHITECTURE.md` — path-based routing decision.
- External references: [Core Web Vitals 2026 thresholds](https://www.corewebvitals.io/core-web-vitals), [llms.txt state](https://www.aeo.press/ai/the-state-of-llms-txt-in-2026), [Google sitemaps for large sites](https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps), [Hreflang in sitemap](https://developers.google.com/search/docs/specialty/international/localized-versions), [AI crawler landscape 2026](https://nohacks.co/blog/ai-user-agents-landscape-2026), [E-E-A-T + AI content 2026](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), [IndexNow participants 2026](https://www.indexnow.org/faq).
