import { ExpandLanguagePipe } from './expand-language.pipe';

describe('ExpandLanguagePipe', () => {
  let pipe: ExpandLanguagePipe;

  beforeEach(() => {
    pipe = new ExpandLanguagePipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should expand "en" to "English"', () => {
    expect(pipe.transform('en')).toBe('English');
  });

  it('should expand "ar" to Arabic name', () => {
    expect(pipe.transform('ar')).toBe('العربية');
  });

  it('should expand "fa" to Persian name', () => {
    expect(pipe.transform('fa')).toBe('فارسی');
  });

  it('should expand "fr" to French name', () => {
    expect(pipe.transform('fr')).toBe('Français');
  });

  it('should expand "ur" to Urdu name', () => {
    expect(pipe.transform('ur')).toBe('اردو');
  });

  it('should expand "tr" to Turkish name', () => {
    expect(pipe.transform('tr')).toBe('Türkçe');
  });

  it('should expand all 12 supported languages', () => {
    const expectedLanguages: Record<string, string> = {
      ar: 'العربية',
      en: 'English',
      fa: 'فارسی',
      fr: 'Français',
      ur: 'اردو',
      tr: 'Türkçe',
      id: 'Bahasa Indonesia',
      bn: 'বাংলা',
      es: 'Español',
      de: 'Deutsch',
      ru: 'Русский',
      zh: '中文',
    };

    for (const [code, name] of Object.entries(expectedLanguages)) {
      expect(pipe.transform(code)).toBe(name, `Failed for language code: ${code}`);
    }
  });

  it('should return the code itself for unknown languages', () => {
    expect(pipe.transform('xx')).toBe('xx');
  });

  it('should return "UNKNOWN LANGUAGE" for null', () => {
    expect(pipe.transform(null)).toBe('UNKNOWN LANGUAGE');
  });

  it('should return "UNKNOWN LANGUAGE" for undefined', () => {
    expect(pipe.transform(undefined)).toBe('UNKNOWN LANGUAGE');
  });

  it('should return "UNKNOWN LANGUAGE" for empty string', () => {
    expect(pipe.transform('')).toBe('UNKNOWN LANGUAGE');
  });
});
