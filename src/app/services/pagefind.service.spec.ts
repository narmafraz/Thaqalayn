import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { environment } from '@env/environment';
import { PagefindService, SearchManifest } from './pagefind.service';

describe('PagefindService', () => {
  function setup(platform: 'browser' | 'server') {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PagefindService, { provide: PLATFORM_ID, useValue: platform }],
    });
    return {
      service: TestBed.inject(PagefindService),
      httpMock: TestBed.inject(HttpTestingController),
    };
  }

  it('search returns null on the server (no cross-origin bundle load during SSR)', async () => {
    const { service, httpMock } = setup('server');
    const res = await service.search('en', 'angel');
    expect(res).toBeNull();
    httpMock.verify();
  });

  it('getManifest fetches from the meta site and caches (shareReplay)', () => {
    const { service, httpMock } = setup('browser');
    const manifest: SearchManifest = {
      schema_version: 1, data_version: 'v1', books: ['al-kafi'],
      languages: [{ code: 'en', pages: 5 }], filters: ['book'],
    };
    let got: SearchManifest | null = null;
    service.getManifest().subscribe((m) => (got = m));
    service.getManifest().subscribe(); // second subscribe must not issue a 2nd request
    httpMock.expectOne(`${environment.searchBaseUrl}manifest.json`).flush(manifest);
    expect(got).toEqual(manifest);
    httpMock.verify();
  });

  it('getManifest resolves to null on HTTP error', () => {
    const { service, httpMock } = setup('browser');
    let got: SearchManifest | null | undefined;
    service.getManifest().subscribe((m) => (got = m));
    httpMock.expectOne(`${environment.searchBaseUrl}manifest.json`).error(new ProgressEvent('fail'));
    expect(got).toBeNull();
    httpMock.verify();
  });

  it('getQref fetches qref.json from the meta site', () => {
    const { service, httpMock } = setup('browser');
    let got: Record<string, string[]> | null = null;
    service.getQref().subscribe((q) => (got = q));
    httpMock.expectOne(`${environment.searchBaseUrl}qref.json`).flush({ '2:255': ['/books/quran:2:255'] });
    expect(got!['2:255'].length).toBe(1);
    httpMock.verify();
  });
});
