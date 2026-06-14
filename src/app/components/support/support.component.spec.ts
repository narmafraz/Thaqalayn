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
  });
});
