import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ServiceWorkerModule } from '@angular/service-worker';

import { SupportComponent } from './support.component';
import { TranslatePipe } from '@app/pipes/translate.pipe';

describe('SupportComponent', () => {
  let component: SupportComponent;
  let fixture: ComponentFixture<SupportComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, ServiceWorkerModule.register('', { enabled: false })],
      declarations: [ SupportComponent, TranslatePipe ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    })
    .compileComponents();
  }));

  // Override `reload()` at the prototype level for the lifetime of the
  // entire Karma run. The motivating leak is confirmSafeRefresh's
  // `setTimeout(() => this.reload(), 600)`: the timer outlives the spec,
  // and once the override is unwound it fires the real
  // `window.location.reload()` in whichever unrelated spec is running
  // 600 ms later — aborting Karma with "Some of your tests did a full
  // page reload!". Restoring in afterAll races with the timer (it can
  // fire hundreds of specs later). Leaving the override in place is
  // safe: no other test or production code calls
  // `SupportComponent.prototype.reload` directly.
  const reloadSpy = jasmine.createSpy('reload');
  (SupportComponent.prototype as any).reload = reloadSpy;

  beforeEach(() => {
    reloadSpy.calls.reset();
    fixture = TestBed.createComponent(SupportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('browser cache instructions', () => {
    it('toggles the instructions panel without clearing any data', () => {
      const cachesSpy = spyOn(window.caches, 'keys');
      expect(component.showBrowserCache).toBeFalse();

      component.promptBrowserCache();
      expect(component.showBrowserCache).toBeTrue();

      component.cancelBrowserCache();
      expect(component.showBrowserCache).toBeFalse();

      // Showing instructions must never touch storage — it is informational only.
      expect(cachesSpy).not.toHaveBeenCalled();
    });
  });

  describe('safe refresh', () => {
    it('clears only the thaqalayn-offline DB and never personal data', async () => {
      const deleted: string[] = [];
      spyOn(indexedDB, 'deleteDatabase').and.callFake((name: string) => {
        deleted.push(name);
        // Return a stub request whose handlers the component invokes.
        const req: any = {};
        queueMicrotask(() => req.onsuccess && req.onsuccess());
        return req;
      });
      const localStorageSpy = spyOn(localStorage, 'clear');

      // Cache API is a read-only getter on window — spy on its methods in place.
      const cacheKeys = ['ngsw:app', 'ngsw:data'];
      spyOn(window.caches, 'keys').and.resolveTo(cacheKeys as any);
      const deleteSpy = spyOn(window.caches, 'delete').and.resolveTo(true);

      await component.confirmSafeRefresh();

      expect(deleted).toEqual(['thaqalayn-offline']);
      expect(deleted).not.toContain('thaqalayn-bookmarks');
      expect(localStorageSpy).not.toHaveBeenCalled();
      expect(deleteSpy).toHaveBeenCalledTimes(cacheKeys.length);
      expect(component.refreshComplete).toBeTrue();
      expect(component.showRefreshConfirm).toBeFalse();
    });

    // REGRESSION: clearing caches alone leaves the OLD app JS still
    // executing in memory. On the next user-initiated reload the SW
    // refills caches from network with the new data shape, but the
    // old JS reads the legacy fields and renders blank — the exact
    // failure that broke mobile Brave after the per-language split.
    // confirmSafeRefresh must schedule a page reload so the next load
    // boots the fresh JS.
    it('REGRESSION: triggers a page reload after clearing caches', async () => {
      spyOn(indexedDB, 'deleteDatabase').and.callFake(() => {
        const req: any = {};
        queueMicrotask(() => req.onsuccess && req.onsuccess());
        return req;
      });
      spyOn(window.caches, 'keys').and.resolveTo([]);

      await component.confirmSafeRefresh();
      // confirmSafeRefresh schedules `this.reload()` via setTimeout(..., 600).
      // Wait past the delay in real time (no jasmine.clock — it interferes
      // with Karma's WebSocket heartbeat). The prototype-level reloadSpy is
      // safe because no real navigation can fire.
      await new Promise(r => setTimeout(r, 700));
      expect(reloadSpy).toHaveBeenCalled();
    });
  });
});
