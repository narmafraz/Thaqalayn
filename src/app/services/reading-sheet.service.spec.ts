import { TestBed } from '@angular/core/testing';
import { ReadingSheetService } from './reading-sheet.service';

describe('ReadingSheetService', () => {
  let service: ReadingSheetService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReadingSheetService);
  });

  it('starts closed', () => {
    expect(service.isOpen).toBe(false);
  });

  it('open() flips state to true and emits', (done) => {
    service.open$.subscribe(value => {
      if (value === true) {
        expect(service.isOpen).toBe(true);
        done();
      }
    });
    service.open();
  });

  it('close() flips state to false', () => {
    service.open();
    service.close();
    expect(service.isOpen).toBe(false);
  });

  it('toggle() flips between true and false', () => {
    service.toggle();
    expect(service.isOpen).toBe(true);
    service.toggle();
    expect(service.isOpen).toBe(false);
  });

  it('open() while open does not emit duplicates', () => {
    service.open();
    let count = 0;
    service.open$.subscribe(() => count++);
    expect(count).toBe(1); // initial BehaviorSubject value
    service.open();
    expect(count).toBe(1); // no duplicate emission
  });

  it('close() while closed does not emit duplicates', () => {
    let count = 0;
    service.open$.subscribe(() => count++);
    expect(count).toBe(1);
    service.close();
    expect(count).toBe(1);
  });
});
