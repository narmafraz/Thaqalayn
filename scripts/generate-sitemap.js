const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://thaqalayn.netlify.app';
const DATA_DIR = path.resolve(__dirname, '../../ThaqalaynData');
const OUTPUT_FILE = path.resolve(__dirname, '../src/sitemap.xml');

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getBookPriority(bookPath) {
  // Root book pages (e.g., /books/quran, /books/al-kafi)
  if (!bookPath.includes(':')) {
    return '0.9';
  }
  return '0.7';
}

function urlEntry(loc, changefreq, priority) {
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

function loadBooksIndex() {
  const filePath = path.join(DATA_DIR, 'index', 'books.en.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function loadNarratorIds() {
  const narratorsDir = path.join(DATA_DIR, 'people', 'narrators');
  if (!fs.existsSync(narratorsDir)) {
    console.warn('Narrators directory not found:', narratorsDir);
    return [];
  }
  return fs.readdirSync(narratorsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
    .sort((a, b) => Number(a) - Number(b));
}

function generateSitemap() {
  const urls = [];

  // Homepage
  urls.push(urlEntry(BASE_URL + '/', 'weekly', '1.0'));

  // Static pages
  const staticPages = ['/about', '/download', '/support'];
  for (const page of staticPages) {
    urls.push(urlEntry(BASE_URL + page, 'monthly', '0.5'));
  }

  // Book pages from index
  const booksIndex = loadBooksIndex();
  // booksIndex is an object where keys are paths like "/books/al-kafi:1:2:3"
  for (const bookPath of Object.keys(booksIndex)) {
    const priority = getBookPriority(bookPath);
    urls.push(urlEntry(BASE_URL + bookPath, 'monthly', priority));
  }

  // Narrator list page
  urls.push(urlEntry(BASE_URL + '/people/narrators/index', 'monthly', '0.6'));

  // Individual narrator pages
  const narratorIds = loadNarratorIds();
  for (const id of narratorIds) {
    urls.push(urlEntry(BASE_URL + '/people/narrators/' + id, 'monthly', '0.6'));
  }

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    ''
  ].join('\n');

  fs.writeFileSync(OUTPUT_FILE, sitemap, 'utf-8');

  const bookCount = Object.keys(booksIndex).length;
  const narratorCount = narratorIds.length;
  const totalUrls = urls.length;
  console.log(`Sitemap generated: ${OUTPUT_FILE}`);
  console.log(`  ${totalUrls} total URLs (1 homepage + ${staticPages.length} static + ${bookCount} book pages + 1 narrator list + ${narratorCount} narrator pages)`);
}

generateSitemap();
