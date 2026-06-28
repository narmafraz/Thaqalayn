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

  beforeEach(() => {
    fixture = TestBed.createComponent(SupportComponent);
    component = fixture.componentInstance;
    // Stub the reload indirection so confirmSafeRefresh's scheduled
    // setTimeout(() => this.reload(), 600) doesn't crash Karma with
    // "Some of your tests did a full page reload!".
    spyOn(component as any, 'reload');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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

      jasmine.clock().install();
      try {
        await component.confirmSafeRefresh();
        // confirmSafeRefresh schedules `this.reload()` via setTimeout(..., 600).
        // Advance jasmine's mock clock past the delay and assert reload fires.
        jasmine.clock().tick(700);
        expect((component as any).reload).toHaveBeenCalled();
      } finally {
        jasmine.clock().uninstall();
      }
    });
  });
});
