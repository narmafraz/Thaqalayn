// Generates sitemap.xml as a SITEMAP INDEX referencing per-bucket sitemaps.
//
// Buckets:
//   sitemap-static.xml      Homepage + static pages
//   sitemap-narrators.xml   Narrator index + per-narrator pages
//   sitemap-{book-slug}.xml One per book — quran, al-kafi, etc.
//
// Why an index: a single sitemap can hold up to 50,000 URLs / 50 MB.
// We have ~67K verse-detail URLs across 15 books today, growing as new
// books come online. Splitting per book keeps every file well under the
// limit and lets Search Console report indexing progress per book.
//
// Local path: walks ../../ThaqalaynData/ to discover every book/verse JSON
//             file. Emits per-file <lastmod> from file mtime.
//
// Remote fallback (CI without local data): emits a minimal sitemap.xml
//             using only the books index + narrators index from the
//             deployed JSON API. Verse URLs are only included when the
//             local data dir is present, since enumerating them remotely
//             would take 8K+ HTTP requests.

const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_URL = 'https://thaqalayn.netlify.app';
const DATA_REMOTE_URL = process.env.THAQALAYN_DATA_URL || 'https://thaqalayndata.netlify.app';
const DATA_DIR = path.resolve(__dirname, '../../ThaqalaynData');
const OUT_DIR = path.resolve(__dirname, '../src');
const TODAY_ISO = new Date().toISOString().slice(0, 10);

const STATIC_PAGES = ['/about', '/download', '/support'];

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function urlEntry(loc, lastmod, changefreq, priority) {
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${escapeXml(lastmod)}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function fileLastMod(filePath) {
  try {
    return fs.statSync(filePath).mtime.toISOString().slice(0, 10);
  } catch {
    return TODAY_ISO;
  }
}

// Convert a data-file path like "al-kafi/1/1/1.json" into the URL path
// "/books/al-kafi:1:1:1". Top-level book files like "al-kafi.json" map to
// "/books/al-kafi".
function dataPathToUrl(rel) {
  const noExt = rel.replace(/\.json$/, '');
  const parts = noExt.split('/');
  return '/books/' + parts.join(':');
}

// Priority heuristic: deeper paths (verse-detail) get lower priority than
// chapters and book roots.
function priorityForUrl(urlPath) {
  const segCount = (urlPath.match(/:/g) || []).length;
  if (segCount === 0) return '0.9';   // /books/quran
  if (segCount === 1) return '0.8';   // /books/quran:1
  if (segCount === 2) return '0.7';   // /books/al-kafi:1:1
  if (segCount === 3) return '0.6';   // /books/al-kafi:1:1:1
  return '0.5';                       // /books/al-kafi:1:1:1:1 (verse-detail)
}

// Walk a book directory, returning entries [{ url, lastmod }, ...].
function walkBookDir(booksDir, slug) {
  const entries = [];
  const rootFile = path.join(booksDir, slug + '.json');
  if (fs.existsSync(rootFile)) {
    entries.push({ url: '/books/' + slug, lastmod: fileLastMod(rootFile) });
  }
  const subDir = path.join(booksDir, slug);
  if (!fs.existsSync(subDir)) return entries;
  const stack = [subDir];
  while (stack.length) {
    const dir = stack.pop();
    let dirents;
    try { dirents = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const dirent of dirents) {
      const full = path.join(dir, dirent.name);
      if (dirent.isDirectory()) {
        if (dirent.name === 'complete') continue;
        stack.push(full);
      } else if (dirent.isFile() && dirent.name.endsWith('.json')) {
        const rel = path.relative(booksDir, full).replace(/\\/g, '/');
        const url = dataPathToUrl(rel);
        entries.push({ url, lastmod: fileLastMod(full) });
      }
    }
  }
  return entries;
}

function discoverBookSlugs(booksDir) {
  const slugs = new Set();
  for (const dirent of fs.readdirSync(booksDir, { withFileTypes: true })) {
    if (dirent.isDirectory()) {
      if (dirent.name === 'complete') continue;
      slugs.add(dirent.name);
    } else if (dirent.isFile() && dirent.name.endsWith('.json') && dirent.name !== 'books.json') {
      slugs.add(dirent.name.replace(/\.json$/, ''));
    }
  }
  return Array.from(slugs).sort();
}

function writeBucket(filename, urls) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ];
  fs.writeFileSync(path.join(OUT_DIR, filename), lines.join('\n'), 'utf-8');
}

function writeIndex(bucketFilenames) {
  const entries = bucketFilenames.map(name =>
    `  <sitemap>\n    <loc>${BASE_URL}/${name}</loc>\n    <lastmod>${TODAY_ISO}</lastmod>\n  </sitemap>`
  );
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</sitemapindex>',
    '',
  ];
  fs.writeFileSync(path.join(OUT_DIR, 'sitemap.xml'), lines.join('\n'), 'utf-8');
}

