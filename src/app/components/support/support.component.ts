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

  constructor(private swUpdate: SwUpdate) { }

  promptReset(): void {
    this.showResetConfirm = true;
    this.resetComplete = false;
  }

  cancelReset(): void {
    this.showResetConfirm = false;
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
