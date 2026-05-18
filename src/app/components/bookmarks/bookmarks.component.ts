import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Annotation, Bookmark, BookmarkService, ReadingProgress } from '@app/services/bookmark.service';
import { DailyReadingTally, ReadingStatsService, StreakInfo } from '@app/services/reading-stats.service';
import { PlanCatalogueEntry, PlanState, PlansService } from '@app/services/plans.service';
import { SyncService, SyncStatus, SyncUser } from '@app/services/sync.service';
import { I18nService } from '@app/services/i18n.service';
import { Observable, Subscription } from 'rxjs';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-bookmarks',
    templateUrl: './bookmarks.component.html',
    styleUrls: ['./bookmarks.component.scss'],
    standalone: false
})
export class BookmarksComponent implements OnInit, OnDestroy {

  bookmarks: Bookmark[] = [];
  readingProgress: ReadingProgress[] = [];
  annotations: Annotation[] = [];
  /** Daily reading history, newest-first. Capped at 30 days in the template. */
  dailyTallies: DailyReadingTally[] = [];
  streak: StreakInfo = { current: 0, longest: 0, includesToday: false };
  totalVersesRead = 0;

  // RE-09 daily-goal state
  goalTarget = 0;
  goalToday = 0;
  goalFraction = 0;
  goalEditing = false;
  goalDraft = 5;

  // RE-10 plans state
  planCatalogue: PlanCatalogueEntry[] = [];
  planStates: PlanState[] = [];
  enrolledIds = new Set<string>();
  private subs: Subscription[] = [];

  // Sync
  syncConfigured: boolean;
  syncUser$: Observable<SyncUser | null>;
  syncStatus$: Observable<SyncStatus>;
  lastSync$: Observable<Date | null>;

  constructor(
    private bookmarkService: BookmarkService,
    private readingStats: ReadingStatsService,
    private plansService: PlansService,
    private syncService: SyncService,
    private i18n: I18nService,
    private cdr: ChangeDetectorRef,
  ) {
    this.syncConfigured = this.syncService.isConfigured;
    this.syncUser$ = this.syncService.user$;
    this.syncStatus$ = this.syncService.status$;
    this.lastSync$ = this.syncService.lastSync$;
  }

  ngOnInit(): void {
    this.subs.push(
      this.bookmarkService.bookmarks$.subscribe(bm => {
        this.bookmarks = bm;
        this.cdr.markForCheck();
      })
    );
    this.subs.push(
      this.bookmarkService.readingProgress$.subscribe(rp => {
        this.readingProgress = rp;
        this.cdr.markForCheck();
      })
    );
    this.subs.push(
      this.bookmarkService.annotations$.subscribe(ann => {
        this.annotations = ann;
        this.cdr.markForCheck();
      })
    );

    // RE-06 + RE-08 wiring (history grouped by day + streak counter)
    this.subs.push(
      this.readingStats.dailyTallies$.subscribe(d => {
        this.dailyTallies = d;
        this.totalVersesRead = d.reduce((sum, t) => sum + t.versesRead, 0);
        this.cdr.markForCheck();
      })
    );
    this.subs.push(
      this.readingStats.streak$.subscribe(s => {
        this.streak = s;
        this.cdr.markForCheck();
      })
    );
    this.subs.push(
      this.readingStats.goalProgress$.subscribe(g => {
        this.goalTarget = g.target;
        this.goalToday = g.today;
        this.goalFraction = g.fraction;
        if (!this.goalEditing) {
          this.goalDraft = g.target > 0 ? g.target : 5;
        }
        this.cdr.markForCheck();
      })
    );

    // RE-10 plans
    this.subs.push(
      this.plansService.catalogue$().subscribe(plans => {
        this.planCatalogue = plans;
        this.cdr.markForCheck();
      })
    );
    this.subs.push(
      this.plansService.enrolledStates$.subscribe(states => {
        this.planStates = states;
        this.enrolledIds = new Set(states.map(s => s.plan.id));
        this.cdr.markForCheck();
      })
    );
  }

  isPlanEnrolled(id: string): boolean {
    return this.enrolledIds.has(id);
  }

  async enrollPlan(id: string): Promise<void> {
    await this.plansService.enroll(id);
  }

  async restartPlan(id: string): Promise<void> {
    // Idempotent — put() overwrites startedAt, effectively restarting.
    if (!confirm(this.i18n.get('reading.plans.restartConfirm'))) return;
    await this.plansService.enroll(id);
  }

  async unenrollPlan(id: string): Promise<void> {
    if (!confirm(this.i18n.get('reading.plans.unenrollConfirm'))) return;
    await this.plansService.unenroll(id);
  }

  // ---------------------------------------------------------------------------
  // RE-09 daily-goal handlers
  // ---------------------------------------------------------------------------

