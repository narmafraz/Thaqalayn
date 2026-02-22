import { ChangeDetectorRef } from '@angular/core';
import { TranslatePipe } from './translate.pipe';
import { I18nService } from '@app/services/i18n.service';
import { Subject } from 'rxjs';

describe('TranslatePipe', () => {
  let pipe: TranslatePipe;
  let i18nSpy: jasmine.SpyObj<I18nService>;
  let cdrSpy: jasmine.SpyObj<ChangeDetectorRef>;
  let stringsChanged$: Subject<void>;

  beforeEach(() => {
    stringsChanged$ = new Subject<void>();
    i18nSpy = jasmine.createSpyObj('I18nService', ['get'], {
      stringsChanged$: stringsChanged$.asObservable(),
    });
    cdrSpy = jasmine.createSpyObj('ChangeDetectorRef', ['markForCheck']);

    pipe = new TranslatePipe(i18nSpy, cdrSpy);
  });

  afterEach(() => {
    pipe.ngOnDestroy();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should call i18n.get with the key', () => {
    i18nSpy.get.and.returnValue('Home');
    const result = pipe.transform('nav.home');
    expect(i18nSpy.get).toHaveBeenCalledWith('nav.home');
    expect(result).toBe('Home');
  });

  it('should cache the result for repeated calls with the same key', () => {
    i18nSpy.get.and.returnValue('Home');
    pipe.transform('nav.home');
    pipe.transform('nav.home');
    // First call gets the value, second uses cache
    expect(i18nSpy.get).toHaveBeenCalledTimes(1);
  });

  it('should re-evaluate when key changes', () => {
    i18nSpy.get.and.callFake((key: string) => {
      if (key === 'nav.home') return 'Home';
      if (key === 'nav.about') return 'About';
      return key;
    });

    expect(pipe.transform('nav.home')).toBe('Home');
    expect(pipe.transform('nav.about')).toBe('About');
    expect(i18nSpy.get).toHaveBeenCalledTimes(2);
  });

  it('should invalidate cache when stringsChanged$ fires', () => {
    i18nSpy.get.and.returnValue('Home');
    pipe.transform('nav.home');

    // Simulate language change
    i18nSpy.get.and.returnValue('الرئيسية');
    stringsChanged$.next();

    // Cache was invalidated, so next transform should re-evaluate
    const result = pipe.transform('nav.home');
    expect(result).toBe('الرئيسية');
    expect(i18nSpy.get).toHaveBeenCalledTimes(2);
  });

  it('should call markForCheck when strings change', () => {
    stringsChanged$.next();
    expect(cdrSpy.markForCheck).toHaveBeenCalled();
  });

  it('should return the key if i18n returns the key (missing translation)', () => {
    i18nSpy.get.and.returnValue('missing.key');
    const result = pipe.transform('missing.key');
    expect(result).toBe('missing.key');
  });

  it('should unsubscribe on destroy', () => {
    pipe.ngOnDestroy();
    // After destroy, stringsChanged$ should not trigger markForCheck
    cdrSpy.markForCheck.calls.reset();
    stringsChanged$.next();
    expect(cdrSpy.markForCheck).not.toHaveBeenCalled();
  });
});
