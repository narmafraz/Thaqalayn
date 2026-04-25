// Generates sitemap.xml from the data index.
//
// Reads from a local ../../ThaqalaynData checkout when present (developer
// machines). Falls back to fetching from the deployed JSON API
// (https://thaqalayndata.netlify.app/) when the local data dir is absent —
// this lets Netlify's CI build the sitemap without bundling all the data.
//
// Emits <lastmod> for every URL, derived from file mtime locally or from
// the index's last_updated field when fetched. Falls back to today.

const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_URL = 'https://thaqalayn.netlify.app';
const DATA_REMOTE_URL = process.env.THAQALAYN_DATA_URL || 'https://thaqalayndata.netlify.app';
const DATA_DIR = path.resolve(__dirname, '../../ThaqalaynData');
const OUTPUT_FILE = path.resolve(__dirname, '../src/sitemap.xml');

const TODAY_ISO = new Date().toISOString().slice(0, 10);

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getBookPriority(bookPath) {
  if (!bookPath.includes(':')) return '0.9';
  return '0.7';
}

function urlEntry(loc, changefreq, priority, lastmod) {
  const lm = lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : '';
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>${lm}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
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

async function loadBooksIndex() {
  const localPath = path.join(DATA_DIR, 'index', 'books.en.json');
  if (fs.existsSync(localPath)) {
    return { source: 'local', data: JSON.parse(fs.readFileSync(localPath, 'utf-8')), localPath };
  }
  const remoteUrl = `${DATA_REMOTE_URL}/index/books.en.json`;
  console.log(`Local data dir missing; fetching ${remoteUrl}`);
  return { source: 'remote', data: await fetchJson(remoteUrl) };
}

async function loadNarratorIds() {
  const narratorsDir = path.join(DATA_DIR, 'people', 'narrators');
  if (fs.existsSync(narratorsDir)) {
    return {
      source: 'local',
      ids: fs.readdirSync(narratorsDir)
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''))
        .sort((a, b) => Number(a) - Number(b)),
    };
  }
  // Remote fallback: there is no narrator index endpoint that lists every ID.
  // The canonical registry has 4,629 entries with sequential IDs 1..N. We
  // fetch the narrator metadata index instead, which contains every narrator
  // referenced anywhere in the corpus.
  const remoteUrl = `${DATA_REMOTE_URL}/people/narrators/index.json`;
  try {
    console.log(`Local narrators dir missing; fetching ${remoteUrl}`);
    const wrapper = await fetchJson(remoteUrl);
    const data = wrapper && wrapper.data ? wrapper.data : {};
    const ids = Object.keys(data).filter(k => k !== 'index').sort((a, b) => Number(a) - Number(b));
    return { source: 'remote', ids };
  } catch (err) {
    console.warn(`Could not fetch narrator index: ${err.message}. Sitemap will omit individual narrator URLs.`);
    return { source: 'remote', ids: [] };
  }
}

function fileLastMod(filePath) {
  try {
    return fs.statSync(filePath).mtime.toISOString().slice(0, 10);
  } catch {
    return TODAY_ISO;
  }
}

async function generateSitemap() {
  const urls = [];

  urls.push(urlEntry(BASE_URL + '/', 'weekly', '1.0', TODAY_ISO));

  const staticPages = ['/about', '/download', '/support'];
  for (const page of staticPages) {
    urls.push(urlEntry(BASE_URL + page, 'monthly', '0.5', TODAY_ISO));
  }

  const { source: booksSource, data: booksIndex, localPath: booksLocalPath } = await loadBooksIndex();
  const booksLastMod = booksLocalPath ? fileLastMod(booksLocalPath) : TODAY_ISO;
  for (const bookPath of Object.keys(booksIndex)) {
    const priority = getBookPriority(bookPath);
    urls.push(urlEntry(BASE_URL + bookPath, 'monthly', priority, booksLastMod));
  }

  urls.push(urlEntry(BASE_URL + '/people/narrators/index', 'monthly', '0.6', TODAY_ISO));

  const { source: narratorsSource, ids: narratorIds } = await loadNarratorIds();
  // Use the same lastmod for all narrators — building per-file mtime over
  // 4,629 files is too slow remotely and unhelpful: narrator data updates
  // together when the AI pipeline runs.
  for (const id of narratorIds) {
    urls.push(urlEntry(BASE_URL + '/people/narrators/' + id, 'monthly', '0.6', TODAY_ISO));
  }

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    ''
  ].join('\n');

  fs.writeFileSync(OUTPUT_FILE, sitemap, 'utf-8');

  console.log(`Sitemap generated: ${OUTPUT_FILE}`);
  console.log(`  ${urls.length} total URLs (1 home + ${staticPages.length} static + ${Object.keys(booksIndex).length} books [${booksSource}] + 1 narrator list + ${narratorIds.length} narrators [${narratorsSource}])`);
}

generateSitemap().catch((err) => {
  console.error('Sitemap generation failed:', err);
  process.exit(1);
});
