import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(SearchService);
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
});
