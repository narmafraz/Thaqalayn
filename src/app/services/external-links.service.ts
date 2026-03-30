import { Injectable } from '@angular/core';

export interface ExternalLink {
  label: string;
  url: string;
  icon?: string;
}

/**
 * Generates external links to other Islamic text sites for a given verse/hadith.
 *
 * For Quran verses: links to quran.com, quranx.com, al-quran.info, corpus.quran.com
 * For hadith: uses the existing source_url (thaqalayn.net) when available
 */
@Injectable({ providedIn: 'root' })
export class ExternalLinksService {

  /**
   * Get all available external links for a verse/hadith.
   * @param path The verse path, e.g. "/books/quran:1:1" or "/books/al-kafi:1:2:3:4"
   * @param sourceUrl Optional source_url from the data (typically thaqalayn.net)
   */
  getExternalLinks(path: string, sourceUrl?: string): ExternalLink[] {
    const index = path.startsWith('/books/') ? path.substring(7) : path;
    const parts = index.split(':');
    const bookSlug = parts[0];

    if (bookSlug === 'quran') {
      return this.getQuranLinks(parts);
    }
    return this.getHadithLinks(bookSlug, sourceUrl);
  }

  private getQuranLinks(parts: string[]): ExternalLink[] {
    // parts: ['quran', surah, ayah]
    if (parts.length < 3) return [];

    const surah = parts[1];
    const ayah = parts[2];
    const links: ExternalLink[] = [];

    // Quran.com — most popular, clean verse-level URLs
    links.push({
      label: 'Quran.com',
      url: `https://quran.com/${surah}:${ayah}`,
    });

    // QuranX — multi-translation comparison
    links.push({
      label: 'QuranX',
      url: `https://quranx.com/${surah}.${ayah}`,
    });

    // al-quran.info — has Shia Pooya/Ali commentary
    links.push({
      label: 'Al-Quran.info',
      url: `https://al-quran.info/${surah}/${ayah}`,
    });

    // Quranic Arabic Corpus — word-by-word morphology
    links.push({
      label: 'Quranic Arabic Corpus',
      url: `https://corpus.quran.com/translation.jsp?chapter=${surah}&verse=${ayah}`,
    });

    // Tanzil — Quran Navigator (hash-based)
    links.push({
      label: 'Tanzil',
      url: `https://tanzil.net/#${surah}:${ayah}`,
    });

    return links;
  }

  private getHadithLinks(bookSlug: string, sourceUrl?: string): ExternalLink[] {
    const links: ExternalLink[] = [];

    // thaqalayn.net — primary source for most hadith books
    if (sourceUrl?.includes('thaqalayn.net')) {
      links.push({
        label: 'Thaqalayn.net',
        url: sourceUrl,
      });
    }

    // WikiShia — encyclopedia articles for major books
    const wikiSlug = WIKISHIA_BOOK_SLUGS[bookSlug];
    if (wikiSlug) {
      links.push({
        label: 'WikiShia',
        url: `https://en.wikishia.net/view/${wikiSlug}`,
      });
    }

    return links;
  }
}

/**
 * Mapping of our book slugs to WikiShia article names.
 * WikiShia has articles about the books themselves (not individual hadiths),
 * so these link to the book-level article page.
 */
const WIKISHIA_BOOK_SLUGS: Record<string, string> = {
  'al-kafi': 'Al-Kafi',
  'man-la-yahduruhu-al-faqih': "Man_La_Yahduruh_al-Faqih",
  'tahdhib-al-ahkam': 'Tahdhib_al-Ahkam',
  'al-istibsar': 'Al-Istibsar',
  'nahj-al-balagha': 'Nahj_al-Balagha',
  'al-amali-mufid': "Al-Amali_(al-Mufid)",
  'al-amali-saduq': "Al-Amali_(al-Saduq)",
  'al-tawhid': "Al-Tawhid_(book)",
  'al-khisal': 'Al-Khisal',
  'uyun-akhbar-al-rida': "Uyun_Akhbar_al-Rida",
  'kamal-al-din': "Kamal_al-Din_wa_Tamam_al-Ni%27ma",
  'kamil-al-ziyarat': 'Kamil_al-Ziyarat',
  'kitab-al-ghayba-tusi': "Kitab_al-Ghayba_(al-Tusi)",
  'kitab-al-ghayba-numani': "Kitab_al-Ghayba_(al-Nu%27mani)",
  'risalat-al-huquq': 'Risalat_al-Huquq',
  'thawab-al-amal': "Thawab_al-A%27mal",
  'maani-al-akhbar': "Ma%27ani_al-Akhbar",
};
