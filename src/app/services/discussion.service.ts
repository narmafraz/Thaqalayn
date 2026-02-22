import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SyncService } from './sync.service';

export interface Comment {
  id?: string;
  path: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  parentId?: string;
  flagCount: number;
  hidden: boolean;
  scholarVerified: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DiscussionService {
  private commentsSubject = new BehaviorSubject<Comment[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private isBrowser: boolean;
  private db: any = null;
  private currentPath: string | null = null;
  private unsubscribeSnapshot: (() => void) | null = null;

  comments$: Observable<Comment[]> = this.commentsSubject.asObservable();
  loading$: Observable<boolean> = this.loadingSubject.asObservable();

  get isConfigured(): boolean {
    return !!environment.firebase?.projectId;
  }

  constructor(
    private syncService: SyncService,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  private async getDb(): Promise<any> {
    if (this.db) return this.db;
    if (!this.isBrowser || !this.isConfigured) return null;

    try {
      const { initializeApp, getApps, getApp } = await import('firebase/app');
      const { getFirestore } = await import('firebase/firestore');

      const app = getApps().length > 0 ? getApp() : initializeApp(environment.firebase);
      this.db = getFirestore(app);
      return this.db;
    } catch {
      return null;
    }
  }

  /** Load comments for a given path and subscribe to real-time updates */
  async loadComments(path: string): Promise<void> {
    // Unsubscribe from previous path
    this.unsubscribeFromPath();
    this.currentPath = path;
    this.commentsSubject.next([]);
    this.loadingSubject.next(true);

    const db = await this.getDb();
    if (!db) {
      this.loadingSubject.next(false);
      return;
    }

    try {
      const { collection, query, where, orderBy, onSnapshot } = await import('firebase/firestore');

      const commentsRef = collection(db, 'comments');
      const q = query(
        commentsRef,
        where('path', '==', path),
        where('hidden', '==', false),
        orderBy('createdAt', 'asc')
      );

      this.unsubscribeSnapshot = onSnapshot(q, (snapshot: any) => {
        const comments: Comment[] = [];
        snapshot.forEach((doc: any) => {
          comments.push({ id: doc.id, ...doc.data() } as Comment);
        });
        this.commentsSubject.next(comments);
        this.loadingSubject.next(false);
      }, () => {
        this.loadingSubject.next(false);
      });
    } catch {
      this.loadingSubject.next(false);
    }
  }

  /** Post a new comment */
  async addComment(path: string, text: string, parentId?: string): Promise<void> {
    const db = await this.getDb();
    if (!db) return;

    const user = this.syncService.isConnected ? await this.getCurrentUser() : null;
    if (!user) return;

    try {
      const { collection, addDoc } = await import('firebase/firestore');

      const comment: Omit<Comment, 'id'> = {
        path,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        text,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        flagCount: 0,
        hidden: false,
        scholarVerified: false,
      };

      if (parentId) {
        comment.parentId = parentId;
      }

      await addDoc(collection(db, 'comments'), comment);
    } catch {
      // Silently fail
    }
  }

  /** Flag a comment for moderation */
  async flagComment(commentId: string): Promise<void> {
    const db = await this.getDb();
    if (!db) return;

    try {
      const { doc, updateDoc, increment } = await import('firebase/firestore');

      await updateDoc(doc(db, 'comments', commentId), {
        flagCount: increment(1),
      });
    } catch {
      // Silently fail
    }
  }

  /** Delete own comment */
  async deleteComment(commentId: string): Promise<void> {
    const db = await this.getDb();
    if (!db) return;

    const user = await this.getCurrentUser();
    if (!user) return;

    try {
      const { doc, getDoc, updateDoc } = await import('firebase/firestore');

      const commentDoc = await getDoc(doc(db, 'comments', commentId));
      if (commentDoc.exists() && commentDoc.data()?.['authorId'] === user.uid) {
        await updateDoc(doc(db, 'comments', commentId), {
          hidden: true,
        });
      }
    } catch {
      // Silently fail
    }
  }

  private async getCurrentUser(): Promise<{ uid: string; displayName: string | null } | null> {
    try {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      return auth.currentUser;
    } catch {
      return null;
    }
  }

  private unsubscribeFromPath(): void {
    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = null;
    }
    this.currentPath = null;
  }

  ngOnDestroy(): void {
    this.unsubscribeFromPath();
  }
}
