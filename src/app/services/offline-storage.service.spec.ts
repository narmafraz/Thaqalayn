import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { OfflineStorageService } from './offline-storage.service';

describe('OfflineStorageService — checkDataVersion', () => {
  let originalFetch: typeof fetch;
  let fetchSpy: jasmine.Spy;

  beforeEach(() => {
    originalFetch = window.fetch;
    fetchSpy = jasmine.createSpy('fetch').and.callFake((url: string) =>
      Promise.resolve(new Response(JSON.stringify({ version: 'v-new' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })),
    );
    window.fetch = fetchSpy as unknown as typeof fetch;
  });

  afterEach(() => {
    window.fetch = originalFetch;
  });

  function configure() {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
  }

  // REGRESSION: the SW's `api-index` data group has a 3-second freshness
  // timeout. On slow mobile networks it falls back to the SW-cached old
  // data_version.json, so the in-app version check sees "no change" and
  // never invalidates IndexedDB. The fix routes data_version through a
  // direct fetch() with cache: 'no-store' + a cache-busting query param,
  // bypassing the SW entirely. This test pins that behaviour.
  it('REGRESSION: fetches data_version with cache:no-store and a busting query param', async () => {
    configure();
    const service = TestBed.inject(OfflineStorageService);
    await service.dataVersionReady;

    expect(fetchSpy).toHaveBeenCalled();
    const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
    // URL must include the cache-busting param (we use ?t=<epoch>)
    expect(url).toContain('index/data_version.json');
    expect(url).toMatch(/[?&]t=\d+/);
    // And the request must bypass HTTP caches
    expect(init?.cache).toBe('no-store');
  });

  it('exposes dataVersionReady that resolves once the check completes', async () => {
    configure();
    const service = TestBed.inject(OfflineStorageService);
    expect(service.dataVersionReady).toBeInstanceOf(Promise);
    await expectAsync(service.dataVersionReady).toBeResolved();
  });

  it('swallows network errors silently (offline mode)', async () => {
    fetchSpy.and.returnValue(Promise.reject(new TypeError('Failed to fetch')));
    configure();
    const service = TestBed.inject(OfflineStorageService);
    // Must not reject — offline app keeps working with stale cache
    await expectAsync(service.dataVersionReady).toBeResolved();
  });
});
