import { CollectionViewer, DataSource } from '@angular/cdk/collections';
import { Narrator } from '@app/models';
import { BehaviorSubject, Observable, map } from 'rxjs';

export class NarratorDataSource extends DataSource<any> {
  private narratorSubject = new BehaviorSubject<any[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private filterValue: string = '';

  public loading$ = this.loadingSubject.asObservable();

  constructor(private narrator$: Observable<Narrator>) {
    super();
  }

  loadNarrators() {
    this.loadingSubject.next(true);

    this.narrator$.subscribe(narrator => {
      const data = narrator ? narrator.verse_paths.map(path => ({ path })) : [];
      this.narratorSubject.next(data);
      this.loadingSubject.next(false);
    });
  }

  filter(filterValue: string) {
    this.filterValue = filterValue;
    this.loadNarrators();
  }

  connect(collectionViewer: CollectionViewer): Observable<any[]> {
    return this.narratorSubject.asObservable().pipe(
      map(data => data.filter(item => item.path.toLowerCase().includes(this.filterValue)))
    );
  }

  disconnect(collectionViewer: CollectionViewer): void {
    this.narratorSubject.complete();
    this.loadingSubject.complete();
  }
}
