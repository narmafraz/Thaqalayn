import { TestBed } from '@angular/core/testing';
import { AudioService, AudioState, Reciter } from './audio.service';

/**
 * Mock HTMLAudioElement for testing audio playback without actual browser Audio API.
 * Stores event listeners so tests can simulate audio events (canplaythrough, ended, error).
 */
class MockAudioElement {
  src = '';
  private listeners: Record<string, Function[]> = {};

  play = jasmine.createSpy('play').and.returnValue(Promise.resolve());
  pause = jasmine.createSpy('pause');
  load = jasmine.createSpy('load');
  removeAttribute = jasmine.createSpy('removeAttribute');

  addEventListener(event: string, handler: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
  }

  /** Simulate dispatching an event to trigger registered listeners. */
  simulateEvent(event: string): void {
    (this.listeners[event] || []).forEach(handler => handler());
  }
}

describe('AudioService', () => {
  let service: AudioService;
  let mockAudio: MockAudioElement;
  let originalAudio: any;
  let audioConstructorCallCount: number;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AudioService);

    // Create a fresh mock for each test and intercept the Audio constructor.
    // Use a real function (not jasmine.createSpy) so `new Audio(url)` works
    // in modern JS engines that reject non-constructors with `new`.
    // The function always delegates to the current `mockAudio` variable,
    // so tests just reassign `mockAudio` instead of using `.and.callFake()`.
    mockAudio = new MockAudioElement();
    originalAudio = (window as any).Audio;
    audioConstructorCallCount = 0;
    (window as any).Audio = function FakeAudio(this: any, url?: string) {
      audioConstructorCallCount++;
      if (url) { mockAudio.src = url; }
      return mockAudio;
    };
  });

  afterEach(() => {
    (window as any).Audio = originalAudio;
    service.ngOnDestroy();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Static RECITERS configuration
  // ---------------------------------------------------------------------------
  describe('RECITERS', () => {
    it('should have 4 reciters defined', () => {
      expect(AudioService.RECITERS.length).toBe(4);
    });

    it('should have husary as the first reciter', () => {
      expect(AudioService.RECITERS[0].id).toBe('husary');
      expect(AudioService.RECITERS[0].subfolder).toBe('Husary_128kbps');
    });

    it('should contain all expected reciter IDs', () => {
      const ids = AudioService.RECITERS.map(r => r.id);
      expect(ids).toEqual([
        'husary',
        'minshawi-murattal',
        'abdulbasit-murattal',
        'alafasy',
      ]);
    });

    it('should have unique IDs for all reciters', () => {
      const ids = AudioService.RECITERS.map(r => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  // ---------------------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------------------
  describe('initial state', () => {
    it('should emit initial state with default values', () => {
      let currentState: AudioState | undefined;
      service.state$.subscribe(s => currentState = s);

      expect(currentState!.playing).toBeFalse();
      expect(currentState!.loading).toBeFalse();
      expect(currentState!.error).toBeFalse();
      expect(currentState!.surah).toBe(0);
      expect(currentState!.ayah).toBe(0);
      expect(currentState!.reciterId).toBe('husary');
    });
  });

  // ---------------------------------------------------------------------------
  // play()
  // ---------------------------------------------------------------------------
  describe('play()', () => {
    it('should construct the correct EveryAyah URL with zero-padded surah and ayah', () => {
      service.play(1, 1);
      expect(mockAudio.src).toBe('https://everyayah.com/data/Husary_128kbps/001001.mp3');
    });

    it('should zero-pad surah and ayah to 3 digits', () => {
      service.play(2, 5);
      expect(mockAudio.src).toBe('https://everyayah.com/data/Husary_128kbps/002005.mp3');
    });

    it('should handle 3-digit surah and ayah numbers without extra padding', () => {
      service.play(114, 6);
      expect(mockAudio.src).toBe('https://everyayah.com/data/Husary_128kbps/114006.mp3');
    });

    it('should handle large ayah numbers', () => {
      service.play(2, 282);
      expect(mockAudio.src).toBe('https://everyayah.com/data/Husary_128kbps/002282.mp3');
    });

    it('should use the specified reciterId when provided', () => {
      service.play(1, 1, 'alafasy');
      expect(mockAudio.src).toBe('https://everyayah.com/data/Alafasy_128kbps/001001.mp3');
    });

    it('should use abdulbasit-murattal subfolder correctly', () => {
      service.play(36, 1, 'abdulbasit-murattal');
      expect(mockAudio.src).toBe('https://everyayah.com/data/Abdul_Basit_Murattal_192kbps/036001.mp3');
    });

    it('should use minshawi-murattal subfolder correctly', () => {
      service.play(55, 13, 'minshawi-murattal');
      expect(mockAudio.src).toBe('https://everyayah.com/data/Minshawy_Murattal_128kbps/055013.mp3');
    });

    it('should fall back to the first reciter if an unknown reciterId is provided', () => {
      service.play(1, 1, 'unknown-reciter');
      // Falls back to RECITERS[0] which is husary
      expect(mockAudio.src).toBe('https://everyayah.com/data/Husary_128kbps/001001.mp3');
    });

    it('should set loading state to true immediately after play is called', () => {
      let currentState: AudioState | undefined;
      service.state$.subscribe(s => currentState = s);

      service.play(1, 1);

      expect(currentState!.loading).toBeTrue();
      expect(currentState!.playing).toBeFalse();
      expect(currentState!.error).toBeFalse();
      expect(currentState!.surah).toBe(1);
      expect(currentState!.ayah).toBe(1);
    });

    it('should call load() on the audio element', () => {
      service.play(1, 1);
      expect(mockAudio.load).toHaveBeenCalled();
    });

    it('should transition to playing state on canplaythrough event', () => {
      let currentState: AudioState | undefined;
      service.state$.subscribe(s => currentState = s);

      service.play(1, 1);
      mockAudio.simulateEvent('canplaythrough');

      expect(currentState!.loading).toBeFalse();
      expect(currentState!.playing).toBeTrue();
    });

    it('should call audio.play() on canplaythrough event', () => {
      service.play(1, 1);
      mockAudio.simulateEvent('canplaythrough');
      expect(mockAudio.play).toHaveBeenCalled();
    });

    it('should transition to not playing on ended event', () => {
      let currentState: AudioState | undefined;
      service.state$.subscribe(s => currentState = s);

      service.play(1, 1);
      mockAudio.simulateEvent('canplaythrough');
      expect(currentState!.playing).toBeTrue();

      mockAudio.simulateEvent('ended');
      expect(currentState!.playing).toBeFalse();
    });

    it('should set error state on error event', () => {
      let currentState: AudioState | undefined;
      service.state$.subscribe(s => currentState = s);

      service.play(1, 1);
      mockAudio.simulateEvent('error');

      expect(currentState!.error).toBeTrue();
      expect(currentState!.loading).toBeFalse();
      expect(currentState!.playing).toBeFalse();
    });

    it('should stop previous audio when play is called again', () => {
      service.play(1, 1);
      const firstMockAudio = mockAudio;

      // Create a new mock for the second play call
      mockAudio = new MockAudioElement();

      service.play(2, 1);

      // The first audio should have been cleaned up via stop()
      expect(firstMockAudio.pause).toHaveBeenCalled();
      expect(firstMockAudio.removeAttribute).toHaveBeenCalledWith('src');
    });

    it('should update surah and ayah in state', () => {
      let currentState: AudioState | undefined;
      service.state$.subscribe(s => currentState = s);

      service.play(36, 12);

      expect(currentState!.surah).toBe(36);
      expect(currentState!.ayah).toBe(12);
    });

    it('should use the current reciterId from state when none is provided', () => {
      // First set reciter to alafasy
      service.setReciter('alafasy');

      // Reset mock for the play call (setReciter may have triggered play if surah > 0)
      mockAudio = new MockAudioElement();

      service.play(1, 1);
      expect(mockAudio.src).toBe('https://everyayah.com/data/Alafasy_128kbps/001001.mp3');
    });
  });

  // ---------------------------------------------------------------------------
  // pause()
  // ---------------------------------------------------------------------------
  describe('pause()', () => {
    it('should pause the audio element and set playing to false', () => {
      let currentState: AudioState | undefined;
      service.state$.subscribe(s => currentState = s);

      service.play(1, 1);
      mockAudio.simulateEvent('canplaythrough');
      expect(currentState!.playing).toBeTrue();

      service.pause();

      expect(mockAudio.pause).toHaveBeenCalled();
      expect(currentState!.playing).toBeFalse();
    });

    it('should do nothing if no audio is loaded', () => {
      let stateEmissions = 0;
      service.state$.subscribe(() => stateEmissions++);

      // Initial emission = 1
      const initialEmissions = stateEmissions;
      service.pause();

      // No additional emissions because audio is null
      expect(stateEmissions).toBe(initialEmissions);
    });
  });

  // ---------------------------------------------------------------------------
  // resume()
  // ---------------------------------------------------------------------------
  describe('resume()', () => {
    it('should resume playback and set playing to true', () => {
      let currentState: AudioState | undefined;
      service.state$.subscribe(s => currentState = s);

      service.play(1, 1);
      mockAudio.simulateEvent('canplaythrough');
      service.pause();
      expect(currentState!.playing).toBeFalse();

      // Reset the play spy call count to verify resume calls play
      mockAudio.play.calls.reset();
      service.resume();

      expect(mockAudio.play).toHaveBeenCalled();
      expect(currentState!.playing).toBeTrue();
    });

    it('should not call play if already playing', () => {
      service.play(1, 1);
      mockAudio.simulateEvent('canplaythrough');

      // audio.play was called by canplaythrough handler, reset to check resume behavior
      mockAudio.play.calls.reset();

      service.resume();
      // Should not call play again since state.playing is already true
      expect(mockAudio.play).not.toHaveBeenCalled();
    });

    it('should do nothing if no audio is loaded', () => {
      let stateEmissions = 0;
      service.state$.subscribe(() => stateEmissions++);

      const initialEmissions = stateEmissions;
      service.resume();

      expect(stateEmissions).toBe(initialEmissions);
    });
  });

  // ---------------------------------------------------------------------------
  // stop()
  // ---------------------------------------------------------------------------
  describe('stop()', () => {
    it('should pause audio, remove src, reload, and nullify the audio element', () => {
      service.play(1, 1);

      service.stop();

      expect(mockAudio.pause).toHaveBeenCalled();
      expect(mockAudio.removeAttribute).toHaveBeenCalledWith('src');
      // load is called once during play() and once during stop()
      expect(mockAudio.load).toHaveBeenCalledTimes(2);
    });

    it('should reset playing, loading, and error to false', () => {
      let currentState: AudioState | undefined;
      service.state$.subscribe(s => currentState = s);

      service.play(1, 1);
      mockAudio.simulateEvent('canplaythrough');
      expect(currentState!.playing).toBeTrue();

      service.stop();

      expect(currentState!.playing).toBeFalse();
      expect(currentState!.loading).toBeFalse();
      expect(currentState!.error).toBeFalse();
    });

    it('should preserve surah, ayah, and reciterId in state after stop', () => {
      let currentState: AudioState | undefined;
      service.state$.subscribe(s => currentState = s);

      service.play(36, 12);
      service.stop();

      // surah and ayah are preserved since stop() spreads ...this.state
      expect(currentState!.surah).toBe(36);
      expect(currentState!.ayah).toBe(12);
      expect(currentState!.reciterId).toBe('husary');
    });

    it('should handle being called when no audio is loaded', () => {
      // Should not throw
      expect(() => service.stop()).not.toThrow();

      let currentState: AudioState | undefined;
      service.state$.subscribe(s => currentState = s);

      expect(currentState!.playing).toBeFalse();
      expect(currentState!.loading).toBeFalse();
      expect(currentState!.error).toBeFalse();
    });

    it('should handle being called multiple times without error', () => {
      service.play(1, 1);
      service.stop();
      expect(() => service.stop()).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // togglePlayPause()
  // ---------------------------------------------------------------------------
  describe('togglePlayPause()', () => {
    it('should pause when the same ayah is currently playing', () => {
      let currentState: AudioState | undefined;
      service.state$.subscribe(s => currentState = s);

      service.play(1, 1);
      mockAudio.simulateEvent('canplaythrough');
      expect(currentState!.playing).toBeTrue();

      service.togglePlayPause(1, 1);

      expect(currentState!.playing).toBeFalse();
      expect(mockAudio.pause).toHaveBeenCalled();
    });

    it('should resume when the same ayah is paused and not loading', () => {
      let currentState: AudioState | undefined;
      service.state$.subscribe(s => currentState = s);

      service.play(1, 1);
      mockAudio.simulateEvent('canplaythrough');
      service.pause();
      expect(currentState!.playing).toBeFalse();

      mockAudio.play.calls.reset();
      service.togglePlayPause(1, 1);

      expect(currentState!.playing).toBeTrue();
      expect(mockAudio.play).toHaveBeenCalled();
    });

    it('should start new playback when a different surah is requested', () => {
      let currentState: AudioState | undefined;
      service.state$.subscribe(s => currentState = s);

      service.play(1, 1);
      mockAudio.simulateEvent('canplaythrough');

      // New mock for the new play call
      mockAudio = new MockAudioElement();

      service.togglePlayPause(2, 1);

      expect(currentState!.surah).toBe(2);
      expect(currentState!.ayah).toBe(1);
      expect(currentState!.loading).toBeTrue();
    });

    it('should start new playback when a different ayah is requested', () => {
      let currentState: AudioState | undefined;
      service.state$.subscribe(s => currentState = s);

      service.play(1, 1);
      mockAudio.simulateEvent('canplaythrough');

      // New mock for the new play call
      mockAudio = new MockAudioElement();

      service.togglePlayPause(1, 5);

      expect(currentState!.surah).toBe(1);
      expect(currentState!.ayah).toBe(5);
      expect(currentState!.loading).toBeTrue();
    });

    it('should start new playback when toggle is called on a different ayah while currently playing', () => {
      service.play(1, 1);
      mockAudio.simulateEvent('canplaythrough');

      // New mock
      mockAudio = new MockAudioElement();

      service.togglePlayPause(3, 10);

      expect(mockAudio.src).toBe('https://everyayah.com/data/Husary_128kbps/003010.mp3');
    });

    it('should not resume if the same ayah is still loading', () => {
      let currentState: AudioState | undefined;
      service.state$.subscribe(s => currentState = s);

      service.play(1, 1);
      // Do NOT simulate canplaythrough -- still loading
      expect(currentState!.loading).toBeTrue();
      expect(currentState!.playing).toBeFalse();

      // Toggle for the same ayah while loading: condition is
      //   surah===surah && ayah===ayah && !loading => false (loading is true)
      // and not playing, so it falls through to the else branch => play again
      const previousMock = mockAudio;
      mockAudio = new MockAudioElement();

      service.togglePlayPause(1, 1);

      // It calls play() again since loading is true and playing is false
      // This stops the previous and starts fresh
      expect(previousMock.pause).toHaveBeenCalled();
      expect(currentState!.loading).toBeTrue();
    });

    it('should call play for a brand new ayah when nothing is currently loaded', () => {
      let currentState: AudioState | undefined;
      service.state$.subscribe(s => currentState = s);

      service.togglePlayPause(5, 3);

      expect(currentState!.surah).toBe(5);
      expect(currentState!.ayah).toBe(3);
      expect(currentState!.loading).toBeTrue();
      expect(mockAudio.src).toBe('https://everyayah.com/data/Husary_128kbps/005003.mp3');
    });
  });

  // ---------------------------------------------------------------------------
  // setReciter()
  // ---------------------------------------------------------------------------
  describe('setReciter()', () => {
    it('should update the reciterId in state', () => {
      let currentState: AudioState | undefined;
      service.state$.subscribe(s => currentState = s);

      service.setReciter('alafasy');

      expect(currentState!.reciterId).toBe('alafasy');
    });

    it('should restart playback if a surah and ayah are set (surah > 0 and ayah > 0)', () => {
      service.play(2, 10);
      mockAudio.simulateEvent('canplaythrough');

      // New mock for the restart
      mockAudio = new MockAudioElement();

      service.setReciter('alafasy');

      expect(mockAudio.src).toBe('https://everyayah.com/data/Alafasy_128kbps/002010.mp3');
    });

    it('should not restart playback if surah is 0 (nothing has been played yet)', () => {
      // Initial state has surah=0, ayah=0
      service.setReciter('alafasy');

      // Audio constructor should not have been called since no play was triggered
      expect(audioConstructorCallCount).toBe(0);
    });

    it('should restart playback even if audio was stopped (surah and ayah still in state)', () => {
      let currentState: AudioState | undefined;
      service.state$.subscribe(s => currentState = s);

      service.play(10, 5);
      service.stop();

      // surah and ayah are preserved after stop
      expect(currentState!.surah).toBe(10);
      expect(currentState!.ayah).toBe(5);

      // New mock for the restart
      mockAudio = new MockAudioElement();

      service.setReciter('minshawi-murattal');

      expect(mockAudio.src).toBe('https://everyayah.com/data/Minshawy_Murattal_128kbps/010005.mp3');
    });

    it('should pass the new reciterId to play()', () => {
      service.play(1, 1);
      mockAudio.simulateEvent('canplaythrough');

      mockAudio = new MockAudioElement();

      service.setReciter('abdulbasit-murattal');

      expect(mockAudio.src).toBe('https://everyayah.com/data/Abdul_Basit_Murattal_192kbps/001001.mp3');
    });
  });

  // ---------------------------------------------------------------------------
  // isPlayingAyah()
  // ---------------------------------------------------------------------------
  describe('isPlayingAyah()', () => {
    it('should return false when nothing is playing', () => {
      expect(service.isPlayingAyah(1, 1)).toBeFalse();
    });

    it('should return true when the specified ayah is currently playing', () => {
      service.play(1, 1);
      mockAudio.simulateEvent('canplaythrough');

      expect(service.isPlayingAyah(1, 1)).toBeTrue();
    });

    it('should return false when a different surah is playing', () => {
      service.play(1, 1);
      mockAudio.simulateEvent('canplaythrough');

      expect(service.isPlayingAyah(2, 1)).toBeFalse();
    });

    it('should return false when a different ayah of the same surah is playing', () => {
      service.play(1, 1);
      mockAudio.simulateEvent('canplaythrough');

      expect(service.isPlayingAyah(1, 2)).toBeFalse();
    });

    it('should return false when the ayah is loaded but paused', () => {
      service.play(1, 1);
      mockAudio.simulateEvent('canplaythrough');
      service.pause();

      expect(service.isPlayingAyah(1, 1)).toBeFalse();
    });

    it('should return false when the ayah is loading but not yet playing', () => {
      service.play(1, 1);
      // canplaythrough not triggered yet, so loading=true, playing=false
      expect(service.isPlayingAyah(1, 1)).toBeFalse();
    });

    it('should return false after audio has ended', () => {
      service.play(1, 1);
      mockAudio.simulateEvent('canplaythrough');
      mockAudio.simulateEvent('ended');

      expect(service.isPlayingAyah(1, 1)).toBeFalse();
    });

    it('should return false after stop is called', () => {
      service.play(1, 1);
      mockAudio.simulateEvent('canplaythrough');
      service.stop();

      expect(service.isPlayingAyah(1, 1)).toBeFalse();
    });
  });

  // ---------------------------------------------------------------------------
  // state$ observable emissions
  // ---------------------------------------------------------------------------
  describe('state$ observable', () => {
    it('should emit the full playback lifecycle in correct order', () => {
      const emissions: AudioState[] = [];
      service.state$.subscribe(s => emissions.push({ ...s }));

      // Initial state emission from BehaviorSubject
      expect(emissions.length).toBe(1);
      expect(emissions[0].playing).toBeFalse();
      expect(emissions[0].loading).toBeFalse();

      // play() -> stop() emits once (from stop's internal call), then loading state
      service.play(1, 1);
      // After play: stop() emits reset, then play sets loading state
      const afterPlay = emissions[emissions.length - 1];
      expect(afterPlay.loading).toBeTrue();
      expect(afterPlay.playing).toBeFalse();
      expect(afterPlay.surah).toBe(1);
      expect(afterPlay.ayah).toBe(1);

      // canplaythrough -> playing
      mockAudio.simulateEvent('canplaythrough');
      const afterCanPlay = emissions[emissions.length - 1];
      expect(afterCanPlay.loading).toBeFalse();
      expect(afterCanPlay.playing).toBeTrue();

      // pause
      service.pause();
      const afterPause = emissions[emissions.length - 1];
      expect(afterPause.playing).toBeFalse();

      // resume
      service.resume();
      const afterResume = emissions[emissions.length - 1];
      expect(afterResume.playing).toBeTrue();

      // ended
      mockAudio.simulateEvent('ended');
      const afterEnded = emissions[emissions.length - 1];
      expect(afterEnded.playing).toBeFalse();
    });

    it('should emit error state when audio fails to load', () => {
      const emissions: AudioState[] = [];
      service.state$.subscribe(s => emissions.push({ ...s }));

      service.play(1, 1);
      mockAudio.simulateEvent('error');

      const errorState = emissions[emissions.length - 1];
      expect(errorState.error).toBeTrue();
      expect(errorState.loading).toBeFalse();
      expect(errorState.playing).toBeFalse();
    });

    it('should maintain reciterId across state transitions', () => {
      let currentState: AudioState | undefined;
      service.state$.subscribe(s => currentState = s);

      service.play(1, 1, 'alafasy');
      expect(currentState!.reciterId).toBe('alafasy');

      mockAudio.simulateEvent('canplaythrough');
      expect(currentState!.reciterId).toBe('alafasy');

      service.pause();
      expect(currentState!.reciterId).toBe('alafasy');

      service.resume();
      expect(currentState!.reciterId).toBe('alafasy');

      service.stop();
      expect(currentState!.reciterId).toBe('alafasy');
    });
  });

  // ---------------------------------------------------------------------------
  // ngOnDestroy()
  // ---------------------------------------------------------------------------
  describe('ngOnDestroy()', () => {
    it('should stop audio playback when service is destroyed', () => {
      service.play(1, 1);
      mockAudio.simulateEvent('canplaythrough');

      service.ngOnDestroy();

      expect(mockAudio.pause).toHaveBeenCalled();
      expect(mockAudio.removeAttribute).toHaveBeenCalledWith('src');
    });

    it('should set playing and loading to false when destroyed', () => {
      let currentState: AudioState | undefined;
      service.state$.subscribe(s => currentState = s);

      service.play(1, 1);
      mockAudio.simulateEvent('canplaythrough');

      service.ngOnDestroy();

      expect(currentState!.playing).toBeFalse();
      expect(currentState!.loading).toBeFalse();
    });

    it('should not throw if destroyed when no audio is loaded', () => {
      expect(() => service.ngOnDestroy()).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases and integration scenarios
  // ---------------------------------------------------------------------------
  describe('edge cases', () => {
    it('should handle rapid play calls by stopping previous audio each time', () => {
      const mocks: MockAudioElement[] = [];

      service.play(1, 1);
      mocks.push(mockAudio);

      for (let i = 2; i <= 5; i++) {
        mockAudio = new MockAudioElement();
        service.play(1, i);
        mocks.push(mockAudio);
      }

      // All previous mocks should have been paused by stop()
      for (let i = 0; i < mocks.length - 1; i++) {
        expect(mocks[i].pause).toHaveBeenCalled();
      }

      // The last state should reflect the final play call
      let currentState: AudioState | undefined;
      service.state$.subscribe(s => currentState = s);
      expect(currentState!.ayah).toBe(5);
    });

    it('should handle play -> error -> play sequence', () => {
      let currentState: AudioState | undefined;
      service.state$.subscribe(s => currentState = s);

      service.play(1, 1);
      mockAudio.simulateEvent('error');
      expect(currentState!.error).toBeTrue();

      // New mock for retry
      mockAudio = new MockAudioElement();

      service.play(1, 1);
      expect(currentState!.error).toBeFalse();
      expect(currentState!.loading).toBeTrue();

      mockAudio.simulateEvent('canplaythrough');
      expect(currentState!.playing).toBeTrue();
    });

    it('should handle changing reciter while loading', () => {
      let currentState: AudioState | undefined;
      service.state$.subscribe(s => currentState = s);

      service.play(1, 1);
      expect(currentState!.loading).toBeTrue();

      mockAudio = new MockAudioElement();

      service.setReciter('alafasy');

      expect(mockAudio.src).toBe('https://everyayah.com/data/Alafasy_128kbps/001001.mp3');
      expect(currentState!.loading).toBeTrue();
      expect(currentState!.reciterId).toBe('alafasy');
    });

    it('should correctly build URL for Surah Al-Fatiha ayah 1 with each reciter', () => {
      const expectedUrls: Record<string, string> = {
        'husary': 'https://everyayah.com/data/Husary_128kbps/001001.mp3',
        'minshawi-murattal': 'https://everyayah.com/data/Minshawy_Murattal_128kbps/001001.mp3',
        'abdulbasit-murattal': 'https://everyayah.com/data/Abdul_Basit_Murattal_192kbps/001001.mp3',
        'alafasy': 'https://everyayah.com/data/Alafasy_128kbps/001001.mp3',
      };

      for (const reciter of AudioService.RECITERS) {
        mockAudio = new MockAudioElement();
        service.play(1, 1, reciter.id);
        expect(mockAudio.src).toBe(expectedUrls[reciter.id]);
      }
    });
  });
});
