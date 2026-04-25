import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

const BASE_URL = 'https://thaqalayn.netlify.app';
const SITE_NAME = 'Thaqalayn';
const DEFAULT_DESCRIPTION = 'Thaqalayn is a free, open digital library of authentic Shia Islamic primary texts — the Holy Quran and the Al-Kafi hadith collection — with Arabic originals, multiple English translations, narrator chains, and scholarly references.';
const DEFAULT_IMAGE = `${BASE_URL}/assets/just-logo_small.png`;
const META_DESCRIPTION_MAX = 155;

// Map of i18n language codes to Open Graph locale codes.
// Languages without a clear region default to the language code alone.
const OG_LOCALES: Record<string, string> = {
  en: 'en_US',
  ar: 'ar_AR',
  fa: 'fa_IR',
  ur: 'ur_PK',
  fr: 'fr_FR',
  tr: 'tr_TR',
  id: 'id_ID',
  bn: 'bn_BD',
  es: 'es_ES',
  de: 'de_DE',
  ru: 'ru_RU',
  zh: 'zh_CN',
};

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface PageMeta {
  title: string;
  description: string;
  url: string;
  type?: string;
  image?: string;
  jsonLd?: Record<string, unknown>;
  locale?: string;
  breadcrumbs?: BreadcrumbItem[];
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private jsonLdElement: HTMLScriptElement | null = null;

  constructor(
    private titleService: Title,
    private meta: Meta,
    @Inject(DOCUMENT) private document: Document,
  ) {}

  setPageMeta(page: PageMeta): void {
    const fullTitle = page.title === SITE_NAME ? SITE_NAME : `${page.title} - ${SITE_NAME}`;
    const ogType = page.type || 'website';
    const image = page.image || DEFAULT_IMAGE;
    const description = truncateMeta(page.description);
    const locale = page.locale || OG_LOCALES['en'];

    this.titleService.setTitle(fullTitle);

    this.meta.updateTag({ name: 'description', content: description });

    // Open Graph
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: page.url });
    this.meta.updateTag({ property: 'og:type', content: ogType });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:locale', content: locale });

    // Twitter Card
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: image });

    this.updateCanonical(page.url);

    if (page.jsonLd || page.breadcrumbs?.length) {
      this.updateJsonLd(buildJsonLdGraph(page.jsonLd, page.breadcrumbs));
    } else {
      this.removeJsonLd();
    }
  }

  setHomePage(lang?: string): void {
    this.setPageMeta({
      title: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      url: BASE_URL + '/',
      type: 'website',
      locale: ogLocaleFor(lang),
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: BASE_URL + '/',
        description: DEFAULT_DESCRIPTION,
      },
    });
  }

  setStaticPage(path: string, title: string, lang?: string): void {
    const descriptions: Record<string, string> = {
      '/about': 'Learn about the Thaqalayn project and its mission to provide accessible Islamic texts.',
      '/download': 'Download Quran and hadith data from the Thaqalayn project.',
      '/support': 'Support the Thaqalayn project and help make Islamic texts accessible to everyone.',
    };
    this.setPageMeta({
      title,
      description: descriptions[path] || DEFAULT_DESCRIPTION,
      url: BASE_URL + path,
      locale: ogLocaleFor(lang),
    });
  }

  setBookPage(bookIndex: string, titleEn: string, descriptionEn?: string, lang?: string, breadcrumbs?: BreadcrumbItem[]): void {
    const path = '/books/' + bookIndex;
    const isQuran = bookIndex.startsWith('quran');
    const isAlKafi = bookIndex.startsWith('al-kafi');
    const bookName = isQuran ? 'Holy Quran' : isAlKafi ? 'Al-Kafi' : bookIndex;

    const description = descriptionEn
      || `Read ${titleEn} from ${bookName} with English translations on Thaqalayn.`;

    this.setPageMeta({
      title: titleEn,
      description,
      url: BASE_URL + path,
      type: 'book',
      locale: ogLocaleFor(lang),
      breadcrumbs,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Book',
        name: titleEn,
        url: BASE_URL + path,
        description,
        inLanguage: ['ar', 'en'],
      },
    });
  }

  setVerseDetailPageWithAi(
    bookIndex: string,
    verseIndex: number,
    partType: string,
    chapterTitle: string,
    aiSeoQuestion?: string,
    aiSummary?: string,
    translationText?: string,
    lang?: string,
    breadcrumbs?: BreadcrumbItem[],
  ): void {
    const path = '/books/' + bookIndex;
    const segments = bookIndex.split(':');
    const bookSlug = segments[0];
    const bookName = bookSlug === 'quran' ? 'Holy Quran' : bookSlug === 'al-kafi' ? 'Al-Kafi' : bookSlug;
    const title = `${partType} ${verseIndex} - ${chapterTitle} - ${bookName}`;

    const description = aiSeoQuestion
      || aiSummary
      || translationText
      || `Read ${partType} ${verseIndex} from ${chapterTitle} in ${bookName} with translations on Thaqalayn.`;

    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: title,
      url: BASE_URL + path,
      description,
      inLanguage: ['ar', 'en'],
      isPartOf: {
        '@type': 'Book',
        name: bookName,
        url: BASE_URL + '/books/' + bookSlug,
      },
    };

    if (aiSeoQuestion && aiSummary) {
      jsonLd['mainEntity'] = {
        '@type': 'Question',
        name: aiSeoQuestion,
        acceptedAnswer: {
          '@type': 'Answer',
          text: aiSummary,
        },
      };
    }

    this.setPageMeta({
      title,
      description,
      url: BASE_URL + path,
      type: 'article',
      jsonLd,
      locale: ogLocaleFor(lang),
      breadcrumbs,
    });
  }

  setVerseDetailPage(
    bookIndex: string,
    verseIndex: number,
    partType: string,
    chapterTitle: string,
    translationText?: string,
    lang?: string,
    breadcrumbs?: BreadcrumbItem[],
  ): void {
    const path = '/books/' + bookIndex;
    const segments = bookIndex.split(':');
    const bookSlug = segments[0];
    const bookName = bookSlug === 'quran' ? 'Holy Quran' : bookSlug === 'al-kafi' ? 'Al-Kafi' : bookSlug;
    const title = `${partType} ${verseIndex} - ${chapterTitle} - ${bookName}`;
    const description = translationText
      || `Read ${partType} ${verseIndex} from ${chapterTitle} in ${bookName} with translations on Thaqalayn.`;

    this.setPageMeta({
      title,
      description,
      url: BASE_URL + path,
      type: 'article',
      locale: ogLocaleFor(lang),
      breadcrumbs,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: title,
        url: BASE_URL + path,
        description,
        inLanguage: ['ar', 'en'],
        isPartOf: {
          '@type': 'Book',
          name: bookName,
          url: BASE_URL + '/books/' + bookSlug,
        },
      },
    });
  }

  setNarratorListPage(lang?: string): void {
    const url = BASE_URL + '/people/narrators/index';
    this.setPageMeta({
      title: 'Narrators',
      description: 'Browse the full list of hadith narrators referenced in Al-Kafi with narration counts and chain information.',
      url,
      locale: ogLocaleFor(lang),
      breadcrumbs: [
        { name: 'Home', url: BASE_URL + '/' },
        { name: 'Narrators', url },
      ],
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Hadith Narrators',
        url,
        description: 'Index of hadith narrators referenced in Al-Kafi.',
      },
    });
  }

  setNarratorPage(
    id: string,
    nameEn: string,
    nameAr?: string,
    biographySummary?: string,
    descriptionEn?: string,
    lang?: string,
  ): void {
    const url = BASE_URL + '/people/narrators/' + id;
    const description = biographySummary
      || descriptionEn
      || `Narrator profile for ${nameEn}${nameAr ? ' (' + nameAr + ')' : ''} with hadith references from Al-Kafi.`;
    this.setPageMeta({
      title: nameEn,
      description,
      url,
      locale: ogLocaleFor(lang),
      breadcrumbs: [
        { name: 'Home', url: BASE_URL + '/' },
        { name: 'Narrators', url: BASE_URL + '/people/narrators/index' },
        { name: nameEn, url },
      ],
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: nameEn,
        ...(nameAr ? { alternateName: nameAr } : {}),
        url,
        description,
      },
    });
  }

  private updateCanonical(url: string): void {
    let link = this.document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private updateJsonLd(data: Record<string, unknown>): void {
    if (!this.jsonLdElement) {
      this.jsonLdElement = this.document.createElement('script');
      this.jsonLdElement.setAttribute('type', 'application/ld+json');
      this.document.head.appendChild(this.jsonLdElement);
    }
    this.jsonLdElement.textContent = JSON.stringify(data);
  }

  private removeJsonLd(): void {
    if (this.jsonLdElement) {
      this.jsonLdElement.remove();
      this.jsonLdElement = null;
    }
  }
}

function ogLocaleFor(lang?: string): string {
  if (!lang) return OG_LOCALES['en'];
  return OG_LOCALES[lang] || lang;
}

// Word-boundary-safe truncation. Avoids cutting mid-word at the meta description limit.
function truncateMeta(text: string, max = META_DESCRIPTION_MAX): string {
  if (!text) return '';
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice) + '…';
}

function buildJsonLdGraph(
  primary: Record<string, unknown> | undefined,
  breadcrumbs: BreadcrumbItem[] | undefined,
): Record<string, unknown> {
  if (!breadcrumbs?.length) {
    return primary as Record<string, unknown>;
  }

  const breadcrumbList = {
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: crumb.url.startsWith('http') ? crumb.url : BASE_URL + crumb.url,
    })),
  };

  if (!primary) {
    return { '@context': 'https://schema.org', ...breadcrumbList };
  }

  const { '@context': context, ...primaryRest } = primary;
  return {
    '@context': context || 'https://schema.org',
    '@graph': [primaryRest, breadcrumbList],
  };
}
