import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform } from '@angular/core';
import { I18nService } from '@app/services/i18n.service';
import { Subscription } from 'rxjs';

@Pipe({
  name: 'translate',
  pure: false
})
export class TranslatePipe implements PipeTransform, OnDestroy {

  private cachedKey = '';
  private cachedValue = '';
  private subscription: Subscription;

  constructor(private i18n: I18nService, private cdr: ChangeDetectorRef) {
    this.subscription = this.i18n.stringsChanged$.subscribe(() => {
      this.cachedKey = ''; // Invalidate cache so next transform re-evaluates
      this.cdr.markForCheck();
    });
  }

  transform(key: string): string {
    if (key === this.cachedKey && this.cachedValue !== key) {
      return this.cachedValue;
    }
    this.cachedKey = key;
    this.cachedValue = this.i18n.get(key);
    return this.cachedValue;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
