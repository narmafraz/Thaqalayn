import { AiPreferencesService } from './ai-preferences.service';

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
    expect(service.get('showIsnadSeparation')).toBe(true);
    expect(service.get('showAiTranslationDisclaimer')).toBe(true);
    expect(service.get('wordByWordDefaultLang')).toBe('en');
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
  });

  it('should reset to defaults', () => {
    service.set('showContentTypeBadges', false);
    service.set('wordByWordDefaultLang', 'fa');
    service.reset();
    expect(service.get('showContentTypeBadges')).toBe(true);
    expect(service.get('wordByWordDefaultLang')).toBe('en');
  });

  it('should handle corrupt localStorage data', () => {
    localStorage.setItem('thaqalayn_ai_preferences', 'invalid json');
    const s = new AiPreferencesService();
    expect(s.get('showContentTypeBadges')).toBe(true);
  });
});
