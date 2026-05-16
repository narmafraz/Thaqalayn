import { AiPreferencesService } from './ai-preferences.service';

const STORAGE_KEY = 'thaqalayn_ai_preferences';

describe('AiPreferencesService', () => {
  let service: AiPreferencesService;

  beforeEach(() => {
    localStorage.clear();
    service = new AiPreferencesService();
  });

  it('should be created with defaults', () => {
    expect(service).toBeTruthy();
    expect(service.get('showDiacritizedByDefault')).toBe(true);
    expect(service.get('showContentTypeBadges')).toBe(true);
    expect(service.get('showTopicTags')).toBe(true);
    expect(service.get('showAiTranslationDisclaimer')).toBe(true);
    expect(service.get('showChainDiagram')).toBe(false);
    expect(service.get('showWordByWord')).toBe(false);
    expect(service.get('sidesheetOpenOnDesktop')).toBe(false);
    expect(service.get('wordByWordDefaultLang')).toBe('en');
    expect(service.get('viewMode')).toBe('plain');
  });

  it('should persist preferences to localStorage', () => {
    service.set('showDiacritizedByDefault', true);
    // Create new instance to verify persistence
    const service2 = new AiPreferencesService();
    expect(service2.get('showDiacritizedByDefault')).toBe(true);
  });

  it('should update individual preferences', () => {
    service.set('wordByWordDefaultLang', 'ur');
    expect(service.get('wordByWordDefaultLang')).toBe('ur');
  });

  it('should return full preferences object', () => {
    const prefs = service.preferences;
    expect(prefs.showContentTypeBadges).toBe(true);
    expect(prefs.wordByWordDefaultLang).toBe('en');
    expect(prefs.showChainDiagram).toBe(false);
  });

  it('should reset to defaults', () => {
    service.set('showContentTypeBadges', false);
    service.set('wordByWordDefaultLang', 'fa');
    service.set('showChainDiagram', true);
    service.reset();
    expect(service.get('showContentTypeBadges')).toBe(true);
    expect(service.get('wordByWordDefaultLang')).toBe('en');
    expect(service.get('showChainDiagram')).toBe(false);
  });

  it('should handle corrupt localStorage data', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid json');
    const s = new AiPreferencesService();
    expect(s.get('showContentTypeBadges')).toBe(true);
  });

  it('setting showWordByWord syncs viewMode and emits on viewMode$', (done) => {
    service.viewMode$.subscribe(mode => {
      if (mode === 'word-by-word') {
        expect(service.get('viewMode')).toBe('word-by-word');
        done();
      }
    });
    service.set('showWordByWord', true);
  });

  it('setting viewMode syncs showWordByWord', () => {
    service.set('viewMode', 'word-by-word');
    expect(service.get('showWordByWord')).toBe(true);
    service.set('viewMode', 'plain');
    expect(service.get('showWordByWord')).toBe(false);
  });

  it('setViewMode is equivalent to set("viewMode", ...) for legacy callers', () => {
    service.setViewMode('word-by-word');
    expect(service.get('viewMode')).toBe('word-by-word');
    expect(service.get('showWordByWord')).toBe(true);
  });

  it('migrates legacy stored viewMode=word-by-word to showWordByWord=true', () => {
    // Pre-upgrade prefs that only had viewMode, no showWordByWord field.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      showDiacritizedByDefault: true,
      viewMode: 'word-by-word',
    }));
    const s = new AiPreferencesService();
    expect(s.get('showWordByWord')).toBe(true);
    expect(s.get('viewMode')).toBe('word-by-word');
  });

  it('keeps showWordByWord and viewMode consistent on partial stored state', () => {
    // showWordByWord:false but viewMode:'word-by-word' — load should normalise.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      showWordByWord: false,
      viewMode: 'word-by-word',
    }));
    const s = new AiPreferencesService();
    expect(s.get('viewMode')).toBe('plain');
    expect(s.get('showWordByWord')).toBe(false);
  });

  it('strips deprecated showIsnadSeparation from loaded prefs', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      showIsnadSeparation: true,
      showDiacritizedByDefault: false,
    }));
    const s = new AiPreferencesService();
    expect((s.preferences as unknown as Record<string, unknown>)['showIsnadSeparation']).toBeUndefined();
    expect(s.get('showDiacritizedByDefault')).toBe(false);
  });
});
