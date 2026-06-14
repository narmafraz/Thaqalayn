import { Component } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

@Component({
    selector: 'app-support',
    templateUrl: './support.component.html',
    styleUrls: ['./support.component.scss'],
    standalone: false
})
export class SupportComponent {

  showResetConfirm = false;
  resetComplete = false;

  showRefreshConfirm = false;
  refreshComplete = false;

  constructor(private swUpdate: SwUpdate) { }

  promptReset(): void {
    this.showResetConfirm = true;
    this.resetComplete = false;
  }

  cancelReset(): void {
    this.showResetConfirm = false;
  }

  promptRefresh(): void {
    this.showRefreshConfirm = true;
    this.refreshComplete = false;
  }

  cancelRefresh(): void {
    this.showRefreshConfirm = false;
  }

  /**
   * Safe refresh: clears only server-redownloadable data (SW caches + the
   * `thaqalayn-offline` cache DB) so stale content and stale translations are
   * re-fetched. Preserves personally authored data — the `thaqalayn-bookmarks`
   * DB (bookmarks, notes, reading progress, badges, plans) and localStorage
   * preferences (language, AI settings, font size) are left untouched.
   */
  async confirmSafeRefresh(): Promise<void> {
    // 1. Clear all service worker caches — app shell, assets, i18n, API data.
    //    These are all re-downloadable; clearing the i18n cache also resolves
    //    any stale-translation (raw-key) state.
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }

    // 2. Delete ONLY the offline data cache DB (downloaded books + cached
    //    API responses + data-version marker). Personal data lives in the
    //    separate `thaqalayn-bookmarks` DB, which we deliberately leave alone.
    if ('indexedDB' in window) {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('thaqalayn-offline');
        req.onsuccess = req.onerror = req.onblocked = () => resolve();
      });
    }

    // 3. Pull any pending app-shell update (auto-activates + reloads if found).
    try {
      await this.swUpdate.checkForUpdate();
    } catch {
      // Service worker disabled (e.g. dev) — nothing to do.
    }

    this.showRefreshConfirm = false;
    this.refreshComplete = true;
  }

  async confirmReset(): Promise<void> {
    // 1. Clear all service worker caches
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }

    // 2. Unregister service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
    }

    // 3. Clear localStorage (preferences, AI settings, reading progress)
    localStorage.clear();

    // 4. Clear sessionStorage
    sessionStorage.clear();

    // 5. Clear IndexedDB (bookmarks, notes via Dexie)
    if ('indexedDB' in window) {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }
    }

    this.showResetConfirm = false;
    this.resetComplete = true;
  }

  reloadPage(): void {
    window.location.href = '/';
  }
}
