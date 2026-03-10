/**
 * Centralized mapping of book slugs to author/compiler metadata.
 *
 * Each entry maps the URL slug (e.g. 'al-kafi') to an object with
 * English and Arabic names of the book's author or compiler.
 *
 * Books with no human author (the Quran) or whose authorship is
 * attributed to an Imam have appropriate entries.
 */
export interface BookAuthor {
  en: string;
  ar: string;
}

export const BOOK_AUTHORS: Record<string, BookAuthor> = {
  // --- The Holy Quran (no human author) ---
  'quran': { en: '', ar: '' },

  // --- The Four Books (al-Kutub al-Arba'a) ---
  'al-kafi': { en: 'Al-Kulayni', ar: 'الكليني' },
  'man-la-yahduruhu-al-faqih': { en: 'Al-Saduq', ar: 'الصدوق' },
  'tahdhib-al-ahkam': { en: 'Al-Tusi', ar: 'الطوسي' },
  'al-istibsar': { en: 'Al-Tusi', ar: 'الطوسي' },

  // --- Al-Saduq's works ---
  'al-amali-saduq': { en: 'Al-Saduq', ar: 'الصدوق' },
  'al-khisal': { en: 'Al-Saduq', ar: 'الصدوق' },
  'al-tawhid': { en: 'Al-Saduq', ar: 'الصدوق' },
  'kamal-al-din': { en: 'Al-Saduq', ar: 'الصدوق' },
  'maani-al-akhbar': { en: 'Al-Saduq', ar: 'الصدوق' },
  'thawab-al-amal': { en: 'Al-Saduq', ar: 'الصدوق' },
  'fadail-al-shia': { en: 'Al-Saduq', ar: 'الصدوق' },
  'sifat-al-shia': { en: 'Al-Saduq', ar: 'الصدوق' },
  'uyun-akhbar-al-rida': { en: 'Al-Saduq', ar: 'الصدوق' },

  // --- Al-Mufid's works ---
  'al-amali-mufid': { en: 'Al-Mufid', ar: 'المفيد' },

  // --- Al-Tusi's works ---
  'kitab-al-ghayba-tusi': { en: 'Al-Tusi', ar: 'الطوسي' },

  // --- Al-Nu'mani ---
  'kitab-al-ghayba-numani': { en: "Al-Nu'mani", ar: 'النعماني' },

  // --- Al-Sharif al-Radi ---
  'nahj-al-balagha': { en: 'Al-Sharif al-Radi', ar: 'الشريف الرضي' },

  // --- Ja'far ibn Muhammad ibn Qulawayh ---
  'kamil-al-ziyarat': { en: "Ibn Qulawayh", ar: 'ابن قولويه' },

  // --- Imam al-Sajjad (attributed) ---
  'risalat-al-huquq': { en: 'Imam al-Sajjad', ar: 'الإمام السجاد (ع)' },

  // --- Al-Husayn ibn Sa'id al-Ahwazi ---
  'kitab-al-zuhd': { en: 'Al-Ahwazi', ar: 'الأهوازي' },
  'kitab-al-mumin': { en: 'Al-Ahwazi', ar: 'الأهوازي' },

  // --- Ahmad ibn 'Ali ibn al-'Abbas al-Najashi ---
  'kitab-al-duafa': { en: 'Ibn al-Ghada\'iri', ar: 'ابن الغضائري' },

  // --- Mu'jam al-Ahadith al-Mu'tabara (modern compilation) ---
  'mujam-al-ahadith-al-mutabara': { en: 'Muhammad Asif Muhsini', ar: 'محمد آصف محسني' },

  // --- Books in BOOK_CARD_META that are not yet in the data index ---
  // These are kept so that when these books are added, authors are ready.
  'kitab-al-irshad': { en: 'Al-Mufid', ar: 'المفيد' },
  'kitab-sulaym-ibn-qays': { en: "Sulaym ibn Qays", ar: 'سليم بن قيس' },
  'al-sahifa-al-sajjadiyya': { en: 'Imam al-Sajjad', ar: 'الإمام السجاد (ع)' },
  'wasael-ul-shia': { en: "Al-Hurr al-Amili", ar: 'الحر العاملي' },
  'bihar-al-anwar': { en: 'Al-Majlisi', ar: 'المجلسي' },
};

/**
 * Look up the author for a book by its slug or full path index.
 * Accepts either 'al-kafi' or 'al-kafi:1:2:3' — extracts the root slug.
 */
export function getBookAuthor(indexOrSlug: string): BookAuthor | undefined {
  const slug = indexOrSlug.split(':')[0];
  return BOOK_AUTHORS[slug];
}