  openGoalEditor(): void {
    this.goalEditing = true;
    this.goalDraft = this.goalTarget > 0 ? this.goalTarget : 5;
  }

  cancelGoalEdit(): void {
    this.goalEditing = false;
  }

  async saveGoal(): Promise<void> {
    const n = Math.max(0, Math.min(500, Math.floor(this.goalDraft || 0)));
    await this.bookmarkService.setGoalConfig(n);
    this.goalEditing = false;
  }

  async disableGoal(): Promise<void> {
    await this.bookmarkService.setGoalConfig(0);
    this.goalEditing = false;
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  removeBookmark(path: string): void {
    this.bookmarkService.removeBookmark(path);
  }

  clearProgress(bookId: string): void {
    this.bookmarkService.clearReadingProgress(bookId);
  }

  deleteAnnotation(path: string): void {
    this.bookmarkService.deleteAnnotation(path);
  }

  getRouterLink(path: string): string {
    // path is like "/books/al-kafi:1:2:3" -> "/books/al-kafi:1:2:3" for routerLink
    return path;
  }

  getRouterLinkSegments(path: string): string[] {
    // path like "/books/al-kafi:1:2:3:4" -> ['/books', 'al-kafi:1:2:3:4']
    const clean = path.replace(/^\//, '');
    const slashIdx = clean.indexOf('/');
    if (slashIdx > 0) {
      return ['/' + clean.substring(0, slashIdx), clean.substring(slashIdx + 1)];
    }
    return [path];
  }

  formatBookId(bookId: string): string {
    const names: Record<string, string> = {
      'quran': 'Quran',
      'al-kafi': 'Al-Kafi',
      'tahdhib-al-ahkam': 'Tahdhib al-Ahkam',
      'al-istibsar': 'Al-Istibsar',
      'man-la-yahduruhu-al-faqih': 'Man La Yahduruhu al-Faqih',
      'nahj-al-balagha': 'Nahj al-Balagha',
      'al-sahifa-al-sajjadiyya': 'Al-Sahifa al-Sajjadiyya',
      'al-amali-saduq': 'Al-Amali (Saduq)',
      'al-amali-mufid': 'Al-Amali (Mufid)',
      'al-khisal': 'Al-Khisal',
      'al-tawhid': 'Al-Tawhid',
      'kamal-al-din': 'Kamal al-Din',
      'maani-al-akhbar': "Ma'ani al-Akhbar",
      'uyun-akhbar-al-rida': 'Uyun Akhbar al-Rida',
      'kamil-al-ziyarat': 'Kamil al-Ziyarat',
      'risalat-al-huquq': 'Risalat al-Huquq',
      'kitab-al-zuhd': 'Kitab al-Zuhd',
      'kitab-al-mumin': "Kitab al-Mu'min",
      'kitab-al-ghayba-numani': "Kitab al-Ghayba (Nu'mani)",
      'kitab-al-ghayba-tusi': 'Kitab al-Ghayba (Tusi)',
      'fadail-al-shia': "Fada'il al-Shi'a",
      'sifat-al-shia': "Sifat al-Shi'a",
      'kitab-al-duafa': "Kitab al-Du'afa",
      'mujam-al-ahadith-al-mutabara': "Mu'jam al-Ahadith",
      'kitab-al-irshad': 'Kitab al-Irshad',
      'kitab-sulaym-ibn-qays': 'Kitab Sulaym ibn Qays',
      'thawab-al-amal': "Thawab al-A'mal",
    };
    return names[bookId] || bookId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  /** Human-friendly day label: Today / Yesterday / formatted date. */
  formatDayLabel(dayKey: string): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dayKey);
    target.setHours(0, 0, 0, 0);
    const diff = (today.getTime() - target.getTime()) / 86_400_000;
    if (diff === 0) return this.i18n.get('reading.todayLabel');
    if (diff === 1) return this.i18n.get('reading.yesterdayLabel');
    return target.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  async exportBookmarks(): Promise<void> {
    const json = await this.bookmarkService.exportBookmarks();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'thaqalayn-bookmarks.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async importBookmarks(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const text = await file.text();
    try {
      const count = await this.bookmarkService.importBookmarks(text);
      alert(`Imported ${count} bookmark(s)`);
    } catch {
      alert('Invalid bookmark file');
    }
    input.value = '';
  }

  // Sync methods
  signInWithGoogle(): void {
    this.syncService.signInWithGoogle();
  }

  signInAnonymously(): void {
    this.syncService.signInAnonymously();
  }

  signOut(): void {
    this.syncService.signOut();
  }

  syncNow(): void {
    this.syncService.sync();
  }

  pushToCloud(): void {
    this.syncService.pushToCloud();
  }

  pullFromCloud(): void {
    this.syncService.pullFromCloud();
  }
}
