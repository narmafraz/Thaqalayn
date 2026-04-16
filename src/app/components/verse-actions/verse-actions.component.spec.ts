import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { VerseActionsComponent } from './verse-actions.component';
import { TranslatePipe } from '@app/pipes/translate.pipe';
import { Verse } from '@app/models';

describe('VerseActionsComponent', () => {
  let component: VerseActionsComponent;
  let fixture: ComponentFixture<VerseActionsComponent>;

  const mockVerse: Verse = {
    index: 1,
    local_index: 1,
    path: '/books/al-kafi:1:1:1:1',
    text: ['<p>Arabic text here</p>'],
    sajda_type: '',
    translations: {
      'en.hubeali': ['English translation here'],
      'en.qarai': ['Alternative translation'],
    },
    part_type: 'Hadith',
    relations: {},
    narrator_chain: { parts: [], text: '' },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VerseActionsComponent, TranslatePipe],
      imports: [
        RouterTestingModule,
        HttpClientTestingModule,
        MatIconModule,
        MatTooltipModule,
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(VerseActionsComponent);
    component = fixture.componentInstance;
    component.versePath = 'al-kafi:1:1:1:1';
    component.verse = mockVerse;
    component.bookTitle = 'Al-Kafi';
    fixture.detectChanges();
  });

  /** Helper: set inputs on an OnPush component and trigger change detection */
  function updateAndDetect(): void {
    (component as any).cdr.markForCheck();
    fixture.detectChanges();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('copyText', () => {
    let clipboardSpy: jasmine.Spy;

    beforeEach(() => {
      clipboardSpy = spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
    });

    it('should copy verse text with link to clipboard', fakeAsync(() => {
      component.copyText();
      tick();

      expect(clipboardSpy).toHaveBeenCalledTimes(1);
      const copiedText = clipboardSpy.calls.first().args[0] as string;

      // Should contain Arabic text (HTML stripped)
      expect(copiedText).toContain('Arabic text here');
      // Should contain translation
      expect(copiedText).toContain('English translation here');
      // Should contain attribution
      expect(copiedText).toContain('— Al-Kafi, Hadith 1');
      // Should contain link
      expect(copiedText).toContain('/books/al-kafi:1:1:1:1');
    }));

    it('should use preferred translation when set', fakeAsync(() => {
      component.preferredTranslation = 'en.qarai';
      component.copyText();
      tick();

      const copiedText = clipboardSpy.calls.first().args[0] as string;
      expect(copiedText).toContain('Alternative translation');
      expect(copiedText).not.toContain('English translation here');
    }));

    it('should fall back to first translation when preferred is not available', fakeAsync(() => {
      component.preferredTranslation = 'nonexistent.translation';
      component.copyText();
      tick();

      const copiedText = clipboardSpy.calls.first().args[0] as string;
      // Should fall back to first available translation
      expect(copiedText).toContain('English translation here');
    }));

    it('should set textCopied flag and reset after timeout', fakeAsync(() => {
      expect(component.textCopied).toBe(false);

      component.copyText();
      tick();

      expect(component.textCopied).toBe(true);

      tick(2000);
      expect(component.textCopied).toBe(false);
    }));

    it('should strip HTML tags from text', fakeAsync(() => {
      component.copyText();
      tick();

      const copiedText = clipboardSpy.calls.first().args[0] as string;
      expect(copiedText).not.toContain('<p>');
      expect(copiedText).not.toContain('</p>');
    }));

    it('should include narrator chain (isnad) in copied text', fakeAsync(() => {
      component.verse = {
        ...mockVerse,
        narrator_chain: {
          parts: [{ kind: 'narrator', text: 'محمد بن يحيى', path: '/people/narrators/1' }],
          text: 'محمد بن يحيى عن أحمد بن محمد',
        },
      };
      component.copyText();
      tick();

      const copiedText = clipboardSpy.calls.first().args[0] as string;
      expect(copiedText).toContain('محمد بن يحيى عن أحمد بن محمد');
      // Chain should appear before the verse body text
      const chainIdx = copiedText.indexOf('محمد بن يحيى');
      const bodyIdx = copiedText.indexOf('Arabic text here');
      expect(chainIdx).toBeLessThan(bodyIdx);
    }));

    it('should not add extra newline when narrator chain is empty', fakeAsync(() => {
      component.verse = { ...mockVerse, narrator_chain: { parts: [], text: '' } };
      component.copyText();
      tick();

      const copiedText = clipboardSpy.calls.first().args[0] as string;
      // Should start with verse body, not a leading newline
      expect(copiedText.startsWith('Arabic text here')).toBe(true);
    }));

    it('should handle verse with no translations', fakeAsync(() => {
      component.verse = { ...mockVerse, translations: {} };
      component.copyText();
      tick();

      const copiedText = clipboardSpy.calls.first().args[0] as string;
      expect(copiedText).toContain('Arabic text here');
      expect(copiedText).toContain('— Al-Kafi, Hadith 1');
      expect(copiedText).toContain('/books/al-kafi:1:1:1:1');
    }));

    it('should handle verse with no text', fakeAsync(() => {
      component.verse = { ...mockVerse, text: [] };
      component.copyText();
      tick();

      const copiedText = clipboardSpy.calls.first().args[0] as string;
      // Should still have attribution and link even with empty text
      expect(copiedText).toContain('— Al-Kafi, Hadith 1');
      expect(copiedText).toContain('/books/al-kafi:1:1:1:1');
    }));
  });

  describe('template rendering', () => {
    it('should show detail link when detailPath is set', () => {
      component.detailPath = 'al-kafi:1:1:1:1';
      updateAndDetect();
      const link = fixture.nativeElement.querySelector('.verse-detail-link');
      expect(link).toBeTruthy();
    });

    it('should not show detail link when detailPath is null', () => {
      component.detailPath = null;
      updateAndDetect();
      const link = fixture.nativeElement.querySelector('.verse-detail-link');
      expect(link).toBeFalsy();
    });

    it('should show label when set', () => {
      component.label = 'Hadith 1';
      updateAndDetect();
      const label = fixture.nativeElement.querySelector('.hadith-label');
      expect(label).toBeTruthy();
      expect(label.textContent.trim()).toBe('Hadith 1');
    });

    it('should not show label when null', () => {
      component.label = null;
      updateAndDetect();
      const label = fixture.nativeElement.querySelector('.hadith-label');
      expect(label).toBeFalsy();
    });

    it('should show bookmark icon', () => {
      const btn = fixture.nativeElement.querySelector('.bookmark-icon-btn');
      expect(btn).toBeTruthy();
    });

    it('should show filled bookmark when bookmarked', () => {
      component.isBookmarked = true;
      updateAndDetect();
      const icon = fixture.nativeElement.querySelector('.bookmark-icon-btn mat-icon');
      expect(icon.textContent.trim()).toBe('bookmark');
    });

    it('should show outline bookmark when not bookmarked', () => {
      component.isBookmarked = false;
      updateAndDetect();
      const icon = fixture.nativeElement.querySelector('.bookmark-icon-btn mat-icon');
      expect(icon.textContent.trim()).toBe('bookmark_border');
    });

    it('should show copy text button (content_copy icon)', () => {
      const buttons = fixture.nativeElement.querySelectorAll('.action-icon-btn');
      const icons = Array.from(buttons).map((b: any) => b.querySelector('mat-icon')?.textContent?.trim());
      expect(icons).toContain('content_copy');
    });

    it('should show share image button', () => {
      const buttons = fixture.nativeElement.querySelectorAll('.action-icon-btn');
      const icons = Array.from(buttons).map((b: any) => b.querySelector('mat-icon')?.textContent?.trim());
      expect(icons).toContain('image');
    });

    it('should show hourglass when generating image', () => {
      component.isGeneratingImage = true;
      updateAndDetect();
      const buttons = fixture.nativeElement.querySelectorAll('.action-icon-btn');
      const icons = Array.from(buttons).map((b: any) => b.querySelector('mat-icon')?.textContent?.trim());
      expect(icons).toContain('hourglass_empty');
    });

    it('should show share link button when showShareLink is true', () => {
      component.showShareLink = true;
      updateAndDetect();
      const buttons = fixture.nativeElement.querySelectorAll('.action-icon-btn');
      const icons = Array.from(buttons).map((b: any) => b.querySelector('mat-icon')?.textContent?.trim());
      expect(icons).toContain('share');
    });

    it('should not show share link button by default', () => {
      const buttons = fixture.nativeElement.querySelectorAll('.action-icon-btn');
      const icons = Array.from(buttons).map((b: any) => b.querySelector('mat-icon')?.textContent?.trim());
      expect(icons).not.toContain('share');
    });

    it('should show audio button when isQuran is true', () => {
      component.isQuran = true;
      updateAndDetect();
      const audioBtn = fixture.nativeElement.querySelector('.audio-icon-btn');
      expect(audioBtn).toBeTruthy();
    });

    it('should not show audio button when isQuran is false', () => {
      component.isQuran = false;
      updateAndDetect();
      const audioBtn = fixture.nativeElement.querySelector('.audio-icon-btn');
      expect(audioBtn).toBeFalsy();
    });

    it('should show tafsir button when isQuran is true', () => {
      component.isQuran = true;
      updateAndDetect();
      const tafsirBtn = fixture.nativeElement.querySelector('.tafsir-icon-btn');
      expect(tafsirBtn).toBeTruthy();
    });

    it('should show view-in-chapter link when chapterPath is set', () => {
      component.chapterPath = 'al-kafi:1:1:1';
      component.anchorFragment = 'h1';
      updateAndDetect();
      const links = fixture.nativeElement.querySelectorAll('a.action-icon-btn');
      const icons = Array.from(links).map((a: any) => a.querySelector('mat-icon')?.textContent?.trim());
      expect(icons).toContain('menu_book');
    });

    it('should show has-note class when hasNote is true', () => {
      component.hasNote = true;
      updateAndDetect();
      const noteBtn = fixture.nativeElement.querySelector('.action-icon-btn.has-note');
      expect(noteBtn).toBeTruthy();
    });
  });

  describe('event emitters', () => {
    it('should emit bookmarkToggle on bookmark click', () => {
      spyOn(component.bookmarkToggle, 'emit');
      const btn = fixture.nativeElement.querySelector('.bookmark-icon-btn');
      btn.click();
      expect(component.bookmarkToggle.emit).toHaveBeenCalled();
    });

    it('should emit noteToggle on note button click', () => {
      spyOn(component.noteToggle, 'emit');
      const noteBtn = fixture.nativeElement.querySelector('.action-icon-btn.has-note') ||
                       fixture.nativeElement.querySelectorAll('.action-icon-btn')[0];
      // Note toggle is the first action-icon-btn that's not a link (after anchor link if present)
      // Find the note button by looking for the one with note_add/edit_note icon
      const buttons = fixture.nativeElement.querySelectorAll('button.action-icon-btn');
      let noteButton: any;
      buttons.forEach((b: any) => {
        const icon = b.querySelector('mat-icon')?.textContent?.trim();
        if (icon === 'note_add' || icon === 'edit_note') noteButton = b;
      });
      if (noteButton) {
        noteButton.click();
        expect(component.noteToggle.emit).toHaveBeenCalled();
      }
    });

    it('should emit imageShare on image button click', () => {
      spyOn(component.imageShare, 'emit');
      const buttons = fixture.nativeElement.querySelectorAll('button.action-icon-btn');
      let imageButton: any;
      buttons.forEach((b: any) => {
        const icon = b.querySelector('mat-icon')?.textContent?.trim();
        if (icon === 'image') imageButton = b;
      });
      if (imageButton) {
        imageButton.click();
        expect(component.imageShare.emit).toHaveBeenCalled();
      }
    });

    it('should emit audioToggle when audio button is clicked', () => {
      component.isQuran = true;
      updateAndDetect();
      spyOn(component.audioToggle, 'emit');
      const audioBtn = fixture.nativeElement.querySelector('.audio-icon-btn');
      audioBtn.click();
      expect(component.audioToggle.emit).toHaveBeenCalled();
    });

    it('should emit tafsirToggle when tafsir button is clicked', () => {
      component.isQuran = true;
      updateAndDetect();
      spyOn(component.tafsirToggle, 'emit');
      const tafsirBtn = fixture.nativeElement.querySelector('.tafsir-icon-btn');
      tafsirBtn.click();
      expect(component.tafsirToggle.emit).toHaveBeenCalled();
    });

    it('should emit linkShare when share button is clicked', () => {
      component.showShareLink = true;
      updateAndDetect();
      spyOn(component.linkShare, 'emit');
      const buttons = fixture.nativeElement.querySelectorAll('button.action-icon-btn');
      let shareButton: any;
      buttons.forEach((b: any) => {
        const icon = b.querySelector('mat-icon')?.textContent?.trim();
        if (icon === 'share') shareButton = b;
      });
      if (shareButton) {
        shareButton.click();
        expect(component.linkShare.emit).toHaveBeenCalled();
      }
    });
  });
});