async function generateLocal() {
  const booksDir = path.join(DATA_DIR, 'books');
  const narratorsDir = path.join(DATA_DIR, 'people', 'narrators');

  const buckets = {};

  // Static
  buckets['sitemap-static.xml'] = [
    urlEntry(BASE_URL + '/', TODAY_ISO, 'weekly', '1.0'),
    ...STATIC_PAGES.map(p => urlEntry(BASE_URL + p, TODAY_ISO, 'monthly', '0.5')),
  ];

  // One sitemap per book slug
  const slugs = discoverBookSlugs(booksDir);
  for (const slug of slugs) {
    const entries = walkBookDir(booksDir, slug);
    if (entries.length === 0) continue;
    buckets[`sitemap-${slug}.xml`] = entries.map(e =>
      urlEntry(BASE_URL + e.url, e.lastmod, 'monthly', priorityForUrl(e.url))
    );
  }

  // Narrators
  const narratorEntries = [];
  narratorEntries.push(urlEntry(BASE_URL + '/people/narrators/index', TODAY_ISO, 'monthly', '0.7'));
  if (fs.existsSync(narratorsDir)) {
    const ids = fs.readdirSync(narratorsDir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace(/\.json$/, ''))
      .sort((a, b) => Number(a) - Number(b));
    for (const id of ids) {
      const lastmod = fileLastMod(path.join(narratorsDir, id + '.json'));
      narratorEntries.push(urlEntry(BASE_URL + '/people/narrators/' + id, lastmod, 'monthly', '0.6'));
    }
  }
  buckets['sitemap-narrators.xml'] = narratorEntries;

  // Write all buckets
  const filenames = [];
  let totalUrls = 0;
  for (const [filename, urls] of Object.entries(buckets)) {
    if (urls.length === 0) continue;
    if (urls.length > 50000) {
      throw new Error(`${filename} has ${urls.length} URLs — exceeds the 50,000-URL sitemap limit. Split further.`);
    }
    writeBucket(filename, urls);
    filenames.push(filename);
    totalUrls += urls.length;
    console.log(`  ${filename}: ${urls.length} URLs`);
  }
  writeIndex(filenames);
  console.log(`Sitemap index written: src/sitemap.xml (${filenames.length} buckets, ${totalUrls} total URLs)`);
}

async function generateRemote() {
  console.log('Local data dir absent — falling back to remote fetch (book + narrator index URLs only, no verse-detail URLs).');
  const booksUrl = `${DATA_REMOTE_URL}/index/books.en.json`;
  const narratorsUrl = `${DATA_REMOTE_URL}/people/narrators/index.json`;

  const booksIndex = await fetchJson(booksUrl);
  let narratorIds = [];
  try {
    const wrapper = await fetchJson(narratorsUrl);
    const data = wrapper && wrapper.data ? wrapper.data : {};
    narratorIds = Object.keys(data).filter(k => k !== 'index').sort((a, b) => Number(a) - Number(b));
  } catch (err) {
    console.warn(`Could not fetch narrator index: ${err.message}`);
  }

  const buckets = {};
  buckets['sitemap-static.xml'] = [
    urlEntry(BASE_URL + '/', TODAY_ISO, 'weekly', '1.0'),
    ...STATIC_PAGES.map(p => urlEntry(BASE_URL + p, TODAY_ISO, 'monthly', '0.5')),
  ];

  // Group remote book URLs by slug — each slug becomes its own sitemap.
  const bySlug = {};
  for (const urlPath of Object.keys(booksIndex)) {
    // urlPath looks like /books/al-kafi:1:2:3
    const m = urlPath.match(/^\/books\/([^:]+)/);
    if (!m) continue;
    const slug = m[1];
    if (!bySlug[slug]) bySlug[slug] = [];
    bySlug[slug].push(urlEntry(BASE_URL + urlPath, TODAY_ISO, 'monthly', priorityForUrl(urlPath)));
  }
  for (const [slug, urls] of Object.entries(bySlug)) {
    buckets[`sitemap-${slug}.xml`] = urls;
  }

  const narratorEntries = [urlEntry(BASE_URL + '/people/narrators/index', TODAY_ISO, 'monthly', '0.7')];
  for (const id of narratorIds) {
    narratorEntries.push(urlEntry(BASE_URL + '/people/narrators/' + id, TODAY_ISO, 'monthly', '0.6'));
  }
  buckets['sitemap-narrators.xml'] = narratorEntries;

  const filenames = [];
  let totalUrls = 0;
  for (const [filename, urls] of Object.entries(buckets)) {
    if (urls.length === 0) continue;
    writeBucket(filename, urls);
    filenames.push(filename);
    totalUrls += urls.length;
    console.log(`  ${filename}: ${urls.length} URLs`);
  }
  writeIndex(filenames);
  console.log(`Sitemap index written: src/sitemap.xml (${filenames.length} buckets, ${totalUrls} total URLs, remote mode — verse URLs skipped)`);
}

async function main() {
  if (fs.existsSync(DATA_DIR)) {
    await generateLocal();
  } else {
    await generateRemote();
  }
}

main().catch((err) => {
  console.error('Sitemap generation failed:', err);
  process.exit(1);
});
