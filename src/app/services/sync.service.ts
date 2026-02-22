import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { BookmarkService, Bookmark, ReadingProgress, Annotation } from './bookmark.service';

export type SyncStatus = 'disconnected' | 'connecting' | 'synced' | 'syncing' | 'error';

export interface SyncUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  isAnonymous: boolean;
}

interface SyncData {
  bookmarks: Bookmark[];
  readingProgress: ReadingProgress[];
  annotations: Annotation[];
  lastSyncedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private statusSubject = new BehaviorSubject<SyncStatus>('disconnected');
  private userSubject = new BehaviorSubject<SyncUser | null>(null);
  private lastSyncSubject = new BehaviorSubject<Date | null>(null);
  private isBrowser: boolean;
  private firebaseApp: any = null;
  private auth: any = null;
  private db: any = null;
  private unsubscribeAuth: (() => void) | null = null;

  status$: Observable<SyncStatus> = this.statusSubject.asObservable();
  user$: Observable<SyncUser | null> = this.userSubject.asObservable();
  lastSync$: Observable<Date | null> = this.lastSyncSubject.asObservable();

  get isConfigured(): boolean {
    return !!environment.firebase?.projectId;
  }

  get isConnected(): boolean {
    return this.userSubject.value !== null;
  }

  constructor(
    private bookmarkService: BookmarkService,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser && this.isConfigured) {
      this.initFirebase();
    }
  }

  private async initFirebase(): Promise<void> {
    try {
      const { initializeApp } = await import('firebase/app');
      const { getAuth, onAuthStateChanged } = await import('firebase/auth');
      const { getFirestore } = await import('firebase/firestore');

      this.firebaseApp = initializeApp(environment.firebase);
      this.auth = getAuth(this.firebaseApp);
      this.db = getFirestore(this.firebaseApp);

      this.unsubscribeAuth = onAuthStateChanged(this.auth, (user: any) => {
        if (user) {
          this.userSubject.next({
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            isAnonymous: user.isAnonymous,
          });
          this.statusSubject.next('synced');
          // Load last sync time from localStorage
          const lastSync = localStorage.getItem('thaqalayn-last-sync');
          if (lastSync) {
            this.lastSyncSubject.next(new Date(lastSync));
          }
        } else {
          this.userSubject.next(null);
          this.statusSubject.next('disconnected');
        }
      });
    } catch {
      this.statusSubject.next('error');
    }
  }

  /** Sign in anonymously (no account needed) */
  async signInAnonymously(): Promise<void> {
    if (!this.auth) return;
    this.statusSubject.next('connecting');
    try {
      const { signInAnonymously } = await import('firebase/auth');
      await signInAnonymously(this.auth);
    } catch {
      this.statusSubject.next('error');
    }
  }

  /** Sign in with Google */
  async signInWithGoogle(): Promise<void> {
    if (!this.auth) return;
    this.statusSubject.next('connecting');
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      await signInWithPopup(this.auth, provider);
    } catch {
      this.statusSubject.next('error');
    }
  }

  /** Sign out and disconnect sync */
  async signOut(): Promise<void> {
    if (!this.auth) return;
    try {
      const { signOut } = await import('firebase/auth');
      await signOut(this.auth);
      this.statusSubject.next('disconnected');
      this.lastSyncSubject.next(null);
      localStorage.removeItem('thaqalayn-last-sync');
    } catch {
      this.statusSubject.next('error');
    }
  }

  /** Push local data to cloud */
  async pushToCloud(): Promise<void> {
    if (!this.db || !this.userSubject.value) return;
    this.statusSubject.next('syncing');

    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const uid = this.userSubject.value.uid;
      const jsonStr = await this.bookmarkService.exportBookmarks();
      const data = JSON.parse(jsonStr);

      const syncData: SyncData = {
        bookmarks: data.bookmarks || [],
        readingProgress: data.readingProgress || [],
        annotations: data.annotations || [],
        lastSyncedAt: new Date().toISOString(),
      };

      await setDoc(doc(this.db, 'users', uid), syncData);

      const now = new Date();
      this.lastSyncSubject.next(now);
      localStorage.setItem('thaqalayn-last-sync', now.toISOString());
      this.statusSubject.next('synced');
    } catch {
      this.statusSubject.next('error');
    }
  }

  /** Pull cloud data to local */
  async pullFromCloud(): Promise<number> {
    if (!this.db || !this.userSubject.value) return 0;
    this.statusSubject.next('syncing');

    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const uid = this.userSubject.value.uid;
      const snapshot = await getDoc(doc(this.db, 'users', uid));

      if (!snapshot.exists()) {
        this.statusSubject.next('synced');
        return 0;
      }

      const cloudData = snapshot.data() as SyncData;
      const jsonStr = JSON.stringify({
        bookmarks: cloudData.bookmarks || [],
        readingProgress: cloudData.readingProgress || [],
        annotations: cloudData.annotations || [],
      });

      const imported = await this.bookmarkService.importBookmarks(jsonStr);

      const now = new Date();
      this.lastSyncSubject.next(now);
      localStorage.setItem('thaqalayn-last-sync', now.toISOString());
      this.statusSubject.next('synced');
      return imported;
    } catch {
      this.statusSubject.next('error');
      return 0;
    }
  }

  /** Full two-way sync: push local, then pull cloud */
  async sync(): Promise<void> {
    await this.pushToCloud();
    await this.pullFromCloud();
  }

  /** Delete all cloud data for this user */
  async deleteCloudData(): Promise<void> {
    if (!this.db || !this.userSubject.value) return;

    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const uid = this.userSubject.value.uid;
      await deleteDoc(doc(this.db, 'users', uid));
    } catch {
      // Silently fail
    }
  }

  ngOnDestroy(): void {
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
    }
  }
}
