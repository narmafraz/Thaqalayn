import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Controls the visibility of the global Reading Sheet (the slide-out
 * panel hosted at the app shell that exposes AI preferences and view
 * options). Singletons so any component can request open/close without
 * needing a parent reference.
 */
@Injectable({ providedIn: 'root' })
export class ReadingSheetService {
  private openSubject = new BehaviorSubject<boolean>(false);
  open$: Observable<boolean> = this.openSubject.asObservable();

  get isOpen(): boolean {
    return this.openSubject.value;
  }

  open(): void {
    if (!this.openSubject.value) this.openSubject.next(true);
  }

  close(): void {
    if (this.openSubject.value) this.openSubject.next(false);
  }

  toggle(): void {
    this.openSubject.next(!this.openSubject.value);
  }
}
