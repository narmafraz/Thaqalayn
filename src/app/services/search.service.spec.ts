import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { SearchService } from './search.service';
import { AiContentService, TopicTaxonomy } from './ai-content.service';

describe('SearchService', () => {
  let service: SearchService;

  const mockTopics: TopicTaxonomy = {
    'theology': {
      'divine_unity': { count: 5, paths: ['/books/al-kafi:1:1:1:1', '/books/al-kafi:1:1:1:2'] },
      'prophethood': { count: 3, paths: ['/books/al-kafi:1:2:1:1'] },
    },
    'ethics': {
      'patience': { count: 2, paths: ['/books/al-kafi:2:1:1:1'] },
    },
  };

  beforeEach(() => {
    const aiContentSpy = jasmine.createSpyObj('AiContentService', ['getTopics', 'getPhrases']);
    aiContentSpy.getTopics.and.returnValue(of(mockTopics));
    aiContentSpy.getPhrases.and.returnValue(of(null));

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: AiContentService, useValue: aiContentSpy },
      ],
    });
    service = TestBed.inject(SearchService);
    // Stub the full-text index load — searchByTopic awaits it but tests don't
    // need the enriched titles/snippets it provides. The service falls back
    // gracefully to path-derived labels when the index isn't populated.
    spyOn(service, 'loadFullTextIndex').and.resolveTo();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('parseFilteredQuery', () => {
    it('should parse tag: prefix', () => {
      const result = service.parseFilteredQuery('tag:theology');
      expect(result).toEqual({ prefix: 'tag', value: 'theology' });
    });

    it('should parse type: prefix', () => {
      const result = service.parseFilteredQuery('type:creedal');
      expect(result).toEqual({ prefix: 'type', value: 'creedal' });
    });

    it('should parse topic: prefix', () => {
      const result = service.parseFilteredQuery('topic:tawhid');
      expect(result).toEqual({ prefix: 'topic', value: 'tawhid' });
    });

    it('should return null for plain queries', () => {
      expect(service.parseFilteredQuery('hello world')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(service.parseFilteredQuery('')).toBeNull();
    });

    it('should handle values with spaces', () => {
      const result = service.parseFilteredQuery('tag:divine unity');
      expect(result).toEqual({ prefix: 'tag', value: 'divine unity' });
    });

    it('should not match unknown prefixes', () => {
      expect(service.parseFilteredQuery('foo:bar')).toBeNull();
    });
  });

  describe('searchByTopic', () => {
    it('should return results for a matching topic', async () => {
      const results = await service.searchByTopic('divine_unity');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].snippet).toContain('divine unity');
      expect(results[0].kind).toBe('hadith');
    });

    it('should match topics case-insensitively', async () => {
      const results = await service.searchByTopic('Divine_Unity');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty for non-matching topic', async () => {
      const results = await service.searchByTopic('nonexistent_topic');
      expect(results.length).toBe(0);
    });

    it('should return one result per hadith (verse-level paths)', async () => {
      const results = await service.searchByTopic('divine_unity');
      // Mock has 2 distinct verses under divine_unity; result should preserve them
      expect(results.length).toBe(2);
      const paths = results.map(r => r.path).sort();
      expect(paths).toEqual(['/books/al-kafi:1:1:1:1', '/books/al-kafi:1:1:1:2']);
      // Paths should retain the trailing verse index, not collapse to chapter
      expect(paths.every(p => /:\d+:\d+:\d+:\d+$/.test(p))).toBe(true);
    });

    it('should deduplicate repeated verse paths', async () => {
      const results = await service.searchByTopic('divine_unity');
      const paths = results.map(r => r.path);
      expect(new Set(paths).size).toBe(paths.length);
    });

    it('should return empty when topics index is null', async () => {
      const aiContent = TestBed.inject(AiContentService) as jasmine.SpyObj<AiContentService>;
      aiContent.getTopics.and.returnValue(of(null));
      const results = await service.searchByTopic('divine_unity');
      expect(results.length).toBe(0);
    });
  });
});
