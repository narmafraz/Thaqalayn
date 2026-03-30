import { ExternalLinksService } from './external-links.service';

describe('ExternalLinksService', () => {
  let service: ExternalLinksService;

  beforeEach(() => {
    service = new ExternalLinksService();
  });

  describe('Quran verses', () => {
    it('should generate Quran links from path', () => {
      const links = service.getExternalLinks('/books/quran:1:1');
      expect(links.length).toBe(5);
      expect(links[0]).toEqual({ label: 'Quran.com', url: 'https://quran.com/1:1' });
      expect(links[1]).toEqual({ label: 'QuranX', url: 'https://quranx.com/1.1' });
      expect(links[2]).toEqual({ label: 'Al-Quran.info', url: 'https://al-quran.info/1/1' });
      expect(links[3]).toEqual({ label: 'Quranic Arabic Corpus', url: 'https://corpus.quran.com/translation.jsp?chapter=1&verse=1' });
      expect(links[4]).toEqual({ label: 'Tanzil', url: 'https://tanzil.net/#1:1' });
    });

    it('should handle Al-Baqarah:255', () => {
      const links = service.getExternalLinks('/books/quran:2:255');
      expect(links[0].url).toBe('https://quran.com/2:255');
      expect(links[1].url).toBe('https://quranx.com/2.255');
    });

    it('should return empty for Quran chapter-level path', () => {
      const links = service.getExternalLinks('/books/quran:1');
      expect(links.length).toBe(0);
    });
  });

  describe('Hadith books with thaqalayn.net source_url', () => {
    it('should include thaqalayn.net link from source_url', () => {
      const links = service.getExternalLinks(
        '/books/al-kafi:1:1:1:1',
        'https://thaqalayn.net/hadith/1/1/1/1'
      );
      expect(links.find(l => l.label === 'Thaqalayn.net')).toBeTruthy();
      expect(links.find(l => l.label === 'Thaqalayn.net')!.url).toBe('https://thaqalayn.net/hadith/1/1/1/1');
    });

    it('should include WikiShia link for known books', () => {
      const links = service.getExternalLinks('/books/al-kafi:1:1:1:1', 'https://thaqalayn.net/hadith/1/1/1/1');
      const wiki = links.find(l => l.label === 'WikiShia');
      expect(wiki).toBeTruthy();
      expect(wiki!.url).toBe('https://en.wikishia.net/view/Al-Kafi');
    });

    it('should include WikiShia for Nahj al-Balagha', () => {
      const links = service.getExternalLinks('/books/nahj-al-balagha:1:1:1', 'https://thaqalayn.net/hadith/32/1/24/1');
      const wiki = links.find(l => l.label === 'WikiShia');
      expect(wiki).toBeTruthy();
      expect(wiki!.url).toBe('https://en.wikishia.net/view/Nahj_al-Balagha');
    });
  });

  describe('Hadith books without source_url', () => {
    it('should still include WikiShia for known books', () => {
      const links = service.getExternalLinks('/books/tahdhib-al-ahkam:1:1:1');
      expect(links.length).toBe(1);
      expect(links[0].label).toBe('WikiShia');
    });

    it('should return empty for unknown books without source_url', () => {
      const links = service.getExternalLinks('/books/unknown-book:1:1:1');
      expect(links.length).toBe(0);
    });
  });

  describe('path handling', () => {
    it('should handle paths with /books/ prefix', () => {
      const links = service.getExternalLinks('/books/quran:2:1');
      expect(links.length).toBe(5);
    });

    it('should handle paths without /books/ prefix', () => {
      const links = service.getExternalLinks('quran:2:1');
      expect(links.length).toBe(5);
    });
  });
});
