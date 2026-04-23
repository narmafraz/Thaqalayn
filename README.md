# Thaqalayn

[![Netlify Status](https://api.netlify.com/api/v1/badges/e2409c3a-1066-43de-993f-adade270c8bb/deploy-status)](https://app.netlify.com/sites/thaqalayn/deploys)

**Live site:** [https://thaqalayn.netlify.app/](https://thaqalayn.netlify.app/)

An Angular 19 web application for browsing and studying the primary Shi'a Hadith collections and the Qur'an, with AI-enhanced scholarly metadata, multi-language translations, and deep search.

## Features

- **Hierarchical navigation** — books → volumes → chapters → individual hadith, with breadcrumbs and prev/next
- **Client-side search** (Orama v3.1.18) with title and full-text modes, plus topic / tag / content-type filters
- **AI-enhanced content** — topic and phrase taxonomies, content-type badges, cross-references, similar-hadith hints, word-by-word analysis, narrator chain diagrams
- **Qur'an-specific** — audio recitation (4 reciters), tafsir panel with 3 editions
- **Personalisation** — bookmarks, personal notes, dark mode, keyboard shortcuts, reading progress (Dexie / IndexedDB), optional Firebase cross-device sync
- **Narrators** — dedicated narrator pages with biographical data and hover cards on narrator chains
- **Gradings** — colour-coded authenticity badges (sahih / hasan / da'if / etc.) where available
- **Cross-validation** — diff viewer when the same hadith appears across multiple sources
- **Internationalisation** — 12 UI languages
- **PWA** — installable, offline-capable
- **Sharing** — share a hadith as a styled image, copy link / formatted text, or embed via iframe
- **Discussion** — optional per-hadith comment threads

## Development

Requires Node.js. The dev server expects the data API at `http://localhost:8888/` (see the sibling `ThaqalaynData` project for local data serving).

```bash
npm install
npm start            # http://localhost:4200
```

`npm start` sets `NODE_OPTIONS=--openssl-legacy-provider`, required for the current Angular/webpack combination. Plain `ng serve` may fail without it.

### Build

```bash
ng build                                 # development build
ng build --configuration=production      # production build
```

### Tests

```bash
# Unit tests (Karma/Jasmine)
npx ng test --watch=false --browsers=ChromeHeadless

# On Windows without Chrome, point CHROME_BIN at another Chromium-based browser:
CHROME_BIN="/c/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe" \
  npx ng test --watch=false --browsers=ChromeHeadless

# E2E tests (Playwright — targets production by default, see playwright.config.ts)
npx playwright test
```

### Code scaffolding

```bash
ng generate component component-name
```

See `ng help` for more generators (directive, service, pipe, etc.).

## Data Sources

The goal is to host all primary sources of AhlulBayt Hadith.

### Al-Kutub Al-Arba'ah — the Four Books

1. Kitab al-Kafi of Kulayni (Usul al-Kafi, Furu al-Kafi, Rawdat al-Kafi)
1. Man La Yahduruhu al-Faqih of Shaykh Saduq
1. Tahdhib al-Ahkam of Shaykh Tusi
1. Al-Istibsar of Shaykh Tusi

### Primary Hadith Collections

(Books compiled, written, or dictated by their authors or their students directly.)

1. Kitab Sulaym ibn Qays, by Sulaym ibn Qays
1. Kitab al-Mu'min, by Husayn b. Sa'id al-Ahwazi
1. Al-Mahasin, by Ahmad b. Muhammad al-Barqi
1. Al-Amali of Shaykh Tusi
1. Al-Amali of Shaykh Saduq
1. Al-Tawhid of Shaykh Saduq
1. 'Uyun Akhbar al-Rida, by Shaykh Saduq
1. Tuhaf al-'Uqul, by Ibn Shu'ba al-Harrani
1. Al-Amali of Shaykh Mufid
1. Nahj al-Balagha, by al-Sharif al-Radi
1. Khasa'is al-A'imma, by al-Sharif al-Radi
1. Da'a'im al-Islam, by al-Qadi al-Nu'man
1. Al-Ihtijaj, by Abu Mansur Ahmad al-Tabrisi
1. Kamil al-Ziyarat, by Ibn Quluwayh
1. Al-Thaqib fi al-Manaqib, by Ibn Hamza al-Tusi
1. Basa'ir al-Darajat, by al-Saffar al-Qummi
1. Al-Ghayba, by Muhammad b. Ibrahim al-Nu'mani
1. Al-Ghayba, by Shaykh Tusi

## Known Issues

1. Column headings are not aligned with the hadith index/count numbers in chapter lists.
1. Heading tooltips are needed where titles are truncated.
1. Sub-chapters should be grouped in the chapter-list component — e.g., Al-Kafi Vol. 4 Book 3 chapters 106–115 belong to "Chapters on Hunting" and 213+ to "Chapters on Ziyarat" rather than being rendered flat. See [this StackOverflow thread](https://stackoverflow.com/questions/52217179/angular-material-mat-table-row-grouping) for grouping approaches (sorting interacts awkwardly).

See [`docs/CONSOLIDATED_ROADMAP.md`](docs/CONSOLIDATED_ROADMAP.md) for the full work-in-progress backlog and [`docs/_DOC_INDEX.md`](docs/_DOC_INDEX.md) for the documentation index.

## Deployment

Production is auto-deployed to Netlify on push to `master`:

- App: [https://thaqalayn.netlify.app/](https://thaqalayn.netlify.app/)
- Data API: [https://thaqalayndata.netlify.app/](https://thaqalayndata.netlify.app/) (sibling `ThaqalaynData` project)

## Further help

For Angular CLI usage, run `ng help` or see the [Angular CLI documentation](https://angular.dev/tools/cli).
