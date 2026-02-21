import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

const BASE_URL = 'https://thaqalayn.netlify.app';
const SITE_NAME = 'Thaqalayn';
const DEFAULT_DESCRIPTION = 'Read and explore authentic Shia Islamic texts including the Holy Quran and Al-Kafi hadith collection with English translations and narrator information.';
const DEFAULT_IMAGE = `${BASE_URL}/assets/just-logo_small.png`;

export interface PageMeta {
  title: string;
  description: string;
  url: string;
  type?: string;
  image?: string;
  jsonLd?: Record<string, unknown>;
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

    this.titleService.setTitle(fullTitle);

    this.meta.updateTag({ name: 'description', content: page.description });
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: page.description });
    this.meta.updateTag({ property: 'og:url', content: page.url });
    this.meta.updateTag({ property: 'og:type', content: ogType });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });

    this.updateCanonical(page.url);

    if (page.jsonLd) {
      this.updateJsonLd(page.jsonLd);
    } else {
      this.removeJsonLd();
    }
  }

  setHomePage(): void {
    this.setPageMeta({
      title: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      url: BASE_URL + '/',
      type: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: BASE_URL + '/',
        description: DEFAULT_DESCRIPTION,
      },
    });
  }

  setStaticPage(path: string, title: string): void {
    const descriptions: Record<string, string> = {
      '/about': 'Learn about the Thaqalayn project and its mission to provide accessible Islamic texts.',
      '/download': 'Download Quran and hadith data from the Thaqalayn project.',
      '/support': 'Support the Thaqalayn project and help make Islamic texts accessible to everyone.',
    };
    this.setPageMeta({
      title,
      description: descriptions[path] || DEFAULT_DESCRIPTION,
      url: BASE_URL + path,
    });
  }

  setBookPage(bookIndex: string, titleEn: string, descriptionEn?: string): void {
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

  setVerseDetailPage(
    bookIndex: string,
    verseIndex: number,
    partType: string,
    chapterTitle: string,
    translationText?: string,
  ): void {
    const path = '/books/' + bookIndex;
    const segments = bookIndex.split(':');
    const bookSlug = segments[0];
    const bookName = bookSlug === 'quran' ? 'Holy Quran' : bookSlug === 'al-kafi' ? 'Al-Kafi' : bookSlug;
    const title = `${partType} ${verseIndex} - ${chapterTitle} - ${bookName}`;
    const description = translationText
      ? translationText.substring(0, 160) + (translationText.length > 160 ? '...' : '')
      : `Read ${partType} ${verseIndex} from ${chapterTitle} in ${bookName} with translations on Thaqalayn.`;

    this.setPageMeta({
      title,
      description,
      url: BASE_URL + path,
      type: 'article',
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

  setNarratorListPage(): void {
    this.setPageMeta({
      title: 'Narrators',
      description: 'Browse the full list of hadith narrators referenced in Al-Kafi with narration counts and chain information.',
      url: BASE_URL + '/people/narrators/index',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Hadith Narrators',
        url: BASE_URL + '/people/narrators/index',
        description: 'Index of hadith narrators referenced in Al-Kafi.',
      },
    });
  }

  setNarratorPage(id: string, nameEn: string, nameAr?: string): void {
    const description = `Narrator profile for ${nameEn}${nameAr ? ' (' + nameAr + ')' : ''} with hadith references from Al-Kafi.`;
    this.setPageMeta({
      title: nameEn,
      description,
      url: BASE_URL + '/people/narrators/' + id,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: nameEn,
        url: BASE_URL + '/people/narrators/' + id,
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
