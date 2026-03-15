import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, ApplicationRef, PLATFORM_ID } from '@angular/core';
import { SwUpdate, UnrecoverableStateEvent, VersionReadyEvent } from '@angular/service-worker';
import { BehaviorSubject, Observable, first, filter } from 'rxjs';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Injectable({
  providedIn: 'root'
})
export class PwaService {

  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private installableSubject = new BehaviorSubject<boolean>(false);
  private updateAvailableSubject = new BehaviorSubject<boolean>(false);
  private installedSubject = new BehaviorSubject<boolean>(false);
  private isBrowser: boolean;

  /** Whether the app can be installed (install prompt is available) */
  installable$: Observable<boolean> = this.installableSubject.asObservable();

  /** Whether a new version of the app is available */
  updateAvailable$: Observable<boolean> = this.updateAvailableSubject.asObservable();

  /** Whether the app is running in standalone/installed mode */
  installed$: Observable<boolean> = this.installedSubject.asObservable();

  constructor(
    private swUpdate: SwUpdate,
    private appRef: ApplicationRef,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.detectStandaloneMode();
      this.listenForInstallPrompt();
    }
    this.listenForUpdates();
  }

  /** Trigger the browser install prompt */
  promptInstall(): void {
    if (!this.deferredPrompt) return;

    this.deferredPrompt.prompt();
    this.deferredPrompt.userChoice.then(result => {
      if (result.outcome === 'accepted') {
        this.installableSubject.next(false);
      }
      this.deferredPrompt = null;
    });
  }

  /** Apply the available update by reloading */
  applyUpdate(): void {
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.activateUpdate().then(() => {
      if (this.isBrowser) {
        window.location.reload();
      }
    });
  }

  /** Dismiss the update notification */
  dismissUpdate(): void {
    this.updateAvailableSubject.next(false);
  }

  private detectStandaloneMode(): void {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    this.installedSubject.next(isStandalone);
  }

  private listenForInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (event: Event) => {
      event.preventDefault();
      this.deferredPrompt = event as BeforeInstallPromptEvent;
      this.installableSubject.next(true);
    });

    window.addEventListener('appinstalled', () => {
      this.installableSubject.next(false);
      this.installedSubject.next(true);
      this.deferredPrompt = null;
    });
  }

  private listenForUpdates(): void {
    if (!this.swUpdate.isEnabled) return;

    // Check for updates immediately on app start, then every 30 minutes
    this.appRef.isStable.pipe(
      first(stable => stable)
    ).subscribe(() => {
      // Immediate check on startup — catches deploys that happened while the tab was closed
      this.swUpdate.checkForUpdate();

      // Periodic checks every 30 minutes
      setInterval(() => {
        this.swUpdate.checkForUpdate();
      }, 30 * 60 * 1000);
    });

    this.swUpdate.versionUpdates.pipe(
      filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY')
    ).subscribe(() => {
      // Automatically activate the update and reload — don't wait for user action.
      // This ensures stale cached JS/CSS/i18n files are replaced immediately.
      // The reload is seamless since Angular PWA caches the new version in the background
      // before firing VERSION_READY, so the reload is instant (no network fetch needed).
      this.swUpdate.activateUpdate().then(() => {
        if (this.isBrowser) {
          window.location.reload();
        }
      });
    });

    // Handle unrecoverable state — cache is corrupt or hash mismatch.
    // This happens when the CDN serves stale files or a non-atomic deploy leaves
    // the service worker with a mix of old and new file versions.
    // The only recovery is to clear caches and reload from network.
    this.swUpdate.unrecoverable.subscribe((event: UnrecoverableStateEvent) => {
      console.error('Service worker unrecoverable state:', event.reason);
      if (this.isBrowser) {
        // Clear all service worker caches and reload
        caches.keys().then(keys => {
          Promise.all(keys.map(key => caches.delete(key))).then(() => {
            window.location.reload();
          });
        });
      }
    });
  }
}
